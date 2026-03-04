#!/usr/bin/env python3
import requests
import json

BASE_URL = "https://neon-dj-platform.preview.emergentagent.com/api"

def test_specific_scenario():
    """Test specific authorization scenarios"""
    import time
    timestamp = str(int(time.time()))
    
    # Setup
    org_data = {
        "email": f"test_org_{timestamp}@test.com",
        "password": "test123",
        "first_name": "Test",
        "last_name": "Org",
        "user_type": "organizer"
    }
    
    dj_data = {
        "email": f"test_dj_{timestamp}@test.com", 
        "password": "test123",
        "first_name": "Test",
        "last_name": "DJ",
        "user_type": "dj"
    }
    
    # Register users
    org_resp = requests.post(f"{BASE_URL}/auth/register", json=org_data)
    dj_resp = requests.post(f"{BASE_URL}/auth/register", json=dj_data)
    
    org_token = org_resp.json()["access_token"]
    dj_token = dj_resp.json()["access_token"]
    
    # Create DJ profile
    profile_resp = requests.post(f"{BASE_URL}/dj/profile", 
                                json={"artist_name": "Test DJ", "bio": "Test", "music_styles": ["House"], 
                                     "event_types": ["Mariage"], "hourly_rate": 100, "minimum_hours": 2,
                                     "travel_radius_km": 50, "city": "Paris", "experience_years": 5},
                                headers={"Authorization": f"Bearer {dj_token}"})
    dj_profile_id = profile_resp.json()["id"]
    
    # Create event  
    event_resp = requests.post(f"{BASE_URL}/events",
                              json={"title": "Test Event", "description": "Test", "event_type": "Mariage",
                                   "date": "2025-12-25", "start_time": "20:00", "end_time": "02:00",
                                   "location": "Test", "city": "Paris", "budget_min": 50, "budget_max": 200,
                                   "music_styles": ["House"], "guest_count": 50},
                              headers={"Authorization": f"Bearer {org_token}"})
    event_id = event_resp.json()["id"]
    
    # Create and accept booking
    booking_resp = requests.post(f"{BASE_URL}/bookings",
                                json={"dj_id": dj_profile_id, "event_id": event_id, "proposed_rate": 150},
                                headers={"Authorization": f"Bearer {org_token}"})
    booking_id = booking_resp.json()["id"]
    
    requests.put(f"{BASE_URL}/bookings/{booking_id}/status",
                json={"status": "accepted"},
                headers={"Authorization": f"Bearer {dj_token}"})
    
    checkout_data = {"booking_id": booking_id, "origin_url": "https://test.com"}
    
    print("Testing DJ authorization...")
    # Test DJ trying to create checkout - should get 403
    dj_resp = requests.post(f"{BASE_URL}/payments/stripe/checkout",
                           json=checkout_data,
                           headers={"Authorization": f"Bearer {dj_token}"})
    print(f"DJ checkout response: {dj_resp.status_code}")
    print(f"DJ checkout text: {dj_resp.text}")
    
    # Check if error handling is working correctly
    if dj_resp.status_code == 403:
        print("✅ DJ authorization test PASSED")
    else:
        print("❌ DJ authorization test FAILED")
    
    print("\nTesting invalid booking...")
    # Test invalid booking - should get 404
    invalid_resp = requests.post(f"{BASE_URL}/payments/stripe/checkout",
                                json={"booking_id": "invalid", "origin_url": "https://test.com"},
                                headers={"Authorization": f"Bearer {org_token}"})
    print(f"Invalid booking response: {invalid_resp.status_code}")
    print(f"Invalid booking text: {invalid_resp.text}")
    
    if invalid_resp.status_code == 404:
        print("✅ Invalid booking test PASSED")  
    else:
        print("❌ Invalid booking test FAILED")
    
    print("\nTesting pending booking...")
    # Create pending booking
    pending_resp = requests.post(f"{BASE_URL}/bookings",
                                json={"dj_id": dj_profile_id, "event_id": event_id, "proposed_rate": 100},
                                headers={"Authorization": f"Bearer {org_token}"})
    pending_booking_id = pending_resp.json()["id"]
    
    # Try checkout on pending booking - should get 400
    pending_checkout_resp = requests.post(f"{BASE_URL}/payments/stripe/checkout",
                                         json={"booking_id": pending_booking_id, "origin_url": "https://test.com"},
                                         headers={"Authorization": f"Bearer {org_token}"})
    print(f"Pending booking checkout response: {pending_checkout_resp.status_code}")
    print(f"Pending booking checkout text: {pending_checkout_resp.text}")
    
    if pending_checkout_resp.status_code == 400:
        print("✅ Pending booking test PASSED")
    else:
        print("❌ Pending booking test FAILED")

if __name__ == "__main__":
    test_specific_scenario()