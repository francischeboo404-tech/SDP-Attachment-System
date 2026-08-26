from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from .models import Job

User = get_user_model()


class JobTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin", password="123", role="ADMIN"
        )
        self.job = Job.objects.create(
            title="IT Intern",
            description="Desc",
            requirements="Req",
            job_type="INTERNSHIP",
            location="Nairobi",
            deadline="2026-12-31T00:00:00Z",
        )

    def test_get_vacancies(self):
        response = self.client.get("/api/careers/vacancies/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
