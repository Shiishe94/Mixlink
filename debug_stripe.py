#!/usr/bin/env python3
import requests
import json

# Base URL from environment
BASE_URL = "https://neon-dj-platform.preview.emergentagent.com/api"

# Quick debug test to check the specific failing scenarios
def debug_stripe_issues():
    print("🔍 Debugging Stripe Payment Issues")
    print("="*50)
    
    # First setup a test scenario
    import time
    timestamp = str(int(time.time()))
    
    organizer_data = {
        "email": f"debug_org_{timestamp}@test.com",
        "password": "test123",
        "first_name": "Debug",
        "last_name": "User", 
        "user_type": "organizer"
    }
    
    dj_data = {
        "email": f"debug_dj_{timestamp}@test.com",
        "password": "test123",
        "first_name": "Debug",
        "last_name": "DJ",
        "user_type": "dj"
    }
    
    # Register users
    org_resp = requests.post(f"{BASE_URL}/auth/register", json=organizer_data)
    dj_resp = requests.post(f"{BASE_URL}/auth/register", json=dj_data)
    
    print(f"Organizer registration: {org_resp.status_code}")
    print(f"DJ registration: {dj_resp.status_code}")
    
    if org_resp.status_code != 200 or dj_resp.status_code != 200:
        print("❌ Setup failed")
        return
        
    org_token = org_resp.json()["access_token"]
    dj_token = dj_resp.json()["access_token"]
    
    # Create DJ profile
    profile_data = {
        "artist_name": "Debug DJ",
        "bio": "Test DJ",
        "music_styles": ["House"],
        "event_types": ["Mariage"],
        "hourly_rate": 100,
        "minimum_hours": 2,
        "travel_radius_km": 50,
        "city": "Paris",
        "experience_years": 5
    }
    
    profile_resp = requests.post(f"{BASE_URL}/dj/profile", 
                                json=profile_data,
                                headers={"Authorization": f"Bearer {dj_token}"})
    print(f"DJ profile creation: {profile_resp.status_code}")
    
    if profile_resp.status_code != 200:
        print("❌ DJ profile creation failed")
        return
        
    dj_profile_id = profile_resp.json()["id"]
    
    # Create event
    event_data = {
        "title": "Debug Event",
        "description": "Test event",
        "event_type": "Mariage",
        "date": "2025-12-25",
        "start_time": "20:00",
        "end_time": "02:00",
        "location": "Test Location",
        "city": "Paris",
        "budget_min": 50,
        "budget_max": 200,
        "music_styles": ["House"],
        "guest_count": 50
    }
    
    event_resp = requests.post(f"{BASE_URL}/events",
                              json=event_data,
                              headers={"Authorization": f"Bearer {org_token}"})
    print(f"Event creation: {event_resp.status_code}")
    
    if event_resp.status_code != 200:
        print("❌ Event creation failed")
        return
        
    event_id = event_resp.json()["id"]
    
    # Create accepted booking
    booking_data = {
        "dj_id": dj_profile_id,
        "event_id": event_id,
        "proposed_rate": 150,
        "message": "Test booking"
    }
    
    booking_resp = requests.post(f"{BASE_URL}/bookings",
                                json=booking_data,
                                headers={"Authorization": f"Bearer {org_token}"})
    print(f"Booking creation: {booking_resp.status_code}")
    
    if booking_resp.status_code != 200:
        print("❌ Booking creation failed")
        return
        
    booking_id = booking_resp.json()["id"]
    
    # Accept booking
    accept_resp = requests.put(f"{BASE_URL}/bookings/{booking_id}/status",
                              json={"status": "accepted"},
                              headers={"Authorization": f"Bearer {dj_token}"})
    print(f"Booking acceptance: {accept_resp.status_code}")
    
    # Now test the failing scenarios
    print("\n🧪 Testing specific failure scenarios:")
    
    # 1. Test DJ trying to create checkout (should fail with 403)
    checkout_data = {
        "booking_id": booking_id,
        "origin_url": "https://test.com"
    }
    
    dj_checkout_resp = requests.post(f"{BASE_URL}/payments/stripe/checkout",
                                    json=checkout_data,
                                    headers={"Authorization": f"Bearer {dj_token}"})
    print(f"1. DJ checkout attempt: {dj_checkout_resp.status_code} - {dj_checkout_resp.text}")
    
    # 2. Test invalid booking ID (should fail with 404)
    invalid_checkout_data = {
        "booking_id": "invalid-booking-id",
        "origin_url": "https://test.com"
    }
    
    invalid_booking_resp = requests.post(f"{BASE_URL}/payments/stripe/checkout",
                                        json=invalid_checkout_data,
                                        headers={"Authorization": f"Bearer {org_token}"})
    print(f"2. Invalid booking checkout: {invalid_booking_resp.status_code} - {invalid_booking_resp.text}")
    
    # 3. Test pending booking (create new booking without acceptance)
    pending_booking_data = {
        "dj_id": dj_profile_id,
        "event_id": event_id,
        "proposed_rate": 100,
        "message": "Pending booking test"
    }
    
    pending_booking_resp = requests.post(f"{BASE_URL}/bookings",
                                        json=pending_booking_data,
                                        headers={"Authorization": f"Bearer {org_token}"})
    print(f"3a. Pending booking creation: {pending_booking_resp.status_code}")
    
    if pending_booking_resp.status_code == 200:
        pending_booking_id = pending_booking_resp.json()["id"]
        
        pending_checkout_data = {
            "booking_id": pending_booking_id,
            "origin_url": "https://test.com"
        }
        
        pending_checkout_resp = requests.post(f"{BASE_URL}/payments/stripe/checkout",
                                            json=pending_checkout_data,
                                            headers={"Authorization": f"Bearer {org_token}"})
        print(f"3b. Pending booking checkout: {pending_checkout_resp.status_code} - {pending_checkout_resp.text}")
    
    print("\n✅ Debug test completed")

if __name__ == "__main__":
    debug_stripe_issues()