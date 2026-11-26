from typing import Optional
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6, max_length=128)
    profession: str = "Farmer"
    language: str = "English"
    specialization: Optional[str] = ""
    profile_details: Optional[dict] = None
    location_details: Optional[dict] = None
    interaction_preference: Optional[str] = "both"
    notifications_enabled: Optional[bool] = True
    interests: Optional[list[str]] = None
    onboarding_completed: Optional[bool] = False


class OnboardingUpdate(BaseModel):
    name: Optional[str] = None
    profession: str = Field(..., min_length=2, max_length=80)
    specialization: Optional[str] = ""
    profile_details: Optional[dict] = None
    location: Optional[dict] = None
    preferredLanguage: Optional[str] = "English"
    interactionPreference: Optional[str] = "both"
    notificationsEnabled: Optional[bool] = True
    interests: Optional[list[str]] = None
    onboardingCompleted: bool = True


class LoginRequest(BaseModel):
    email: str
    password: str
    totp_code: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None


class TotpVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=8)
    temp_token: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(default="", max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., min_length=6, max_length=128)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    language: str = "English"
    profession: str = "Farmer"
    doc_id: Optional[str] = None
    conversation_id: Optional[str] = None


class ConversationCreate(BaseModel):
    title: str = "General Chat"
    profession: str = "Farmer"
    language: str = "English"


class ConversationMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    language: str = "English"
    profession: str = "Farmer"
    doc_id: Optional[str] = None


class ConversationRename(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    archived: Optional[bool] = None


class VoiceRequest(BaseModel):
    transcript: str = Field(..., min_length=1, max_length=2000)
    language: str = "English"
    profession: str = "Farmer"


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    target_language: str = Field(default="Telugu", max_length=40)
    profession: str = Field(default="General Citizen", max_length=60)


class EligibilityRequest(BaseModel):
    profession: str
    annual_income: int = Field(..., ge=0)
    state: str = "Andhra Pradesh"
    category: str = "General"
    owns_land: bool = False
    has_aadhaar: bool = True


class SavedAnswerRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    category: str = "General"
    source: str = "Sahayak AI"


class ReminderCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    detail: str = "Personal reminder"
    due_date: Optional[str] = None


class SupportRequestCreate(BaseModel):
    subject: str = Field(..., min_length=2, max_length=200)
    category: str
    description: str = Field(..., min_length=5, max_length=3000)
    priority: str = "Normal"


class FeedbackCreate(BaseModel):
    type: str = "Feedback"
    subject: str = Field(..., min_length=2, max_length=200)
    details: str = Field(..., min_length=3, max_length=3000)
    page: str = "General"


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    profession: Optional[str] = None
    language: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None


class PreferencesUpdate(BaseModel):
    profession: Optional[str] = None
    language: Optional[str] = None
    fontSize: Optional[str] = None
    highContrast: Optional[bool] = None
    voiceAutoRead: Optional[bool] = None


class AdminKnowledgeCreate(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=2, max_length=200)
    source: str = Field(..., min_length=2, max_length=200)
    source_url: str = ""
    professions: list[str] = ["General Citizen"]
    category: str = "knowledge"
    text: str = Field(..., min_length=10)
