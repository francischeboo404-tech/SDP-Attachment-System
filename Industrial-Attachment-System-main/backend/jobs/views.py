import re
from rest_framework import generics, permissions, serializers
from rest_framework.throttling import UserRateThrottle
from django.db.models import Count, Avg
from .models import Job, Application
from .serializers import JobSerializer, ApplicationSerializer
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek, TruncYear

User = get_user_model()

# ---------------------------------------------------------------------------
# ATS (Applicant Tracking System) configuration
# ---------------------------------------------------------------------------

# Common English function words that inflate the job-keyword denominator
# and cause false low-match scores. Filtering them makes overlap meaningful.
ENGLISH_STOP_WORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "this", "that", "these", "those",
    "it", "its", "from", "not", "no", "as", "we", "our", "your", "their",
    "which", "who", "you", "they", "he", "she", "me", "him", "her",
    "us", "them", "any", "all", "must", "can", "also", "up", "out", "into",
    "so", "if", "than", "then", "when", "where", "how", "what", "each",
    "both", "only", "just", "over", "per", "via", "s", "re", "ve", "ll",
    "d", "t", "m", "such", "other", "more", "very", "well", "some",
})

# Minimum composite ATS score to accept an application.
# With the 4-dimension scoring system a fully compliant applicant who has uploaded
# all 9 required documents already starts at 35 pts before any keyword/education
# bonus, so 25 is a meaningful but achievable threshold.
ATS_MINIMUM_SCORE = 25.0

# ---------------------------------------------------------------------------
# ATS document keyword expansion
# ---------------------------------------------------------------------------
# Each document type an applicant uploads contributes:
#   (a) its human-readable display name (already captured via get_document_type_display)
#   (b) the rich synonym/domain keyword set defined here.
# This dramatically improves ATS recall for applicants who have fulfilled their
# document requirements but whose raw profile text uses different vocabulary
# from the job posting (e.g. "cv" vs "resume", "transcript" vs "academic records").
DOCUMENT_ATS_KEYWORDS = {
    "TRANSCRIPT":        "transcript academic records marks grades university college results",
    "NATIONAL_ID":       "national identity identification citizen id card kenya",
    "RESUME":            "resume cv curriculum vitae work experience skills profile professional",
    "COVER_LETTER":      "cover letter motivation statement application interest suitability",
    "INSTITUTION_INTRO": "introduction letter institution university recommendation attachment intern",
    "GOOD_CONDUCT":      "conduct certificate police clearance character background vetting",
    "STUDENT_INSURANCE": "insurance student medical health cover protection policy",
    "STUDENT_ID":        "student identification university college enrollment registration card",
    "NEXT_OF_KIN_ID":    "next kin emergency contact family relative beneficiary",
    "KRA_PIN":           "kra pin tax registration revenue authority kenya fiscal",
    "SHA_CARD":          "sha social health insurance authority card medical",
    "NSSF_CARD":         "nssf national social security fund pension card contribution",
    "BIRTH_CERT":        "birth certificate registration civil record",
    "ACADEMIC_CERT":     "academic certificate qualification degree diploma award graduation",
    "SECRETS_ACT_FORM":  "official secrets act security clearance government confidentiality",
    "PSIP_FORM":         "psip intern biodata attachment public service internship form",
    "PASSPORT_PHOTOS":   "passport photo identity biometric portrait",
    "ATM_CARD":          "atm bank account banking payment details financial",
}

# ---------------------------------------------------------------------------
# The 9 mandatory documents evaluated in Dimension 1 of the ATS composite score.
# Based on Kenya Public Service / PSIP Industrial Attachment requirements.
# ---------------------------------------------------------------------------
REQUIRED_DOCUMENTS = [
    "NATIONAL_ID",        # 1. National ID              — identity verification
    "TRANSCRIPT",         # 2. Academic Transcripts      — qualifications proof
    "INSTITUTION_INTRO",  # 3. Institution Intro Letter  — confirms active enrollment
    "RESUME",             # 4. Resume / CV               — competence summary
    "GOOD_CONDUCT",       # 5. Certificate of Good Conduct — character vetting
    "KRA_PIN",            # 6. KRA PIN Certificate       — tax compliance
    "NSSF_CARD",          # 7. NSSF Card                 — social security
    "SHA_CARD",           # 8. SHA Card                  — health insurance
    "STUDENT_ID",         # 9. Student ID                — active student status
]
ATS_REQUIRED_DOC_COUNT = len(REQUIRED_DOCUMENTS)  # 9


class ApplyThrottle(UserRateThrottle):
    """
    Per-user throttle for job application POST submissions.
    10 applications/hour is generous for legitimate applicants while
    preventing automated application-flooding spam.
    """
    scope = "apply"


class IsManagementOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method == "DELETE" and request.user.role == "HR":
            return False
        return request.user.role in ["ADMIN", "HR"]


class JobListCreateView(generics.ListCreateAPIView):
    queryset = Job.objects.all().order_by("-created_at")
    serializer_class = JobSerializer
    permission_classes = (IsManagementOrReadOnly,)


class JobDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Job.objects.all()
    serializer_class = JobSerializer
    permission_classes = (IsManagementOrReadOnly,)


class ApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_throttles(self):
        """
        Apply ApplyThrottle (10/hour) only on POST requests (new submissions).
        GET requests (listing applications) use the global user throttle so
        HR staff and applicants can freely query the applications list.
        """
        request = getattr(self, "request", None)
        if request and request.method == "POST":
            return [ApplyThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        qs = Application.objects.select_related(
            "job", "user", "user__profile"
        ).prefetch_related("user__documents").order_by("-applied_at")
        if self.request.user.role in ["ADMIN", "HR"]:
            return qs.all()
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = (
            User.objects.select_related("profile")
            .prefetch_related("education", "experience", "trainings", "memberships", "documents")
            .get(id=self.request.user.id)
        )
        job = serializer.validated_data["job"]

        # ── 0a. Active status gate ─────────────────────────────────────────────
        # Checked first so a manually closed vacancy gives a clear, specific error.
        if not job.is_active:
            raise serializers.ValidationError(
                {
                    "detail": (
                        f'The vacancy "{job.title}" is no longer accepting applications '
                        "because it has been deactivated by the administrator."
                    )
                }
            )

        # ── 0b. Deadline gate ──────────────────────────────────────────────────
        # timezone.now() is always UTC (USE_TZ = True in settings.py) and
        # job.deadline is stored by Django in UTC, so the comparison is correct
        # regardless of the server's or the client's local timezone.
        # The server clock is the SOLE source of truth — no client timestamp is
        # ever consulted, so a manipulated browser clock cannot bypass this check.
        now = timezone.now()
        if now > job.deadline:
            deadline_str = (
                f"{job.deadline.day} "
                f"{job.deadline.strftime('%B %Y at %H:%M')} UTC"
            )
            raise serializers.ValidationError(
                {
                    "detail": (
                        f'The application deadline for "{job.title}" closed on '
                        f"{deadline_str}. No further applications are being accepted."
                    )
                }
            )

        # ── 0c. Duplicate application gate ─────────────────────────────────────
        # The Application model has unique_together = (("user", "job")) at the DB
        # level, but we check explicitly here — BEFORE the expensive ATS keyword
        # computation — so we can return a clear, actionable error message instead
        # of a cryptic IntegrityError from the database constraint layer.
        if Application.objects.filter(user=user, job=job).exists():
            raise serializers.ValidationError(
                {
                    "detail": (
                        f'You have already submitted an application for "{job.title}". '
                        "Only one application per vacancy is permitted. "
                        "Visit \"My Applications\" to track your existing submission."
                    )
                }
            )

        # ── 1. Profile completeness gate ────────────────────────────────────
        from accounts.utils import calculate_profile_completion
        completion_data = calculate_profile_completion(user)
        if not completion_data["can_apply"]:
            missing = ", ".join(completion_data["missing_sections"])
            raise serializers.ValidationError(
                {
                    "detail": (
                        f"Application refused. Your profile is incomplete. "
                        f"Missing: {missing}. "
                        "Please visit your Profile page to complete all required sections."
                    )
                }
            )

        # ════════════════════════════════════════════════════════════════════════════
        # WEIGHTED ATS COMPOSITE SCORING  —  4 independent dimensions, max 100 pts
        # ════════════════════════════════════════════════════════════════════════════
        #  Dimension                   Weight   Rationale
        #  ────────────────────────────────────────────────────────────────────────
        #  1. Required Documents       35 pts   9 mandated docs — verifiable compliance
        #  2. Job Keyword Match        30 pts   Corpus↔job overlap — role relevance
        #  3. Education Quality        25 pts   Records + qualification level
        #  4. General Profile Info     10 pts   Identity/contact completeness
        #  ────────────────────────────────────────────────────────────────────────
        #  Total possible              100 pts
        # ════════════════════════════════════════════════════════════════════════════

        def get_keywords(text):
            """Return meaningful lowercase words ≥2 chars, excluding stop words."""
            words = set(re.findall(r"\b[a-z]{2,}\b", text.lower()))
            return words - ENGLISH_STOP_WORDS

        # ── Dimension 1: Required Document Completeness (max 35 pts) ────────────────
        # Checks how many of the 9 mandated core documents have been uploaded.
        # This rewards verifiable compliance, not just self-reported claims.
        uploaded_doc_types = set(
            user.documents.values_list("document_type", flat=True)
        )
        required_uploaded = sum(
            1 for d in REQUIRED_DOCUMENTS if d in uploaded_doc_types
        )
        doc_score = round((required_uploaded / ATS_REQUIRED_DOC_COUNT) * 35, 2)

        # ── Dimension 2: Job Keyword Match (max 30 pts) ────────────────────────
        # Builds an applicant keyword corpus from all profile sources, then measures
        # overlap with the job’s requirements + description.
        applicant_parts = []

        # Education: qualification, field of study, institution, grade award
        for edu in user.education.all():
            applicant_parts.append(
                f"{edu.qualification} {edu.field_of_study} "
                f"{edu.institution_name} {edu.grade_award}"
            )

        # Experience: title, responsibilities, organisation
        for exp in user.experience.all():
            applicant_parts.append(
                f"{exp.job_title} {exp.responsibilities} {exp.organization}"
            )

        # Trainings
        for training in user.trainings.all():
            applicant_parts.append(f"{training.name} {training.institution}")

        # Professional memberships
        for membership in user.memberships.all():
            applicant_parts.append(f"{membership.body_name} {membership.status}")

        # Uploaded documents — display name + domain synonym expansion
        for doc in user.documents.all():
            applicant_parts.append(doc.get_document_type_display())
            extra_kw = DOCUMENT_ATS_KEYWORDS.get(doc.document_type, "")
            if extra_kw:
                applicant_parts.append(extra_kw)

        # County of residence (location affinity)
        try:
            if user.profile.county_of_residence:
                applicant_parts.append(user.profile.county_of_residence)
        except Exception:
            pass

        # Cover letter — highest-weight individual text source
        cover_letter = serializer.validated_data.get("cover_letter", "")
        if cover_letter and cover_letter.strip():
            applicant_parts.append(cover_letter)

        applicant_keywords = get_keywords(" ".join(applicant_parts))

        if not applicant_keywords:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Your profile has no meaningful content for ATS analysis. "
                        "Please complete your Education and Experience sections, "
                        "upload the required documents, and write a Cover Letter before applying."
                    )
                }
            )

        job_keywords = get_keywords(f"{job.requirements} {job.description}")

        if not job_keywords:
            keyword_score = 30.0  # No job keywords \u2192 full marks for this dimension
        else:
            intersection  = applicant_keywords.intersection(job_keywords)
            keyword_score = round(min(len(intersection) / len(job_keywords), 1.0) * 30, 2)

        # \u2500\u2500 Dimension 3: Education Quality (max 25 pts) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        # Base 10 pts for having at least one education record, plus up to 15 bonus
        # pts based on the highest qualification level found in the profile.
        QUALIFICATION_RANKS = {
            "phd": 15, "doctorate": 15,
            "masters": 12, "master": 12, "mba": 12, "msc": 12,
            "degree": 10, "bachelor": 10, "honours": 10, "bsc": 10, "ba": 10,
            "diploma": 7, "hnd": 7,
            "certificate": 5, "cert": 5,
            "kcse": 3, "secondary": 3,
        }
        edu_records = list(user.education.all())
        if edu_records:
            qual_bonus = 0
            for edu in edu_records:
                qual_lower = edu.qualification.lower()
                for key, pts in QUALIFICATION_RANKS.items():
                    if key in qual_lower:
                        qual_bonus = max(qual_bonus, pts)
                        break
            edu_score = min(10 + qual_bonus, 25)  # 10 base + up to 15 qual bonus
        else:
            edu_score = 0

        # \u2500\u2500 Dimension 4: General Profile Information (max 10 pts) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        # Awards points proportional to how many of 6 core identity/contact fields
        # the applicant has filled in.  Encourages a complete, trustworthy profile.
        try:
            profile = user.profile
            identity_fields = [
                profile.gender,
                str(profile.dob) if profile.dob else "",
                profile.phone_number,
                profile.id_number,
                profile.county_of_residence,
                profile.nationality,
            ]
            filled        = sum(1 for f in identity_fields if f and f.strip())
            general_score = round((filled / len(identity_fields)) * 10, 2)
        except Exception:
            general_score = 0.0

        # \u2500\u2500 Composite ATS Score \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        ats_score = round(
            min(doc_score + keyword_score + edu_score + general_score, 100.0),
            2,
        )

        if ats_score < ATS_MINIMUM_SCORE:
            raise serializers.ValidationError(
                {
                    "detail": (
                        f"Your composite ATS score is {ats_score:.1f}/100 "
                        f"(minimum {ATS_MINIMUM_SCORE:.0f} required). "
                        f"Score breakdown \u2014 "
                        f"Documents: {doc_score:.1f}/35 "
                        f"({required_uploaded}/{ATS_REQUIRED_DOC_COUNT} required docs uploaded), "
                        f"Keyword Match: {keyword_score:.1f}/30, "
                        f"Education: {edu_score:.1f}/25, "
                        f"General Info: {general_score:.1f}/10. "
                        "To improve: upload all 9 required documents, complete your profile fields, "
                        "add Education & Experience records, and write a tailored Cover Letter."
                    )
                }
            )

        serializer.save(user=user, ats_score=ats_score)


class ApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Application.objects.select_related(
            "job", "user", "user__profile"
        ).prefetch_related("user__documents").order_by("-applied_at")
        if self.request.user.role in ["ADMIN", "HR"]:
            return qs.all()
        return qs.filter(user=self.request.user)


class ApplicationStatusUpdateView(APIView):
    permission_classes = (IsManagementOrReadOnly,)

    def patch(self, request, pk):
        try:
            instance = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status in dict(Application.STATUS_CHOICES).keys():
            instance.status = new_status
            instance.save(update_fields=["status"])
            return Response(
                {
                    "detail": f"Application marked as {new_status}.",
                    "status": instance.status,
                }
            )
        return Response(
            {"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST
        )


class AnalyticsView(APIView):
    permission_classes = (IsManagementOrReadOnly,)

    def get(self, request):
        now = timezone.now()
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        if start_date_str and end_date_str:
            from datetime import datetime
            try:
                parsed_start = datetime.strptime(start_date_str, "%Y-%m-%d")
                parsed_end = datetime.strptime(end_date_str, "%Y-%m-%d") + timedelta(days=1, seconds=-1)
                start_date = timezone.make_aware(parsed_start) if timezone.is_naive(parsed_start) else parsed_start
                end_date = timezone.make_aware(parsed_end) if timezone.is_naive(parsed_end) else parsed_end
            except ValueError:
                start_date = now - timedelta(days=30)
                end_date = now
        else:
            start_date = now - timedelta(days=30)
            end_date = now

        delta_days = (end_date - start_date).days

        if delta_days <= 45:
            trunc_func = TruncDate("applied_at")
            date_format = "%b %d"
            period_label = "Daily"
        elif delta_days <= 180:
            trunc_func = TruncWeek("applied_at")
            date_format = "%b %d"
            period_label = "Weekly"
        elif delta_days <= 730:
            trunc_func = TruncMonth("applied_at")
            date_format = "%b %Y"
            period_label = "Monthly"
        else:
            trunc_func = TruncYear("applied_at")
            date_format = "%Y"
            period_label = "Yearly"

        apps = Application.objects.filter(applied_at__gte=start_date, applied_at__lte=end_date)
        jobs_qs = Job.objects.filter(created_at__gte=start_date, created_at__lte=end_date)

        total_jobs = jobs_qs.count()
        total_applications = apps.count()

        status_distribution = list(apps.values("status").annotate(count=Count("id")))
        # Show job category demands based on applications received for each job type in period
        job_type_distribution = list(
            apps.values("job__job_type").annotate(count=Count("id"))
        )

        # fix job_type key name to match old response
        formatted_job_type_dict = []
        for j in job_type_distribution:
            formatted_job_type_dict.append(
                {"job_type": j["job__job_type"], "count": j["count"]}
            )

        avg_ats_score = apps.aggregate(Avg("ats_score"))["ats_score__avg"] or 0

        trend_qs = (
            apps.annotate(period_date=trunc_func)
            .values("period_date")
            .annotate(app_count=Count("id"), avg_score=Avg("ats_score"))
            .order_by("period_date")
        )

        trend = []
        for item in trend_qs:
            trend.append(
                {
                    "date": (
                        item["period_date"].strftime(date_format)
                        if hasattr(item["period_date"], "strftime")
                        else str(item["period_date"])
                    ),
                    "applications": item["app_count"],
                    "average_score": (
                        round(item["avg_score"], 2) if item["avg_score"] else 0
                    ),
                }
            )

        return Response(
            {
                "total_jobs": total_jobs,
                "total_applications": total_applications,
                "status_distribution": status_distribution,
                "job_type_distribution": formatted_job_type_dict,
                "average_ats_score": round(avg_ats_score, 2),
                "trend": trend,
                "period_label": period_label,
            }
        )
