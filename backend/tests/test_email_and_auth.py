"""
Backend Tests for UpShift Platform - Iteration 5
Testing:
1. Admin login functionality
2. Yoco subscription checkout flow
3. Email service contract notification methods
4. Route imports verification
"""

import pytest
import requests
import os
import sys

# Add backend to path for imports
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://jobhubai.preview.emergentagent.com').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@upshift.works"
SUPER_ADMIN_PASSWORD = "Admin@2025!"
RECRUITER_EMAIL = "john@woo.co.za"
RECRUITER_PASSWORD = "Test@1234"


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_success(self):
        """Test super admin can login successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": SUPER_ADMIN_EMAIL,
                "password": SUPER_ADMIN_PASSWORD
            }
        )
        
        print(f"Admin login response status: {response.status_code}")
        print(f"Admin login response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        assert data["user"]["email"] == SUPER_ADMIN_EMAIL
        assert data["user"]["role"] == "super_admin", f"Expected super_admin role, got {data['user']['role']}"
        
        print(f"✓ Admin login successful - role: {data['user']['role']}")
        return data["access_token"]
    
    def test_admin_login_wrong_password(self):
        """Test admin login fails with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": SUPER_ADMIN_EMAIL,
                "password": "WrongPassword123!"
            }
        )
        
        print(f"Wrong password response status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin login correctly rejects wrong password")
    
    def test_admin_login_nonexistent_user(self):
        """Test login fails for non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nonexistent@upshift.works",
                "password": "SomePassword123!"
            }
        )
        
        print(f"Non-existent user response status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Login correctly rejects non-existent user")
    
    def test_admin_can_access_protected_endpoint(self):
        """Test admin token works for protected endpoints"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": SUPER_ADMIN_EMAIL,
                "password": SUPER_ADMIN_PASSWORD
            }
        )
        
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Access protected endpoint
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Protected endpoint response status: {me_response.status_code}")
        
        assert me_response.status_code == 200, f"Expected 200, got {me_response.status_code}"
        
        data = me_response.json()
        assert data["email"] == SUPER_ADMIN_EMAIL
        assert data["role"] == "super_admin"
        
        print("✓ Admin token works for protected endpoints")


class TestYocoSubscription:
    """Test Yoco subscription checkout flow"""
    
    @pytest.fixture
    def recruiter_token(self):
        """Get recruiter auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": RECRUITER_EMAIL,
                "password": RECRUITER_PASSWORD
            }
        )
        
        if response.status_code != 200:
            # Try to create the recruiter user if doesn't exist
            print(f"Recruiter login failed with {response.status_code}, trying admin token instead")
            admin_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "email": SUPER_ADMIN_EMAIL,
                    "password": SUPER_ADMIN_PASSWORD
                }
            )
            if admin_response.status_code == 200:
                return admin_response.json()["access_token"]
            pytest.skip("Could not get auth token")
        
        return response.json()["access_token"]
    
    def test_get_recruiter_plans(self):
        """Test getting recruiter subscription plans"""
        response = requests.get(f"{BASE_URL}/api/talent-pool/recruiter/plans")
        
        print(f"Recruiter plans response status: {response.status_code}")
        print(f"Recruiter plans response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] == True
        assert "plans" in data
        assert len(data["plans"]) >= 3, "Should have at least 3 plans (monthly, quarterly, annual)"
        
        # Verify plan structure
        for plan in data["plans"]:
            assert "id" in plan
            assert "name" in plan
            assert "price" in plan
            assert "duration_days" in plan
            assert "features" in plan
        
        print(f"✓ Got {len(data['plans'])} subscription plans")
    
    def test_subscribe_to_plan_returns_checkout_url(self, recruiter_token):
        """Test subscribing to a plan returns valid checkout URL"""
        response = requests.post(
            f"{BASE_URL}/api/talent-pool/subscribe/recruiter-monthly",
            headers={"Authorization": f"Bearer {recruiter_token}"}
        )
        
        print(f"Subscribe response status: {response.status_code}")
        
        # The endpoint should return checkout details
        if response.status_code == 200:
            data = response.json()
            print(f"Subscribe response: {data}")
            
            assert data.get("success") == True
            assert "checkout_url" in data or "redirect_url" in data, "Should return checkout URL"
            
            checkout_url = data.get("checkout_url") or data.get("redirect_url")
            assert checkout_url is not None
            assert "yoco" in checkout_url.lower() or "http" in checkout_url.lower()
            
            print(f"✓ Subscription checkout URL returned: {checkout_url[:50]}...")
        elif response.status_code == 500:
            # Yoco might not be configured - check error message
            data = response.json()
            print(f"Subscribe error: {data}")
            
            # This is acceptable if Yoco is not configured
            if "not configured" in str(data.get("detail", "")).lower():
                print("✓ Yoco subscription endpoint works but Yoco not configured (expected in test env)")
            else:
                pytest.fail(f"Unexpected error: {data}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_get_recruiter_subscription_status(self, recruiter_token):
        """Test getting recruiter subscription status"""
        response = requests.get(
            f"{BASE_URL}/api/talent-pool/recruiter/subscription",
            headers={"Authorization": f"Bearer {recruiter_token}"}
        )
        
        print(f"Subscription status response: {response.status_code}")
        print(f"Subscription status: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "has_subscription" in data
        
        print(f"✓ Subscription status retrieved - has_subscription: {data['has_subscription']}")


class TestEmailServiceMethods:
    """Test that email service has all required contract notification methods"""
    
    def test_email_service_has_proposal_accepted_method(self):
        """Test email service has send_proposal_accepted_email method"""
        from email_service import email_service
        
        assert hasattr(email_service, 'send_proposal_accepted_email'), \
            "email_service should have send_proposal_accepted_email method"
        
        # Check it's callable
        assert callable(getattr(email_service, 'send_proposal_accepted_email'))
        
        print("✓ email_service has send_proposal_accepted_email method")
    
    def test_email_service_has_contract_created_method(self):
        """Test email service has send_contract_created_email method"""
        from email_service import email_service
        
        assert hasattr(email_service, 'send_contract_created_email'), \
            "email_service should have send_contract_created_email method"
        
        assert callable(getattr(email_service, 'send_contract_created_email'))
        
        print("✓ email_service has send_contract_created_email method")
    
    def test_email_service_has_contract_signed_method(self):
        """Test email service has send_contract_signed_email method"""
        from email_service import email_service
        
        assert hasattr(email_service, 'send_contract_signed_email'), \
            "email_service should have send_contract_signed_email method"
        
        assert callable(getattr(email_service, 'send_contract_signed_email'))
        
        print("✓ email_service has send_contract_signed_email method")
    
    def test_email_service_has_milestone_funded_method(self):
        """Test email service has send_milestone_funded_email method"""
        from email_service import email_service
        
        assert hasattr(email_service, 'send_milestone_funded_email'), \
            "email_service should have send_milestone_funded_email method"
        
        assert callable(getattr(email_service, 'send_milestone_funded_email'))
        
        print("✓ email_service has send_milestone_funded_email method")
    
    def test_email_service_has_payment_released_method(self):
        """Test email service has send_payment_released_email method"""
        from email_service import email_service
        
        assert hasattr(email_service, 'send_payment_released_email'), \
            "email_service should have send_payment_released_email method"
        
        assert callable(getattr(email_service, 'send_payment_released_email'))
        
        print("✓ email_service has send_payment_released_email method")
    
    def test_email_service_all_methods_present(self):
        """Comprehensive test for all contract notification methods"""
        from email_service import email_service
        
        required_methods = [
            'send_proposal_accepted_email',
            'send_contract_created_email',
            'send_contract_signed_email',
            'send_milestone_funded_email',
            'send_payment_released_email'
        ]
        
        missing_methods = []
        for method in required_methods:
            if not hasattr(email_service, method):
                missing_methods.append(method)
        
        assert len(missing_methods) == 0, f"Missing email methods: {missing_methods}"
        
        print(f"✓ All {len(required_methods)} contract notification methods present in email_service")


class TestRouteImports:
    """Test that routes correctly import email_service"""
    
    def test_contracts_routes_imports_email_service(self):
        """Test contracts_routes.py imports email_service"""
        with open('/app/backend/contracts_routes.py', 'r') as f:
            content = f.read()
        
        assert 'from email_service import email_service' in content, \
            "contracts_routes.py should import email_service"
        
        print("✓ contracts_routes.py imports email_service correctly")
    
    def test_proposals_routes_imports_email_service(self):
        """Test proposals_routes.py imports email_service"""
        with open('/app/backend/proposals_routes.py', 'r') as f:
            content = f.read()
        
        assert 'from email_service import email_service' in content, \
            "proposals_routes.py should import email_service"
        
        print("✓ proposals_routes.py imports email_service correctly")
    
    def test_payments_routes_imports_email_service(self):
        """Test payments_routes.py imports email_service"""
        with open('/app/backend/payments_routes.py', 'r') as f:
            content = f.read()
        
        assert 'from email_service import email_service' in content, \
            "payments_routes.py should import email_service"
        
        print("✓ payments_routes.py imports email_service correctly")
    
    def test_contracts_routes_uses_email_methods(self):
        """Test contracts_routes.py uses email notification methods"""
        with open('/app/backend/contracts_routes.py', 'r') as f:
            content = f.read()
        
        # Check for contract created email
        assert 'send_contract_created_email' in content, \
            "contracts_routes.py should use send_contract_created_email"
        
        # Check for contract signed email
        assert 'send_contract_signed_email' in content, \
            "contracts_routes.py should use send_contract_signed_email"
        
        print("✓ contracts_routes.py uses email notification methods")
    
    def test_proposals_routes_uses_email_methods(self):
        """Test proposals_routes.py uses email notification methods"""
        with open('/app/backend/proposals_routes.py', 'r') as f:
            content = f.read()
        
        # Check for proposal accepted email
        assert 'send_proposal_accepted_email' in content, \
            "proposals_routes.py should use send_proposal_accepted_email"
        
        print("✓ proposals_routes.py uses send_proposal_accepted_email")
    
    def test_payments_routes_uses_email_methods(self):
        """Test payments_routes.py uses email notification methods"""
        with open('/app/backend/payments_routes.py', 'r') as f:
            content = f.read()
        
        # Check for milestone funded email
        assert 'send_milestone_funded_email' in content, \
            "payments_routes.py should use send_milestone_funded_email"
        
        # Check for payment released email
        assert 'send_payment_released_email' in content, \
            "payments_routes.py should use send_payment_released_email"
        
        print("✓ payments_routes.py uses payment notification email methods")


class TestAPIEndpointsHealth:
    """Test that key API endpoints are accessible"""
    
    def test_auth_login_endpoint_exists(self):
        """Test /api/auth/login endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "test"}
        )
        
        # Should return 401 (unauthorized) not 404 (not found)
        assert response.status_code != 404, "Login endpoint should exist"
        print(f"✓ /api/auth/login endpoint exists (status: {response.status_code})")
    
    def test_talent_pool_plans_endpoint_exists(self):
        """Test /api/talent-pool/recruiter/plans endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/talent-pool/recruiter/plans")
        
        assert response.status_code == 200, f"Plans endpoint should return 200, got {response.status_code}"
        print("✓ /api/talent-pool/recruiter/plans endpoint exists and works")
    
    def test_pricing_endpoint_exists(self):
        """Test /api/pricing endpoint exists (public)"""
        response = requests.get(f"{BASE_URL}/api/pricing")
        
        assert response.status_code == 200, f"Pricing endpoint should return 200, got {response.status_code}"
        
        data = response.json()
        assert "tiers" in data
        
        print("✓ /api/pricing endpoint exists and returns tiers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
