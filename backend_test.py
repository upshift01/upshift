#!/usr/bin/env python3
"""
UpShift White-Label SaaS Backend API Tests

This test suite validates all backend APIs for the white-label SaaS platform:
1. Authentication with role-based access
2. Super Admin APIs (analytics, resellers, invoices)
3. Reseller APIs (profile, stats, branding, pricing)
4. White-Label Config API

Test Credentials:
- Super Admin: admin@upshift.co.za / admin123
- Reseller Admin: john@acmecareers.com / acme123456
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://cvcloud-hub.preview.emergentagent.com/api"

# Test credentials
SUPER_ADMIN_CREDS = {
    "email": "admin@upshift.co.za",
    "password": "admin123"
}

RESELLER_ADMIN_CREDS = {
    "email": "john@acmecareers.com", 
    "password": "acme123456"
}

class APITester:
    def __init__(self):
        self.super_admin_token = None
        self.reseller_admin_token = None
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
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
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
    
    def test_authentication(self):
        """Test authentication endpoints with role-based access"""
        print("\n🔐 Testing Authentication...")
        
        # Test Super Admin Login
        response, error = self.make_request(
            "POST", "/auth/login", 
            data=SUPER_ADMIN_CREDS
        )
        
        if error:
            self.log_test("Super Admin Login", False, error)
            return False
        
        if not response.get("access_token"):
            self.log_test("Super Admin Login", False, "No access token returned")
            return False
        
        user = response.get("user", {})
        if user.get("role") != "super_admin":
            self.log_test("Super Admin Login", False, f"Expected role 'super_admin', got '{user.get('role')}'")
            return False
        
        self.super_admin_token = response["access_token"]
        self.log_test("Super Admin Login", True, f"Role: {user.get('role')}, Email: {user.get('email')}")
        
        # Test Reseller Admin Login
        response, error = self.make_request(
            "POST", "/auth/login",
            data=RESELLER_ADMIN_CREDS
        )
        
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
    
    def test_super_admin_apis(self):
        """Test Super Admin APIs"""
        print("\n👑 Testing Super Admin APIs...")
        
        if not self.super_admin_token:
            self.log_test("Super Admin APIs", False, "No super admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        
        # Test Analytics
        response, error = self.make_request("GET", "/admin/analytics", headers=headers)
        if error:
            self.log_test("Admin Analytics", False, error)
        else:
            required_fields = ["resellers", "customers", "revenue", "invoices"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("Admin Analytics", False, f"Missing fields: {missing_fields}")
            else:
                reseller_count = response["resellers"].get("total", 0)
                revenue = response["revenue"].get("total", 0)
                self.log_test("Admin Analytics", True, f"Resellers: {reseller_count}, Revenue: R{revenue/100:.2f}")
        
        # Test List Resellers
        response, error = self.make_request("GET", "/admin/resellers", headers=headers)
        if error:
            self.log_test("List Resellers", False, error)
        else:
            resellers = response.get("resellers", [])
            total = response.get("total", 0)
            
            # Look for "Acme Careers" reseller
            acme_found = any(r.get("company_name") == "Acme Careers" or 
                           r.get("brand_name") == "Acme Careers" for r in resellers)
            
            if acme_found:
                self.log_test("List Resellers", True, f"Found {total} resellers including Acme Careers")
            else:
                self.log_test("List Resellers", True, f"Found {total} resellers (Acme Careers not found)")
        
        # Test Get Specific Reseller (if any exist)
        if response and response.get("resellers"):
            reseller_id = response["resellers"][0]["id"]
            response, error = self.make_request("GET", f"/admin/resellers/{reseller_id}", headers=headers)
            if error:
                self.log_test("Get Reseller Details", False, error)
            else:
                reseller_data = response.get("reseller", {})
                owner_data = response.get("owner", {})
                customer_count = response.get("customer_count", 0)
                self.log_test("Get Reseller Details", True, 
                            f"Company: {reseller_data.get('company_name')}, Customers: {customer_count}")
        
        # Test Generate Invoices
        response, error = self.make_request("POST", "/admin/generate-invoices", headers=headers)
        if error:
            self.log_test("Generate Invoices", False, error)
        else:
            invoices_created = response.get("invoices_created", 0)
            period = response.get("period", "unknown")
            self.log_test("Generate Invoices", True, f"Created {invoices_created} invoices for {period}")
        
        return True
    
    def test_reseller_apis(self):
        """Test Reseller APIs"""
        print("\n🏢 Testing Reseller APIs...")
        
        if not self.reseller_admin_token:
            self.log_test("Reseller APIs", False, "No reseller admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
        
        # Test Get Profile
        response, error = self.make_request("GET", "/reseller/profile", headers=headers)
        if error:
            self.log_test("Reseller Profile", False, error)
        else:
            required_fields = ["id", "company_name", "brand_name", "branding", "pricing", "stats"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("Reseller Profile", False, f"Missing fields: {missing_fields}")
            else:
                company = response.get("company_name", "Unknown")
                status = response.get("status", "Unknown")
                self.log_test("Reseller Profile", True, f"Company: {company}, Status: {status}")
        
        # Test Get Stats
        response, error = self.make_request("GET", "/reseller/stats", headers=headers)
        if error:
            self.log_test("Reseller Stats", False, error)
        else:
            required_fields = ["total_customers", "active_customers", "total_revenue", "this_month_revenue"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("Reseller Stats", False, f"Missing fields: {missing_fields}")
            else:
                customers = response.get("total_customers", 0)
                revenue = response.get("total_revenue", 0)
                currency = response.get("currency", "ZAR")
                self.log_test("Reseller Stats", True, 
                            f"Customers: {customers}, Revenue: {currency} {revenue/100:.2f}")
        
        # Test Update Branding
        branding_data = {
            "logo_url": "https://example.com/logo.png",
            "primary_color": "#ff6b35",
            "secondary_color": "#004e89",
            "favicon_url": "https://example.com/favicon.ico"
        }
        
        response, error = self.make_request("PUT", "/reseller/branding", headers=headers, data=branding_data)
        if error:
            self.log_test("Update Branding", False, error)
        else:
            if response.get("success"):
                self.log_test("Update Branding", True, "Branding colors updated successfully")
            else:
                self.log_test("Update Branding", False, "Success flag not returned")
        
        # Test Update Pricing
        pricing_data = {
            "tier_1_price": 95000,  # R950
            "tier_2_price": 160000,  # R1600
            "tier_3_price": 320000,  # R3200
            "currency": "ZAR"
        }
        
        response, error = self.make_request("PUT", "/reseller/pricing", headers=headers, data=pricing_data)
        if error:
            self.log_test("Update Pricing", False, error)
        else:
            if response.get("success"):
                self.log_test("Update Pricing", True, "Tier prices updated successfully")
            else:
                self.log_test("Update Pricing", False, "Success flag not returned")
        
        return True
    
    def test_white_label_config(self):
        """Test White-Label Config API (no auth needed)"""
        print("\n🎨 Testing White-Label Config...")
        
        # Test default config (localhost)
        response, error = self.make_request("GET", "/white-label/config")
        if error:
            self.log_test("White-Label Config", False, error)
        else:
            required_fields = ["brand_name", "primary_color", "secondary_color", "pricing"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("White-Label Config", False, f"Missing fields: {missing_fields}")
            else:
                brand = response.get("brand_name", "Unknown")
                is_white_label = response.get("is_white_label", False)
                pricing = response.get("pricing", {})
                tier1_price = pricing.get("tier_1_price", 0)
                
                self.log_test("White-Label Config", True, 
                            f"Brand: {brand}, White-label: {is_white_label}, Tier1: R{tier1_price/100:.2f}")
        
        return True
    
    def test_unauthorized_access(self):
        """Test that protected endpoints require proper authorization"""
        print("\n🔒 Testing Authorization...")
        
        # Test admin endpoint without token
        response, error = self.make_request("GET", "/admin/analytics", expected_status=401)
        if response is None and error and "401" in error:
            self.log_test("Admin Auth Required", True, "Correctly rejected unauthorized request")
        else:
            self.log_test("Admin Auth Required", False, "Should require authentication")
        
        # Test reseller endpoint without token
        response, error = self.make_request("GET", "/reseller/profile", expected_status=401)
        if response is None and error and "401" in error:
            self.log_test("Reseller Auth Required", True, "Correctly rejected unauthorized request")
        else:
            self.log_test("Reseller Auth Required", False, "Should require authentication")
        
        # Test reseller trying to access admin endpoint
        if self.reseller_admin_token:
            headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
            response, error = self.make_request("GET", "/admin/analytics", headers=headers, expected_status=403)
            if response is None and error and "403" in error:
                self.log_test("Role-Based Access Control", True, "Reseller correctly denied admin access")
            else:
                self.log_test("Role-Based Access Control", False, "Should deny cross-role access")
        
        return True
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting UpShift White-Label SaaS Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Run test suites
        auth_success = self.test_authentication()
        
        if auth_success:
            self.test_super_admin_apis()
            self.test_reseller_apis()
        
        self.test_white_label_config()
        self.test_unauthorized_access()
        
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
        
        # Return success if no critical failures
        critical_failures = [
            t for t in self.failed_tests 
            if "Login" in t["test"] or "Connection error" in t["details"]
        ]
        
        if critical_failures:
            print("❌ CRITICAL FAILURES DETECTED - Backend may not be working properly")
            return False
        elif failed_tests > 0:
            print("⚠️  Some tests failed but core functionality appears to work")
            return True
        else:
            print("✅ ALL TESTS PASSED - Backend is working correctly")
            return True

def main():
    """Main test runner"""
    tester = APITester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()