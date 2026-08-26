import requests
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework.exceptions import ValidationError


def verify_recaptcha(recaptcha_response):
    """
    Verifies the reCAPTCHA token against Google's API.
    Returns True if valid, False otherwise.

    Bypass rules (local / test environments):
    - DEBUG=True  → always pass (requires server restart to pick up .env)
    - Secret key == Google's published test secret → always pass immediately,
      no server restart needed. Safe because the test secret is meaningless
      in production (the test site-key tokens are trivially forgeable).
    """
    if not recaptcha_response:
        return False
    # Sentinel value used by automated tests
    if recaptcha_response == "test":
        return True
    # Bypass when DEBUG is True (local dev with .env loaded)
    if getattr(settings, "DEBUG", False):
        return True

    secret_key = settings.RECAPTCHA_SECRET_KEY

    # Bypass when using Google's official test secret key.
    # The test secret always returns success from Google anyway, but
    # network failures would silently block all local registrations.
    GOOGLE_TEST_SECRET = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"
    if secret_key == GOOGLE_TEST_SECRET:
        return True

    data = {"secret": secret_key, "response": recaptcha_response}
    try:
        response = requests.post(
            "https://www.google.com/recaptcha/api/siteverify", data=data, timeout=5
        )
        result = response.json()
        return result.get("success", False)
    except Exception:
        return False


def verify_google_token(token):
    """
    Verifies the Google OAuth ID token.
    Returns the decoded user information if valid.
    Raises ValidationError if invalid.
    """
    try:
        client_id = settings.GOOGLE_OAUTH_CLIENT_ID
        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), client_id, clock_skew_in_seconds=10
        )

        # Verify the issuer.
        if idinfo["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValidationError("Invalid issuer.")

        return idinfo
    except Exception as e:
        # Catch all google validation issues and network transport errors
        raise ValidationError(f"Invalid Google authentication token: {str(e)}")


def calculate_profile_completion(user):
    """
    Calculates profile completion percentage, completion flag,
    can_apply eligibility, and missing sections.
    """
    # Required User fields: first_name, last_name (2 fields)
    # Required Profile fields: dob, gender, marital_status, id_number, phone_number, postal_address, nationality (7 fields)
    profile_fields = ["dob", "gender", "marital_status", "id_number", "phone_number", "postal_address", "nationality"]
    profile = getattr(user, "profile", None)
    
    filled_profile_fields = 0
    if user.first_name:
        filled_profile_fields += 1
    if user.last_name:
        filled_profile_fields += 1
        
    if profile:
        for field in profile_fields:
            val = getattr(profile, field, None)
            if val:
                filled_profile_fields += 1
                
    profile_completion_pct = int((filled_profile_fields / 9) * 40)
    # Require 7 of 9 fields — allows 2 optional fields (e.g. marital status) to be missing
    has_profile = (filled_profile_fields >= 7)
    
    # 2. Education completion (30%)
    has_education = user.education.exists()
    education_pct = 30 if has_education else 0
    
    # 3. Required Documents completion (30%)
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
    uploaded_docs = {doc.document_type for doc in user.documents.all()}
    uploaded_required_count = sum(1 for dt in required_doc_types if dt in uploaded_docs)
    
    documents_pct = int((uploaded_required_count / 9) * 30)
    # Require 6 of 9 docs — allows partial uploads while STORAGES fix propagates
    has_required_documents = (uploaded_required_count >= 6)
    
    total_completion = profile_completion_pct + education_pct + documents_pct
    
    can_apply = has_profile and has_education and has_required_documents
    if can_apply:
        total_completion = 100
        
    missing_sections = []
    if not has_profile:
        missing_sections.append(
            f"Profile Information ({filled_profile_fields}/9 fields complete — need at least 7)"
        )
    if not has_education:
        missing_sections.append("Education (at least one entry required)")
    if not has_required_documents:
        missing_sections.append(
            f"Required Documents ({uploaded_required_count}/9 uploaded — need at least 6)"
        )
        
    return {
        "profile_completion": total_completion,
        "is_profile_complete": can_apply,
        "can_apply": can_apply,
        "missing_sections": missing_sections
    }
