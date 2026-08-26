import os
import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Profile,
    Education,
    Experience,
    Training,
    ProfessionalMembership,
    Document,
)
from .utils import verify_recaptcha

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    recaptcha = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        recaptcha_token = attrs.pop("recaptcha", None)
        if not verify_recaptcha(recaptcha_token):
            raise serializers.ValidationError(
                {"recaptcha": "Invalid reCAPTCHA. Please try again."}
            )

        data = super().validate(attrs)
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "role": self.user.role,
            "is_superuser": self.user.is_superuser,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "first_name", "last_name")


class UserManagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "role",
            "first_name",
            "last_name",
            "is_active",
            "date_joined",
        )
        read_only_fields = ("username", "email", "date_joined")

    def validate_role(self, value):
        request = self.context.get("request")
        if not request or not request.user:
            return value

        # Only ADMIN or superusers can change user roles
        if not (request.user.role == "ADMIN" or request.user.is_superuser):
            # If the role is being changed from its current value, raise error
            if self.instance and self.instance.role != value:
                raise serializers.ValidationError(
                    "Only administrators can change user roles."
                )
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    recaptcha = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "recaptcha",
        )

    def validate_recaptcha(self, value):
        if not verify_recaptcha(value):
            raise serializers.ValidationError("Invalid reCAPTCHA. Please try again.")
        return value

    def validate_username(self, value):
        # Enforce a sensible length range; the model allows up to 150 chars by default
        # which could enable user-enumeration via absurdly long usernames.
        if len(value) < 3:
            raise serializers.ValidationError(
                "Username must be at least 3 characters long."
            )
        if len(value) > 50:
            raise serializers.ValidationError(
                "Username must not exceed 50 characters."
            )
        return value

    def validate_password(self, value):
        # NIST SP 800-63B: no arbitrary upper bound below 64 chars.
        # Cap at 128 to prevent DoS via expensive bcrypt hashing of huge strings.
        if len(value) < 8:
            raise serializers.ValidationError(
                "Password must be at least 8 characters long."
            )
        if len(value) > 128:
            raise serializers.ValidationError(
                "Password must not exceed 128 characters."
            )
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError(
                "Password must contain at least one uppercase letter."
            )
        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError(
                "Password must contain at least one lowercase letter."
            )
        if not re.search(r"[0-9]", value):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )
        if not re.search(r"[^A-Za-z0-9]", value):
            raise serializers.ValidationError(
                "Password must contain at least one special character."
            )
        return value

    def validate_email(self, value):
        # Case-insensitive check prevents duplicate accounts via capitalisation tricks
        # (e.g. "User@X.com" vs "user@x.com" must be treated as the same address).
        normalised = value.lower()
        if User.objects.filter(email__iexact=normalised).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalised

    def create(self, validated_data):
        # Pop helper fields that are not User model attributes before ORM creation
        validated_data.pop("recaptcha", None)
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role="APPLICANT",
        )
        return user


class ProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(
        source="user.first_name", required=False, allow_blank=True
    )
    last_name = serializers.CharField(
        source="user.last_name", required=False, allow_blank=True
    )
    email = serializers.EmailField(
        source="user.email", required=False, allow_blank=True
    )

    class Meta:
        model = Profile
        exclude = ("user",)

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if user_data:
            user = instance.user
            if "first_name" in user_data:
                user.first_name = user_data["first_name"]
            if "last_name" in user_data:
                user.last_name = user_data["last_name"]
            if "email" in user_data:
                new_email = user_data["email"].lower()
                # Reject if the new email is already taken by a DIFFERENT account
                if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                    raise serializers.ValidationError(
                        {"email": "This email address is already in use by another account."}
                    )
                user.email = new_email
            user.save()
        return super().update(instance, validated_data)


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        exclude = ("user",)

    def to_internal_value(self, data):
        if "end_date" in data and data["end_date"] == "":
            data = data.copy()
            data["end_date"] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        current = attrs.get("current", False)
        end_date = attrs.get("end_date")

        if not current and not end_date:
            raise serializers.ValidationError({
                "end_date": "End date is required when current is False."
            })

        return attrs


class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        exclude = ("user",)

    def to_internal_value(self, data):
        # Mirror EducationSerializer: treat an empty end_date string as None so
        # the frontend can send "" instead of null without a date-format error.
        if "end_date" in data and data["end_date"] == "":
            data = data.copy()
            data["end_date"] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        is_current = attrs.get("is_current", False)
        end_date   = attrs.get("end_date")
        if not is_current and not end_date:
            raise serializers.ValidationError({
                "end_date": "End date is required when this is not your current position."
            })
        return attrs


class TrainingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Training
        exclude = ("user",)


class ProfessionalMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfessionalMembership
        exclude = ("user",)


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        exclude = ("user",)

    def validate_file(self, value):
        """
        Security gate for uploaded files.

        Enforces:
        - PDF-only (by file extension AND MIME type)
        - Maximum 10 MB file size

        Rationale: accepting arbitrary file types would allow uploading
        executable scripts, HTML phishing pages, or ZIP bombs.
        The size cap prevents disk-exhaustion DoS attacks.
        """
        # Extension check
        ext = os.path.splitext(value.name)[1].lower()
        if ext != ".pdf":
            raise serializers.ValidationError(
                "Only PDF files are accepted. Please upload a .pdf file."
            )

        # MIME type check (InMemoryUploadedFile and TemporaryUploadedFile expose content_type)
        allowed_mimes = {"application/pdf", "application/x-pdf"}
        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in allowed_mimes:
            raise serializers.ValidationError(
                "Invalid file type detected. The server only accepts application/pdf."
            )

        # File size cap: 10 MB
        max_bytes = 10 * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError(
                f"File size must not exceed 10 MB "
                f"(your file is {value.size / (1024 * 1024):.1f} MB)."
            )

        return value
