from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
import base64
from bson import ObjectId

ROOT_DIR = Path(__file__).parent

# Helper function to serialize MongoDB documents
def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                continue  # Skip MongoDB _id field
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_doc(v) if isinstance(v, (dict, list)) else v for v in value]
            else:
                result[key] = value
        return result
    return doc
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'dj_booking')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'dj-booking-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

# Commission Configuration
COMMISSION_RATE = 0.15  # 15% total commission
DJ_COMMISSION_RATE = 0.075  # 7.5% from DJ
ORGANIZER_COMMISSION_RATE = 0.075  # 7.5% from Organizer

# Admin Configuration
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@djbooking.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Create the main app
app = FastAPI(title="DJ Booking API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Music Styles and Event Types
MUSIC_STYLES = [
    "House", "Techno", "Hip-Hop", "RnB", "Pop", "Electro", "Afro", "Latino",
    "Années 80/90", "Commercial", "Deep House", "Tropical", "Reggaeton",
    "Funk", "Soul", "Jazz", "Rock", "Drum & Bass", "Disco", "EDM"
]

EVENT_TYPES = [
    "Mariage", "Anniversaire", "Soirée privée", "Événement corporate",
    "Club/Bar", "Festival", "Gala", "Afterwork", "Inauguration",
    "Garden party", "Séminaire", "Bal de promo", "Soirée étudiante"
]

# User Models
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    user_type: str  # "dj" or "organizer"
    phone: Optional[str] = None
    profile_image: Optional[str] = None  # base64

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

# DJ Profile Models
class SocialMedia(BaseModel):
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    soundcloud: Optional[str] = None
    mixcloud: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    spotify: Optional[str] = None

class PortfolioItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "video", "audio", "image"
    url: Optional[str] = None
    base64_data: Optional[str] = None
    title: str
    description: Optional[str] = None

class DJProfileCreate(BaseModel):
    artist_name: str
    bio: str
    music_styles: List[str]
    event_types: List[str]
    equipment: Optional[str] = None
    hourly_rate: float
    minimum_hours: int = 2
    travel_radius_km: int = 50
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    experience_years: int
    social_media: Optional[SocialMedia] = None
    portfolio: Optional[List[PortfolioItem]] = []

class DJProfile(DJProfileCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    rating: float = 0.0
    review_count: int = 0
    booking_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = False

# Availability Models
class AvailabilitySlot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dj_id: str
    date: str  # YYYY-MM-DD format
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    is_available: bool = True

class AvailabilityCreate(BaseModel):
    date: str
    start_time: str
    end_time: str
    is_available: bool = True

# Event Models
class EventCreate(BaseModel):
    title: str
    description: str
    event_type: str
    date: str
    start_time: str
    end_time: str
    location: str
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    budget_min: float
    budget_max: float
    music_styles: List[str]
    guest_count: int
    special_requirements: Optional[str] = None

class Event(EventCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organizer_id: str
    status: str = "open"  # open, booked, completed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Booking Models
class BookingCreate(BaseModel):
    dj_id: str
    event_id: str
    proposed_rate: float
    message: Optional[str] = None

class Booking(BookingCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organizer_id: str
    status: str = "pending"  # pending, accepted, rejected, paid, completed, cancelled
    payment_status: str = "unpaid"  # unpaid, paid, refunded
    payment_method: Optional[str] = None  # stripe, paypal, simulated
    total_amount: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BookingStatusUpdate(BaseModel):
    status: str
    message: Optional[str] = None

# Payment Models
class PaymentCreate(BaseModel):
    booking_id: str
    payment_method: str  # "stripe", "paypal", "simulated"
    amount: float

class Payment(PaymentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, completed, failed, refunded
    transaction_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Message Models
class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    booking_id: Optional[str] = None

class Message(MessageCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Review Models
class ReviewCreate(BaseModel):
    dj_id: str
    booking_id: str
    rating: int  # 1-5
    comment: str

class Review(ReviewCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organizer_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Commission Models
class Commission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    payment_id: str
    dj_id: str
    organizer_id: str
    booking_amount: float
    dj_commission: float  # Amount taken from DJ
    organizer_commission: float  # Amount taken from Organizer
    total_commission: float
    dj_payout: float  # What DJ receives after commission
    status: str = "pending"  # pending, credited, withdrawn
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Admin Wallet Model
class AdminWallet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    balance: float = 0.0
    total_earned: float = 0.0
    total_withdrawn: float = 0.0
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Withdrawal Request Model
class WithdrawalRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    status: str = "pending"  # pending, processing, completed, rejected
    bank_details: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None

# Admin Login Model
class AdminLogin(BaseModel):
    email: EmailStr
    password: str

# ==================== AUTHENTICATION ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    user_dict["is_active"] = True
    
    await db.users.insert_one(user_dict)
    
    # Remove password from response
    user_response = serialize_doc({k: v for k, v in user_dict.items() if k != "password"})
    
    token = create_token(user_dict["id"])
    return {"access_token": token, "token_type": "bearer", "user": user_response}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_response = serialize_doc({k: v for k, v in user.items() if k != "password"})
    token = create_token(user["id"])
    return {"access_token": token, "token_type": "bearer", "user": user_response}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_response = serialize_doc({k: v for k, v in current_user.items() if k != "password"})
    # If user is DJ, get their profile
    if current_user.get("user_type") == "dj":
        dj_profile = await db.dj_profiles.find_one({"user_id": current_user["id"]})
        if dj_profile:
            user_response["dj_profile"] = serialize_doc(dj_profile)
    return user_response

@api_router.put("/auth/profile")
async def update_profile(
    updates: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    allowed_fields = ["first_name", "last_name", "phone", "profile_image"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"id": current_user["id"]})
    return serialize_doc({k: v for k, v in updated_user.items() if k != "password"})

# ==================== DJ PROFILE ROUTES ====================

@api_router.post("/dj/profile")
async def create_dj_profile(
    profile_data: DJProfileCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("user_type") != "dj":
        raise HTTPException(status_code=403, detail="Only DJs can create DJ profiles")
    
    # Check if profile already exists
    existing = await db.dj_profiles.find_one({"user_id": current_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="DJ profile already exists")
    
    profile_dict = profile_data.model_dump()
    profile_dict["id"] = str(uuid.uuid4())
    profile_dict["user_id"] = current_user["id"]
    profile_dict["created_at"] = datetime.utcnow()
    profile_dict["updated_at"] = datetime.utcnow()
    profile_dict["rating"] = 0.0
    profile_dict["review_count"] = 0
    profile_dict["booking_count"] = 0
    profile_dict["is_verified"] = False
    
    await db.dj_profiles.insert_one(profile_dict)
    return serialize_doc(profile_dict)

@api_router.get("/dj/profile/me")
async def get_my_dj_profile(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") != "dj":
        raise HTTPException(status_code=403, detail="Only DJs can access this endpoint")
    
    profile = await db.dj_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="DJ profile not found")
    return serialize_doc(profile)

@api_router.put("/dj/profile")
async def update_dj_profile(
    updates: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("user_type") != "dj":
        raise HTTPException(status_code=403, detail="Only DJs can update DJ profiles")
    
    updates["updated_at"] = datetime.utcnow()
    
    await db.dj_profiles.update_one(
        {"user_id": current_user["id"]},
        {"$set": updates}
    )
    
    profile = await db.dj_profiles.find_one({"user_id": current_user["id"]})
    return serialize_doc(profile)

@api_router.get("/dj/profiles")
async def search_dj_profiles(
    city: Optional[str] = None,
    music_style: Optional[str] = None,
    event_type: Optional[str] = None,
    min_rate: Optional[float] = None,
    max_rate: Optional[float] = None,
    min_rating: Optional[float] = None,
    date: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if music_style:
        query["music_styles"] = {"$in": [music_style]}
    if event_type:
        query["event_types"] = {"$in": [event_type]}
    if min_rate is not None:
        query["hourly_rate"] = {"$gte": min_rate}
    if max_rate is not None:
        if "hourly_rate" in query:
            query["hourly_rate"]["$lte"] = max_rate
        else:
            query["hourly_rate"] = {"$lte": max_rate}
    if min_rating is not None:
        query["rating"] = {"$gte": min_rating}
    
    profiles = await db.dj_profiles.find(query).skip(skip).limit(limit).to_list(limit)
    
    # Add user info to each profile
    result = []
    for profile in profiles:
        profile_data = serialize_doc(profile)
        user = await db.users.find_one({"id": profile["user_id"]})
        if user:
            profile_data["user"] = {
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "profile_image": user.get("profile_image")
            }
        result.append(profile_data)
    
    return result

@api_router.get("/dj/profiles/{dj_id}")
async def get_dj_profile(dj_id: str):
    profile = await db.dj_profiles.find_one({"id": dj_id})
    if not profile:
        raise HTTPException(status_code=404, detail="DJ profile not found")
    
    profile_data = serialize_doc(profile)
    user = await db.users.find_one({"id": profile["user_id"]})
    if user:
        profile_data["user"] = {
            "first_name": user.get("first_name"),
            "last_name": user.get("last_name"),
            "profile_image": user.get("profile_image"),
            "email": user.get("email")
        }
    
    # Get reviews
    reviews = await db.reviews.find({"dj_id": dj_id}).sort("created_at", -1).limit(10).to_list(10)
    profile_data["recent_reviews"] = serialize_doc(reviews)
    
    return profile_data

# ==================== AVAILABILITY ROUTES ====================

@api_router.post("/dj/availability")
async def set_availability(
    slots: List[AvailabilityCreate],
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("user_type") != "dj":
        raise HTTPException(status_code=403, detail="Only DJs can set availability")
    
    dj_profile = await db.dj_profiles.find_one({"user_id": current_user["id"]})
    if not dj_profile:
        raise HTTPException(status_code=404, detail="DJ profile not found")
    
    created_slots = []
    for slot_data in slots:
        slot_dict = slot_data.model_dump()
        slot_dict["id"] = str(uuid.uuid4())
        slot_dict["dj_id"] = dj_profile["id"]
        
        # Check for existing slot on same date
        existing = await db.availability.find_one({
            "dj_id": dj_profile["id"],
            "date": slot_data.date
        })
        
        if existing:
            await db.availability.update_one(
                {"id": existing["id"]},
                {"$set": slot_dict}
            )
            slot_dict["id"] = existing["id"]
        else:
            await db.availability.insert_one(slot_dict)
        
        created_slots.append(serialize_doc(slot_dict))
    
    return created_slots

@api_router.get("/dj/availability/{dj_id}")
async def get_dj_availability(dj_id: str, month: Optional[str] = None):
    query = {"dj_id": dj_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    slots = await db.availability.find(query).to_list(100)
    return serialize_doc(slots)

@api_router.delete("/dj/availability/{slot_id}")
async def delete_availability(slot_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") != "dj":
        raise HTTPException(status_code=403, detail="Only DJs can delete availability")
    
    dj_profile = await db.dj_profiles.find_one({"user_id": current_user["id"]})
    if not dj_profile:
        raise HTTPException(status_code=404, detail="DJ profile not found")
    
    result = await db.availability.delete_one({"id": slot_id, "dj_id": dj_profile["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Availability slot not found")
    
    return {"message": "Availability deleted"}

# ==================== EVENT ROUTES ====================

@api_router.post("/events")
async def create_event(
    event_data: EventCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("user_type") != "organizer":
        raise HTTPException(status_code=403, detail="Only organizers can create events")
    
    event_dict = event_data.model_dump()
    event_dict["id"] = str(uuid.uuid4())
    event_dict["organizer_id"] = current_user["id"]
    event_dict["status"] = "open"
    event_dict["created_at"] = datetime.utcnow()
    
    await db.events.insert_one(event_dict)
    return serialize_doc(event_dict)

@api_router.get("/events")
async def get_events(
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    if status:
        query["status"] = status
    if event_type:
        query["event_type"] = event_type
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    events = await db.events.find(query).sort("date", 1).skip(skip).limit(limit).to_list(limit)
    return events

@api_router.get("/events/my")
async def get_my_events(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") != "organizer":
        raise HTTPException(status_code=403, detail="Only organizers can access this endpoint")
    
    events = await db.events.find({"organizer_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    return events

@api_router.get("/events/{event_id}")
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    organizer = await db.users.find_one({"id": event["organizer_id"]})
    if organizer:
        event["organizer"] = {
            "first_name": organizer.get("first_name"),
            "last_name": organizer.get("last_name")
        }
    
    return event

@api_router.put("/events/{event_id}")
async def update_event(
    event_id: str,
    updates: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event["organizer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this event")
    
    await db.events.update_one({"id": event_id}, {"$set": updates})
    return await db.events.find_one({"id": event_id})

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event["organizer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")
    
    await db.events.delete_one({"id": event_id})
    return {"message": "Event deleted"}

# ==================== BOOKING ROUTES ====================

@api_router.post("/bookings")
async def create_booking(
    booking_data: BookingCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("user_type") != "organizer":
        raise HTTPException(status_code=403, detail="Only organizers can create bookings")
    
    # Verify DJ exists
    dj_profile = await db.dj_profiles.find_one({"id": booking_data.dj_id})
    if not dj_profile:
        raise HTTPException(status_code=404, detail="DJ not found")
    
    # Verify event exists and belongs to organizer
    event = await db.events.find_one({"id": booking_data.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event["organizer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Event does not belong to you")
    
    booking_dict = booking_data.model_dump()
    booking_dict["id"] = str(uuid.uuid4())
    booking_dict["organizer_id"] = current_user["id"]
    booking_dict["status"] = "pending"
    booking_dict["payment_status"] = "unpaid"
    booking_dict["total_amount"] = booking_data.proposed_rate
    booking_dict["created_at"] = datetime.utcnow()
    booking_dict["updated_at"] = datetime.utcnow()
    
    await db.bookings.insert_one(booking_dict)
    return booking_dict

@api_router.get("/bookings/my")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") == "dj":
        dj_profile = await db.dj_profiles.find_one({"user_id": current_user["id"]})
        if not dj_profile:
            return []
        bookings = await db.bookings.find({"dj_id": dj_profile["id"]}).sort("created_at", -1).to_list(100)
    else:
        bookings = await db.bookings.find({"organizer_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    
    # Enrich bookings with event and DJ info
    for booking in bookings:
        event = await db.events.find_one({"id": booking["event_id"]})
        if event:
            booking["event"] = event
        
        dj = await db.dj_profiles.find_one({"id": booking["dj_id"]})
        if dj:
            dj_user = await db.users.find_one({"id": dj["user_id"]})
            booking["dj"] = {
                "id": dj["id"],
                "artist_name": dj["artist_name"],
                "user": {
                    "first_name": dj_user.get("first_name") if dj_user else None,
                    "last_name": dj_user.get("last_name") if dj_user else None,
                    "profile_image": dj_user.get("profile_image") if dj_user else None
                }
            }
        
        organizer = await db.users.find_one({"id": booking["organizer_id"]})
        if organizer:
            booking["organizer"] = {
                "first_name": organizer.get("first_name"),
                "last_name": organizer.get("last_name")
            }
    
    return bookings

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization
    dj_profile = await db.dj_profiles.find_one({"user_id": current_user["id"]})
    is_dj = dj_profile and booking["dj_id"] == dj_profile["id"]
    is_organizer = booking["organizer_id"] == current_user["id"]
    
    if not is_dj and not is_organizer:
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
    
    # Enrich with details
    event = await db.events.find_one({"id": booking["event_id"]})
    if event:
        booking["event"] = event
    
    dj = await db.dj_profiles.find_one({"id": booking["dj_id"]})
    if dj:
        dj_user = await db.users.find_one({"id": dj["user_id"]})
        booking["dj"] = {
            "id": dj["id"],
            "artist_name": dj["artist_name"],
            "user": {
                "first_name": dj_user.get("first_name") if dj_user else None,
                "last_name": dj_user.get("last_name") if dj_user else None,
                "profile_image": dj_user.get("profile_image") if dj_user else None
            }
        }
    
    return booking

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status_update: BookingStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Authorization check
    dj_profile = await db.dj_profiles.find_one({"user_id": current_user["id"]})
    is_dj = dj_profile and booking["dj_id"] == dj_profile["id"]
    is_organizer = booking["organizer_id"] == current_user["id"]
    
    # DJs can accept/reject, organizers can cancel
    valid_dj_statuses = ["accepted", "rejected"]
    valid_organizer_statuses = ["cancelled"]
    
    if is_dj and status_update.status in valid_dj_statuses:
        pass
    elif is_organizer and status_update.status in valid_organizer_statuses:
        pass
    else:
        raise HTTPException(status_code=403, detail="Not authorized to change status")
    
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.utcnow()
    }
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    # Update event status if booking is accepted
    if status_update.status == "accepted":
        await db.events.update_one(
            {"id": booking["event_id"]},
            {"$set": {"status": "booked"}}
        )
        # Increment DJ booking count
        await db.dj_profiles.update_one(
            {"id": booking["dj_id"]},
            {"$inc": {"booking_count": 1}}
        )
    
    return await db.bookings.find_one({"id": booking_id})

# ==================== PAYMENT ROUTES (SIMULATED) ====================

@api_router.post("/payments")
async def process_payment(
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    booking = await db.bookings.find_one({"id": payment_data.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["organizer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this booking")
    
    if booking["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Booking must be accepted before payment")
    
    # Calculate commissions
    booking_amount = payment_data.amount
    dj_commission = round(booking_amount * DJ_COMMISSION_RATE, 2)
    organizer_commission = round(booking_amount * ORGANIZER_COMMISSION_RATE, 2)
    total_commission = dj_commission + organizer_commission
    dj_payout = booking_amount - dj_commission
    total_with_organizer_fee = booking_amount + organizer_commission
    
    # Simulate payment processing
    payment_dict = payment_data.model_dump()
    payment_dict["id"] = str(uuid.uuid4())
    payment_dict["status"] = "completed"  # Simulated success
    payment_dict["transaction_id"] = f"SIM_{str(uuid.uuid4())[:8].upper()}"
    payment_dict["created_at"] = datetime.utcnow()
    payment_dict["dj_commission"] = dj_commission
    payment_dict["organizer_commission"] = organizer_commission
    payment_dict["total_commission"] = total_commission
    payment_dict["dj_payout"] = dj_payout
    payment_dict["total_charged"] = total_with_organizer_fee
    
    await db.payments.insert_one(payment_dict)
    
    # Create commission record
    commission_dict = {
        "id": str(uuid.uuid4()),
        "booking_id": payment_data.booking_id,
        "payment_id": payment_dict["id"],
        "dj_id": booking["dj_id"],
        "organizer_id": booking["organizer_id"],
        "booking_amount": booking_amount,
        "dj_commission": dj_commission,
        "organizer_commission": organizer_commission,
        "total_commission": total_commission,
        "dj_payout": dj_payout,
        "status": "credited",
        "created_at": datetime.utcnow()
    }
    await db.commissions.insert_one(commission_dict)
    
    # Update admin wallet
    admin_wallet = await db.admin_wallet.find_one({})
    if admin_wallet:
        await db.admin_wallet.update_one(
            {"id": admin_wallet["id"]},
            {
                "$inc": {"balance": total_commission, "total_earned": total_commission},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    else:
        # Create admin wallet if doesn't exist
        await db.admin_wallet.insert_one({
            "id": str(uuid.uuid4()),
            "balance": total_commission,
            "total_earned": total_commission,
            "total_withdrawn": 0.0,
            "updated_at": datetime.utcnow()
        })
    
    # Update booking payment status
    await db.bookings.update_one(
        {"id": payment_data.booking_id},
        {"$set": {
            "payment_status": "paid",
            "payment_method": payment_data.payment_method,
            "status": "paid",
            "updated_at": datetime.utcnow(),
            "dj_payout": dj_payout,
            "commission_amount": total_commission
        }}
    )
    
    return serialize_doc({
        "payment": payment_dict,
        "commission": {
            "dj_commission": dj_commission,
            "organizer_commission": organizer_commission,
            "total_commission": total_commission,
            "dj_payout": dj_payout,
            "total_charged": total_with_organizer_fee
        },
        "message": "Payment processed successfully (SIMULATED)"
    })

# ==================== MESSAGE ROUTES ====================

@api_router.post("/messages")
async def send_message(
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    # Verify receiver exists
    receiver = await db.users.find_one({"id": message_data.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    message_dict = message_data.model_dump()
    message_dict["id"] = str(uuid.uuid4())
    message_dict["sender_id"] = current_user["id"]
    message_dict["is_read"] = False
    message_dict["created_at"] = datetime.utcnow()
    
    await db.messages.insert_one(message_dict)
    return message_dict

@api_router.get("/messages/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    # Get all unique conversations
    sent = await db.messages.find({"sender_id": current_user["id"]}).to_list(1000)
    received = await db.messages.find({"receiver_id": current_user["id"]}).to_list(1000)
    
    # Get unique conversation partners
    partner_ids = set()
    for msg in sent:
        partner_ids.add(msg["receiver_id"])
    for msg in received:
        partner_ids.add(msg["sender_id"])
    
    conversations = []
    for partner_id in partner_ids:
        partner = await db.users.find_one({"id": partner_id})
        if not partner:
            continue
        
        # Get last message
        last_message = await db.messages.find_one(
            {"$or": [
                {"sender_id": current_user["id"], "receiver_id": partner_id},
                {"sender_id": partner_id, "receiver_id": current_user["id"]}
            ]},
            sort=[("created_at", -1)]
        )
        
        # Count unread
        unread_count = await db.messages.count_documents({
            "sender_id": partner_id,
            "receiver_id": current_user["id"],
            "is_read": False
        })
        
        conversations.append({
            "partner_id": partner_id,
            "partner_name": f"{partner.get('first_name', '')} {partner.get('last_name', '')}",
            "partner_image": partner.get("profile_image"),
            "last_message": last_message,
            "unread_count": unread_count
        })
    
    # Sort by last message time
    conversations.sort(key=lambda x: x["last_message"]["created_at"] if x["last_message"] else datetime.min, reverse=True)
    return conversations

@api_router.get("/messages/{partner_id}")
async def get_messages(partner_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user["id"], "receiver_id": partner_id},
            {"sender_id": partner_id, "receiver_id": current_user["id"]}
        ]
    }).sort("created_at", 1).to_list(500)
    
    # Mark as read
    await db.messages.update_many(
        {"sender_id": partner_id, "receiver_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return messages

# ==================== REVIEW ROUTES ====================

@api_router.post("/reviews")
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("user_type") != "organizer":
        raise HTTPException(status_code=403, detail="Only organizers can leave reviews")
    
    # Verify booking exists and is completed/paid
    booking = await db.bookings.find_one({"id": review_data.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["organizer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your booking")
    
    if booking["status"] not in ["paid", "completed"]:
        raise HTTPException(status_code=400, detail="Can only review paid/completed bookings")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({"booking_id": review_data.booking_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed this booking")
    
    review_dict = review_data.model_dump()
    review_dict["id"] = str(uuid.uuid4())
    review_dict["organizer_id"] = current_user["id"]
    review_dict["created_at"] = datetime.utcnow()
    
    await db.reviews.insert_one(review_dict)
    
    # Update DJ rating
    dj_reviews = await db.reviews.find({"dj_id": review_data.dj_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in dj_reviews) / len(dj_reviews)
    
    await db.dj_profiles.update_one(
        {"id": review_data.dj_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(dj_reviews)}}
    )
    
    return review_dict

@api_router.get("/reviews/{dj_id}")
async def get_dj_reviews(dj_id: str, limit: int = 20, skip: int = 0):
    reviews = await db.reviews.find({"dj_id": dj_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Add organizer info
    for review in reviews:
        organizer = await db.users.find_one({"id": review["organizer_id"]})
        if organizer:
            review["organizer"] = {
                "first_name": organizer.get("first_name"),
                "last_name": organizer.get("last_name")
            }
    
    return reviews

# ==================== MATCHING ROUTES ====================

@api_router.get("/match/djs-for-event/{event_id}")
async def match_djs_for_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Find matching DJs based on criteria
    query = {
        "city": {"$regex": event["city"], "$options": "i"},
        "event_types": {"$in": [event["event_type"]]},
        "music_styles": {"$in": event["music_styles"]},
        "hourly_rate": {"$lte": event["budget_max"]}
    }
    
    djs = await db.dj_profiles.find(query).sort("rating", -1).limit(20).to_list(20)
    
    # Add user info and calculate match score
    for dj in djs:
        user = await db.users.find_one({"id": dj["user_id"]})
        if user:
            dj["user"] = {
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "profile_image": user.get("profile_image")
            }
        
        # Calculate match score
        score = 0
        style_matches = len(set(dj["music_styles"]) & set(event["music_styles"]))
        score += style_matches * 10
        if event["event_type"] in dj["event_types"]:
            score += 20
        if dj["hourly_rate"] <= event["budget_max"]:
            score += 15
        score += dj.get("rating", 0) * 5
        dj["match_score"] = score
    
    # Sort by match score
    djs.sort(key=lambda x: x["match_score"], reverse=True)
    
    return djs

# ==================== CONFIG ROUTES ====================

@api_router.get("/config/music-styles")
async def get_music_styles():
    return MUSIC_STYLES

@api_router.get("/config/event-types")
async def get_event_types():
    return EVENT_TYPES

@api_router.get("/")
async def root():
    return {"message": "DJ Booking API", "version": "1.0"}

# ==================== ADMIN ROUTES ====================

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    if credentials.email != ADMIN_EMAIL or credentials.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    token = create_token(f"admin_{ADMIN_EMAIL}")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "email": ADMIN_EMAIL,
            "is_admin": True
        }
    }

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id or not user_id.startswith("admin_"):
            raise HTTPException(status_code=401, detail="Admin access required")
        return {"email": user_id.replace("admin_", ""), "is_admin": True}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(admin: dict = Depends(get_admin_user)):
    # Get admin wallet
    wallet = await db.admin_wallet.find_one({})
    if not wallet:
        wallet = {
            "balance": 0.0,
            "total_earned": 0.0,
            "total_withdrawn": 0.0
        }
    
    # Get statistics
    total_users = await db.users.count_documents({})
    total_djs = await db.users.count_documents({"user_type": "dj"})
    total_organizers = await db.users.count_documents({"user_type": "organizer"})
    total_bookings = await db.bookings.count_documents({})
    total_paid_bookings = await db.bookings.count_documents({"status": "paid"})
    total_events = await db.events.count_documents({})
    
    # Get recent commissions
    recent_commissions = await db.commissions.find({}).sort("created_at", -1).limit(20).to_list(20)
    
    # Calculate total revenue
    total_revenue = sum(c.get("total_commission", 0) for c in recent_commissions)
    
    return serialize_doc({
        "wallet": {
            "balance": wallet.get("balance", 0),
            "total_earned": wallet.get("total_earned", 0),
            "total_withdrawn": wallet.get("total_withdrawn", 0)
        },
        "statistics": {
            "total_users": total_users,
            "total_djs": total_djs,
            "total_organizers": total_organizers,
            "total_bookings": total_bookings,
            "total_paid_bookings": total_paid_bookings,
            "total_events": total_events,
            "commission_rate": f"{COMMISSION_RATE * 100}%"
        },
        "recent_commissions": recent_commissions
    })

@api_router.get("/admin/commissions")
async def get_all_commissions(
    admin: dict = Depends(get_admin_user),
    limit: int = 50,
    skip: int = 0,
    status: Optional[str] = None
):
    query = {}
    if status:
        query["status"] = status
    
    commissions = await db.commissions.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with booking and user info
    for commission in commissions:
        booking = await db.bookings.find_one({"id": commission["booking_id"]})
        if booking:
            event = await db.events.find_one({"id": booking.get("event_id")})
            commission["event_title"] = event.get("title") if event else "N/A"
        
        dj_profile = await db.dj_profiles.find_one({"id": commission["dj_id"]})
        commission["dj_name"] = dj_profile.get("artist_name") if dj_profile else "N/A"
        
        organizer = await db.users.find_one({"id": commission["organizer_id"]})
        if organizer:
            commission["organizer_name"] = f"{organizer.get('first_name', '')} {organizer.get('last_name', '')}"
    
    total = await db.commissions.count_documents(query)
    
    return serialize_doc({
        "commissions": commissions,
        "total": total,
        "limit": limit,
        "skip": skip
    })

@api_router.get("/admin/users")
async def get_all_users(
    admin: dict = Depends(get_admin_user),
    user_type: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    if user_type:
        query["user_type"] = user_type
    
    users = await db.users.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Remove passwords and add DJ profiles if applicable
    result = []
    for user in users:
        user_data = serialize_doc({k: v for k, v in user.items() if k != "password"})
        if user.get("user_type") == "dj":
            dj_profile = await db.dj_profiles.find_one({"user_id": user["id"]})
            if dj_profile:
                user_data["dj_profile"] = serialize_doc(dj_profile)
        result.append(user_data)
    
    total = await db.users.count_documents(query)
    
    return {
        "users": result,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.get("/admin/bookings")
async def get_all_bookings(
    admin: dict = Depends(get_admin_user),
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    if status:
        query["status"] = status
    
    bookings = await db.bookings.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich bookings
    for booking in bookings:
        event = await db.events.find_one({"id": booking.get("event_id")})
        if event:
            booking["event"] = serialize_doc(event)
        
        dj = await db.dj_profiles.find_one({"id": booking.get("dj_id")})
        if dj:
            booking["dj"] = {"artist_name": dj.get("artist_name")}
        
        organizer = await db.users.find_one({"id": booking.get("organizer_id")})
        if organizer:
            booking["organizer_name"] = f"{organizer.get('first_name', '')} {organizer.get('last_name', '')}"
    
    total = await db.bookings.count_documents(query)
    
    return serialize_doc({
        "bookings": bookings,
        "total": total,
        "limit": limit,
        "skip": skip
    })

@api_router.post("/admin/withdrawal")
async def request_withdrawal(
    amount: float,
    bank_details: Dict[str, Any],
    admin: dict = Depends(get_admin_user)
):
    # Check balance
    wallet = await db.admin_wallet.find_one({})
    if not wallet or wallet.get("balance", 0) < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create withdrawal request
    withdrawal = {
        "id": str(uuid.uuid4()),
        "amount": amount,
        "status": "pending",
        "bank_details": bank_details,
        "created_at": datetime.utcnow(),
        "processed_at": None
    }
    
    await db.withdrawals.insert_one(withdrawal)
    
    # Update wallet (deduct from balance)
    await db.admin_wallet.update_one(
        {"id": wallet["id"]},
        {
            "$inc": {"balance": -amount, "total_withdrawn": amount},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return serialize_doc({
        "withdrawal": withdrawal,
        "message": "Withdrawal request submitted. Will be processed within 3-5 business days."
    })

@api_router.get("/admin/withdrawals")
async def get_withdrawals(
    admin: dict = Depends(get_admin_user),
    limit: int = 20,
    skip: int = 0
):
    withdrawals = await db.withdrawals.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.withdrawals.count_documents({})
    
    return serialize_doc({
        "withdrawals": withdrawals,
        "total": total
    })

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
