"""
Payment Settings and Gateway Integration Tests
Tests for Stripe/Yoco payment configuration and contract funding APIs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@upshift.works"
ADMIN_PASSWORD = "Admin@2025!"
EMPLOYER_EMAIL = "test@example.com"
EMPLOYER_PASSWORD = "password123"
CONTRACT_ID = "bd2ecf7a-c5c9-470a-88d6-953f65871831"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def employer_token():
    """Get employer authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": EMPLOYER_EMAIL, "password": EMPLOYER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Employer authentication failed")


class TestPaymentConfig:
    """Tests for /api/payments/config endpoint"""
    
    def test_get_payment_config_requires_auth(self):
        """Payment config requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/config")
        assert response.status_code in [401, 403]
    
    def test_get_payment_config_success(self, employer_token):
        """Payment config returns both providers"""
        response = requests.get(
            f"{BASE_URL}/api/payments/config",
            headers={"Authorization": f"Bearer {employer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "providers" in data
        assert isinstance(data["providers"], list)
        
        # Check for Stripe provider
        stripe_provider = next((p for p in data["providers"] if p["id"] == "stripe"), None)
        assert stripe_provider is not None
        assert stripe_provider["name"] == "Stripe"
        assert "USD" in stripe_provider["currencies"]
        assert "ZAR" in stripe_provider["currencies"]
        
        # Check for Yoco provider
        yoco_provider = next((p for p in data["providers"] if p["id"] == "yoco"), None)
        assert yoco_provider is not None
        assert yoco_provider["name"] == "Yoco"
        assert "ZAR" in yoco_provider["currencies"]
        
        # Check default provider
        assert "default_provider" in data


class TestAdminPaymentSettings:
    """Tests for /api/admin/settings/payments endpoints"""
    
    def test_get_settings_requires_admin(self, employer_token):
        """Non-admin cannot access payment settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/payments",
            headers={"Authorization": f"Bearer {employer_token}"}
        )
        assert response.status_code == 403
    
    def test_get_settings_success(self, admin_token):
        """Admin can get payment settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/payments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "settings" in data
        settings = data["settings"]
        
        # Check all expected fields
        assert "stripe_public_key" in settings
        assert "stripe_secret_key" in settings
        assert "stripe_configured" in settings
        assert "yoco_public_key" in settings
        assert "yoco_secret_key" in settings
        assert "yoco_configured" in settings
        assert "default_provider" in settings
        
        # Secret keys should be masked
        if settings["stripe_configured"]:
            assert settings["stripe_secret_key"] == "••••••••"
        if settings["yoco_configured"]:
            assert settings["yoco_secret_key"] == "••••••••"
    
    def test_update_settings_requires_admin(self, employer_token):
        """Non-admin cannot update payment settings"""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/payments",
            headers={"Authorization": f"Bearer {employer_token}"},
            json={"default_provider": "yoco"}
        )
        assert response.status_code == 403
    
    def test_update_settings_success(self, admin_token):
        """Admin can update payment settings"""
        # Update default provider
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/payments",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"default_provider": "yoco"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/settings/payments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.status_code == 200
        assert verify_response.json()["settings"]["default_provider"] == "yoco"
        
        # Restore to stripe
        requests.put(
            f"{BASE_URL}/api/admin/settings/payments",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"default_provider": "stripe"}
        )


class TestFundContract:
    """Tests for /api/payments/fund-contract endpoint"""
    
    def test_fund_contract_requires_auth(self):
        """Fund contract requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/payments/fund-contract",
            json={
                "contract_id": CONTRACT_ID,
                "origin_url": "https://example.com",
                "provider": "stripe"
            }
        )
        assert response.status_code in [401, 403]
    
    def test_fund_contract_stripe_success(self, employer_token):
        """Fund contract with Stripe returns checkout URL"""
        response = requests.post(
            f"{BASE_URL}/api/payments/fund-contract",
            headers={"Authorization": f"Bearer {employer_token}"},
            json={
                "contract_id": CONTRACT_ID,
                "origin_url": "https://jobmatch-pro-45.preview.emergentagent.com",
                "provider": "stripe"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["provider"] == "stripe"
        assert "checkout_url" in data
        assert "session_id" in data
        assert "stripe.com" in data["checkout_url"]
    
    def test_fund_contract_yoco_currency_validation(self, employer_token):
        """Yoco rejects non-ZAR currency contracts"""
        response = requests.post(
            f"{BASE_URL}/api/payments/fund-contract",
            headers={"Authorization": f"Bearer {employer_token}"},
            json={
                "contract_id": CONTRACT_ID,
                "origin_url": "https://jobmatch-pro-45.preview.emergentagent.com",
                "provider": "yoco"
            }
        )
        # Contract is in USD, Yoco only supports ZAR
        assert response.status_code == 400
        assert "ZAR" in response.json().get("detail", "")
    
    def test_fund_contract_invalid_provider(self, employer_token):
        """Invalid provider returns error"""
        response = requests.post(
            f"{BASE_URL}/api/payments/fund-contract",
            headers={"Authorization": f"Bearer {employer_token}"},
            json={
                "contract_id": CONTRACT_ID,
                "origin_url": "https://example.com",
                "provider": "invalid_provider"
            }
        )
        assert response.status_code == 400
    
    def test_fund_contract_not_found(self, employer_token):
        """Non-existent contract returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/payments/fund-contract",
            headers={"Authorization": f"Bearer {employer_token}"},
            json={
                "contract_id": "non-existent-id",
                "origin_url": "https://example.com",
                "provider": "stripe"
            }
        )
        assert response.status_code == 404


class TestPaymentTransactions:
    """Tests for payment transaction endpoints"""
    
    def test_get_transactions_requires_auth(self):
        """Get transactions requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/transactions")
        assert response.status_code in [401, 403]
    
    def test_get_transactions_success(self, employer_token):
        """Get transactions returns list"""
        response = requests.get(
            f"{BASE_URL}/api/payments/transactions",
            headers={"Authorization": f"Bearer {employer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "transactions" in data
        assert isinstance(data["transactions"], list)


class TestPaymentTestConnection:
    """Tests for payment provider connection testing"""
    
    def test_stripe_connection(self, admin_token):
        """Test Stripe connection"""
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/payments/test",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"provider": "stripe"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data
    
    def test_yoco_connection(self, admin_token):
        """Test Yoco connection"""
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/payments/test",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"provider": "yoco"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data
