# Backend Models Module
# Pydantic models for request/response validation

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ==================== ENUMS ====================

class UserType(str, Enum):
    DJ = "dj"
    ORGANIZER = "organizer"
    ADMIN = "admin"

class BookingStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    PAID = "paid"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class WithdrawalMethod(str, Enum):
    IBAN = "iban"
    PAYPAL = "paypal"

class WithdrawalStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REJECTED = "rejected"

# ==================== USER MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    user_type: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    password: str

# ==================== DJ MODELS ====================

class DJProfileCreate(BaseModel):
    stage_name: str
    bio: Optional[str] = None
    music_styles: List[str] = []
    experience_years: int = 0
    hourly_rate: float = 0
    equipment: List[str] = []
    city: Optional[str] = None
    social_links: Dict[str, str] = {}

class DJProfileUpdate(BaseModel):
    stage_name: Optional[str] = None
    bio: Optional[str] = None
    music_styles: Optional[List[str]] = None
    experience_years: Optional[int] = None
    hourly_rate: Optional[float] = None
    equipment: Optional[List[str]] = None
    city: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    available: Optional[bool] = None

class PayoutDetailsUpdate(BaseModel):
    iban: Optional[str] = None
    bic: Optional[str] = None
    bank_name: Optional[str] = None
    paypal_email: Optional[EmailStr] = None

# ==================== EVENT MODELS ====================

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str
    date: datetime
    start_time: str
    end_time: str
    venue: str
    city: str
    address: Optional[str] = None
    expected_guests: Optional[int] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    music_preferences: List[str] = []
    requirements: Optional[str] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    venue: Optional[str] = None
    status: Optional[str] = None

# ==================== BOOKING MODELS ====================

class BookingCreate(BaseModel):
    dj_id: str
    event_id: str
    price: float
    message: Optional[str] = None

class BookingUpdate(BaseModel):
    status: Optional[str] = None

# ==================== MESSAGE MODELS ====================

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

# ==================== PAYMENT MODELS ====================

class WithdrawalRequest(BaseModel):
    amount: float = Field(..., gt=0)
    method: str = Field(..., pattern="^(iban|paypal)$")
    iban: Optional[str] = None
    paypal_email: Optional[EmailStr] = None

# ==================== REVIEW MODELS ====================

class ReviewCreate(BaseModel):
    dj_id: str
    booking_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

# ==================== RESPONSE MODELS ====================

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MessageResponse(BaseModel):
    message: str

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    user_type: str
    created_at: datetime

class DJProfileResponse(BaseModel):
    id: str
    user_id: str
    stage_name: str
    bio: Optional[str]
    music_styles: List[str]
    rating: float
    review_count: int
    hourly_rate: float
    city: Optional[str]
    available: bool
