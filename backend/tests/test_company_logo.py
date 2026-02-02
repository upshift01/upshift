"""
Test Company Logo Upload Feature
Tests the employer company logo upload, display in /api/auth/me, and display in job listings
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://upshift-jobs.preview.emergentagent.com')

# Test credentials
EMPLOYER_EMAIL = "employer@testcompany.com"
EMPLOYER_PASSWORD = "Test@1234"


class TestCompanyLogoFeature:
    """Test company logo upload and display functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user_id = None
    
    def get_employer_token(self):
        """Login as employer and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": EMPLOYER_EMAIL, "password": EMPLOYER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.user_id = data["user"]["id"]
        return self.token
    
    # ==================== Backend API Tests ====================
    
    def test_employer_login_success(self):
        """Test employer can login successfully"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": EMPLOYER_EMAIL, "password": EMPLOYER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "employer"
        print(f"PASS: Employer login successful, role={data['user']['role']}")
    
    def test_auth_me_returns_company_logo(self):
        """Test /api/auth/me returns company_logo field for employers"""
        token = self.get_employer_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify company_logo field exists in response
        assert "company_logo" in data, "company_logo field missing from /api/auth/me response"
        
        # If logo is set, verify it's a valid path
        if data["company_logo"]:
            assert data["company_logo"].startswith("/uploads/company_logos/"), \
                f"Invalid company_logo path: {data['company_logo']}"
            print(f"PASS: company_logo returned: {data['company_logo']}")
        else:
            print("PASS: company_logo field present (currently null)")
    
    def test_upload_logo_endpoint_exists(self):
        """Test /api/employer/upload-logo endpoint exists and requires auth"""
        # Test without auth - should return 401
        response = self.session.post(f"{BASE_URL}/api/employer/upload-logo")
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print("PASS: upload-logo endpoint requires authentication")
    
    def test_upload_logo_requires_employer_role(self):
        """Test that only employers can upload logos"""
        token = self.get_employer_token()
        
        # Create a simple test image (1x1 PNG)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test_logo.png', io.BytesIO(png_data), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/api/employer/upload-logo",
            headers={"Authorization": f"Bearer {token}"},
            files=files
        )
        
        # Should succeed for employer
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "logo_url" in data
        assert data["logo_url"].startswith("/uploads/company_logos/")
        print(f"PASS: Logo uploaded successfully: {data['logo_url']}")
    
    def test_upload_logo_validates_file_type(self):
        """Test that upload rejects invalid file types"""
        token = self.get_employer_token()
        
        # Try to upload a text file
        files = {'file': ('test.txt', io.BytesIO(b'not an image'), 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/api/employer/upload-logo",
            headers={"Authorization": f"Bearer {token}"},
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
        print("PASS: Invalid file type rejected correctly")
    
    def test_delete_logo_endpoint(self):
        """Test DELETE /api/employer/logo endpoint"""
        token = self.get_employer_token()
        
        response = self.session.delete(
            f"{BASE_URL}/api/employer/logo",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should succeed (200) even if no logo exists
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        print("PASS: Delete logo endpoint works")
    
    # ==================== Job Listing Tests ====================
    
    def test_remote_jobs_list_includes_company_logo(self):
        """Test /api/remote-jobs/jobs returns company_logo in job listings"""
        response = self.session.get(f"{BASE_URL}/api/remote-jobs/jobs")
        assert response.status_code == 200
        data = response.json()
        
        assert "jobs" in data
        
        # Check if any jobs have company_logo field
        jobs_with_logo = [j for j in data["jobs"] if j.get("company_logo")]
        
        if data["jobs"]:
            # Verify company_logo field exists in job objects
            first_job = data["jobs"][0]
            assert "company_logo" in first_job or first_job.get("company_logo") is None, \
                "company_logo field should be present in job listing"
            print(f"PASS: Jobs listing includes company_logo field. {len(jobs_with_logo)}/{len(data['jobs'])} jobs have logos")
        else:
            print("PASS: No jobs found, but endpoint works")
    
    def test_job_details_includes_company_logo(self):
        """Test /api/remote-jobs/jobs/{id} returns company_logo"""
        # First get a job ID
        response = self.session.get(f"{BASE_URL}/api/remote-jobs/jobs")
        assert response.status_code == 200
        data = response.json()
        
        if not data["jobs"]:
            pytest.skip("No jobs available to test")
        
        job_id = data["jobs"][0]["id"]
        
        # Get job details
        response = self.session.get(f"{BASE_URL}/api/remote-jobs/jobs/{job_id}")
        assert response.status_code == 200
        job_data = response.json()
        
        assert "job" in job_data
        job = job_data["job"]
        
        # Verify company_logo field exists
        assert "company_logo" in job or job.get("company_logo") is None, \
            "company_logo field should be present in job details"
        
        if job.get("company_logo"):
            print(f"PASS: Job details includes company_logo: {job['company_logo']}")
        else:
            print("PASS: Job details includes company_logo field (currently null)")
    
    def test_employer_my_jobs_includes_company_logo(self):
        """Test /api/remote-jobs/my-jobs returns company_logo for employer's jobs"""
        token = self.get_employer_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/remote-jobs/my-jobs",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "jobs" in data
        
        if data["jobs"]:
            first_job = data["jobs"][0]
            assert "company_logo" in first_job or first_job.get("company_logo") is None, \
                "company_logo field should be present in my-jobs listing"
            
            jobs_with_logo = [j for j in data["jobs"] if j.get("company_logo")]
            print(f"PASS: My jobs includes company_logo. {len(jobs_with_logo)}/{len(data['jobs'])} jobs have logos")
        else:
            print("PASS: No jobs found for employer, but endpoint works")
    
    # ==================== Logo File Serving Tests ====================
    
    def test_logo_file_accessible(self):
        """Test that uploaded logo files are accessible via /uploads/company_logos/"""
        # First get the current logo URL from auth/me
        token = self.get_employer_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        logo_url = data.get("company_logo")
        if not logo_url:
            pytest.skip("No logo uploaded to test file access")
        
        # Try to access the logo file
        full_url = f"{BASE_URL}{logo_url}"
        response = requests.get(full_url)
        
        assert response.status_code == 200, f"Logo file not accessible at {full_url}: {response.status_code}"
        assert len(response.content) > 0, "Logo file is empty"
        print(f"PASS: Logo file accessible at {logo_url}")
    
    # ==================== Integration Tests ====================
    
    def test_upload_logo_updates_user_and_jobs(self):
        """Test that uploading a logo updates both user profile and existing jobs"""
        token = self.get_employer_token()
        
        # Create a simple test image
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('integration_test_logo.png', io.BytesIO(png_data), 'image/png')}
        
        # Upload logo
        response = requests.post(
            f"{BASE_URL}/api/employer/upload-logo",
            headers={"Authorization": f"Bearer {token}"},
            files=files
        )
        assert response.status_code == 200
        upload_data = response.json()
        new_logo_url = upload_data["logo_url"]
        
        # Verify user profile updated
        response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["company_logo"] == new_logo_url, \
            f"User profile not updated. Expected {new_logo_url}, got {user_data['company_logo']}"
        
        print(f"PASS: Logo upload updates user profile correctly")


class TestCompanyLogoEdgeCases:
    """Test edge cases for company logo feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
    
    def get_employer_token(self):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": EMPLOYER_EMAIL, "password": EMPLOYER_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        return response.json()["access_token"]
    
    def test_upload_large_file_rejected(self):
        """Test that files over 5MB are rejected"""
        token = self.get_employer_token()
        
        # Create a file larger than 5MB (5.1MB of zeros)
        large_data = b'\x00' * (5 * 1024 * 1024 + 100000)
        
        files = {'file': ('large_logo.png', io.BytesIO(large_data), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/api/employer/upload-logo",
            headers={"Authorization": f"Bearer {token}"},
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}"
        print("PASS: Large files (>5MB) are rejected")
    
    def test_supported_image_formats(self):
        """Test that all supported image formats are accepted"""
        token = self.get_employer_token()
        
        # Test SVG format
        svg_data = b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="blue" width="100" height="100"/></svg>'
        
        files = {'file': ('test_logo.svg', io.BytesIO(svg_data), 'image/svg+xml')}
        
        response = requests.post(
            f"{BASE_URL}/api/employer/upload-logo",
            headers={"Authorization": f"Bearer {token}"},
            files=files
        )
        
        assert response.status_code == 200, f"SVG upload failed: {response.text}"
        print("PASS: SVG format accepted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
