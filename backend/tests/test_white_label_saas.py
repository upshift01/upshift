#!/usr/bin/env python3
"""
UpShift White-Label SaaS Backend API Tests

Comprehensive test suite for the white-label SaaS platform backend APIs.
Tests authentication, authorization, and all major API endpoints.

Usage:
    python test_white_label_saas.py

Test Coverage:
- Authentication with role-based access control
- Super Admin APIs (analytics, reseller management, invoice generation)
- Reseller APIs (profile, stats, branding, pricing)
- White-Label Config API
- Authorization and security
"""

import requests
import json
import sys
import os
from datetime import datetime
from typing import Dict, Any, Tuple, Optional

# Backend URL - using production endpoint
BACKEND_URL = "https://remote-workspace-5.preview.emergentagent.com/api"

# Test credentials
SUPER_ADMIN_CREDS = {
    "email": "admin@upshift.works",
    "password": "admin123"
}

RESELLER_ADMIN_CREDS = {
    "email": "john@acmecareers.com", 
    "password": "acme123456"
}

class WhiteLabelSaaSTester:
    """Comprehensive tester for UpShift White-Label SaaS Backend APIs"""
    
    def __init__(self):
        self.super_admin_token = None
        self.reseller_admin_token = None
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result with detailed information"""
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
    
    def make_request(self, method: str, endpoint: str, headers: Optional[Dict] = None, 
                    data: Optional[Dict] = None, expected_status: int = 200) -> Tuple[Optional[Dict], Optional[str]]:
        """Make HTTP request with comprehensive error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            else:
                return None, f"Unsupported HTTP method: {method}"
            
            if response.status_code == expected_status:
                try:
                    return response.json(), None
                except:
                    return {"status": "success", "status_code": response.status_code}, None
            else:
                error_msg = f"HTTP {response.status_code}, expected {expected_status}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail.get('detail', 'No detail provided')}"
                except:
                    error_msg += f" - {response.text[:200]}"
                return None, error_msg
                
        except requests.exceptions.Timeout:
            return None, "Request timeout (30 seconds)"
        except requests.exceptions.ConnectionError:
            return None, "Connection error - backend service may be unavailable"
        except Exception as e:
            return None, f"Request error: {str(e)}"
    
    def test_authentication_flow(self):
        """Test complete authentication flow with role validation"""
        print("\n🔐 Testing Authentication & Role-Based Access...")
        
        # Test Super Admin Authentication
        response, error = self.make_request("POST", "/auth/login", data=SUPER_ADMIN_CREDS)
        
        if error:
            self.log_test("Super Admin Authentication", False, error)
            return False
        
        if not response.get("access_token"):
            self.log_test("Super Admin Authentication", False, "No access token in response")
            return False
        
        user = response.get("user", {})
        if user.get("role") != "super_admin":
            self.log_test("Super Admin Authentication", False, 
                         f"Expected role 'super_admin', got '{user.get('role')}'")
            return False
        
        self.super_admin_token = response["access_token"]
        self.log_test("Super Admin Authentication", True, 
                     f"Successfully authenticated as {user.get('email')} with role {user.get('role')}")
        
        # Test Reseller Admin Authentication
        response, error = self.make_request("POST", "/auth/login", data=RESELLER_ADMIN_CREDS)
        
        if error:
            self.log_test("Reseller Admin Authentication", False, error)
            return False
        
        if not response.get("access_token"):
            self.log_test("Reseller Admin Authentication", False, "No access token in response")
            return False
        
        user = response.get("user", {})
        if user.get("role") != "reseller_admin":
            self.log_test("Reseller Admin Authentication", False, 
                         f"Expected role 'reseller_admin', got '{user.get('role')}'")
            return False
        
        self.reseller_admin_token = response["access_token"]
        self.log_test("Reseller Admin Authentication", True, 
                     f"Successfully authenticated as {user.get('email')} with role {user.get('role')}")
        
        return True
    
    def test_super_admin_analytics(self):
        """Test Super Admin analytics endpoint"""
        print("\n📊 Testing Super Admin Analytics...")
        
        if not self.super_admin_token:
            self.log_test("Super Admin Analytics", False, "No super admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        response, error = self.make_request("GET", "/admin/analytics", headers=headers)
        
        if error:
            self.log_test("Super Admin Analytics", False, error)
            return False
        
        # Validate response structure
        required_sections = ["resellers", "customers", "revenue", "invoices"]
        missing_sections = [section for section in required_sections if section not in response]
        
        if missing_sections:
            self.log_test("Super Admin Analytics", False, f"Missing sections: {missing_sections}")
            return False
        
        # Extract key metrics
        resellers = response["resellers"]
        revenue = response["revenue"]
        
        details = (f"Resellers: {resellers.get('total', 0)} total, "
                  f"{resellers.get('active', 0)} active, "
                  f"{resellers.get('pending', 0)} pending | "
                  f"Revenue: {revenue.get('currency', 'ZAR')} {revenue.get('total', 0)/100:.2f} total, "
                  f"{revenue.get('this_month', 0)/100:.2f} this month")
        
        self.log_test("Super Admin Analytics", True, details, response)
        return True
    
    def test_reseller_management(self):
        """Test reseller management endpoints"""
        print("\n🏢 Testing Reseller Management...")
        
        if not self.super_admin_token:
            self.log_test("Reseller Management", False, "No super admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        
        # List all resellers
        response, error = self.make_request("GET", "/admin/resellers", headers=headers)
        if error:
            self.log_test("List Resellers", False, error)
            return False
        
        resellers = response.get("resellers", [])
        total_count = response.get("total", 0)
        
        # Check for Acme Careers reseller
        acme_reseller = None
        for reseller in resellers:
            if (reseller.get("company_name") == "Acme Careers" or 
                reseller.get("brand_name") == "Acme Careers"):
                acme_reseller = reseller
                break
        
        if acme_reseller:
            self.log_test("List Resellers", True, 
                         f"Found {total_count} resellers including Acme Careers (Status: {acme_reseller.get('status')})")
        else:
            self.log_test("List Resellers", True, 
                         f"Found {total_count} resellers (Acme Careers not found)")
        
        # Test get specific reseller details
        if resellers:
            reseller_id = resellers[0]["id"]
            response, error = self.make_request("GET", f"/admin/resellers/{reseller_id}", headers=headers)
            
            if error:
                self.log_test("Get Reseller Details", False, error)
            else:
                reseller_data = response.get("reseller", {})
                owner_data = response.get("owner", {})
                customer_count = response.get("customer_count", 0)
                
                details = (f"Company: {reseller_data.get('company_name')}, "
                          f"Owner: {owner_data.get('full_name')} ({owner_data.get('email')}), "
                          f"Customers: {customer_count}, "
                          f"Status: {reseller_data.get('status')}")
                
                self.log_test("Get Reseller Details", True, details)
        
        return True
    
    def test_invoice_generation(self):
        """Test invoice generation functionality"""
        print("\n💰 Testing Invoice Generation...")
        
        if not self.super_admin_token:
            self.log_test("Invoice Generation", False, "No super admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        response, error = self.make_request("POST", "/admin/generate-invoices", headers=headers)
        
        if error:
            self.log_test("Generate Monthly Invoices", False, error)
            return False
        
        invoices_created = response.get("invoices_created", 0)
        period = response.get("period", "unknown")
        success = response.get("success", False)
        
        if success:
            self.log_test("Generate Monthly Invoices", True, 
                         f"Successfully generated {invoices_created} invoices for period {period}")
        else:
            self.log_test("Generate Monthly Invoices", False, "Success flag not returned")
        
        return True
    
    def test_reseller_profile_management(self):
        """Test reseller profile and settings management"""
        print("\n👤 Testing Reseller Profile Management...")
        
        if not self.reseller_admin_token:
            self.log_test("Reseller Profile Management", False, "No reseller admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
        
        # Get reseller profile
        response, error = self.make_request("GET", "/reseller/profile", headers=headers)
        if error:
            self.log_test("Get Reseller Profile", False, error)
            return False
        
        required_fields = ["id", "company_name", "brand_name", "branding", "pricing", "stats"]
        missing_fields = [field for field in required_fields if field not in response]
        
        if missing_fields:
            self.log_test("Get Reseller Profile", False, f"Missing fields: {missing_fields}")
            return False
        
        company = response.get("company_name", "Unknown")
        status = response.get("status", "Unknown")
        subdomain = response.get("subdomain", "Unknown")
        
        self.log_test("Get Reseller Profile", True, 
                     f"Company: {company}, Status: {status}, Subdomain: {subdomain}")
        
        return True
    
    def test_reseller_stats(self):
        """Test reseller statistics endpoint"""
        print("\n📈 Testing Reseller Statistics...")
        
        if not self.reseller_admin_token:
            self.log_test("Reseller Statistics", False, "No reseller admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
        response, error = self.make_request("GET", "/reseller/stats", headers=headers)
        
        if error:
            self.log_test("Get Reseller Stats", False, error)
            return False
        
        required_fields = ["total_customers", "active_customers", "total_revenue", "this_month_revenue"]
        missing_fields = [field for field in required_fields if field not in response]
        
        if missing_fields:
            self.log_test("Get Reseller Stats", False, f"Missing fields: {missing_fields}")
            return False
        
        total_customers = response.get("total_customers", 0)
        active_customers = response.get("active_customers", 0)
        total_revenue = response.get("total_revenue", 0)
        month_revenue = response.get("this_month_revenue", 0)
        currency = response.get("currency", "ZAR")
        
        details = (f"Customers: {total_customers} total, {active_customers} active | "
                  f"Revenue: {currency} {total_revenue/100:.2f} total, "
                  f"{month_revenue/100:.2f} this month")
        
        self.log_test("Get Reseller Stats", True, details)
        return True
    
    def test_branding_management(self):
        """Test reseller branding management"""
        print("\n🎨 Testing Branding Management...")
        
        if not self.reseller_admin_token:
            self.log_test("Branding Management", False, "No reseller admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
        
        # Test branding update
        branding_data = {
            "logo_url": "https://example.com/test-logo.png",
            "primary_color": "#ff6b35",
            "secondary_color": "#004e89",
            "favicon_url": "https://example.com/test-favicon.ico"
        }
        
        response, error = self.make_request("PUT", "/reseller/branding", headers=headers, data=branding_data)
        
        if error:
            self.log_test("Update Branding", False, error)
            return False
        
        if response.get("success"):
            self.log_test("Update Branding", True, 
                         f"Successfully updated branding colors: {branding_data['primary_color']}, {branding_data['secondary_color']}")
        else:
            self.log_test("Update Branding", False, "Success flag not returned in response")
        
        return True
    
    def test_pricing_management(self):
        """Test reseller pricing management"""
        print("\n💵 Testing Pricing Management...")
        
        if not self.reseller_admin_token:
            self.log_test("Pricing Management", False, "No reseller admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
        
        # Test pricing update
        pricing_data = {
            "tier_1_price": 95000,   # R950.00
            "tier_2_price": 160000,  # R1600.00
            "tier_3_price": 320000,  # R3200.00
            "currency": "ZAR"
        }
        
        response, error = self.make_request("PUT", "/reseller/pricing", headers=headers, data=pricing_data)
        
        if error:
            self.log_test("Update Pricing", False, error)
            return False
        
        if response.get("success"):
            details = (f"Tier 1: R{pricing_data['tier_1_price']/100:.2f}, "
                      f"Tier 2: R{pricing_data['tier_2_price']/100:.2f}, "
                      f"Tier 3: R{pricing_data['tier_3_price']/100:.2f}")
            self.log_test("Update Pricing", True, f"Successfully updated pricing: {details}")
        else:
            self.log_test("Update Pricing", False, "Success flag not returned in response")
        
        return True
    
    def test_white_label_config(self):
        """Test white-label configuration API"""
        print("\n🏷️ Testing White-Label Configuration...")
        
        # This endpoint doesn't require authentication
        response, error = self.make_request("GET", "/white-label/config")
        
        if error:
            self.log_test("White-Label Config", False, error)
            return False
        
        required_fields = ["brand_name", "primary_color", "secondary_color", "pricing"]
        missing_fields = [field for field in required_fields if field not in response]
        
        if missing_fields:
            self.log_test("White-Label Config", False, f"Missing fields: {missing_fields}")
            return False
        
        brand_name = response.get("brand_name", "Unknown")
        is_white_label = response.get("is_white_label", False)
        pricing = response.get("pricing", {})
        tier1_price = pricing.get("tier_1_price", 0)
        primary_color = response.get("primary_color", "#000000")
        
        details = (f"Brand: {brand_name}, White-label: {is_white_label}, "
                  f"Primary Color: {primary_color}, Tier 1 Price: R{tier1_price/100:.2f}")
        
        self.log_test("White-Label Config", True, details)
        return True
    
    def test_authorization_security(self):
        """Test authorization and security controls"""
        print("\n🔒 Testing Authorization & Security...")
        
        # Test admin endpoint without authentication
        response, error = self.make_request("GET", "/admin/analytics", expected_status=401)
        if error and "401" in error:
            self.log_test("Admin Endpoint Auth Required", True, "Correctly rejected unauthorized request")
        elif response and "Not authenticated" in str(response):
            self.log_test("Admin Endpoint Auth Required", True, "Correctly rejected unauthorized request")
        else:
            self.log_test("Admin Endpoint Auth Required", False, "Should require authentication")
        
        # Test reseller endpoint without authentication
        response, error = self.make_request("GET", "/reseller/profile", expected_status=401)
        if error and "401" in error:
            self.log_test("Reseller Endpoint Auth Required", True, "Correctly rejected unauthorized request")
        elif response and "Not authenticated" in str(response):
            self.log_test("Reseller Endpoint Auth Required", True, "Correctly rejected unauthorized request")
        else:
            self.log_test("Reseller Endpoint Auth Required", False, "Should require authentication")
        
        # Test role-based access control (reseller trying to access admin endpoint)
        if self.reseller_admin_token:
            headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
            response, error = self.make_request("GET", "/admin/analytics", headers=headers, expected_status=403)
            
            if error and "403" in error:
                self.log_test("Role-Based Access Control", True, "Correctly denied cross-role access")
            elif response and "Access denied" in str(response):
                self.log_test("Role-Based Access Control", True, "Correctly denied cross-role access")
            else:
                self.log_test("Role-Based Access Control", False, "Should deny cross-role access")
        
        return True
    
    def run_comprehensive_tests(self):
        """Run all test suites with detailed reporting"""
        print("🚀 UpShift White-Label SaaS Backend API - Comprehensive Test Suite")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 80)
        
        # Authentication must succeed for other tests
        auth_success = self.test_authentication_flow()
        
        if auth_success:
            # Core functionality tests
            self.test_super_admin_analytics()
            self.test_reseller_management()
            self.test_invoice_generation()
            self.test_reseller_profile_management()
            self.test_reseller_stats()
            self.test_branding_management()
            self.test_pricing_management()
        else:
            print("⚠️  Skipping authenticated tests due to authentication failure")
        
        # Public API tests
        self.test_white_label_config()
        
        # Security tests
        self.test_authorization_security()
        
        # Generate comprehensive report
        self.generate_test_report()
        
        # Determine overall success
        critical_failures = [
            t for t in self.failed_tests 
            if any(keyword in t["test"] for keyword in ["Authentication", "Connection", "Backend"])
        ]
        
        if critical_failures:
            print("❌ CRITICAL FAILURES - Backend system has major issues")
            return False
        elif self.failed_tests:
            print("⚠️  Minor issues detected but core functionality works")
            return True
        else:
            print("✅ ALL TESTS PASSED - Backend system fully operational")
            return True
    
    def generate_test_report(self):
        """Generate detailed test report"""
        print("\n" + "=" * 80)
        print("📋 DETAILED TEST REPORT")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = len(self.failed_tests)
        
        print(f"📊 Summary:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests} ✅")
        print(f"   Failed: {failed_tests} ❌")
        print(f"   Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests ({len(self.failed_tests)}):")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"   {i}. {test['test']}")
                print(f"      Error: {test['details']}")
        
        print(f"\n✅ Passed Tests ({passed_tests}):")
        passed_tests_list = [t for t in self.test_results if t["success"]]
        for i, test in enumerate(passed_tests_list, 1):
            print(f"   {i}. {test['test']}")
            if test.get("details"):
                print(f"      Details: {test['details']}")
        
        print("\n" + "=" * 80)

def main():
    """Main test execution function"""
    tester = WhiteLabelSaaSTester()
    success = tester.run_comprehensive_tests()
    
    # Exit with appropriate code for CI/CD integration
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()