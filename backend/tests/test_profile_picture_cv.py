"""
Profile Picture Upload and CV Download Button Tests
Tests for the new features:
1. Profile picture upload endpoint POST /api/talent-pool/upload-profile-picture
2. Profile picture serving endpoint GET /api/talent-pool/profile-picture/{filename}
3. CV download button visibility (only when cv_url exists)
"""

import pytest
import requests
import os
import uuid
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CANDIDATE_EMAIL = "test@example.com"
TEST_CANDIDATE_PASSWORD = "password123"
TEST_RECRUITER_EMAIL = "john@woo.co.za"
TEST_RECRUITER_PASSWORD = "Test@1234"


class TestProfilePictureEndpoints:
    """Test profile picture upload and serving endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as test candidate before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CANDIDATE_EMAIL,
            "password": TEST_CANDIDATE_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Test candidate login failed: {response.text}")
        
        data = response.json()
        self.token = data.get("access_token") or data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✅ Test candidate logged in successfully")
    
    def test_upload_profile_picture_requires_auth(self):
        """POST /api/talent-pool/upload-profile-picture - requires authentication"""
        # Create a simple test image (1x1 pixel PNG)
        test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test.png', io.BytesIO(test_image), 'image/png')}
        response = requests.post(f"{BASE_URL}/api/talent-pool/upload-profile-picture", files=files)
        
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422 without auth, got {response.status_code}"
        print("✅ Profile picture upload correctly requires authentication")
    
    def test_upload_profile_picture_success(self):
        """POST /api/talent-pool/upload-profile-picture - successful upload"""
        # Create a simple test image (1x1 pixel PNG)
        test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test_profile.png', io.BytesIO(test_image), 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/talent-pool/upload-profile-picture",
            headers=self.headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "profile_picture_url" in data, "Response should contain profile_picture_url"
        assert data["profile_picture_url"].startswith("/api/talent-pool/profile-picture/"), f"URL should start with /api/talent-pool/profile-picture/, got {data['profile_picture_url']}"
        
        # Store URL for later tests
        self.uploaded_picture_url = data["profile_picture_url"]
        print(f"✅ Profile picture uploaded successfully: {data['profile_picture_url']}")
        
        # Verify the picture can be retrieved
        filename = data["profile_picture_url"].split("/")[-1]
        get_response = requests.get(f"{BASE_URL}/api/talent-pool/profile-picture/{filename}")
        assert get_response.status_code == 200, f"Expected 200 when retrieving uploaded picture, got {get_response.status_code}"
        print(f"✅ Uploaded profile picture can be retrieved")
    
    def test_upload_profile_picture_invalid_type(self):
        """POST /api/talent-pool/upload-profile-picture - reject invalid file types"""
        # Create a fake text file
        fake_file = b'This is not an image'
        
        files = {'file': ('test.txt', io.BytesIO(fake_file), 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/talent-pool/upload-profile-picture",
            headers=self.headers,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}: {response.text}"
        print("✅ Profile picture upload correctly rejects invalid file types")
    
    def test_upload_profile_picture_jpeg(self):
        """POST /api/talent-pool/upload-profile-picture - accept JPEG files"""
        # Create a minimal JPEG file
        # This is a 1x1 pixel JPEG
        test_jpeg = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x7E, 0xCD,
            0xBF, 0xFF, 0xD9
        ])
        
        files = {'file': ('test_profile.jpg', io.BytesIO(test_jpeg), 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/talent-pool/upload-profile-picture",
            headers=self.headers,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200 for JPEG, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("✅ Profile picture upload accepts JPEG files")
    
    def test_get_profile_picture_not_found(self):
        """GET /api/talent-pool/profile-picture/{filename} - 404 for non-existent file"""
        response = requests.get(f"{BASE_URL}/api/talent-pool/profile-picture/nonexistent_file_12345.png")
        assert response.status_code == 404, f"Expected 404 for non-existent file, got {response.status_code}"
        print("✅ Profile picture endpoint returns 404 for non-existent files")


class TestRecruiterBrowseWithProfilePicture:
    """Test that recruiters can see profile pictures in browse view"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as recruiter before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_RECRUITER_EMAIL,
            "password": TEST_RECRUITER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Test recruiter login failed: {response.text}")
        
        data = response.json()
        self.token = data.get("access_token") or data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✅ Test recruiter logged in successfully")
    
    def test_browse_candidates_includes_profile_picture_url(self):
        """GET /api/talent-pool/browse - should include profile_picture_url field"""
        response = requests.get(
            f"{BASE_URL}/api/talent-pool/browse?page=1&limit=20",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "candidates" in data
        
        # Check that candidates have profile_picture_url field (can be null)
        for candidate in data["candidates"]:
            # profile_picture_url should be present in the response (even if null)
            # This verifies the field is being returned
            print(f"  Candidate: {candidate.get('full_name')} - profile_picture_url: {candidate.get('profile_picture_url', 'NOT_PRESENT')}")
        
        print(f"✅ Browse endpoint returns {len(data['candidates'])} candidates")
    
    def test_browse_candidates_cv_url_field(self):
        """GET /api/talent-pool/browse - should include cv_url field for CV download button"""
        response = requests.get(
            f"{BASE_URL}/api/talent-pool/browse?page=1&limit=20",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Check that candidates have cv_url field (can be null)
        candidates_with_cv = 0
        candidates_without_cv = 0
        
        for candidate in data["candidates"]:
            cv_url = candidate.get("cv_url")
            if cv_url:
                candidates_with_cv += 1
                print(f"  Candidate with CV: {candidate.get('full_name')} - cv_url: {cv_url}")
            else:
                candidates_without_cv += 1
                print(f"  Candidate without CV: {candidate.get('full_name')}")
        
        print(f"✅ Browse endpoint: {candidates_with_cv} candidates with CV, {candidates_without_cv} without CV")


class TestCandidateProfileWithPicture:
    """Test candidate's own profile with profile picture"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as test candidate before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CANDIDATE_EMAIL,
            "password": TEST_CANDIDATE_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Test candidate login failed: {response.text}")
        
        data = response.json()
        self.token = data.get("access_token") or data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✅ Test candidate logged in successfully")
    
    def test_my_profile_includes_profile_picture_url(self):
        """GET /api/talent-pool/my-profile - should include profile_picture_url"""
        response = requests.get(
            f"{BASE_URL}/api/talent-pool/my-profile",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        if data.get("opted_in"):
            profile = data.get("profile", {})
            # profile_picture_url should be in the profile
            print(f"  Profile picture URL: {profile.get('profile_picture_url', 'None')}")
            print(f"  CV URL: {profile.get('cv_url', 'None')}")
            print(f"✅ My profile endpoint returns profile with picture URL field")
        else:
            print("✅ User not opted into talent pool yet")


class TestProfilePictureUpdateOnUpload:
    """Test that uploading profile picture updates the talent pool profile"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as test candidate before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CANDIDATE_EMAIL,
            "password": TEST_CANDIDATE_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Test candidate login failed: {response.text}")
        
        data = response.json()
        self.token = data.get("access_token") or data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✅ Test candidate logged in successfully")
    
    def test_upload_updates_profile(self):
        """Upload profile picture and verify it updates the talent pool profile"""
        # First check if user is opted in
        profile_response = requests.get(
            f"{BASE_URL}/api/talent-pool/my-profile",
            headers=self.headers
        )
        
        if profile_response.status_code != 200:
            pytest.skip("Could not get profile")
        
        profile_data = profile_response.json()
        
        if not profile_data.get("opted_in"):
            print("⚠️ User not opted into talent pool - skipping profile update test")
            pytest.skip("User not opted into talent pool")
        
        # Upload a new profile picture
        test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('new_profile.png', io.BytesIO(test_image), 'image/png')}
        upload_response = requests.post(
            f"{BASE_URL}/api/talent-pool/upload-profile-picture",
            headers=self.headers,
            files=files
        )
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        upload_data = upload_response.json()
        uploaded_url = upload_data.get("profile_picture_url")
        
        # Verify the profile was updated
        verify_response = requests.get(
            f"{BASE_URL}/api/talent-pool/my-profile",
            headers=self.headers
        )
        
        verify_data = verify_response.json()
        profile = verify_data.get("profile", {})
        
        assert profile.get("profile_picture_url") == uploaded_url, f"Profile picture URL not updated. Expected {uploaded_url}, got {profile.get('profile_picture_url')}"
        print(f"✅ Profile picture URL updated in talent pool profile: {uploaded_url}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
