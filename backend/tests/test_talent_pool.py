"""
Talent Pool Feature Backend Tests
Tests for Admin, Reseller, and Public Talent Pool API endpoints
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
SUPER_ADMIN_EMAIL = "admin@upshift.works"
SUPER_ADMIN_PASSWORD = "Admin@2025!"
DEMO_RESELLER_EMAIL = "demo@talenthub.upshift.works"
DEMO_RESELLER_PASSWORD = "demo123"
TEST_CUSTOMER_EMAIL = "test@example.com"
TEST_CUSTOMER_PASSWORD = "password123"


class TestPublicEndpoints:
    """Test public talent pool endpoints (no auth required)"""
    
    def test_get_industries(self):
        """GET /api/talent-pool/industries - should return list of industries"""
        response = requests.get(f"{BASE_URL}/api/talent-pool/industries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "industries" in data
        assert isinstance(data["industries"], list)
        assert len(data["industries"]) > 0
        # Check for expected industries
        assert "Technology" in data["industries"]
        assert "Healthcare" in data["industries"]
        assert "Finance" in data["industries"]
        print(f"✅ Industries endpoint returned {len(data['industries'])} industries")
    
    def test_get_experience_levels(self):
        """GET /api/talent-pool/experience-levels - should return experience levels"""
        response = requests.get(f"{BASE_URL}/api/talent-pool/experience-levels")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "levels" in data
        assert isinstance(data["levels"], list)
        assert len(data["levels"]) == 4  # entry, mid, senior, executive
        
        # Verify structure
        level_ids = [l["id"] for l in data["levels"]]
        assert "entry" in level_ids
        assert "mid" in level_ids
        assert "senior" in level_ids
        assert "executive" in level_ids
        print(f"✅ Experience levels endpoint returned {len(data['levels'])} levels")
    
    def test_get_recruiter_plans(self):
        """GET /api/talent-pool/recruiter/plans - should return subscription plans"""
        response = requests.get(f"{BASE_URL}/api/talent-pool/recruiter/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "plans" in data
        assert isinstance(data["plans"], list)
        assert len(data["plans"]) == 3  # monthly, quarterly, annual
        
        # Verify pricing in cents (R999, R2499, R7999)
        plan_prices = {p["id"]: p["price"] for p in data["plans"]}
        assert plan_prices.get("recruiter-monthly") == 99900, f"Monthly should be 99900 cents, got {plan_prices.get('recruiter-monthly')}"
        assert plan_prices.get("recruiter-quarterly") == 249900, f"Quarterly should be 249900 cents, got {plan_prices.get('recruiter-quarterly')}"
        assert plan_prices.get("recruiter-annual") == 799900, f"Annual should be 799900 cents, got {plan_prices.get('recruiter-annual')}"
        
        # Verify plan structure
        for plan in data["plans"]:
            assert "id" in plan
            assert "name" in plan
            assert "price" in plan
            assert "duration_days" in plan
            assert "features" in plan
            assert isinstance(plan["features"], list)
        
        print(f"✅ Recruiter plans endpoint returned {len(data['plans'])} plans with correct pricing")


class TestAdminEndpoints:
    """Test admin talent pool endpoints (requires super_admin auth)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Super admin login failed: {response.text}")
        
        data = response.json()
        self.token = data.get("access_token") or data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✅ Super admin logged in successfully")
    
    def test_admin_get_candidates(self):
        """GET /api/talent-pool/admin/candidates - requires auth"""
        response = requests.get(
            f"{BASE_URL}/api/talent-pool/admin/candidates",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "candidates" in data
        assert isinstance(data["candidates"], list)
        print(f"✅ Admin candidates endpoint returned {len(data['candidates'])} candidates")
    
    def test_admin_get_candidates_requires_auth(self):
        """GET /api/talent-pool/admin/candidates - should fail without auth"""
        response = requests.get(f"{BASE_URL}/api/talent-pool/admin/candidates")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✅ Admin candidates endpoint correctly requires authentication")
    
    def test_admin_get_pricing(self):
        """GET /api/talent-pool/admin/pricing - requires auth"""
        response = requests.get(
            f"{BASE_URL}/api/talent-pool/admin/pricing",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "pricing" in data
        
        pricing = data["pricing"]
        assert "monthly" in pricing
        assert "quarterly" in pricing
        assert "annual" in pricing
        print(f"✅ Admin pricing endpoint returned pricing: monthly={pricing['monthly']}, quarterly={pricing['quarterly']}, annual={pricing['annual']}")
    
    def test_admin_get_pricing_requires_auth(self):
        """GET /api/talent-pool/admin/pricing - should fail without auth"""
        response = requests.get(f"{BASE_URL}/api/talent-pool/admin/pricing")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✅ Admin pricing endpoint correctly requires authentication")
    
    def test_admin_get_subscriptions(self):
        """GET /api/talent-pool/admin/subscriptions - requires auth"""
        response = requests.get(
            f"{BASE_URL}/api/talent-pool/admin/subscriptions",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "subscriptions" in data
        assert isinstance(data["subscriptions"], list)
        print(f"✅ Admin subscriptions endpoint returned {len(data['subscriptions'])} subscriptions")
    
    def test_admin_add_candidate(self):
        """POST /api/talent-pool/admin/candidates - add new candidate"""
        test_candidate = {
            "full_name": f"TEST_Candidate_{uuid.uuid4().hex[:8]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "phone": "+27 12 345 6789",
            "job_title": "Software Developer",
            "industry": "Technology",
            "experience_level": "mid",
            "location": "Johannesburg, South Africa",
            "skills": ["Python", "JavaScript", "React"],
            "summary": "Experienced software developer with 5 years of experience",
            "is_visible": True,
            "status": "approved"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/talent-pool/admin/candidates",
            headers={**self.headers, "Content-Type": "application/json"},
            json=test_candidate
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "profile" in data
        
        profile = data["profile"]
        assert profile["full_name"] == test_candidate["full_name"]
        assert profile["job_title"] == test_candidate["job_title"]
        assert "id" in profile
        
        # Store for cleanup
        self.created_candidate_id = profile["id"]
        print(f"✅ Admin successfully added candidate: {profile['full_name']}")
        
        # Cleanup - delete the test candidate
        delete_response = requests.delete(
            f"{BASE_URL}/api/talent-pool/admin/candidates/{self.created_candidate_id}",
            headers=self.headers
        )
        if delete_response.status_code == 200:
            print(f"✅ Test candidate cleaned up successfully")
    
    def test_admin_update_candidate_status(self):
        """PUT /api/talent-pool/admin/candidates/{id}/status - approve/reject candidate"""
        # First create a test candidate
        test_candidate = {
            "full_name": f"TEST_StatusCandidate_{uuid.uuid4().hex[:8]}",
            "email": f"test_status_{uuid.uuid4().hex[:8]}@example.com",
            "job_title": "Test Developer",
            "industry": "Technology",
            "status": "pending"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/talent-pool/admin/candidates",
            headers={**self.headers, "Content-Type": "application/json"},
            json=test_candidate
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test candidate: {create_response.text}")
        
        candidate_id = create_response.json()["profile"]["id"]
        
        # Test approve
        response = requests.put(
            f"{BASE_URL}/api/talent-pool/admin/candidates/{candidate_id}/status",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"status": "approved"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Admin successfully approved candidate")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/talent-pool/admin/candidates/{candidate_id}",
            headers=self.headers
        )
    
    def test_admin_delete_candidate(self):
        """DELETE /api/talent-pool/admin/candidates/{id} - delete candidate"""
        # First create a test candidate
        test_candidate = {
            "full_name": f"TEST_DeleteCandidate_{uuid.uuid4().hex[:8]}",
            "email": f"test_delete_{uuid.uuid4().hex[:8]}@example.com",
            "job_title": "Test Developer",
            "industry": "Technology"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/talent-pool/admin/candidates",
            headers={**self.headers, "Content-Type": "application/json"},
            json=test_candidate
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test candidate: {create_response.text}")
        
        candidate_id = create_response.json()["profile"]["id"]
        
        # Test delete
        response = requests.delete(
            f"{BASE_URL}/api/talent-pool/admin/candidates/{candidate_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Admin successfully deleted candidate")
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/talent-pool/admin/candidates",
            headers=self.headers
        )
        candidates = get_response.json().get("candidates", [])
        candidate_ids = [c["id"] for c in candidates]
        assert candidate_id not in candidate_ids, "Candidate should be deleted"
        print(f"✅ Verified candidate was removed from list")
    
    def test_admin_update_pricing(self):
        """PUT /api/talent-pool/admin/pricing - update pricing"""
        # Get current pricing first
        get_response = requests.get(
            f"{BASE_URL}/api/talent-pool/admin/pricing",
            headers=self.headers
        )
        original_pricing = get_response.json().get("pricing", {})
        
        # Update pricing
        new_pricing = {
            "monthly": 109900,  # R1099
            "quarterly": 259900,  # R2599
            "annual": 849900  # R8499
        }
        
        response = requests.put(
            f"{BASE_URL}/api/talent-pool/admin/pricing",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"pricing": new_pricing}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Admin successfully updated pricing")
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/api/talent-pool/admin/pricing",
            headers=self.headers
        )
        updated_pricing = verify_response.json().get("pricing", {})
        assert updated_pricing["monthly"] == new_pricing["monthly"]
        print(f"✅ Verified pricing was updated correctly")
        
        # Restore original pricing
        if original_pricing:
            requests.put(
                f"{BASE_URL}/api/talent-pool/admin/pricing",
                headers={**self.headers, "Content-Type": "application/json"},
                json={"pricing": original_pricing}
            )
            print(f"✅ Restored original pricing")


class TestResellerEndpoints:
    """Test reseller talent pool endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as demo reseller before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_RESELLER_EMAIL,
            "password": DEMO_RESELLER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Demo reseller login failed: {response.text}")
        
        data = response.json()
        self.token = data.get("access_token") or data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✅ Demo reseller logged in successfully")
    
    def test_reseller_get_candidates(self):
        """GET /api/talent-pool/admin/candidates - reseller can access"""
        response = requests.get(
            f"{BASE_URL}/api/talent-pool/admin/candidates",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "candidates" in data
        print(f"✅ Reseller candidates endpoint returned {len(data['candidates'])} candidates")
    
    def test_reseller_get_pricing(self):
        """GET /api/talent-pool/admin/pricing - reseller can access"""
        response = requests.get(
            f"{BASE_URL}/api/talent-pool/admin/pricing",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "pricing" in data
        print(f"✅ Reseller pricing endpoint working")
    
    def test_reseller_get_subscriptions(self):
        """GET /api/talent-pool/admin/subscriptions - reseller can access"""
        response = requests.get(
            f"{BASE_URL}/api/talent-pool/admin/subscriptions",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "subscriptions" in data
        print(f"✅ Reseller subscriptions endpoint returned {len(data['subscriptions'])} subscriptions")


class TestSubscriptionFlow:
    """Test subscription flow for recruiters"""
    
    def test_subscribe_requires_auth(self):
        """POST /api/talent-pool/subscribe/{plan_id} - requires auth"""
        response = requests.post(f"{BASE_URL}/api/talent-pool/subscribe/recruiter-monthly")
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422 without auth, got {response.status_code}"
        print("✅ Subscribe endpoint correctly requires authentication")
    
    def test_subscribe_invalid_plan(self):
        """POST /api/talent-pool/subscribe/{plan_id} - invalid plan should fail"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Test customer login failed: {login_response.text}")
        
        data = login_response.json()
        token = data.get("access_token") or data.get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/talent-pool/subscribe/invalid-plan-id",
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        print("✅ Subscribe endpoint correctly rejects invalid plan ID")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
