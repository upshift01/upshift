"""
Test Work Report Feature for Milestone Payments
Tests:
- Work report submission by job seeker
- Work report viewing by employer
- Revision request by employer
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
EMPLOYER_EMAIL = "employer@testcompany.com"
EMPLOYER_PASSWORD = "Test@1234"
JOBSEEKER_EMAIL = "tannievlam@gmail.com"
JOBSEEKER_PASSWORD = "Test@1234"

# Known contract and milestone IDs from context
CONTRACT_ID = "98a8c8e3-38cd-4d2a-bd89-02ad1fdde3eb"
MILESTONE_ID = "c32a0ef6-f8cf-4bab-abeb-c14e66143438"


class TestWorkReportFeature:
    """Test work report submission, viewing, and revision request"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_employer_token(self):
        """Login as employer and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def get_jobseeker_token(self):
        """Login as job seeker and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": JOBSEEKER_EMAIL,
            "password": JOBSEEKER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    # ==================== Authentication Tests ====================
    
    def test_employer_login(self):
        """Test employer can login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        assert response.status_code == 200, f"Employer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("role") == "employer"
        print(f"✓ Employer login successful")
    
    def test_jobseeker_login(self):
        """Test job seeker can login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": JOBSEEKER_EMAIL,
            "password": JOBSEEKER_PASSWORD
        })
        assert response.status_code == 200, f"Job seeker login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Job seeker login successful")
    
    # ==================== Contract Access Tests ====================
    
    def test_contract_exists(self):
        """Test contract exists and is accessible"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Contract not found: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("contract", {}).get("id") == CONTRACT_ID
        print(f"✓ Contract {CONTRACT_ID} exists")
    
    def test_contract_has_milestones(self):
        """Test contract has milestones"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        contract = data.get("contract", {})
        milestones = contract.get("milestones", [])
        assert len(milestones) > 0, "Contract has no milestones"
        print(f"✓ Contract has {len(milestones)} milestone(s)")
        
        # Check if our test milestone exists
        milestone_ids = [m.get("id") for m in milestones]
        assert MILESTONE_ID in milestone_ids, f"Milestone {MILESTONE_ID} not found in contract"
        print(f"✓ Milestone {MILESTONE_ID} exists in contract")
    
    def test_contract_is_active(self):
        """Test contract is in active status"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        contract = data.get("contract", {})
        status = contract.get("status")
        assert status == "active", f"Contract status is '{status}', expected 'active'"
        print(f"✓ Contract is active")
    
    # ==================== Work Report GET Endpoint Tests ====================
    
    def test_get_work_report_endpoint_exists(self):
        """Test GET work-report endpoint exists"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{MILESTONE_ID}/work-report",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 200 (with or without report)
        assert response.status_code == 200, f"Work report endpoint failed: {response.text}"
        data = response.json()
        assert "success" in data
        assert "has_report" in data
        print(f"✓ GET work-report endpoint works, has_report={data.get('has_report')}")
    
    def test_get_work_report_returns_report_data(self):
        """Test GET work-report returns report data if exists"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{MILESTONE_ID}/work-report",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("has_report"):
            assert "work_report" in data
            report = data.get("work_report", {})
            assert "work_summary" in report
            assert "submitted_at" in report
            print(f"✓ Work report data returned with summary: {report.get('work_summary', '')[:50]}...")
        else:
            print(f"✓ No work report exists yet for this milestone")
    
    def test_get_work_report_unauthorized(self):
        """Test GET work-report requires authentication"""
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{MILESTONE_ID}/work-report"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Unauthorized access correctly rejected")
    
    def test_get_work_report_nonexistent_contract(self):
        """Test GET work-report for non-existent contract returns 404"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        fake_contract_id = str(uuid.uuid4())
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{fake_contract_id}/milestones/{MILESTONE_ID}/work-report",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent contract returns 404")
    
    def test_get_work_report_nonexistent_milestone(self):
        """Test GET work-report for non-existent milestone returns 404"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        fake_milestone_id = str(uuid.uuid4())
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{fake_milestone_id}/work-report",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent milestone returns 404")
    
    # ==================== Work Report Submit Endpoint Tests ====================
    
    def test_submit_work_report_endpoint_exists(self):
        """Test POST submit endpoint exists and validates input"""
        token = self.get_jobseeker_token()
        assert token, "Failed to get job seeker token"
        
        # Try with empty body - should fail validation
        response = self.session.post(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{MILESTONE_ID}/submit",
            headers={"Authorization": f"Bearer {token}"},
            json={}
        )
        # Should return 422 (validation error) or 400, not 404
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}: {response.text}"
        print(f"✓ Submit endpoint exists and validates input")
    
    def test_submit_work_report_requires_work_summary(self):
        """Test submit requires work_summary field"""
        token = self.get_jobseeker_token()
        assert token, "Failed to get job seeker token"
        
        response = self.session.post(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{MILESTONE_ID}/submit",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "deliverables_completed": ["Test deliverable"]
            }
        )
        # Should fail because work_summary is required
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print(f"✓ work_summary is required for submission")
    
    def test_submit_work_report_employer_forbidden(self):
        """Test employer cannot submit work report"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        response = self.session.post(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{MILESTONE_ID}/submit",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "work_summary": "Test summary from employer"
            }
        )
        # Should return 403 - only contractor can submit
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ Employer correctly forbidden from submitting work report")
    
    # ==================== Revision Request Endpoint Tests ====================
    
    def test_request_revision_endpoint_exists(self):
        """Test POST request-revision endpoint exists"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        # Try with empty body - should fail validation
        response = self.session.post(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{MILESTONE_ID}/request-revision",
            headers={"Authorization": f"Bearer {token}"},
            json={}
        )
        # Should return 422 (validation error) or 400, not 404
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}: {response.text}"
        print(f"✓ Request-revision endpoint exists and validates input")
    
    def test_request_revision_requires_feedback(self):
        """Test request-revision requires feedback field"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        response = self.session.post(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{MILESTONE_ID}/request-revision",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "specific_issues": ["Issue 1"]
            }
        )
        # Should fail because feedback is required
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print(f"✓ feedback is required for revision request")
    
    def test_request_revision_contractor_forbidden(self):
        """Test contractor cannot request revision"""
        token = self.get_jobseeker_token()
        assert token, "Failed to get job seeker token"
        
        response = self.session.post(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{MILESTONE_ID}/request-revision",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "feedback": "Test feedback from contractor"
            }
        )
        # Should return 403 - only employer can request revision
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ Contractor correctly forbidden from requesting revision")
    
    # ==================== Integration Flow Tests ====================
    
    def test_milestone_status_check(self):
        """Check current milestone status"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        contract = data.get("contract", {})
        milestones = contract.get("milestones", [])
        
        target_milestone = next((m for m in milestones if m.get("id") == MILESTONE_ID), None)
        assert target_milestone, f"Milestone {MILESTONE_ID} not found"
        
        status = target_milestone.get("status")
        has_work_report = target_milestone.get("work_report") is not None
        
        print(f"✓ Milestone status: {status}, has_work_report: {has_work_report}")
        
        if has_work_report:
            report = target_milestone.get("work_report", {})
            print(f"  - Report status: {report.get('status')}")
            print(f"  - Submitted by: {report.get('submitted_by_name')}")
            print(f"  - Work summary: {report.get('work_summary', '')[:50]}...")


class TestWorkReportSubmissionFlow:
    """Test the complete work report submission flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_employer_token(self):
        """Login as employer and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def get_jobseeker_token(self):
        """Login as job seeker and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": JOBSEEKER_EMAIL,
            "password": JOBSEEKER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_find_pending_milestone_for_submission(self):
        """Find a pending or in_progress milestone to test submission"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        contract = data.get("contract", {})
        milestones = contract.get("milestones", [])
        
        # Find pending or in_progress milestones
        submittable = [m for m in milestones if m.get("status") in ["pending", "in_progress"]]
        
        if submittable:
            print(f"✓ Found {len(submittable)} submittable milestone(s)")
            for m in submittable:
                print(f"  - {m.get('title')} (status: {m.get('status')}, id: {m.get('id')})")
        else:
            print(f"✓ No pending/in_progress milestones found - all may be submitted/approved/paid")
            # List all milestones with their status
            for m in milestones:
                print(f"  - {m.get('title')} (status: {m.get('status')})")
    
    def test_view_submitted_work_report(self):
        """Test viewing a submitted work report as employer"""
        token = self.get_employer_token()
        assert token, "Failed to get employer token"
        
        # Get contract to find submitted milestones
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{CONTRACT_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        contract = data.get("contract", {})
        milestones = contract.get("milestones", [])
        
        # Find submitted milestones with work reports
        submitted = [m for m in milestones if m.get("status") == "submitted" and m.get("work_report")]
        
        if submitted:
            milestone = submitted[0]
            print(f"✓ Found submitted milestone: {milestone.get('title')}")
            
            # View the work report
            response = self.session.get(
                f"{BASE_URL}/api/contracts/{CONTRACT_ID}/milestones/{milestone.get('id')}/work-report",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("has_report") == True
            report = data.get("work_report", {})
            print(f"  - Work summary: {report.get('work_summary', '')[:100]}...")
            print(f"  - Deliverables: {report.get('deliverables_completed', [])}")
            print(f"  - Hours worked: {report.get('hours_worked')}")
        else:
            print(f"✓ No submitted milestones with work reports found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
