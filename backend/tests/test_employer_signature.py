"""
Test suite for Employer Signature Feature
Tests: POST /api/employer/signature/draw, POST /api/employer/signature, 
       GET /api/employer/my-signature, DELETE /api/employer/signature
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials for employer
EMPLOYER_EMAIL = "employer@testcompany.com"
EMPLOYER_PASSWORD = "Test@1234"


class TestEmployerSignatureFeature:
    """Test suite for employer electronic signature functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with employer authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as employer
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": EMPLOYER_EMAIL, "password": EMPLOYER_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Employer login failed: {login_response.status_code} - {login_response.text}")
        
        login_data = login_response.json()
        self.token = login_data.get("access_token")
        self.user_role = login_data.get("user", {}).get("role")
        
        if not self.token:
            pytest.skip("No access token received from login")
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
        
        # Cleanup - delete signature after tests
        try:
            self.session.delete(f"{BASE_URL}/api/employer/signature")
        except:
            pass
    
    def test_employer_login_returns_employer_role(self):
        """Verify employer login returns correct role"""
        assert self.user_role == "employer", f"Expected role 'employer', got '{self.user_role}'"
        print(f"PASS: Employer login successful with role: {self.user_role}")
    
    def test_get_my_signature_endpoint_exists(self):
        """Test GET /api/employer/my-signature endpoint exists and returns 200"""
        response = self.session.get(f"{BASE_URL}/api/employer/my-signature")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain 'success' field"
        assert "signature_url" in data, "Response should contain 'signature_url' field"
        print(f"PASS: GET /api/employer/my-signature returns 200 with signature_url: {data.get('signature_url')}")
    
    def test_save_drawn_signature(self):
        """Test POST /api/employer/signature/draw - save drawn signature (base64)"""
        # Create a simple base64 PNG image (1x1 white pixel)
        # This is a minimal valid PNG for testing
        simple_png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        signature_data = f"data:image/png;base64,{simple_png_base64}"
        
        response = self.session.post(
            f"{BASE_URL}/api/employer/signature/draw",
            json={"signature_data": signature_data}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "signature_url" in data, "Response should contain 'signature_url'"
        assert data["signature_url"].startswith("/api/employer/signature/"), f"Invalid signature URL format: {data['signature_url']}"
        
        print(f"PASS: Drawn signature saved successfully. URL: {data['signature_url']}")
        return data["signature_url"]
    
    def test_signature_persistence_after_save(self):
        """Test that signature persists after saving - verify via GET /api/employer/my-signature"""
        # First save a signature
        simple_png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        signature_data = f"data:image/png;base64,{simple_png_base64}"
        
        save_response = self.session.post(
            f"{BASE_URL}/api/employer/signature/draw",
            json={"signature_data": signature_data}
        )
        assert save_response.status_code == 200, f"Save failed: {save_response.text}"
        saved_url = save_response.json().get("signature_url")
        
        # Now verify it persists via GET
        get_response = self.session.get(f"{BASE_URL}/api/employer/my-signature")
        assert get_response.status_code == 200, f"GET failed: {get_response.text}"
        
        data = get_response.json()
        assert data.get("signature_url") == saved_url, f"Signature URL mismatch. Expected: {saved_url}, Got: {data.get('signature_url')}"
        
        print(f"PASS: Signature persists correctly. URL: {data['signature_url']}")
    
    def test_signature_image_accessible(self):
        """Test that saved signature image is accessible via GET /api/employer/signature/{filename}"""
        # First save a signature
        simple_png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        signature_data = f"data:image/png;base64,{simple_png_base64}"
        
        save_response = self.session.post(
            f"{BASE_URL}/api/employer/signature/draw",
            json={"signature_data": signature_data}
        )
        assert save_response.status_code == 200
        signature_url = save_response.json().get("signature_url")
        
        # Access the signature image
        image_response = self.session.get(f"{BASE_URL}{signature_url}")
        
        assert image_response.status_code == 200, f"Expected 200, got {image_response.status_code}"
        assert "image" in image_response.headers.get("content-type", ""), f"Expected image content-type, got {image_response.headers.get('content-type')}"
        
        print(f"PASS: Signature image accessible at {signature_url}")
    
    def test_delete_signature(self):
        """Test DELETE /api/employer/signature - delete employer signature"""
        # First save a signature
        simple_png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        signature_data = f"data:image/png;base64,{simple_png_base64}"
        
        save_response = self.session.post(
            f"{BASE_URL}/api/employer/signature/draw",
            json={"signature_data": signature_data}
        )
        assert save_response.status_code == 200
        
        # Delete the signature
        delete_response = self.session.delete(f"{BASE_URL}/api/employer/signature")
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        
        # Verify signature is deleted
        get_response = self.session.get(f"{BASE_URL}/api/employer/my-signature")
        assert get_response.status_code == 200
        assert get_response.json().get("signature_url") is None, "Signature should be None after deletion"
        
        print("PASS: Signature deleted successfully")
    
    def test_save_drawn_signature_without_data_fails(self):
        """Test POST /api/employer/signature/draw fails without signature_data"""
        response = self.session.post(
            f"{BASE_URL}/api/employer/signature/draw",
            json={}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Empty signature_data correctly returns 400")
    
    def test_upload_signature_file(self):
        """Test POST /api/employer/signature - upload signature image file"""
        # Create a simple PNG file content
        simple_png_bytes = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": f"Bearer {self.token}"}
        
        files = {
            "file": ("test_signature.png", simple_png_bytes, "image/png")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employer/signature",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "signature_url" in data, "Response should contain 'signature_url'"
        
        print(f"PASS: Signature file uploaded successfully. URL: {data['signature_url']}")
    
    def test_upload_signature_invalid_file_type(self):
        """Test POST /api/employer/signature fails with invalid file type"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        files = {
            "file": ("test.txt", b"not an image", "text/plain")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employer/signature",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
        print("PASS: Invalid file type correctly rejected with 400")


class TestEmployerSignatureAccessControl:
    """Test access control for employer signature endpoints"""
    
    def test_non_employer_cannot_save_signature(self):
        """Test that non-employer users cannot save signatures"""
        session = requests.Session()
        
        # Try to login as a regular user (job seeker)
        # First check if we have a test job seeker account
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "Test@1234"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("No test job seeker account available")
        
        token = login_response.json().get("access_token")
        user_role = login_response.json().get("user", {}).get("role")
        
        if user_role == "employer":
            pytest.skip("Test user is an employer, cannot test access control")
        
        session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })
        
        # Try to save signature
        simple_png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        signature_data = f"data:image/png;base64,{simple_png_base64}"
        
        response = session.post(
            f"{BASE_URL}/api/employer/signature/draw",
            json={"signature_data": signature_data}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-employer, got {response.status_code}"
        print("PASS: Non-employer correctly denied access to save signature")
    
    def test_unauthenticated_cannot_access_signature_endpoints(self):
        """Test that unauthenticated requests are rejected"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try to get signature without auth
        response = session.get(f"{BASE_URL}/api/employer/my-signature")
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        
        # Try to save signature without auth
        response = session.post(
            f"{BASE_URL}/api/employer/signature/draw",
            json={"signature_data": "test"}
        )
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        
        print("PASS: Unauthenticated requests correctly rejected with 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
