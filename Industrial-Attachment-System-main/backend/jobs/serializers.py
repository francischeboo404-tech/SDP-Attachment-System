from rest_framework import serializers
from .models import Job, Application


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = "__all__"


class ApplicationSerializer(serializers.ModelSerializer):
    applicant_name = serializers.SerializerMethodField()
    job_title = serializers.CharField(source="job.title", read_only=True)
    job_type = serializers.CharField(source="job.job_type", read_only=True)
    opportunity_type = serializers.CharField(
        source="user.profile.opportunity_type", read_only=True
    )
    attached_documents = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = "__all__"
        read_only_fields = ("user", "status", "applied_at", "ats_score")

    def get_applicant_name(self, obj):
        # We can enforce anonymity here if required, but returning full name for now.
        return (
            f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        )

    def get_attached_documents(self, obj):
        from accounts.serializers import DocumentSerializer

        docs = obj.user.documents.all()
        return DocumentSerializer(docs, many=True).data
