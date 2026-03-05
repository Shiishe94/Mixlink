#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime
import uuid

# Base URL from environment
BASE_URL = "https://neon-dj-connect.preview.emergentagent.com/api"

# Test data with unique emails
import time
timestamp = str(int(time.time()))

ORGANIZER_DATA = {
    "email": f"test_org_{timestamp}@test.com",
    "password": "test123",
    "first_name": "Marie",
    "last_name": "Leblanc",
    "user_type": "organizer"
}

DJ_DATA = {
    "email": f"test_dj_{timestamp}@test.com",
    "password": "test123",
    "first_name": "Lucas",
    "last_name": "Bernard",
    "user_type": "dj"
}

DJ_PROFILE_DATA = {
    "artist_name": "DJ Lucas B",
    "bio": "DJ spécialisé House et Techno",
    "music_styles": ["House", "Techno"],
    "event_types": ["Mariage", "Soirée privée"],
    "hourly_rate": 120,
    "minimum_hours": 3,
    "travel_radius_km": 50,
    "city": "Lyon",
    "experience_years": 5
}

EVENT_DATA = {
    "title": "Mariage Pierre & Marie",
    "description": "Mariage au château",
    "event_type": "Mariage",
    "date": "2025-09-15",
    "start_time": "19:00",
    "end_time": "04:00",
    "location": "Château de Lyon",
    "city": "Lyon",
    "budget_min": 500,
    "budget_max": 1000,
    "music_styles": ["House", "Pop"],
    "guest_count": 150
}

ADMIN_CREDENTIALS = {
    "email": "admin@djbooking.com",
    "password": "admin123"
}

# Global variables to store test data
organizer_token = None
dj_token = None
admin_token = None
dj_profile_id = None
event_id = None
booking_id = None

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_pass(self, test_name):
        self.passed += 1
        print(f"✅ {test_name}")
    
    def add_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ {test_name}: {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.failed > 0:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")
        return self.failed == 0

def make_request(method, endpoint, data=None, token=None, expected_status=200):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            return None, f"Unsupported method: {method}"
        
        if response.status_code != expected_status:
            return None, f"Status {response.status_code}, expected {expected_status}. Response: {response.text}"
        
        try:
            return response.json(), None
        except:
            return response.text, None
            
    except requests.exceptions.RequestException as e:
        return None, f"Request failed: {str(e)}"

def test_auth_registration(result):
    """Test user registration for organizer and DJ"""
    global organizer_token, dj_token
    
    # Test organizer registration
    data, error = make_request("POST", "/auth/register", ORGANIZER_DATA, expected_status=200)
    if error:
        result.add_fail("Organizer Registration", error)
        return False
    
    if not data.get("access_token"):
        result.add_fail("Organizer Registration", "No access token returned")
        return False
    
    organizer_token = data["access_token"]
    if data.get("user", {}).get("user_type") != "organizer":
        result.add_fail("Organizer Registration", f"Wrong user type: {data.get('user', {}).get('user_type')}")
        return False
        
    result.add_pass("Organizer Registration")
    
    # Test DJ registration
    data, error = make_request("POST", "/auth/register", DJ_DATA, expected_status=200)
    if error:
        result.add_fail("DJ Registration", error)
        return False
    
    if not data.get("access_token"):
        result.add_fail("DJ Registration", "No access token returned")
        return False
    
    dj_token = data["access_token"]
    if data.get("user", {}).get("user_type") != "dj":
        result.add_fail("DJ Registration", f"Wrong user type: {data.get('user', {}).get('user_type')}")
        return False
        
    result.add_pass("DJ Registration")
    return True

def test_auth_login(result):
    """Test user login for both accounts"""
    global organizer_token, dj_token
    
    # Test organizer login
    login_data = {"email": ORGANIZER_DATA["email"], "password": ORGANIZER_DATA["password"]}
    data, error = make_request("POST", "/auth/login", login_data, expected_status=200)
    if error:
        result.add_fail("Organizer Login", error)
        return False
    
    if not data.get("access_token"):
        result.add_fail("Organizer Login", "No access token returned")
        return False
        
    organizer_token = data["access_token"]
    result.add_pass("Organizer Login")
    
    # Test DJ login
    login_data = {"email": DJ_DATA["email"], "password": DJ_DATA["password"]}
    data, error = make_request("POST", "/auth/login", login_data, expected_status=200)
    if error:
        result.add_fail("DJ Login", error)
        return False
    
    if not data.get("access_token"):
        result.add_fail("DJ Login", "No access token returned")
        return False
        
    dj_token = data["access_token"]
    result.add_pass("DJ Login")
    return True

def test_dj_profile_creation(result):
    """Test DJ profile creation"""
    global dj_profile_id
    
    data, error = make_request("POST", "/dj/profile", DJ_PROFILE_DATA, dj_token, expected_status=200)
    if error:
        result.add_fail("DJ Profile Creation", error)
        return False
    
    if not data.get("id"):
        result.add_fail("DJ Profile Creation", "No profile ID returned")
        return False
    
    dj_profile_id = data["id"]
    
    # Verify all fields are correct
    required_fields = ["artist_name", "bio", "music_styles", "event_types", "hourly_rate", "city"]
    for field in required_fields:
        if field not in data:
            result.add_fail("DJ Profile Creation", f"Missing field: {field}")
            return False
    
    result.add_pass("DJ Profile Creation")
    return True

def test_dj_profile_retrieval(result):
    """Test getting DJ profile"""
    
    data, error = make_request("GET", "/dj/profile/me", token=dj_token, expected_status=200)
    if error:
        result.add_fail("DJ Profile Retrieval", error)
        return False
    
    if data.get("id") != dj_profile_id:
        result.add_fail("DJ Profile Retrieval", f"Profile ID mismatch: {data.get('id')} != {dj_profile_id}")
        return False
    
    result.add_pass("DJ Profile Retrieval")
    return True

def test_dj_profile_search(result):
    """Test searching DJ profiles"""
    
    # Search without filters
    data, error = make_request("GET", "/dj/profiles", expected_status=200)
    if error:
        result.add_fail("DJ Profile Search (No Filters)", error)
        return False
    
    if not isinstance(data, list):
        result.add_fail("DJ Profile Search (No Filters)", f"Expected list, got {type(data)}")
        return False
    
    result.add_pass("DJ Profile Search (No Filters)")
    
    # Search with city filter
    data, error = make_request("GET", "/dj/profiles?city=Lyon", expected_status=200)
    if error:
        result.add_fail("DJ Profile Search (City Filter)", error)
        return False
    
    if not isinstance(data, list):
        result.add_fail("DJ Profile Search (City Filter)", f"Expected list, got {type(data)}")
        return False
    
    # Check if our DJ is in the results
    found_our_dj = any(profile.get("id") == dj_profile_id for profile in data)
    if not found_our_dj:
        result.add_fail("DJ Profile Search (City Filter)", "Our DJ not found in Lyon search results")
        return False
    
    result.add_pass("DJ Profile Search (City Filter)")
    return True

def test_event_creation(result):
    """Test event creation"""
    global event_id
    
    data, error = make_request("POST", "/events", EVENT_DATA, organizer_token, expected_status=200)
    if error:
        result.add_fail("Event Creation", error)
        return False
    
    if not data.get("id"):
        result.add_fail("Event Creation", "No event ID returned")
        return False
    
    event_id = data["id"]
    
    # Verify all fields are correct
    required_fields = ["title", "description", "event_type", "date", "location", "city"]
    for field in required_fields:
        if field not in data:
            result.add_fail("Event Creation", f"Missing field: {field}")
            return False
    
    if data.get("status") != "open":
        result.add_fail("Event Creation", f"Wrong status: {data.get('status')}")
        return False
    
    result.add_pass("Event Creation")
    return True

def test_event_retrieval(result):
    """Test getting event details"""
    
    data, error = make_request("GET", f"/events/{event_id}", expected_status=200)
    if error:
        result.add_fail("Event Retrieval", error)
        return False
    
    if data.get("id") != event_id:
        result.add_fail("Event Retrieval", f"Event ID mismatch: {data.get('id')} != {event_id}")
        return False
    
    if data.get("title") != EVENT_DATA["title"]:
        result.add_fail("Event Retrieval", f"Title mismatch: {data.get('title')} != {EVENT_DATA['title']}")
        return False
    
    result.add_pass("Event Retrieval")
    return True

def test_dj_matching(result):
    """Test DJ matching for event"""
    
    data, error = make_request("GET", f"/match/djs-for-event/{event_id}", token=organizer_token, expected_status=200)
    if error:
        result.add_fail("DJ Matching", error)
        return False
    
    if not isinstance(data, list):
        result.add_fail("DJ Matching", f"Expected list, got {type(data)}")
        return False
    
    # Check if our DJ is in the matches
    found_our_dj = any(dj.get("id") == dj_profile_id for dj in data)
    if not found_our_dj:
        result.add_fail("DJ Matching", "Our DJ not found in matching results")
        return False
    
    # Check match scores are present
    for dj in data:
        if "match_score" not in dj:
            result.add_fail("DJ Matching", "Match score missing")
            return False
    
    result.add_pass("DJ Matching")
    return True

def test_booking_creation(result):
    """Test booking creation"""
    global booking_id
    
    booking_data = {
        "dj_id": dj_profile_id,
        "event_id": event_id,
        "proposed_rate": 800,
        "message": "Interested in your DJ services for our wedding"
    }
    
    data, error = make_request("POST", "/bookings", booking_data, organizer_token, expected_status=200)
    if error:
        result.add_fail("Booking Creation", error)
        return False
    
    if not data.get("id"):
        result.add_fail("Booking Creation", "No booking ID returned")
        return False
    
    booking_id = data["id"]
    
    if data.get("status") != "pending":
        result.add_fail("Booking Creation", f"Wrong status: {data.get('status')}")
        return False
    
    if data.get("payment_status") != "unpaid":
        result.add_fail("Booking Creation", f"Wrong payment status: {data.get('payment_status')}")
        return False
    
    result.add_pass("Booking Creation")
    return True

def test_booking_retrieval(result):
    """Test getting bookings"""
    
    # Test organizer's bookings
    data, error = make_request("GET", "/bookings/my", token=organizer_token, expected_status=200)
    if error:
        result.add_fail("Organizer Booking Retrieval", error)
        return False
    
    if not isinstance(data, list):
        result.add_fail("Organizer Booking Retrieval", f"Expected list, got {type(data)}")
        return False
    
    # Find our booking
    our_booking = None
    for booking in data:
        if booking.get("id") == booking_id:
            our_booking = booking
            break
    
    if not our_booking:
        result.add_fail("Organizer Booking Retrieval", "Our booking not found")
        return False
    
    result.add_pass("Organizer Booking Retrieval")
    
    # Test DJ's bookings
    data, error = make_request("GET", "/bookings/my", token=dj_token, expected_status=200)
    if error:
        result.add_fail("DJ Booking Retrieval", error)
        return False
    
    if not isinstance(data, list):
        result.add_fail("DJ Booking Retrieval", f"Expected list, got {type(data)}")
        return False
    
    # Find our booking
    our_booking = None
    for booking in data:
        if booking.get("id") == booking_id:
            our_booking = booking
            break
    
    if not our_booking:
        result.add_fail("DJ Booking Retrieval", "Our booking not found")
        return False
    
    result.add_pass("DJ Booking Retrieval")
    return True

def test_booking_acceptance(result):
    """Test DJ accepting booking"""
    
    status_data = {"status": "accepted", "message": "Happy to play at your wedding!"}
    
    data, error = make_request("PUT", f"/bookings/{booking_id}/status", status_data, dj_token, expected_status=200)
    if error:
        result.add_fail("Booking Acceptance", error)
        return False
    
    if data.get("status") != "accepted":
        result.add_fail("Booking Acceptance", f"Status not updated: {data.get('status')}")
        return False
    
    result.add_pass("Booking Acceptance")
    return True

def test_payment_processing(result):
    """Test payment processing (simulated)"""
    
    payment_data = {
        "booking_id": booking_id,
        "payment_method": "simulated",
        "amount": 800
    }
    
    data, error = make_request("POST", "/payments", payment_data, organizer_token, expected_status=200)
    if error:
        result.add_fail("Payment Processing", error)
        return False
    
    if not data.get("payment"):
        result.add_fail("Payment Processing", "No payment data returned")
        return False
    
    payment = data["payment"]
    if payment.get("status") != "completed":
        result.add_fail("Payment Processing", f"Payment not completed: {payment.get('status')}")
        return False
    
    if not payment.get("transaction_id"):
        result.add_fail("Payment Processing", "No transaction ID generated")
        return False
    
    # Check commission calculation
    commission = data.get("commission", {})
    if not commission.get("total_commission"):
        result.add_fail("Payment Processing", "No commission calculated")
        return False
    
    result.add_pass("Payment Processing")
    return True

def test_admin_login(result):
    """Test admin login"""
    global admin_token
    
    data, error = make_request("POST", "/admin/login", ADMIN_CREDENTIALS, expected_status=200)
    if error:
        result.add_fail("Admin Login", error)
        return False
    
    if not data.get("access_token"):
        result.add_fail("Admin Login", "No access token returned")
        return False
    
    admin_token = data["access_token"]
    
    if not data.get("user", {}).get("is_admin"):
        result.add_fail("Admin Login", "User not marked as admin")
        return False
    
    result.add_pass("Admin Login")
    return True

def test_admin_dashboard(result):
    """Test admin dashboard"""
    
    data, error = make_request("GET", "/admin/dashboard", token=admin_token, expected_status=200)
    if error:
        result.add_fail("Admin Dashboard", error)
        return False
    
    # Check required sections
    required_sections = ["wallet", "statistics", "recent_commissions"]
    for section in required_sections:
        if section not in data:
            result.add_fail("Admin Dashboard", f"Missing section: {section}")
            return False
    
    # Check wallet structure
    wallet = data.get("wallet", {})
    wallet_fields = ["balance", "total_earned", "total_withdrawn"]
    for field in wallet_fields:
        if field not in wallet:
            result.add_fail("Admin Dashboard", f"Missing wallet field: {field}")
            return False
    
    # Check statistics
    stats = data.get("statistics", {})
    stats_fields = ["total_users", "total_djs", "total_organizers", "total_bookings"]
    for field in stats_fields:
        if field not in stats:
            result.add_fail("Admin Dashboard", f"Missing statistics field: {field}")
            return False
    
    result.add_pass("Admin Dashboard")
    return True

def main():
    """Run all tests"""
    print(f"🚀 Starting DJ Booking API Tests")
    print(f"Base URL: {BASE_URL}")
    print(f"{'='*60}")
    
    result = TestResult()
    
    # Test sequence
    tests = [
        ("Auth Registration Tests", test_auth_registration),
        ("Auth Login Tests", test_auth_login),
        ("DJ Profile Creation", test_dj_profile_creation),
        ("DJ Profile Retrieval", test_dj_profile_retrieval),
        ("DJ Profile Search", test_dj_profile_search),
        ("Event Creation", test_event_creation),
        ("Event Retrieval", test_event_retrieval),
        ("DJ Matching", test_dj_matching),
        ("Booking Creation", test_booking_creation),
        ("Booking Retrieval", test_booking_retrieval),
        ("Booking Acceptance", test_booking_acceptance),
        ("Payment Processing", test_payment_processing),
        ("Admin Login", test_admin_login),
        ("Admin Dashboard", test_admin_dashboard)
    ]
    
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name}...")
        try:
            test_func(result)
        except Exception as e:
            result.add_fail(test_name, f"Exception: {str(e)}")
    
    success = result.summary()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()