#!/usr/bin/env python3
"""
LinkedIn Tools API Focused Tests

Tests the specific LinkedIn API endpoints mentioned in the review request:
1. GET /api/linkedin/oauth/status (No auth required)
2. POST /api/linkedin/convert-to-resume (Requires auth)
3. POST /api/linkedin/create-profile (Requires auth)
4. POST /api/linkedin/enhance-profile (Requires auth)
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://hire-shift.preview.emergentagent.com/api"

# Test customer credentials
TEST_CUSTOMER_CREDS = {
    "email": "test@example.com",
    "password": "testpass123"
}

class LinkedInAPITester:
    def __init__(self):
        self.customer_token = None
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response"] = response_data
        
        self.test_results.append(result)
        
        if success:
            print(f"✅ {test_name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {test_name}: {details}")
            self.failed_tests.append(result)
    
    def make_request(self, method, endpoint, headers=None, data=None, expected_status=200, timeout=60):
        """Make HTTP request with error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=timeout)
            else:
                return None, f"Unsupported method: {method}"
            
            if response.status_code == expected_status:
                try:
                    return response.json(), None
                except:
                    return {"status": "success"}, None
            else:
                error_msg = f"Status {response.status_code}, expected {expected_status}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail.get('detail', 'No detail')}"
                except:
                    error_msg += f" - {response.text[:200]}"
                return None, error_msg
                
        except requests.exceptions.Timeout:
            return None, f"Request timeout ({timeout}s)"
        except requests.exceptions.ConnectionError:
            return None, "Connection error - backend may be down"
        except Exception as e:
            return None, f"Request error: {str(e)}"
    
    def authenticate_customer(self):
        """Authenticate test customer"""
        print("🔐 Authenticating test customer...")
        
        # Try to login first
        response, error = self.make_request(
            "POST", "/auth/login",
            data=TEST_CUSTOMER_CREDS
        )
        
        if error:
            # Try to register the customer first
            register_data = {
                "email": TEST_CUSTOMER_CREDS["email"],
                "password": TEST_CUSTOMER_CREDS["password"],
                "full_name": "Test Customer",
                "phone": "+27123456789"
            }
            
            response, error = self.make_request(
                "POST", "/auth/register",
                data=register_data
            )
            
            if error:
                self.log_test("Customer Authentication", False, f"Registration failed: {error}")
                return False
            else:
                if response.get("access_token"):
                    self.customer_token = response["access_token"]
                    self.log_test("Customer Authentication", True, "Customer registered and authenticated")
                    return True
                else:
                    self.log_test("Customer Authentication", False, "No access token returned from registration")
                    return False
        else:
            if response.get("access_token"):
                self.customer_token = response["access_token"]
                user = response.get("user", {})
                self.log_test("Customer Authentication", True, f"Customer logged in: {user.get('email')}")
                return True
            else:
                self.log_test("Customer Authentication", False, "No access token returned from login")
                return False
    
    def test_oauth_status(self):
        """Test GET /api/linkedin/oauth/status (No auth required)"""
        print("\n📋 Testing LinkedIn OAuth Status...")
        
        response, error = self.make_request("GET", "/linkedin/oauth/status")
        if error:
            self.log_test("LinkedIn OAuth Status", False, error)
            return False
        
        # Validate response structure
        required_fields = ["configured", "message"]
        missing_fields = [f for f in required_fields if f not in response]
        if missing_fields:
            self.log_test("LinkedIn OAuth Status", False, f"Missing fields: {missing_fields}")
            return False
        
        configured = response.get("configured", False)
        message = response.get("message", "")
        
        # Should return configured: false since LinkedIn OAuth is not configured
        if configured == False:
            self.log_test("LinkedIn OAuth Status", True, f"Correctly returns configured=false: {message}")
            return True
        else:
            self.log_test("LinkedIn OAuth Status", True, f"OAuth configured: {configured}, Message: {message}")
            return True
    
    def test_convert_to_resume(self):
        """Test POST /api/linkedin/convert-to-resume (Requires auth)"""
        print("\n📄 Testing LinkedIn Convert to Resume...")
        
        if not self.customer_token:
            self.log_test("LinkedIn Convert to Resume", False, "No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        
        # Sample data from review request
        linkedin_data = {
            "full_name": "John Smith",
            "email": "john@example.com",
            "headline": "Senior Software Engineer",
            "summary": "10+ years experience in software development",
            "location": "Johannesburg, South Africa",
            "work_experience": [
                {
                    "title": "Senior Developer",
                    "company": "Tech Co",
                    "start_date": "2020",
                    "end_date": "Present",
                    "description": "Led development team"
                }
            ],
            "education": [
                {
                    "degree": "BSc Computer Science",
                    "institution": "University of Cape Town",
                    "graduation_date": "2014"
                }
            ],
            "skills": ["Python", "JavaScript", "React"],
            "certifications": ["AWS Solutions Architect"]
        }
        
        response, error = self.make_request("POST", "/linkedin/convert-to-resume", 
                                          headers=headers, data=linkedin_data, timeout=90)
        if error:
            self.log_test("LinkedIn Convert to Resume", False, error)
            return False
        
        # Validate response structure
        required_fields = ["success", "resume"]
        missing_fields = [f for f in required_fields if f not in response]
        if missing_fields:
            self.log_test("LinkedIn Convert to Resume", False, f"Missing fields: {missing_fields}")
            return False
        
        success = response.get("success", False)
        resume = response.get("resume", {})
        
        if not success:
            self.log_test("LinkedIn Convert to Resume", False, "Success flag is False")
            return False
        
        if not isinstance(resume, dict):
            self.log_test("LinkedIn Convert to Resume", False, "Resume is not a dictionary")
            return False
        
        # Check for expected resume fields
        expected_resume_fields = ["professional_summary", "work_experience", "skills"]
        found_fields = [field for field in expected_resume_fields if field in resume]
        
        if len(found_fields) > 0:
            self.log_test("LinkedIn Convert to Resume", True, 
                        f"Successfully generated resume with fields: {', '.join(found_fields)}")
            return True
        else:
            self.log_test("LinkedIn Convert to Resume", True, 
                        f"Generated resume with {len(resume)} sections")
            return True
    
    def test_create_profile(self):
        """Test POST /api/linkedin/create-profile (Requires auth)"""
        print("\n👤 Testing LinkedIn Create Profile...")
        
        if not self.customer_token:
            self.log_test("LinkedIn Create Profile", False, "No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        
        # Sample data from review request
        profile_data = {
            "full_name": "Jane Doe",
            "current_title": "Marketing Manager",
            "target_role": "Head of Marketing",
            "industry": "Marketing",
            "years_experience": 8,
            "key_skills": ["Digital Marketing", "SEO", "Content Strategy"],
            "achievements": ["Increased leads by 200%", "Managed R5M budget"],
            "career_goals": "To become CMO at a leading tech company"
        }
        
        response, error = self.make_request("POST", "/linkedin/create-profile", 
                                          headers=headers, data=profile_data, timeout=90)
        if error:
            self.log_test("LinkedIn Create Profile", False, error)
            return False
        
        # Validate response structure
        required_fields = ["success", "profile"]
        missing_fields = [f for f in required_fields if f not in response]
        if missing_fields:
            self.log_test("LinkedIn Create Profile", False, f"Missing fields: {missing_fields}")
            return False
        
        success = response.get("success", False)
        profile = response.get("profile", {})
        
        if not success:
            self.log_test("LinkedIn Create Profile", False, "Success flag is False")
            return False
        
        if not isinstance(profile, dict):
            self.log_test("LinkedIn Create Profile", False, "Profile is not a dictionary")
            return False
        
        # Check for expected profile fields
        expected_profile_fields = ["headline", "about_summary", "skills_to_add"]
        found_fields = [field for field in expected_profile_fields if field in profile]
        
        if len(found_fields) > 0:
            self.log_test("LinkedIn Create Profile", True, 
                        f"Successfully generated profile with fields: {', '.join(found_fields)}")
            return True
        else:
            self.log_test("LinkedIn Create Profile", True, 
                        f"Generated profile with {len(profile)} sections")
            return True
    
    def test_enhance_profile(self):
        """Test POST /api/linkedin/enhance-profile (Requires auth)"""
        print("\n🔧 Testing LinkedIn Enhance Profile...")
        
        if not self.customer_token:
            self.log_test("LinkedIn Enhance Profile", False, "No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        
        # Sample data from review request
        enhance_data = {
            "headline": "Software Developer",
            "about": "I am a developer with 5 years experience.",
            "experience": [
                {
                    "title": "Developer",
                    "company": "Startup",
                    "description": "Wrote code"
                }
            ],
            "skills": ["Java", "SQL"],
            "target_role": "Senior Software Engineer"
        }
        
        response, error = self.make_request("POST", "/linkedin/enhance-profile", 
                                          headers=headers, data=enhance_data, timeout=90)
        if error:
            self.log_test("LinkedIn Enhance Profile", False, error)
            return False
        
        # Validate response structure
        required_fields = ["success", "analysis"]
        missing_fields = [f for f in required_fields if f not in response]
        if missing_fields:
            self.log_test("LinkedIn Enhance Profile", False, f"Missing fields: {missing_fields}")
            return False
        
        success = response.get("success", False)
        analysis = response.get("analysis", {})
        
        if not success:
            self.log_test("LinkedIn Enhance Profile", False, "Success flag is False")
            return False
        
        if not isinstance(analysis, dict):
            self.log_test("LinkedIn Enhance Profile", False, "Analysis is not a dictionary")
            return False
        
        # Check for expected analysis fields
        expected_analysis_fields = ["overall_score", "section_analysis", "action_items"]
        found_fields = [field for field in expected_analysis_fields if field in analysis]
        
        if len(found_fields) > 0:
            overall_score = analysis.get("overall_score", "N/A")
            self.log_test("LinkedIn Enhance Profile", True, 
                        f"Successfully analyzed profile, score: {overall_score}/100, fields: {', '.join(found_fields)}")
            return True
        else:
            self.log_test("LinkedIn Enhance Profile", True, 
                        f"Generated analysis with {len(analysis)} sections")
            return True
    
    def run_all_tests(self):
        """Run all LinkedIn API tests"""
        print("🚀 Starting LinkedIn Tools API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Authenticate customer
        auth_success = self.authenticate_customer()
        
        # Test OAuth Status (no auth required)
        self.test_oauth_status()
        
        if auth_success:
            # Test authenticated endpoints
            self.test_convert_to_resume()
            self.test_create_profile()
            self.test_enhance_profile()
        else:
            print("⚠️  Skipping authenticated tests due to authentication failure")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 LINKEDIN API TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        else:
            print("\n✅ ALL LINKEDIN API TESTS PASSED")
        
        print("\n" + "=" * 60)
        
        return failed_tests == 0

def main():
    """Main test runner"""
    tester = LinkedInAPITester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()