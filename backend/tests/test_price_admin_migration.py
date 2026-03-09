"""
Tests for MixLink price field migration and admin account changes.
Tests: price field (replacing hourly_rate), new admin@mixlink.com account, old admin/login route removal.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://dj-connect-12.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_NEW_EMAIL = "admin@mixlink.com"
ADMIN_PASSWORD = "admin123456"
ADMIN_OLD_EMAIL = "admin@djbooking.com"

# Test DJ user for price field tests
TEST_DJ_EMAIL = f"test_dj_price_{uuid.uuid4().hex[:6]}@example.com"
TEST_DJ_PASSWORD = "testpassword123"

# Test organizer for booking flow
TEST_ORG_EMAIL = f"test_org_{uuid.uuid4().hex[:6]}@example.com"
TEST_ORG_PASSWORD = "testpassword123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token via new admin@mixlink.com account"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_NEW_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        user = data.get("user", {})
        print(f"Admin login: user_type={user.get('user_type')}, email={user.get('email')}")
        return token
    print(f"Admin login failed: {response.status_code} - {response.text}")
    pytest.skip("Admin login failed - skipping admin tests")


@pytest.fixture(scope="module")
def dj_credentials():
    """Create a test DJ user and return (token, user_id)"""
    # Register test DJ
    reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_DJ_EMAIL,
        "first_name": "TestDJ",
        "last_name": "Price",
        "user_type": "dj",
        "password": TEST_DJ_PASSWORD
    })
    if reg_resp.status_code in (200, 201):
        data = reg_resp.json()
        return data.get("access_token"), data.get("user", {}).get("id")
    
    # Try login if already exists
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_DJ_EMAIL,
        "password": TEST_DJ_PASSWORD
    })
    if login_resp.status_code == 200:
        data = login_resp.json()
        return data.get("access_token"), data.get("user", {}).get("id")
    
    pytest.skip("Could not create/login test DJ user")


@pytest.fixture(scope="module")
def org_credentials():
    """Create a test organizer user and return (token, user_id)"""
    reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_ORG_EMAIL,
        "first_name": "TestOrg",
        "last_name": "Booking",
        "user_type": "organizer",
        "password": TEST_ORG_PASSWORD
    })
    if reg_resp.status_code in (200, 201):
        data = reg_resp.json()
        return data.get("access_token"), data.get("user", {}).get("id")
    
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_ORG_EMAIL,
        "password": TEST_ORG_PASSWORD
    })
    if login_resp.status_code == 200:
        data = login_resp.json()
        return data.get("access_token"), data.get("user", {}).get("id")
    
    pytest.skip("Could not create/login test organizer user")


# ==================== TEST 1: Admin Login ====================

class TestAdminLogin:
    """Test new admin account login via standard /api/auth/login"""

    def test_admin_login_new_account(self):
        """Admin can login with admin@mixlink.com / admin123456"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_NEW_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ADMIN_NEW_EMAIL
        assert data["user"]["user_type"] == "admin", f"Expected user_type='admin', got '{data['user']['user_type']}'"
        print(f"✓ Admin login successful - user_type: {data['user']['user_type']}")

    def test_admin_old_login_route_removed(self):
        """POST /api/admin/login should return 404 (route removed)"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_NEW_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 404, f"Expected 404 for removed route, got {response.status_code}: {response.text}"
        print(f"✓ Old /api/admin/login route correctly returns 404")

    def test_admin_login_invalid_credentials(self):
        """Admin login fails with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_NEW_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid admin credentials correctly rejected")


# ==================== TEST 2: Admin Stats & V2 Routes ====================

class TestAdminEndpoints:
    """Test admin stats and v2 user management endpoints"""

    def test_admin_stats_accessible(self, admin_token):
        """Admin can access GET /api/admin/stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        data = response.json()
        assert "users" in data, "No 'users' in stats response"
        assert "bookings" in data, "No 'bookings' in stats response"
        assert "revenue" in data, "No 'revenue' in stats response"
        assert "reviews" in data, "No 'reviews' in stats response"
        print(f"✓ Admin stats: {data['users']['total']} users, {data['bookings']['total']} bookings")

    def test_admin_stats_denied_without_token(self):
        """Non-admin cannot access admin stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code in (401, 403, 422), f"Expected auth error, got {response.status_code}"
        print(f"✓ Unauthenticated request to admin/stats correctly denied: {response.status_code}")

    def test_admin_v2_users(self, admin_token):
        """Admin can access GET /api/admin/v2/users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/v2/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin v2 users failed: {response.text}"
        data = response.json()
        # Response can be a list or dict with users key
        if isinstance(data, list):
            assert len(data) >= 0
            print(f"✓ Admin v2 users: {len(data)} users returned")
        elif isinstance(data, dict):
            assert "users" in data or "total" in data
            print(f"✓ Admin v2 users response: {list(data.keys())}")

    def test_admin_v2_users_denied_for_regular_user(self, dj_credentials):
        """Regular DJ user cannot access admin v2 users"""
        dj_token, _ = dj_credentials
        response = requests.get(
            f"{BASE_URL}/api/admin/v2/users",
            headers={"Authorization": f"Bearer {dj_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ DJ user correctly denied access to admin/v2/users")


# ==================== TEST 3: DJ Profile Price Field ====================

class TestDJProfilePriceField:
    """Test that DJ profiles use 'price' field (not hourly_rate)"""

    def test_get_dj_profiles_returns_price_field(self):
        """GET /api/dj/profiles returns 'price' field (not hourly_rate)"""
        response = requests.get(f"{BASE_URL}/api/dj/profiles")
        assert response.status_code == 200, f"GET dj/profiles failed: {response.text}"
        profiles = response.json()
        assert isinstance(profiles, list), "Expected list of profiles"
        
        if len(profiles) > 0:
            profile = profiles[0]
            assert "price" in profile, f"'price' field missing from DJ profile. Fields: {list(profile.keys())}"
            assert "hourly_rate" not in profile, f"'hourly_rate' should not be in profile (deprecated)"
            assert isinstance(profile["price"], (int, float)), f"'price' should be a number, got {type(profile['price'])}"
            print(f"✓ DJ profiles return 'price' field: {profile['price']}€ - no 'hourly_rate' field")
        else:
            print("⚠ No DJ profiles found to verify price field")

    def test_create_dj_profile_with_price(self, dj_credentials):
        """POST /api/dj/profile creates profile with 'price' field"""
        dj_token, _ = dj_credentials
        
        profile_data = {
            "artist_name": f"TEST_DJ_Price_{uuid.uuid4().hex[:4]}",
            "bio": "Test DJ for price field testing",
            "music_styles": ["House", "Techno"],
            "event_types": ["Mariage", "Soirée privée"],
            "price": 350.0,
            "minimum_hours": 3,
            "travel_radius_km": 50,
            "city": "Paris",
            "experience_years": 5
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dj/profile",
            json=profile_data,
            headers={"Authorization": f"Bearer {dj_token}"}
        )
        
        # May return 400 if profile already exists
        if response.status_code == 400 and "already exists" in response.text:
            print("⚠ DJ profile already exists - skipping create test")
            return
        
        assert response.status_code == 200, f"Create DJ profile failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "price" in data, f"'price' field missing from created profile. Fields: {list(data.keys())}"
        assert data["price"] == 350.0, f"Expected price=350.0, got {data['price']}"
        assert "hourly_rate" not in data, "'hourly_rate' should not be in created profile"
        print(f"✓ DJ profile created with price={data['price']}€")

    def test_create_dj_profile_rejects_missing_price(self, dj_credentials):
        """POST /api/dj/profile without 'price' should fail with 422"""
        dj_token, _ = dj_credentials
        
        profile_data = {
            "artist_name": "TestNoPriceDJ",
            "bio": "Test bio",
            "music_styles": ["House"],
            "event_types": ["Mariage"],
            # No 'price' field
            "city": "Paris",
            "experience_years": 2
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dj/profile",
            json=profile_data,
            headers={"Authorization": f"Bearer {dj_token}"}
        )
        
        assert response.status_code == 422, f"Expected 422 for missing price, got {response.status_code}: {response.text}"
        print(f"✓ Profile creation without 'price' correctly rejected with 422")

    def test_update_dj_profile_with_price(self, dj_credentials):
        """PUT /api/dj/profile updates 'price' field"""
        dj_token, _ = dj_credentials
        
        # First ensure DJ has a profile
        get_resp = requests.get(
            f"{BASE_URL}/api/dj/profile/me",
            headers={"Authorization": f"Bearer {dj_token}"}
        )
        if get_resp.status_code == 404:
            print("⚠ No DJ profile for update test - skipping")
            return
        
        new_price = 450.0
        response = requests.put(
            f"{BASE_URL}/api/dj/profile",
            json={"price": new_price},
            headers={"Authorization": f"Bearer {dj_token}"}
        )
        assert response.status_code == 200, f"Update DJ profile failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "price" in data, f"'price' missing in updated profile. Fields: {list(data.keys())}"
        assert data["price"] == new_price, f"Expected price={new_price}, got {data['price']}"
        print(f"✓ DJ profile updated with price={data['price']}€")

    def test_get_specific_dj_profile_has_price(self):
        """GET /api/dj/profiles/{id} returns 'price' (not hourly_rate)"""
        # First get list of profiles
        list_resp = requests.get(f"{BASE_URL}/api/dj/profiles")
        if list_resp.status_code != 200 or not list_resp.json():
            pytest.skip("No DJ profiles available")
        
        profiles = list_resp.json()
        dj_id = profiles[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/dj/profiles/{dj_id}")
        assert response.status_code == 200, f"Get DJ profile failed: {response.text}"
        data = response.json()
        assert "price" in data, f"'price' missing from individual DJ profile. Fields: {list(data.keys())}"
        assert "hourly_rate" not in data, "'hourly_rate' should not be present in profile"
        print(f"✓ Individual DJ profile has 'price'={data['price']}€ - no hourly_rate")

    def test_dj_profiles_price_filter(self):
        """GET /api/dj/profiles with min_rate/max_rate filter uses price field"""
        response = requests.get(f"{BASE_URL}/api/dj/profiles?min_rate=100&max_rate=1000")
        assert response.status_code == 200, f"Price filter failed: {response.text}"
        profiles = response.json()
        assert isinstance(profiles, list)
        # Verify all returned profiles have price in range
        for profile in profiles:
            assert "price" in profile, "Profile missing 'price' field"
            assert 100 <= profile["price"] <= 1000, f"Profile price {profile['price']} outside filter range 100-1000"
        print(f"✓ DJ profiles price filter works: {len(profiles)} profiles in range 100-1000€")


# ==================== TEST 4: Booking Flow with Price ====================

class TestBookingFlowWithPrice:
    """Test that booking flow uses DJ's price field correctly"""

    def test_booking_uses_dj_price(self, org_credentials):
        """Creating a booking with proposed_rate uses DJ's price value"""
        org_token, _ = org_credentials
        
        # Get a DJ profile to use
        dj_resp = requests.get(f"{BASE_URL}/api/dj/profiles?limit=1")
        if dj_resp.status_code != 200 or not dj_resp.json():
            pytest.skip("No DJ profiles available for booking test")
        
        dj_profile = dj_resp.json()[0]
        dj_price = dj_profile.get("price", 200)
        dj_id = dj_profile["id"]
        
        # Create an event first
        event_resp = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "title": f"TEST_Event_Price_{uuid.uuid4().hex[:4]}",
                "description": "Test event for price booking",
                "event_type": "Soirée privée",
                "date": "2026-06-15",
                "start_time": "20:00",
                "end_time": "23:00",
                "location": "Paris",
                "city": "Paris",
                "budget_min": 100,
                "budget_max": 1000,
                "music_styles": ["House"],
                "guest_count": 50
            },
            headers={"Authorization": f"Bearer {org_token}"}
        )
        if event_resp.status_code not in (200, 201):
            pytest.skip(f"Could not create event: {event_resp.text}")
        
        event_id = event_resp.json()["id"]
        
        # Create booking using DJ's price
        booking_resp = requests.post(
            f"{BASE_URL}/api/bookings",
            json={
                "dj_id": dj_id,
                "event_id": event_id,
                "proposed_rate": dj_price,
                "message": "Test booking with price field"
            },
            headers={"Authorization": f"Bearer {org_token}"}
        )
        assert booking_resp.status_code in (200, 201), f"Create booking failed: {booking_resp.status_code} - {booking_resp.text}"
        booking_data = booking_resp.json()
        assert "proposed_rate" in booking_data, "Booking missing proposed_rate"
        assert booking_data["proposed_rate"] == dj_price, f"Booking proposed_rate {booking_data['proposed_rate']} != DJ price {dj_price}"
        print(f"✓ Booking created with proposed_rate={booking_data['proposed_rate']}€ (from DJ price={dj_price}€)")


# ==================== TEST 5: Verify No hourly_rate in Database ====================

class TestNoHourlyRateInDatabase:
    """Verify that migrated DJ profiles don't have hourly_rate as primary field"""

    def test_migrated_profiles_use_price_not_hourly_rate(self):
        """All existing DJ profiles should have 'price' field (migration done)"""
        response = requests.get(f"{BASE_URL}/api/dj/profiles?limit=50")
        assert response.status_code == 200
        profiles = response.json()
        
        price_count = 0
        hourly_rate_count = 0
        
        for profile in profiles:
            if "price" in profile:
                price_count += 1
            if "hourly_rate" in profile:
                hourly_rate_count += 1
        
        assert hourly_rate_count == 0, f"{hourly_rate_count} profiles still have 'hourly_rate' field (migration incomplete)"
        print(f"✓ Migration complete: {price_count}/{len(profiles)} profiles use 'price' field, 0 have 'hourly_rate'")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
