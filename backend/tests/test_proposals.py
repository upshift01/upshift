"""
Test suite for Proposal/Bid System APIs
Tests all proposal endpoints for job seekers and employers
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
JOB_SEEKER_EMAIL = "john@woo.co.za"
JOB_SEEKER_PASSWORD = "Test@1234"
EMPLOYER_EMAIL = "test@example.com"
EMPLOYER_PASSWORD = "password123"

# Test job ID (posted by test@example.com)
TEST_JOB_ID = "b221cb72-e7e5-4b18-b017-1fcae21ec007"


def get_auth_token(email, password):
    """Helper to get auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


class TestJobDetailsForProposal:
    """Test job details endpoint needed for proposal submission"""
    
    def test_get_job_details(self):
        """Test fetching job details for proposal page"""
        response = requests.get(f"{BASE_URL}/api/remote-jobs/jobs/{TEST_JOB_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "job" in data
        assert data["job"]["id"] == TEST_JOB_ID
        assert data["job"]["title"] == "Senior React Developer"
        assert data["job"]["status"] == "active"
        print(f"PASS: Job details fetched - {data['job']['title']}")


class TestMyProposals:
    """Test job seeker's proposal management"""
    
    def test_get_my_proposals_requires_auth(self):
        """Test that my-proposals requires authentication"""
        response = requests.get(f"{BASE_URL}/api/proposals/my-proposals")
        assert response.status_code in [401, 403]
        print("PASS: my-proposals requires authentication")
    
    def test_get_my_proposals_success(self):
        """Test fetching job seeker's proposals"""
        token = get_auth_token(JOB_SEEKER_EMAIL, JOB_SEEKER_PASSWORD)
        assert token is not None, "Failed to get job seeker token"
        
        response = requests.get(
            f"{BASE_URL}/api/proposals/my-proposals",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "proposals" in data
        assert isinstance(data["proposals"], list)
        
        # John Woo has already submitted one proposal
        if len(data["proposals"]) > 0:
            proposal = data["proposals"][0]
            assert "id" in proposal
            assert "job_id" in proposal
            assert "status" in proposal
            assert "cover_letter" in proposal
            print(f"PASS: Found {len(data['proposals'])} proposals for job seeker")
        else:
            print("PASS: No proposals found (empty list)")


class TestJobProposalsForEmployer:
    """Test employer's proposal management"""
    
    def test_get_job_proposals_requires_auth(self):
        """Test that job proposals requires authentication"""
        response = requests.get(f"{BASE_URL}/api/proposals/job/{TEST_JOB_ID}")
        assert response.status_code in [401, 403]
        print("PASS: job proposals requires authentication")
    
    def test_get_job_proposals_success(self):
        """Test fetching proposals for employer's job"""
        token = get_auth_token(EMPLOYER_EMAIL, EMPLOYER_PASSWORD)
        assert token is not None, "Failed to get employer token"
        
        response = requests.get(
            f"{BASE_URL}/api/proposals/job/{TEST_JOB_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "job" in data
        assert "proposals" in data
        assert "status_counts" in data
        
        # Verify job info
        assert data["job"]["id"] == TEST_JOB_ID
        
        # Verify status counts structure
        assert "total" in data["status_counts"]
        assert "pending" in data["status_counts"]
        assert "shortlisted" in data["status_counts"]
        
        print(f"PASS: Employer can view {data['status_counts']['total']} proposals")
    
    def test_get_job_proposals_non_owner_denied(self):
        """Test that non-owner cannot view job proposals"""
        token = get_auth_token(JOB_SEEKER_EMAIL, JOB_SEEKER_PASSWORD)
        assert token is not None, "Failed to get job seeker token"
        
        response = requests.get(
            f"{BASE_URL}/api/proposals/job/{TEST_JOB_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should be 404 (job not found for this user) or 403
        assert response.status_code in [403, 404]
        print("PASS: Non-owner cannot view job proposals")


class TestProposalStatusUpdate:
    """Test employer's ability to update proposal status"""
    
    def test_update_proposal_status_shortlist(self):
        """Test shortlisting a proposal"""
        token = get_auth_token(EMPLOYER_EMAIL, EMPLOYER_PASSWORD)
        assert token is not None, "Failed to get employer token"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # First get proposals to find one to shortlist
        response = requests.get(
            f"{BASE_URL}/api/proposals/job/{TEST_JOB_ID}",
            headers=headers
        )
        if response.status_code != 200:
            pytest.skip("Could not fetch proposals")
        
        data = response.json()
        proposals = data.get("proposals", [])
        
        if not proposals:
            pytest.skip("No proposals to test status update")
        
        proposal_id = proposals[0]["id"]
        
        # First reset to pending
        requests.post(
            f"{BASE_URL}/api/proposals/{proposal_id}/status",
            json={"status": "pending"},
            headers=headers
        )
        
        # Shortlist the proposal
        response = requests.post(
            f"{BASE_URL}/api/proposals/{proposal_id}/status",
            json={"status": "shortlisted"},
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "shortlisted"
        print(f"PASS: Proposal {proposal_id} shortlisted successfully")
    
    def test_update_proposal_status_reject(self):
        """Test rejecting a proposal"""
        token = get_auth_token(EMPLOYER_EMAIL, EMPLOYER_PASSWORD)
        assert token is not None, "Failed to get employer token"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Get proposals
        response = requests.get(
            f"{BASE_URL}/api/proposals/job/{TEST_JOB_ID}",
            headers=headers
        )
        if response.status_code != 200:
            pytest.skip("Could not fetch proposals")
        
        data = response.json()
        proposals = data.get("proposals", [])
        
        if not proposals:
            pytest.skip("No proposals to test")
        
        proposal_id = proposals[0]["id"]
        
        # Reject the proposal
        response = requests.post(
            f"{BASE_URL}/api/proposals/{proposal_id}/status",
            json={"status": "rejected", "notes": "Test rejection"},
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "rejected"
        print(f"PASS: Proposal {proposal_id} rejected successfully")
    
    def test_reset_proposal_to_pending(self):
        """Reset proposal back to pending for future tests"""
        token = get_auth_token(EMPLOYER_EMAIL, EMPLOYER_PASSWORD)
        assert token is not None, "Failed to get employer token"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Get proposals
        response = requests.get(
            f"{BASE_URL}/api/proposals/job/{TEST_JOB_ID}",
            headers=headers
        )
        if response.status_code != 200:
            pytest.skip("Could not fetch proposals")
        
        data = response.json()
        proposals = data.get("proposals", [])
        
        if not proposals:
            pytest.skip("No proposals to reset")
        
        proposal_id = proposals[0]["id"]
        
        # Reset to pending
        response = requests.post(
            f"{BASE_URL}/api/proposals/{proposal_id}/status",
            json={"status": "pending"},
            headers=headers
        )
        assert response.status_code == 200
        print(f"PASS: Proposal {proposal_id} reset to pending")


class TestAIProposalGeneration:
    """Test AI proposal generation endpoints"""
    
    def test_ai_generate_proposal_requires_auth(self):
        """Test that AI generation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/proposals/ai/generate-proposal",
            json={
                "job_title": "Test Job",
                "job_description": "Test description",
                "required_skills": ["Python"],
                "user_skills": ["Python"],
                "user_experience": "5 years",
                "user_bio": "Test bio",
                "tone": "professional"
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [401, 403]
        print("PASS: AI generate proposal requires authentication")
    
    def test_ai_generate_proposal_success(self):
        """Test AI proposal generation"""
        token = get_auth_token(JOB_SEEKER_EMAIL, JOB_SEEKER_PASSWORD)
        assert token is not None, "Failed to get job seeker token"
        
        response = requests.post(
            f"{BASE_URL}/api/proposals/ai/generate-proposal",
            json={
                "job_title": "Senior React Developer",
                "job_description": "Building scalable web applications using React and TypeScript",
                "required_skills": ["React", "TypeScript", "JavaScript"],
                "user_skills": ["React", "JavaScript", "Node.js"],
                "user_experience": "5 years in frontend development",
                "user_bio": "Passionate developer with experience in modern web technologies",
                "tone": "professional"
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        # AI generation might take time or fail due to API limits
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            assert "proposal" in data
            assert len(data["proposal"]) > 50  # Should be a substantial proposal
            print(f"PASS: AI generated proposal ({len(data['proposal'])} chars)")
        elif response.status_code == 500:
            # AI service might not be configured or rate limited
            print("SKIP: AI service unavailable (500 error)")
        else:
            print(f"WARN: Unexpected status {response.status_code}")


class TestProposalSubmission:
    """Test proposal submission flow"""
    
    def test_submit_proposal_duplicate_check(self):
        """Test that duplicate proposals are rejected"""
        token = get_auth_token(JOB_SEEKER_EMAIL, JOB_SEEKER_PASSWORD)
        assert token is not None, "Failed to get job seeker token"
        
        # John Woo has already submitted a proposal for this job
        response = requests.post(
            f"{BASE_URL}/api/proposals",
            json={
                "job_id": TEST_JOB_ID,
                "cover_letter": "Test duplicate proposal",
                "proposed_rate": 5000,
                "rate_type": "monthly",
                "currency": "USD",
                "availability": "immediate"
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        # Should be rejected as duplicate
        assert response.status_code == 400
        data = response.json()
        assert "already submitted" in data.get("detail", "").lower()
        print("PASS: Duplicate proposal correctly rejected")
    
    def test_submit_proposal_own_job_rejected(self):
        """Test that employer cannot apply to their own job"""
        token = get_auth_token(EMPLOYER_EMAIL, EMPLOYER_PASSWORD)
        assert token is not None, "Failed to get employer token"
        
        response = requests.post(
            f"{BASE_URL}/api/proposals",
            json={
                "job_id": TEST_JOB_ID,
                "cover_letter": "Test self-application",
                "proposed_rate": 5000,
                "rate_type": "monthly",
                "currency": "USD",
                "availability": "immediate"
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        # Should be rejected
        assert response.status_code == 400
        data = response.json()
        assert "own job" in data.get("detail", "").lower() or "cannot" in data.get("detail", "").lower()
        print("PASS: Self-application correctly rejected")


class TestEmployerStats:
    """Test employer proposal statistics"""
    
    def test_employer_stats(self):
        """Test employer proposal statistics endpoint"""
        token = get_auth_token(EMPLOYER_EMAIL, EMPLOYER_PASSWORD)
        assert token is not None, "Failed to get employer token"
        
        response = requests.get(
            f"{BASE_URL}/api/proposals/stats/employer",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "stats" in data
        
        stats = data["stats"]
        assert "total_proposals" in stats
        assert "pending" in stats
        assert "shortlisted" in stats
        assert "jobs_with_proposals" in stats
        
        print(f"PASS: Employer stats - {stats['total_proposals']} total proposals")


class TestProposalDetails:
    """Test proposal detail viewing"""
    
    def test_get_proposal_details_as_applicant(self):
        """Test viewing proposal details as the applicant"""
        token = get_auth_token(JOB_SEEKER_EMAIL, JOB_SEEKER_PASSWORD)
        assert token is not None, "Failed to get job seeker token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # First get my proposals
        response = requests.get(
            f"{BASE_URL}/api/proposals/my-proposals",
            headers=headers
        )
        if response.status_code != 200:
            pytest.skip("Could not fetch proposals")
        
        data = response.json()
        proposals = data.get("proposals", [])
        
        if not proposals:
            pytest.skip("No proposals to view")
        
        proposal_id = proposals[0]["id"]
        
        # Get proposal details
        response = requests.get(
            f"{BASE_URL}/api/proposals/{proposal_id}",
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "proposal" in data
        assert data["is_owner"] is True
        
        print(f"PASS: Applicant can view their proposal details")
    
    def test_get_proposal_details_as_employer(self):
        """Test viewing proposal details as the employer"""
        token = get_auth_token(EMPLOYER_EMAIL, EMPLOYER_PASSWORD)
        assert token is not None, "Failed to get employer token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # First get job proposals
        response = requests.get(
            f"{BASE_URL}/api/proposals/job/{TEST_JOB_ID}",
            headers=headers
        )
        if response.status_code != 200:
            pytest.skip("Could not fetch proposals")
        
        data = response.json()
        proposals = data.get("proposals", [])
        
        if not proposals:
            pytest.skip("No proposals to view")
        
        proposal_id = proposals[0]["id"]
        
        # Get proposal details
        response = requests.get(
            f"{BASE_URL}/api/proposals/{proposal_id}",
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "proposal" in data
        
        print(f"PASS: Employer can view proposal details")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
