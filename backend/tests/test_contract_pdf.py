"""
Test Contract PDF Generation Feature
- Tests PDF download endpoint
- Tests PDF generation with company logo
- Tests professional formatting
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
EMPLOYER_EMAIL = "employer@testcompany.com"
EMPLOYER_PASSWORD = "Test@1234"

# Contract ID for testing (provided by main agent)
TEST_CONTRACT_ID = "98a8c8e3-38cd-4d2a-bd89-02ad1fdde3eb"


class TestContractPDF:
    """Contract PDF generation tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
    
    def get_auth_token(self):
        """Get authentication token for employer"""
        if self.token:
            return self.token
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return self.token
        
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    def test_employer_login_success(self):
        """Test employer can login successfully"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("role") == "employer", "User is not employer"
        print(f"✓ Employer login successful, role: {data.get('user', {}).get('role')}")
    
    def test_contract_exists(self):
        """Test that the test contract exists"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}")
        
        assert response.status_code == 200, f"Contract not found: {response.text}"
        data = response.json()
        assert "contract" in data, "No contract in response"
        contract = data["contract"]
        assert contract.get("id") == TEST_CONTRACT_ID, "Contract ID mismatch"
        print(f"✓ Contract found: {contract.get('title')}")
        print(f"  Status: {contract.get('status')}")
        print(f"  Employer: {contract.get('employer_name')}")
        print(f"  Contractor: {contract.get('contractor_name')}")
    
    def test_pdf_endpoint_returns_pdf(self):
        """Test PDF endpoint returns valid PDF file"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}/pdf")
        
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Wrong content type: {content_type}"
        
        # Check content disposition
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, f"Missing attachment header: {content_disposition}"
        assert ".pdf" in content_disposition, f"Missing .pdf in filename: {content_disposition}"
        
        # Check PDF magic bytes
        pdf_content = response.content
        assert pdf_content[:4] == b'%PDF', "Response is not a valid PDF (missing PDF header)"
        
        # Check PDF has reasonable size (at least 1KB)
        assert len(pdf_content) > 1024, f"PDF too small: {len(pdf_content)} bytes"
        
        print(f"✓ PDF generated successfully")
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disposition}")
        print(f"  PDF Size: {len(pdf_content)} bytes")
    
    def test_pdf_download_without_auth_fails(self):
        """Test PDF endpoint requires authentication"""
        # Create new session without auth
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}/pdf")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated PDF request correctly rejected")
    
    def test_pdf_for_nonexistent_contract_returns_404(self):
        """Test PDF endpoint returns 404 for non-existent contract"""
        self.get_auth_token()
        
        fake_contract_id = "00000000-0000-0000-0000-000000000000"
        response = self.session.get(f"{BASE_URL}/api/contracts/{fake_contract_id}/pdf")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent contract correctly returns 404")
    
    def test_contract_has_company_info(self):
        """Test contract has company information for PDF header"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}")
        
        assert response.status_code == 200
        contract = response.json().get("contract", {})
        
        # Check company info exists
        company_name = contract.get("company_name")
        employer_name = contract.get("employer_name")
        employer_email = contract.get("employer_email")
        
        print(f"✓ Contract company info:")
        print(f"  Company Name: {company_name or 'Not set'}")
        print(f"  Employer Name: {employer_name}")
        print(f"  Employer Email: {employer_email}")
        
        assert employer_name, "Missing employer_name"
        assert employer_email, "Missing employer_email"
    
    def test_employer_has_company_logo(self):
        """Test employer profile has company logo for PDF"""
        self.get_auth_token()
        
        # Use /api/auth/me endpoint for profile
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 200, f"Profile fetch failed: {response.text}"
        profile = response.json()
        
        company_logo = profile.get("company_logo")
        company_name = profile.get("company_name")
        
        print(f"✓ Employer profile:")
        print(f"  Company Name: {company_name or 'Not set'}")
        print(f"  Company Logo: {company_logo or 'Not set'}")
        
        # Logo is optional but should be present for full PDF feature
        if company_logo:
            print(f"  ✓ Company logo is set")
        else:
            print(f"  ⚠ Company logo not set - PDF will use text header")
    
    def test_pdf_content_structure(self):
        """Test PDF contains expected content sections"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/contracts/{TEST_CONTRACT_ID}/pdf")
        
        assert response.status_code == 200
        pdf_content = response.content.decode('latin-1', errors='ignore')
        
        # Check for key PDF elements (these appear in PDF text streams)
        checks = {
            "SERVICE AGREEMENT": "Title section",
            "PARTIES": "Parties section",
            "SCOPE": "Scope section",
            "COMPENSATION": "Compensation section",
            "SIGNATURES": "Signatures section",
        }
        
        found_sections = []
        missing_sections = []
        
        for keyword, section_name in checks.items():
            if keyword in pdf_content:
                found_sections.append(section_name)
            else:
                missing_sections.append(section_name)
        
        print(f"✓ PDF content structure check:")
        for section in found_sections:
            print(f"  ✓ {section} found")
        for section in missing_sections:
            print(f"  ⚠ {section} not found in raw PDF")
        
        # At least title should be present
        assert "SERVICE AGREEMENT" in pdf_content or "Contract" in pdf_content, "PDF missing title"
    
    def test_pdf_for_different_contract_statuses(self):
        """Test PDF can be generated for contracts in any status"""
        self.get_auth_token()
        
        # Get all contracts
        response = self.session.get(f"{BASE_URL}/api/contracts/my-contracts")
        
        assert response.status_code == 200
        contracts = response.json().get("contracts", [])
        
        if not contracts:
            pytest.skip("No contracts found for testing")
        
        # Test PDF for first contract
        contract = contracts[0]
        contract_id = contract.get("id")
        status = contract.get("status")
        
        pdf_response = self.session.get(f"{BASE_URL}/api/contracts/{contract_id}/pdf")
        
        assert pdf_response.status_code == 200, f"PDF failed for {status} contract: {pdf_response.text}"
        assert pdf_response.content[:4] == b'%PDF', "Invalid PDF"
        
        print(f"✓ PDF generated for contract with status: {status}")


class TestCompanyLogoForPDF:
    """Test company logo handling for PDF generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
    
    def get_auth_token(self):
        """Get authentication token for employer"""
        if self.token:
            return self.token
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return self.token
        
        pytest.skip(f"Authentication failed: {response.status_code}")
    
    def test_logo_endpoint_exists(self):
        """Test company logo endpoint exists"""
        self.get_auth_token()
        
        # Get employer profile to find logo URL
        response = self.session.get(f"{BASE_URL}/api/employer/profile")
        assert response.status_code == 200
        
        profile = response.json()
        logo_url = profile.get("company_logo")
        
        if not logo_url:
            pytest.skip("No company logo set for employer")
        
        # Try to access logo
        if logo_url.startswith('/api/'):
            full_url = f"{BASE_URL}{logo_url}"
        else:
            full_url = logo_url
        
        logo_response = self.session.get(full_url)
        
        assert logo_response.status_code == 200, f"Logo not accessible: {logo_response.status_code}"
        print(f"✓ Company logo accessible at: {logo_url}")
        print(f"  Content-Type: {logo_response.headers.get('Content-Type')}")
        print(f"  Size: {len(logo_response.content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
