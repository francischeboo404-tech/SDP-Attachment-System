from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Job(models.Model):
    JOB_TYPE_CHOICES = (
        ("ATTACHMENT", "Attachment"),
        ("JOB_OPENING", "Job Opening"),
    )

    title = models.CharField(max_length=200)
    description = models.TextField()
    requirements = models.TextField()
    job_type = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES, db_index=True)
    location = models.CharField(max_length=150)
    deadline = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    def __str__(self):
        return f"{self.title} ({self.get_job_type_display()})"


class Application(models.Model):
    STATUS_CHOICES = (
        ("PENDING",     "Pending"),
        ("REVIEWED",    "Reviewed"),       # HR/Admin has opened the attachments panel
        ("SHORTLISTED", "Shortlisted"),
        ("REJECTED",    "Rejected"),
        ("HIRED",       "Hired"),
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="applications"
    )
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    cover_letter = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING", db_index=True
    )
    ats_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, db_index=True)
    applied_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        unique_together = ("user", "job")

    def __str__(self):
        return f"{self.user.username} - {self.job.title}"
