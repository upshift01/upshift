#!/usr/bin/env python3
"""
Focused test for Reseller Customer Signup E2E Flow
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://ats-partner.preview.emergentagent.com/api"

# Test credentials
RESELLER_ADMIN_CREDS = {
    "email": "john@acmecareers.com", 
    "password": "acme123456"
}

class ResellerSignupTester:
    def __init__(self):
        self.reseller_admin_token = None
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        
        self.test_results.append(result)
        
        if success:
            print(f"✅ {test_name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {test_name}: {details}")
            self.failed_tests.append(result)
    
    def make_request(self, method, endpoint, headers=None, data=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
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
            return None, "Request timeout (30s)"
        except requests.exceptions.ConnectionError:
            return None, "Connection error - backend may be down"
        except Exception as e:
            return None, f"Request error: {str(e)}"
    
    def authenticate_reseller(self):
        """Authenticate as reseller admin"""
        print("🔐 Authenticating as Reseller Admin...")
        
        response, error = self.make_request("POST", "/auth/login", data=RESELLER_ADMIN_CREDS)
        
        if error:
            self.log_test("Reseller Admin Login", False, error)
            return False
        
        if not response.get("access_token"):
            self.log_test("Reseller Admin Login", False, "No access token returned")
            return False
        
        user = response.get("user", {})
        if user.get("role") != "reseller_admin":
            self.log_test("Reseller Admin Login", False, f"Expected role 'reseller_admin', got '{user.get('role')}'")
            return False
        
        self.reseller_admin_token = response["access_token"]
        self.log_test("Reseller Admin Login", True, f"Role: {user.get('role')}, Email: {user.get('email')}")
        return True
    
    def test_reseller_customer_signup_e2e(self):
        """Test Reseller Customer Signup E2E flow (white-label customer registration)"""
        print("\n🔗 Testing Reseller Customer Signup E2E Flow...")
        
        # Test 1: Platform Registration (without reseller)
        platform_customer_data = {
            "email": "platform_customer_test@test.com",
            "password": "TestPass123!",
            "full_name": "Platform Test Customer",
            "phone": "+27821111111"
        }
        
        response, error = self.make_request("POST", "/auth/register", data=platform_customer_data)
        if error:
            self.log_test("Platform Customer Registration", False, error)
        else:
            user = response.get("user", {})
            reseller_id = user.get("reseller_id")
            if reseller_id is None:
                self.log_test("Platform Customer Registration", True, f"Customer registered with reseller_id: null")
            else:
                self.log_test("Platform Customer Registration", False, f"Expected reseller_id: null, got: {reseller_id}")
        
        # Test 2: Get reseller ID by logging in as reseller
        if not self.reseller_admin_token:
            self.log_test("Reseller Customer Registration", False, "No reseller admin token available")
            return False
        
        reseller_headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
        
        # Get reseller profile to extract reseller_id
        response, error = self.make_request("GET", "/reseller/profile", headers=reseller_headers)
        if error:
            self.log_test("Get Reseller ID", False, error)
            return False
        
        reseller_id = response.get("id")
        if not reseller_id:
            self.log_test("Get Reseller ID", False, "Reseller ID not found in profile")
            return False
        
        self.log_test("Get Reseller ID", True, f"Reseller ID: {reseller_id}")
        
        # Test 3: Register customer with reseller_id
        reseller_customer_data = {
            "email": "reseller_customer_test@test.com",
            "password": "TestPass123!",
            "full_name": "Reseller Test Customer",
            "phone": "+27822222222",
            "reseller_id": reseller_id
        }
        
        response, error = self.make_request("POST", "/auth/register", data=reseller_customer_data)
        if error:
            self.log_test("Reseller Customer Registration", False, error)
        else:
            user = response.get("user", {})
            returned_reseller_id = user.get("reseller_id")
            if returned_reseller_id == reseller_id:
                self.log_test("Reseller Customer Registration", True, f"Customer registered with correct reseller_id: {reseller_id}")
            else:
                self.log_test("Reseller Customer Registration", False, f"Expected reseller_id: {reseller_id}, got: {returned_reseller_id}")
        
        # Test 4: Verify customer appears in reseller dashboard
        response, error = self.make_request("GET", "/reseller/customers", headers=reseller_headers)
        if error:
            self.log_test("Verify Customer in Reseller Dashboard", False, error)
        else:
            customers = response.get("customers", [])
            reseller_customer_found = any(
                customer.get("email") == "reseller_customer_test@test.com" and 
                customer.get("reseller_id") == reseller_id 
                for customer in customers
            )
            
            if reseller_customer_found:
                self.log_test("Verify Customer in Reseller Dashboard", True, "New customer appears in reseller's customer list")
            else:
                self.log_test("Verify Customer in Reseller Dashboard", False, "New customer not found in reseller's customer list")
        
        # Test 5: Test invalid reseller ID (should fall back to null)
        invalid_reseller_customer_data = {
            "email": "invalid_reseller_test@test.com",
            "password": "TestPass123!",
            "full_name": "Invalid Reseller Test Customer",
            "phone": "+27833333333",
            "reseller_id": "invalid-reseller-123"
        }
        
        response, error = self.make_request("POST", "/auth/register", data=invalid_reseller_customer_data)
        if error:
            self.log_test("Invalid Reseller ID Fallback", False, error)
        else:
            user = response.get("user", {})
            returned_reseller_id = user.get("reseller_id")
            if returned_reseller_id is None:
                self.log_test("Invalid Reseller ID Fallback", True, "Invalid reseller_id correctly fell back to null")
            else:
                self.log_test("Invalid Reseller ID Fallback", False, f"Expected reseller_id: null, got: {returned_reseller_id}")
        
        return True
    
    def run_test(self):
        """Run the focused test"""
        print("🚀 Starting Reseller Customer Signup E2E Test")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate_reseller():
            print("❌ Authentication failed - cannot proceed with tests")
            return False
        
        # Run the E2E test
        self.test_reseller_customer_signup_e2e()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
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
        
        print("\n" + "=" * 60)
        
        return failed_tests == 0

def main():
    """Main test runner"""
    tester = ResellerSignupTester()
    success = tester.run_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()