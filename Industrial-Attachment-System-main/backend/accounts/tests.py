from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


class AuthTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="12345", password="password123")

    def test_login(self):
        response = self.client.post(
            "/api/accounts/login/", {"username": "12345", "password": "password123", "recaptcha": "test"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)


class EducationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.client.force_authenticate(user=self.user)

    def test_1_current_false_end_date_provided(self):
        data = {
            "institution_name": "Test University",
            "qualification": "BSc",
            "field_of_study": "Computer Science",
            "grade_award": "First Class",
            "start_date": "2020-01-01",
            "end_date": "2024-01-01",
            "current": False
        }
        response = self.client.post("/api/accounts/education/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["current"], False)
        self.assertEqual(response.data["end_date"], "2024-01-01")

    def test_2_current_false_end_date_missing(self):
        data = {
            "institution_name": "Test University",
            "qualification": "BSc",
            "field_of_study": "Computer Science",
            "grade_award": "First Class",
            "start_date": "2020-01-01",
            "current": False
        }
        response = self.client.post("/api/accounts/education/", data, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("end_date", response.data)

    def test_3_current_true_end_date_null(self):
        data = {
            "institution_name": "Test University",
            "qualification": "BSc",
            "field_of_study": "Computer Science",
            "grade_award": "First Class",
            "start_date": "2020-01-01",
            "end_date": None,
            "current": True
        }
        response = self.client.post("/api/accounts/education/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["current"], True)
        self.assertEqual(response.data["end_date"], None)

    def test_4_current_true_end_date_omitted(self):
        data = {
            "institution_name": "Test University",
            "qualification": "BSc",
            "field_of_study": "Computer Science",
            "grade_award": "First Class",
            "start_date": "2020-01-01",
            "current": True
        }
        response = self.client.post("/api/accounts/education/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["current"], True)
        self.assertEqual(response.data["end_date"], None)

    def test_5_current_true_end_date_empty_string(self):
        data = {
            "institution_name": "Test University",
            "qualification": "BSc",
            "field_of_study": "Computer Science",
            "grade_award": "First Class",
            "start_date": "2020-01-01",
            "end_date": "",
            "current": True
        }
        response = self.client.post("/api/accounts/education/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["current"], True)
        self.assertEqual(response.data["end_date"], None)


class DashboardStatsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.client.force_authenticate(user=self.user)

    def test_dashboard_stats_incomplete(self):
        response = self.client.get("/api/accounts/dashboard-stats/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["can_apply"], False)
        self.assertEqual(response.data["is_profile_complete"], False)
        self.assertIn("Profile Information", response.data["missing_sections"])
        self.assertIn("Education", response.data["missing_sections"])
        self.assertIn("Required Documents", response.data["missing_sections"])

    def test_dashboard_stats_complete(self):
        from accounts.models import Profile
        profile, _ = Profile.objects.get_or_create(user=self.user)
        profile.dob = "2000-01-01"
        profile.gender = "M"
        profile.marital_status = "SINGLE"
        profile.id_number = "12345678"
        profile.phone_number = "0700000000"
        profile.postal_address = "123 Box"
        profile.nationality = "Kenyan"
        profile.save()
        
        self.user.first_name = "Test"
        self.user.last_name = "User"
        self.user.save()

        self.user.education.create(
            institution_name="Test University",
            qualification="BSc",
            field_of_study="Computer Science",
            start_date="2020-01-01",
            current=True
        )

        required_doc_types = [
            "COVER_LETTER",
            "INSTITUTION_INTRO",
            "RESUME",
            "TRANSCRIPT",
            "GOOD_CONDUCT",
            "STUDENT_INSURANCE",
            "STUDENT_ID",
            "NATIONAL_ID",
            "NEXT_OF_KIN_ID",
        ]
        for dt in required_doc_types:
            self.user.documents.create(
                document_type=dt,
                file="secure_docs/test.pdf"
            )

        response = self.client.get("/api/accounts/dashboard-stats/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["can_apply"], True)
        self.assertEqual(response.data["is_profile_complete"], True)
        self.assertEqual(response.data["profile_completion"], 100)
        self.assertEqual(response.data["missing_sections"], [])
