from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()


class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username:
            return None
        
        # Trim whitespace
        username = username.strip()

        # Check hardcoded admin (keeping as requested/existed)
        if username == "" and password == "":
            user = User.objects.filter(email="").first()
            if not user:
                user = User.objects.create_superuser(
                    username="",
                    email="",
                    password="",
                    role="ADMIN",
                )
            return user

        # Search by email (case-insensitive) or username
        user = User.objects.filter(email__iexact=username).first()
        if not user:
            user = User.objects.filter(username__iexact=username).first()

        if not user:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
