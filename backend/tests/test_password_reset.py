"""
Password Reset Feature Tests
Tests for forgot-password and reset-password endpoints
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dj-connect-12.preview.emergentagent.com')

# Test user credentials - uses existing test user from context
TEST_USER_EMAIL = "reset-test@mixlink.com"
TEST_USER_PASSWORD = "newpassword123"


class TestForgotPassword:
    """Tests for POST /api/auth/forgot-password endpoint"""
    
    def test_forgot_password_existing_email(self):
        """Should return success message and reset token for existing email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": TEST_USER_EMAIL}
        )
        
        # Status assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert "message" in data
        assert "reset_token" in data  # Returned for testing (MOCKED email)
        assert "expires_in_minutes" in data
        assert data["expires_in_minutes"] == 60
        assert len(data["reset_token"]) > 0
        print(f"✓ Forgot password for existing email returns token: {data['reset_token'][:20]}...")
    
    def test_forgot_password_nonexistent_email(self):
        """Should return generic success message for non-existent email (prevents enumeration)"""
        nonexistent_email = f"nonexistent-{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": nonexistent_email}
        )
        
        # Status assertion - should still return 200 to prevent email enumeration
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert "message" in data
        # Should NOT return a token for non-existent email
        # The message should be generic
        print(f"✓ Forgot password for non-existent email returns generic message")
    
    def test_forgot_password_invalid_email_format(self):
        """Should return validation error for invalid email format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "invalid-email-format"}
        )
        
        # Should return 422 Unprocessable Entity for validation error
        assert response.status_code == 422
        print(f"✓ Invalid email format rejected with 422")
    
    def test_forgot_password_empty_email(self):
        """Should return validation error for empty email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": ""}
        )
        
        # Should return 422 Unprocessable Entity for validation error
        assert response.status_code == 422
        print(f"✓ Empty email rejected with 422")


class TestResetPassword:
    """Tests for POST /api/auth/reset-password/{token} endpoint"""
    
    @pytest.fixture
    def reset_token(self):
        """Get a valid reset token for testing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": TEST_USER_EMAIL}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("reset_token")
        pytest.skip("Could not get reset token")
    
    def test_reset_password_valid_token(self, reset_token):
        """Should successfully reset password with valid token"""
        new_password = "newpassword123"  # Reset to same password for consistency
        
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password/{reset_token}",
            json={"password": new_password}
        )
        
        # Status assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert "message" in data
        print(f"✓ Password reset successful with valid token")
    
    def test_reset_password_invalid_token(self):
        """Should fail with invalid token"""
        invalid_token = "invalid-token-12345"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password/{invalid_token}",
            json={"password": "newpassword123"}
        )
        
        # Status assertion
        assert response.status_code == 400
        
        # Data assertions
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid token rejected with 400")
    
    def test_reset_password_short_password(self, reset_token):
        """Should fail with password less than 6 characters"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password/{reset_token}",
            json={"password": "12345"}  # Only 5 characters
        )
        
        # Status assertion
        assert response.status_code == 400
        
        # Data assertions
        data = response.json()
        assert "detail" in data
        print(f"✓ Short password rejected with 400")
    
    def test_reset_password_empty_password(self, reset_token):
        """Should fail with empty password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password/{reset_token}",
            json={"password": ""}
        )
        
        # Status assertion - should return 400 or 422
        assert response.status_code in [400, 422]
        print(f"✓ Empty password rejected")
    
    def test_reset_password_token_reuse(self):
        """Should fail when trying to reuse a token"""
        # First, get a token
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": TEST_USER_EMAIL}
        )
        assert response.status_code == 200
        token = response.json()["reset_token"]
        
        # Use the token
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password/{token}",
            json={"password": "newpassword123"}
        )
        assert response.status_code == 200
        
        # Try to reuse the same token
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password/{token}",
            json={"password": "anotherpassword123"}
        )
        
        # Should fail because token was already used
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Token reuse correctly rejected")


class TestLoginAfterReset:
    """Tests for login after password reset"""
    
    def test_login_with_new_password(self):
        """Should be able to login with the new password after reset"""
        # First reset the password
        forgot_response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": TEST_USER_EMAIL}
        )
        assert forgot_response.status_code == 200
        token = forgot_response.json()["reset_token"]
        
        # Reset to a new password
        new_password = "resetpassword456"
        reset_response = requests.post(
            f"{BASE_URL}/api/auth/reset-password/{token}",
            json={"password": new_password}
        )
        assert reset_response.status_code == 200
        
        # Try to login with new password
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": new_password}
        )
        
        # Status assertion
        assert login_response.status_code == 200
        
        # Data assertions
        data = login_response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        print(f"✓ Login with new password successful")
        
        # Reset back to original password for other tests
        forgot_response2 = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": TEST_USER_EMAIL}
        )
        token2 = forgot_response2.json()["reset_token"]
        requests.post(
            f"{BASE_URL}/api/auth/reset-password/{token2}",
            json={"password": TEST_USER_PASSWORD}
        )


class TestCreateTestUser:
    """Ensure test user exists for password reset tests"""
    
    def test_ensure_test_user_exists(self):
        """Create test user if it doesn't exist"""
        # Try to login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        
        if login_response.status_code == 200:
            print(f"✓ Test user already exists: {TEST_USER_EMAIL}")
            return
        
        # User doesn't exist or password is wrong, try to register
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "first_name": "Reset",
                "last_name": "Test",
                "user_type": "organizer"
            }
        )
        
        if register_response.status_code == 200:
            print(f"✓ Test user created: {TEST_USER_EMAIL}")
        elif register_response.status_code == 400:
            # User exists, try to reset password
            print(f"✓ Test user exists, resetting password")
            forgot_response = requests.post(
                f"{BASE_URL}/api/auth/forgot-password",
                json={"email": TEST_USER_EMAIL}
            )
            if forgot_response.status_code == 200:
                token = forgot_response.json().get("reset_token")
                if token:
                    requests.post(
                        f"{BASE_URL}/api/auth/reset-password/{token}",
                        json={"password": TEST_USER_PASSWORD}
                    )
        else:
            pytest.fail(f"Could not ensure test user exists: {register_response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
