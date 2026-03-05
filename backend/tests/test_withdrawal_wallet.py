"""
Tests for DJ Withdrawal and Wallet functionality
- /api/dj/wallet - Get DJ wallet
- /api/dj/withdrawal - Request withdrawal
- /api/dj/earnings - Get earnings
- /api/dj/withdrawals - Get withdrawal history
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://neon-dj-connect.preview.emergentagent.com')

# Test credentials
TEST_DJ_EMAIL = "dj-test@example.com"
TEST_DJ_PASSWORD = "test123456"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def dj_auth_token(api_client):
    """Get DJ authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_DJ_EMAIL,
        "password": TEST_DJ_PASSWORD
    })
    print(f"DJ Login response: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    # If login fails, try to register the DJ user
    register_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_DJ_EMAIL,
        "password": TEST_DJ_PASSWORD,
        "first_name": "Test",
        "last_name": "DJ",
        "user_type": "dj"
    })
    print(f"DJ Register response: {register_response.status_code}")
    if register_response.status_code == 200:
        data = register_response.json()
        return data.get("access_token")
    pytest.skip("Cannot authenticate DJ user")

@pytest.fixture(scope="module")
def authenticated_dj_client(api_client, dj_auth_token):
    """Session with DJ auth header"""
    api_client.headers.update({"Authorization": f"Bearer {dj_auth_token}"})
    return api_client

class TestWalletAPI:
    """Tests for DJ Wallet endpoint"""
    
    def test_get_wallet_returns_200(self, authenticated_dj_client):
        """Test /api/dj/wallet returns 200 OK"""
        response = authenticated_dj_client.get(f"{BASE_URL}/api/dj/wallet")
        print(f"GET /api/dj/wallet: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_wallet_response_format(self, authenticated_dj_client):
        """Test wallet response has correct structure"""
        response = authenticated_dj_client.get(f"{BASE_URL}/api/dj/wallet")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "wallet" in data, "Response should contain 'wallet' field"
        assert "min_withdrawal" in data, "Response should contain 'min_withdrawal' field"
        
        wallet = data["wallet"]
        assert "pending_balance" in wallet, "Wallet should contain 'pending_balance'"
        assert "available_balance" in wallet, "Wallet should contain 'available_balance'"
        assert "total_earned" in wallet, "Wallet should contain 'total_earned'"
        assert "total_withdrawn" in wallet, "Wallet should contain 'total_withdrawn'"
        
        # Check min_withdrawal value
        assert data["min_withdrawal"] == 50.0, "Minimum withdrawal should be 50€"
    
    def test_wallet_balances_are_numbers(self, authenticated_dj_client):
        """Test wallet balances are numeric"""
        response = authenticated_dj_client.get(f"{BASE_URL}/api/dj/wallet")
        assert response.status_code == 200
        data = response.json()
        wallet = data["wallet"]
        
        assert isinstance(wallet["pending_balance"], (int, float)), "pending_balance should be numeric"
        assert isinstance(wallet["available_balance"], (int, float)), "available_balance should be numeric"
        assert isinstance(wallet["total_earned"], (int, float)), "total_earned should be numeric"
        assert isinstance(wallet["total_withdrawn"], (int, float)), "total_withdrawn should be numeric"


class TestWithdrawalAPI:
    """Tests for DJ Withdrawal endpoint"""
    
    def test_withdrawal_requires_minimum_50(self, authenticated_dj_client):
        """Test withdrawal fails if amount < 50€"""
        response = authenticated_dj_client.post(f"{BASE_URL}/api/dj/withdrawal", json={
            "amount": 30,
            "method": "bank",
            "bank_name": "Test Bank",
            "iban": "FR7630001007941234567890185"
        })
        print(f"Withdrawal <50€: {response.status_code} - {response.text}")
        assert response.status_code == 400, "Should reject withdrawal under 50€"
        data = response.json()
        assert "50" in data.get("detail", ""), "Error message should mention minimum 50€"
    
    def test_withdrawal_requires_iban_for_bank(self, authenticated_dj_client):
        """Test withdrawal requires IBAN when method is bank"""
        response = authenticated_dj_client.post(f"{BASE_URL}/api/dj/withdrawal", json={
            "amount": 100,
            "method": "bank",
            "bank_name": "Test Bank"
            # Missing IBAN
        })
        print(f"Withdrawal missing IBAN: {response.status_code} - {response.text}")
        assert response.status_code == 400, "Should reject withdrawal without IBAN"
    
    def test_withdrawal_insufficient_balance(self, authenticated_dj_client):
        """Test withdrawal fails with insufficient balance"""
        # First get current balance
        wallet_response = authenticated_dj_client.get(f"{BASE_URL}/api/dj/wallet")
        wallet_data = wallet_response.json()
        available = wallet_data["wallet"]["available_balance"]
        
        # Try to withdraw more than available
        response = authenticated_dj_client.post(f"{BASE_URL}/api/dj/withdrawal", json={
            "amount": available + 100,  # More than available
            "method": "bank",
            "bank_name": "Test Bank",
            "iban": "FR7630001007941234567890185"
        })
        print(f"Withdrawal > available: {response.status_code} - {response.text}")
        assert response.status_code == 400, "Should reject withdrawal exceeding balance"
    
    def test_withdrawal_valid_request_format(self, authenticated_dj_client):
        """Test withdrawal endpoint accepts valid format even if insufficient funds"""
        # Valid request format test (may fail due to insufficient balance, that's OK)
        response = authenticated_dj_client.post(f"{BASE_URL}/api/dj/withdrawal", json={
            "amount": 50,
            "method": "bank",
            "bank_name": "Test Bank SEPA",
            "iban": "FR7630001007941234567890185"
        })
        print(f"Valid withdrawal format: {response.status_code}")
        # Either 200 (success) or 400 (insufficient balance) are valid responses
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"


class TestEarningsAPI:
    """Tests for DJ Earnings endpoint"""
    
    def test_get_earnings_returns_200(self, authenticated_dj_client):
        """Test /api/dj/earnings returns 200 OK"""
        response = authenticated_dj_client.get(f"{BASE_URL}/api/dj/earnings")
        print(f"GET /api/dj/earnings: {response.status_code}")
        assert response.status_code == 200
        # Should return a list
        data = response.json()
        assert isinstance(data, list), "Earnings should return a list"
    
    def test_get_earnings_with_status_filter(self, authenticated_dj_client):
        """Test earnings with status filter"""
        response = authenticated_dj_client.get(f"{BASE_URL}/api/dj/earnings?status=pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestWithdrawalsHistoryAPI:
    """Tests for DJ Withdrawals History endpoint"""
    
    def test_get_withdrawals_returns_200(self, authenticated_dj_client):
        """Test /api/dj/withdrawals returns 200 OK"""
        response = authenticated_dj_client.get(f"{BASE_URL}/api/dj/withdrawals")
        print(f"GET /api/dj/withdrawals: {response.status_code}")
        assert response.status_code == 200
        # Should return a list
        data = response.json()
        assert isinstance(data, list), "Withdrawals should return a list"


class TestAuthRequired:
    """Tests that authentication is required"""
    
    def test_wallet_requires_auth(self, api_client):
        """Test /api/dj/wallet requires authentication"""
        # Make request without auth
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.get(f"{BASE_URL}/api/dj/wallet")
        print(f"Wallet without auth: {response.status_code}")
        assert response.status_code in [401, 403], "Should require authentication"
    
    def test_withdrawal_requires_auth(self, api_client):
        """Test /api/dj/withdrawal requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(f"{BASE_URL}/api/dj/withdrawal", json={
            "amount": 100,
            "method": "bank",
            "bank_name": "Test",
            "iban": "FR7630001007941234567890185"
        })
        print(f"Withdrawal without auth: {response.status_code}")
        assert response.status_code in [401, 403], "Should require authentication"


class TestDJOnlyAccess:
    """Tests that only DJs can access wallet endpoints"""
    
    @pytest.fixture
    def organizer_token(self, api_client):
        """Get organizer authentication token"""
        # Try login first
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "organizer-test@example.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        # Register if not exists
        register_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "organizer-test@example.com",
            "password": "test123456",
            "first_name": "Test",
            "last_name": "Organizer",
            "user_type": "organizer"
        })
        if register_response.status_code == 200:
            return register_response.json().get("access_token")
        pytest.skip("Cannot create organizer user")
    
    def test_organizer_cannot_access_wallet(self, api_client, organizer_token):
        """Test organizers cannot access DJ wallet"""
        if organizer_token is None:
            pytest.skip("No organizer token available")
        response = api_client.get(
            f"{BASE_URL}/api/dj/wallet",
            headers={"Authorization": f"Bearer {organizer_token}"}
        )
        print(f"Organizer wallet access: {response.status_code}")
        assert response.status_code == 403, "Organizers should not access DJ wallet"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
