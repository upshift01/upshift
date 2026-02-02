"""
Test suite for Escrow Dashboard & Management APIs
Tests: Dashboard, Contract Escrow Details, Statement, Disputes, Refunds, Auto-release Settings
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
EMPLOYER_EMAIL = "employer@testcompany.com"
EMPLOYER_PASSWORD = "Test@1234"
JOBSEEKER_EMAIL = "tannievlam@gmail.com"
JOBSEEKER_PASSWORD = "Test@1234"

# Known contract ID from previous testing
CONTRACT_ID = "98a8c8e3-38cd-4d2a-bd89-02ad1fdde3eb"


class TestAuthentication:
    """Test authentication for both employer and job seeker"""
    
    def test_employer_login(self, api_client):
        """Test employer can login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        assert response.status_code == 200, f"Employer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == EMPLOYER_EMAIL
        print(f"✓ Employer login successful: {EMPLOYER_EMAIL}")
    
    def test_jobseeker_login(self, api_client):
        """Test job seeker can login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": JOBSEEKER_EMAIL,
            "password": JOBSEEKER_PASSWORD
        })
        assert response.status_code == 200, f"Job seeker login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == JOBSEEKER_EMAIL
        print(f"✓ Job seeker login successful: {JOBSEEKER_EMAIL}")


class TestEscrowDashboard:
    """Test Escrow Dashboard API - GET /api/payments/escrow/dashboard"""
    
    def test_escrow_dashboard_employer(self, employer_client):
        """Test employer can access escrow dashboard"""
        response = employer_client.get(f"{BASE_URL}/api/payments/escrow/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "dashboard" in data
        
        dashboard = data["dashboard"]
        assert "as_employer" in dashboard
        assert "as_contractor" in dashboard
        
        # Verify employer stats structure
        employer_stats = dashboard["as_employer"]
        assert "total_funded" in employer_stats
        assert "total_released" in employer_stats
        assert "pending_release" in employer_stats
        assert "active_contracts" in employer_stats
        assert "pending_approvals" in employer_stats
        assert "unfunded_milestones" in employer_stats
        
        print(f"✓ Employer dashboard loaded - Active contracts: {employer_stats['active_contracts']}")
        print(f"  Total funded: {employer_stats['total_funded']}, Released: {employer_stats['total_released']}")
        print(f"  Unfunded milestones: {employer_stats['unfunded_milestones']}")
    
    def test_escrow_dashboard_contractor(self, jobseeker_client):
        """Test contractor can access escrow dashboard"""
        response = jobseeker_client.get(f"{BASE_URL}/api/payments/escrow/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        dashboard = data["dashboard"]
        
        # Verify contractor stats structure
        contractor_stats = dashboard["as_contractor"]
        assert "total_funded_for_you" in contractor_stats
        assert "total_received" in contractor_stats
        assert "pending_release" in contractor_stats
        assert "active_contracts" in contractor_stats
        assert "awaiting_payment" in contractor_stats
        
        print(f"✓ Contractor dashboard loaded - Active contracts: {contractor_stats['active_contracts']}")
        print(f"  Secured in escrow: {contractor_stats['total_funded_for_you']}")
    
    def test_escrow_dashboard_unauthorized(self, api_client):
        """Test dashboard requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/payments/escrow/dashboard")
        assert response.status_code == 401, "Should require authentication"
        print("✓ Dashboard correctly requires authentication")


class TestContractEscrowDetails:
    """Test Contract Escrow Details API - GET /api/payments/escrow/contract/{id}"""
    
    def test_contract_escrow_details_employer(self, employer_client):
        """Test employer can view contract escrow details"""
        response = employer_client.get(f"{BASE_URL}/api/payments/escrow/contract/{CONTRACT_ID}")
        assert response.status_code == 200, f"Contract details failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "contract" in data
        assert "milestones" in data
        assert "transactions" in data
        
        contract = data["contract"]
        assert contract["id"] == CONTRACT_ID
        assert "title" in contract
        assert "status" in contract
        assert "total_value" in contract
        assert "currency" in contract
        assert "total_funded" in contract
        assert "total_paid" in contract
        assert "escrow_balance" in contract
        
        print(f"✓ Contract escrow details loaded: {contract['title']}")
        print(f"  Total value: {contract['total_value']}, Funded: {contract['total_funded']}")
        print(f"  Milestones: {len(data['milestones'])}, Transactions: {len(data['transactions'])}")
    
    def test_contract_escrow_details_contractor(self, jobseeker_client):
        """Test contractor can view contract escrow details"""
        response = jobseeker_client.get(f"{BASE_URL}/api/payments/escrow/contract/{CONTRACT_ID}")
        assert response.status_code == 200, f"Contract details failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "milestones" in data
        
        # Verify milestone escrow breakdown
        if data["milestones"]:
            milestone = data["milestones"][0]
            assert "milestone_id" in milestone
            assert "title" in milestone
            assert "amount" in milestone
            assert "status" in milestone
            assert "escrow_status" in milestone
            assert "funded_amount" in milestone
            assert "released_amount" in milestone
            assert "held_amount" in milestone
        
        print(f"✓ Contractor can view contract escrow details")
    
    def test_contract_escrow_details_not_found(self, employer_client):
        """Test 404 for non-existent contract"""
        response = employer_client.get(f"{BASE_URL}/api/payments/escrow/contract/non-existent-id")
        assert response.status_code == 404, "Should return 404 for non-existent contract"
        print("✓ Correctly returns 404 for non-existent contract")
    
    def test_contract_escrow_details_unauthorized(self, api_client):
        """Test contract details requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/payments/escrow/contract/{CONTRACT_ID}")
        assert response.status_code == 401, "Should require authentication"
        print("✓ Contract details correctly requires authentication")


class TestEscrowStatement:
    """Test Escrow Statement API - GET /api/payments/escrow/statement/{id}"""
    
    def test_escrow_statement_employer(self, employer_client):
        """Test employer can generate escrow statement"""
        response = employer_client.get(f"{BASE_URL}/api/payments/escrow/statement/{CONTRACT_ID}")
        assert response.status_code == 200, f"Statement failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "statement" in data
        
        statement = data["statement"]
        assert "contract" in statement
        assert "summary" in statement
        assert "entries" in statement
        assert "generated_at" in statement
        
        # Verify contract info in statement
        contract = statement["contract"]
        assert "id" in contract
        assert "title" in contract
        assert "employer" in contract
        assert "contractor" in contract
        assert "currency" in contract
        
        # Verify summary
        summary = statement["summary"]
        assert "total_funded" in summary
        assert "total_released" in summary
        assert "current_balance" in summary
        
        print(f"✓ Escrow statement generated for contract: {contract['title']}")
        print(f"  Summary - Funded: {summary['total_funded']}, Released: {summary['total_released']}, Balance: {summary['current_balance']}")
        print(f"  Entries: {len(statement['entries'])}")
    
    def test_escrow_statement_contractor(self, jobseeker_client):
        """Test contractor can generate escrow statement"""
        response = jobseeker_client.get(f"{BASE_URL}/api/payments/escrow/statement/{CONTRACT_ID}")
        assert response.status_code == 200, f"Statement failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "statement" in data
        print("✓ Contractor can generate escrow statement")
    
    def test_escrow_statement_not_found(self, employer_client):
        """Test 404 for non-existent contract statement"""
        response = employer_client.get(f"{BASE_URL}/api/payments/escrow/statement/non-existent-id")
        assert response.status_code == 404, "Should return 404 for non-existent contract"
        print("✓ Correctly returns 404 for non-existent contract statement")


class TestDisputeCreation:
    """Test Dispute Creation API - POST /api/payments/escrow/dispute/{contract_id}/{milestone_id}"""
    
    def test_dispute_creation_requires_contractor(self, employer_client):
        """Test only contractor can create disputes"""
        # First get a milestone ID from the contract
        response = employer_client.get(f"{BASE_URL}/api/payments/escrow/contract/{CONTRACT_ID}")
        if response.status_code == 200:
            data = response.json()
            milestones = data.get("milestones", [])
            if milestones:
                milestone_id = milestones[0]["milestone_id"]
                
                # Try to create dispute as employer (should fail)
                dispute_response = employer_client.post(
                    f"{BASE_URL}/api/payments/escrow/dispute/{CONTRACT_ID}/{milestone_id}",
                    json={
                        "reason": "Test dispute",
                        "description": "This is a test dispute"
                    }
                )
                assert dispute_response.status_code == 403, "Employer should not be able to create disputes"
                print("✓ Correctly prevents employer from creating disputes")
    
    def test_dispute_creation_validation(self, jobseeker_client):
        """Test dispute creation requires reason and description"""
        # Get a milestone ID
        response = jobseeker_client.get(f"{BASE_URL}/api/payments/escrow/contract/{CONTRACT_ID}")
        if response.status_code == 200:
            data = response.json()
            milestones = data.get("milestones", [])
            if milestones:
                milestone_id = milestones[0]["milestone_id"]
                
                # Try to create dispute without required fields
                dispute_response = jobseeker_client.post(
                    f"{BASE_URL}/api/payments/escrow/dispute/{CONTRACT_ID}/{milestone_id}",
                    json={}
                )
                # Should fail validation (422) or bad request (400)
                assert dispute_response.status_code in [400, 422], f"Should validate required fields: {dispute_response.text}"
                print("✓ Dispute creation validates required fields")


class TestDisputeList:
    """Test Dispute List API - GET /api/payments/escrow/disputes"""
    
    def test_get_disputes_employer(self, employer_client):
        """Test employer can get their disputes"""
        response = employer_client.get(f"{BASE_URL}/api/payments/escrow/disputes")
        assert response.status_code == 200, f"Get disputes failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "disputes" in data
        assert isinstance(data["disputes"], list)
        
        print(f"✓ Employer disputes loaded: {len(data['disputes'])} dispute(s)")
    
    def test_get_disputes_contractor(self, jobseeker_client):
        """Test contractor can get their disputes"""
        response = jobseeker_client.get(f"{BASE_URL}/api/payments/escrow/disputes")
        assert response.status_code == 200, f"Get disputes failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "disputes" in data
        
        print(f"✓ Contractor disputes loaded: {len(data['disputes'])} dispute(s)")
    
    def test_get_disputes_with_status_filter(self, employer_client):
        """Test filtering disputes by status"""
        response = employer_client.get(f"{BASE_URL}/api/payments/escrow/disputes?status=open")
        assert response.status_code == 200, f"Get disputes with filter failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        # All returned disputes should have status 'open'
        for dispute in data.get("disputes", []):
            assert dispute.get("status") == "open", "Filter should only return open disputes"
        
        print(f"✓ Dispute status filter works correctly")


class TestDisputeResolution:
    """Test Dispute Resolution API - POST /api/payments/escrow/dispute/{id}/resolve"""
    
    def test_dispute_resolution_not_found(self, employer_client):
        """Test 404 for non-existent dispute"""
        response = employer_client.post(
            f"{BASE_URL}/api/payments/escrow/dispute/non-existent-id/resolve",
            json={
                "resolution": "release_to_contractor",
                "notes": "Test resolution"
            }
        )
        assert response.status_code == 404, "Should return 404 for non-existent dispute"
        print("✓ Correctly returns 404 for non-existent dispute")
    
    def test_dispute_resolution_contractor_forbidden(self, jobseeker_client):
        """Test contractor cannot resolve disputes"""
        # First get any existing dispute
        response = jobseeker_client.get(f"{BASE_URL}/api/payments/escrow/disputes")
        if response.status_code == 200:
            disputes = response.json().get("disputes", [])
            if disputes:
                dispute_id = disputes[0]["id"]
                resolve_response = jobseeker_client.post(
                    f"{BASE_URL}/api/payments/escrow/dispute/{dispute_id}/resolve",
                    json={
                        "resolution": "release_to_contractor",
                        "notes": "Test"
                    }
                )
                assert resolve_response.status_code == 403, "Contractor should not be able to resolve disputes"
                print("✓ Correctly prevents contractor from resolving disputes")
            else:
                print("⚠ No disputes to test resolution - skipping")
        else:
            print("⚠ Could not get disputes - skipping resolution test")


class TestRefund:
    """Test Refund API - POST /api/payments/escrow/refund/{contract_id}/{milestone_id}"""
    
    def test_refund_requires_employer(self, jobseeker_client):
        """Test only employer can request refunds"""
        response = jobseeker_client.get(f"{BASE_URL}/api/payments/escrow/contract/{CONTRACT_ID}")
        if response.status_code == 200:
            data = response.json()
            milestones = data.get("milestones", [])
            if milestones:
                milestone_id = milestones[0]["milestone_id"]
                
                refund_response = jobseeker_client.post(
                    f"{BASE_URL}/api/payments/escrow/refund/{CONTRACT_ID}/{milestone_id}"
                )
                assert refund_response.status_code == 403, "Contractor should not be able to request refunds"
                print("✓ Correctly prevents contractor from requesting refunds")
    
    def test_refund_not_found(self, employer_client):
        """Test 404 for non-existent contract refund"""
        response = employer_client.post(
            f"{BASE_URL}/api/payments/escrow/refund/non-existent-id/non-existent-milestone"
        )
        assert response.status_code == 404, "Should return 404 for non-existent contract"
        print("✓ Correctly returns 404 for non-existent contract refund")


class TestAutoReleaseSettings:
    """Test Auto-release Settings API - POST /api/payments/escrow/auto-release-settings/{contract_id}"""
    
    def test_auto_release_settings_employer(self, employer_client):
        """Test employer can update auto-release settings"""
        response = employer_client.post(
            f"{BASE_URL}/api/payments/escrow/auto-release-settings/{CONTRACT_ID}",
            json={
                "enabled": True,
                "days_after_submission": 14
            }
        )
        assert response.status_code == 200, f"Auto-release settings failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "message" in data
        
        print(f"✓ Auto-release settings updated: {data['message']}")
    
    def test_auto_release_settings_contractor(self, jobseeker_client):
        """Test contractor can also update auto-release settings"""
        response = jobseeker_client.post(
            f"{BASE_URL}/api/payments/escrow/auto-release-settings/{CONTRACT_ID}",
            json={
                "enabled": True,
                "days_after_submission": 7
            }
        )
        assert response.status_code == 200, f"Auto-release settings failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        print("✓ Contractor can update auto-release settings")
    
    def test_auto_release_settings_not_found(self, employer_client):
        """Test 404 for non-existent contract"""
        response = employer_client.post(
            f"{BASE_URL}/api/payments/escrow/auto-release-settings/non-existent-id",
            json={
                "enabled": True,
                "days_after_submission": 14
            }
        )
        assert response.status_code == 404, "Should return 404 for non-existent contract"
        print("✓ Correctly returns 404 for non-existent contract")
    
    def test_auto_release_settings_validation(self, employer_client):
        """Test auto-release settings validation"""
        # Test with invalid data
        response = employer_client.post(
            f"{BASE_URL}/api/payments/escrow/auto-release-settings/{CONTRACT_ID}",
            json={}  # Missing required fields
        )
        # Should either use defaults or fail validation
        # Based on the Pydantic model, it has defaults so should succeed
        assert response.status_code in [200, 422], f"Unexpected status: {response.status_code}"
        print("✓ Auto-release settings handles missing fields correctly")


# ==================== FIXTURES ====================

@pytest.fixture
def api_client():
    """Shared requests session without auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def employer_token(api_client):
    """Get employer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMPLOYER_EMAIL,
        "password": EMPLOYER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Employer authentication failed: {response.text}")


@pytest.fixture
def jobseeker_token(api_client):
    """Get job seeker authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": JOBSEEKER_EMAIL,
        "password": JOBSEEKER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Job seeker authentication failed: {response.text}")


@pytest.fixture
def employer_client(api_client, employer_token):
    """Session with employer auth header"""
    api_client.headers.update({"Authorization": f"Bearer {employer_token}"})
    return api_client


@pytest.fixture
def jobseeker_client():
    """Session with job seeker auth header"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": JOBSEEKER_EMAIL,
        "password": JOBSEEKER_PASSWORD
    })
    if response.status_code == 200:
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    pytest.skip(f"Job seeker authentication failed: {response.text}")
