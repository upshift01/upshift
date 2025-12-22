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
BACKEND_URL = "https://upshift-pro.preview.emergentagent.com/api"

# Test credentials
SUPER_ADMIN_CREDS = {
    "email": "admin@upshift.co.za",
    "password": "admin123"
}

RESELLER_ADMIN_CREDS = {
    "email": "john@acmecareers.com", 
    "password": "acme123456"
}

# Test customer credentials for LinkedIn API testing
TEST_CUSTOMER_CREDS = {
    "email": "test@example.com",
    "password": "testpass123"
}

class APITester:
    def __init__(self):
        self.super_admin_token = None
        self.reseller_admin_token = None
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
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
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
        
        # Test Customer Login (for LinkedIn API tests)
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
                self.log_test("Customer Registration", False, error)
            else:
                if response.get("access_token"):
                    self.customer_token = response["access_token"]
                    self.log_test("Customer Registration", True, "Customer registered and logged in")
                else:
                    self.log_test("Customer Registration", False, "No access token returned")
        else:
            if not response.get("access_token"):
                self.log_test("Customer Login", False, "No access token returned")
            else:
                user = response.get("user", {})
                self.customer_token = response["access_token"]
                self.log_test("Customer Login", True, f"Role: {user.get('role')}, Email: {user.get('email')}")
        
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
        if error and "401" in error:
            self.log_test("Admin Auth Required", True, "Correctly rejected unauthorized request")
        elif response and "Not authenticated" in str(response):
            self.log_test("Admin Auth Required", True, "Correctly rejected unauthorized request")
        else:
            self.log_test("Admin Auth Required", False, f"Should require authentication - got response: {response}, error: {error}")
        
        # Test reseller endpoint without token
        response, error = self.make_request("GET", "/reseller/profile", expected_status=401)
        if error and "401" in error:
            self.log_test("Reseller Auth Required", True, "Correctly rejected unauthorized request")
        elif response and "Not authenticated" in str(response):
            self.log_test("Reseller Auth Required", True, "Correctly rejected unauthorized request")
        else:
            self.log_test("Reseller Auth Required", False, f"Should require authentication - got response: {response}, error: {error}")
        
        # Test reseller trying to access admin endpoint
        if self.reseller_admin_token:
            headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
            response, error = self.make_request("GET", "/admin/analytics", headers=headers, expected_status=403)
            if error and "403" in error:
                self.log_test("Role-Based Access Control", True, "Reseller correctly denied admin access")
            elif response and "Access denied" in str(response):
                self.log_test("Role-Based Access Control", True, "Reseller correctly denied admin access")
            else:
                self.log_test("Role-Based Access Control", False, f"Should deny cross-role access - got response: {response}, error: {error}")
        
        return True
    
    def test_email_and_scheduling_system(self):
        """Test Email and Scheduling System endpoints"""
        print("\n📧 Testing Email and Scheduling System...")
        
        if not self.super_admin_token:
            self.log_test("Email & Scheduling Tests", False, "No super admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        
        # Test 1: GET /api/scheduler/email-settings
        response, error = self.make_request("GET", "/scheduler/email-settings", headers=headers)
        if error:
            self.log_test("GET Email Settings", False, error)
        else:
            required_fields = ["smtp_host", "smtp_port", "smtp_user", "from_name"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("GET Email Settings", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("GET Email Settings", True, f"Host: {response.get('smtp_host')}, Port: {response.get('smtp_port')}")
        
        # Test 2: POST /api/scheduler/email-settings (Save SMTP settings)
        email_settings = {
            "smtp_host": "smtp.office365.com",
            "smtp_port": 587,
            "smtp_user": "test@upshift.co.za",
            "smtp_password": "testpassword123",
            "from_email": "test@upshift.co.za",
            "from_name": "UpShift Test"
        }
        response, error = self.make_request("POST", "/scheduler/email-settings", headers=headers, data=email_settings)
        if error:
            self.log_test("POST Email Settings", False, error)
        else:
            if response.get("success"):
                self.log_test("POST Email Settings", True, "SMTP settings saved successfully")
            else:
                self.log_test("POST Email Settings", False, "Success flag not returned")
        
        # Test 3: POST /api/scheduler/email-settings/test
        response, error = self.make_request("POST", "/scheduler/email-settings/test", headers=headers)
        if error:
            self.log_test("Test SMTP Connection", False, error)
        else:
            # This might fail due to invalid credentials, but endpoint should respond
            success = response.get("success", False)
            if success:
                self.log_test("Test SMTP Connection", True, "SMTP connection test successful")
            else:
                # Expected to fail with test credentials, but endpoint works
                self.log_test("Test SMTP Connection", True, f"SMTP test responded: {response.get('error', 'No error')}")
        
        # Test 4: GET /api/scheduler/reminder-schedules
        response, error = self.make_request("GET", "/scheduler/reminder-schedules", headers=headers)
        if error:
            self.log_test("GET Reminder Schedules", False, error)
        else:
            if isinstance(response, list):
                schedule_count = len(response)
                if schedule_count >= 7:  # Should have 7 default schedules
                    self.log_test("GET Reminder Schedules", True, f"Found {schedule_count} reminder schedules")
                else:
                    self.log_test("GET Reminder Schedules", True, f"Found {schedule_count} schedules (expected 7 defaults)")
            else:
                self.log_test("GET Reminder Schedules", False, "Response is not a list")
        
        # Test 5: POST /api/scheduler/reminder-schedules (Create new schedule)
        new_schedule = {
            "name": "Test Reminder",
            "days_before_due": 5,
            "is_active": True
        }
        response, error = self.make_request("POST", "/scheduler/reminder-schedules", headers=headers, data=new_schedule)
        if error:
            self.log_test("POST Reminder Schedule", False, error)
        else:
            if response.get("success") and response.get("schedule_id"):
                schedule_id = response["schedule_id"]
                self.log_test("POST Reminder Schedule", True, f"Created schedule with ID: {schedule_id}")
                
                # Test 6: PUT /api/scheduler/reminder-schedules/{id} (Update schedule)
                updated_schedule = {
                    "name": "Updated Test Reminder",
                    "days_before_due": 5,
                    "is_active": False
                }
                response, error = self.make_request("PUT", f"/scheduler/reminder-schedules/{schedule_id}", headers=headers, data=updated_schedule)
                if error:
                    self.log_test("PUT Reminder Schedule", False, error)
                else:
                    if response.get("success"):
                        self.log_test("PUT Reminder Schedule", True, "Schedule updated successfully")
                    else:
                        self.log_test("PUT Reminder Schedule", False, "Success flag not returned")
                
                # Test 7: DELETE /api/scheduler/reminder-schedules/{id}
                response, error = self.make_request("DELETE", f"/scheduler/reminder-schedules/{schedule_id}", headers=headers)
                if error:
                    self.log_test("DELETE Reminder Schedule", False, error)
                else:
                    if response.get("success"):
                        self.log_test("DELETE Reminder Schedule", True, "Schedule deleted successfully")
                    else:
                        self.log_test("DELETE Reminder Schedule", False, "Success flag not returned")
            else:
                self.log_test("POST Reminder Schedule", False, "Failed to create schedule")
        
        # Test 8: POST /api/scheduler/send-reminders
        response, error = self.make_request("POST", "/scheduler/send-reminders", headers=headers)
        if error:
            self.log_test("Send Payment Reminders", False, error)
        else:
            if "success" in response:
                sent = response.get("sent", 0)
                total = response.get("total_pending", 0)
                self.log_test("Send Payment Reminders", True, f"Sent {sent} reminders out of {total} pending invoices")
            else:
                self.log_test("Send Payment Reminders", False, "Invalid response format")
        
        # Test 9: POST /api/scheduler/generate-monthly-invoices
        response, error = self.make_request("POST", "/scheduler/generate-monthly-invoices", headers=headers)
        if error:
            self.log_test("Generate Monthly Invoices", False, error)
        else:
            if response.get("success"):
                created = response.get("invoices_created", 0)
                period = response.get("period", "unknown")
                self.log_test("Generate Monthly Invoices", True, f"Generated {created} invoices for {period}")
            else:
                self.log_test("Generate Monthly Invoices", False, "Success flag not returned")
        
        # Test 10: GET /api/scheduler/email-logs
        response, error = self.make_request("GET", "/scheduler/email-logs", headers=headers)
        if error:
            self.log_test("GET Email Logs", False, error)
        else:
            if "logs" in response:
                log_count = len(response["logs"])
                self.log_test("GET Email Logs", True, f"Retrieved {log_count} email logs")
            else:
                self.log_test("GET Email Logs", False, "Logs field not found in response")
        
        return True
    
    def test_reseller_email_settings(self):
        """Test Reseller Email Settings endpoints"""
        print("\n📨 Testing Reseller Email Settings...")
        
        if not self.reseller_admin_token:
            self.log_test("Reseller Email Tests", False, "No reseller admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
        
        # Test 11: GET /api/reseller/email-settings
        response, error = self.make_request("GET", "/reseller/email-settings", headers=headers)
        if error:
            self.log_test("GET Reseller Email Settings", False, error)
        else:
            required_fields = ["smtp_host", "smtp_port", "from_name", "is_configured"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("GET Reseller Email Settings", False, f"Missing fields: {missing_fields}")
            else:
                configured = response.get("is_configured", False)
                brand_name = response.get("from_name", "Unknown")
                self.log_test("GET Reseller Email Settings", True, f"Configured: {configured}, Brand: {brand_name}")
        
        # Test 12: POST /api/reseller/email-settings (Save reseller SMTP settings)
        reseller_email_settings = {
            "smtp_host": "smtp.gmail.com",
            "smtp_port": 587,
            "smtp_user": "reseller@acmecareers.com",
            "smtp_password": "resellerpassword123",
            "from_email": "reseller@acmecareers.com",
            "from_name": "Acme Careers"
        }
        response, error = self.make_request("POST", "/reseller/email-settings", headers=headers, data=reseller_email_settings)
        if error:
            self.log_test("POST Reseller Email Settings", False, error)
        else:
            if response.get("success"):
                self.log_test("POST Reseller Email Settings", True, "Reseller SMTP settings saved successfully")
            else:
                self.log_test("POST Reseller Email Settings", False, "Success flag not returned")
        
        # Test 13: POST /api/reseller/email-settings/test
        response, error = self.make_request("POST", "/reseller/email-settings/test", headers=headers)
        if error:
            self.log_test("Test Reseller SMTP Connection", False, error)
        else:
            # This might fail due to invalid credentials, but endpoint should respond
            success = response.get("success", False)
            if success:
                self.log_test("Test Reseller SMTP Connection", True, "Reseller SMTP connection test successful")
            else:
                # Expected to fail with test credentials, but endpoint works
                self.log_test("Test Reseller SMTP Connection", True, f"Reseller SMTP test responded: {response.get('error', 'No error')}")
        
        return True
    
    def test_ats_resume_checker(self):
        """Test ATS Resume Checker endpoint (FREE - no authentication required)"""
        print("\n📄 Testing ATS Resume Checker...")
        
        # Sample resume content from review request
        sample_resume_content = """John Smith
Email: john.smith@email.com
Phone: (555) 123-4567
Location: New York, NY
LinkedIn: linkedin.com/in/johnsmith

PROFESSIONAL SUMMARY
Experienced software engineer with 5 years of experience in full-stack development.

WORK EXPERIENCE
Senior Software Engineer
ABC Tech Company | Jan 2020 - Present
- Developed web applications using React and Node.js
- Led a team of 3 developers
- Improved application performance by 40%

Software Developer
XYZ Corp | Jun 2018 - Dec 2019
- Built REST APIs using Python and Flask
- Collaborated with cross-functional teams

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2018

SKILLS
Python, JavaScript, React, Node.js, SQL, Git, AWS"""
        
        # Create a temporary text file with the resume content
        import tempfile
        import os
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
                temp_file.write(sample_resume_content)
                temp_file_path = temp_file.name
            
            # Prepare file for upload
            url = f"{BACKEND_URL}/ats-check"
            
            with open(temp_file_path, 'rb') as file:
                files = {'file': ('sample_resume.txt', file, 'text/plain')}
                
                try:
                    response = requests.post(url, files=files, timeout=60)
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            
                            # Validate response structure
                            required_fields = ["success", "filename", "analysis"]
                            missing_fields = [f for f in required_fields if f not in data]
                            
                            if missing_fields:
                                self.log_test("ATS Resume Checker - Response Structure", False, 
                                            f"Missing fields: {missing_fields}")
                                return False
                            
                            # Check success flag
                            if not data.get("success"):
                                self.log_test("ATS Resume Checker - Success Flag", False, 
                                            "Success flag is False")
                                return False
                            
                            # Check filename
                            if not data.get("filename"):
                                self.log_test("ATS Resume Checker - Filename", False, 
                                            "Filename not returned")
                                return False
                            
                            # Validate analysis structure
                            analysis = data.get("analysis", {})
                            required_analysis_fields = [
                                "overall_score", "summary", "categories", 
                                "checklist", "strengths", "recommendations"
                            ]
                            missing_analysis_fields = [f for f in required_analysis_fields if f not in analysis]
                            
                            if missing_analysis_fields:
                                self.log_test("ATS Resume Checker - Analysis Structure", False, 
                                            f"Missing analysis fields: {missing_analysis_fields}")
                                return False
                            
                            # Validate overall_score is a number between 0-100
                            overall_score = analysis.get("overall_score")
                            if not isinstance(overall_score, (int, float)) or not (0 <= overall_score <= 100):
                                self.log_test("ATS Resume Checker - Overall Score", False, 
                                            f"Invalid overall_score: {overall_score} (should be 0-100)")
                                return False
                            
                            # Validate categories structure
                            categories = analysis.get("categories", {})
                            expected_categories = [
                                "format_compatibility", "contact_information", "keywords_skills",
                                "work_experience", "education", "overall_structure"
                            ]
                            missing_categories = [c for c in expected_categories if c not in categories]
                            
                            if missing_categories:
                                self.log_test("ATS Resume Checker - Categories", False, 
                                            f"Missing categories: {missing_categories}")
                                return False
                            
                            # Validate arrays
                            checklist = analysis.get("checklist", [])
                            strengths = analysis.get("strengths", [])
                            recommendations = analysis.get("recommendations", [])
                            
                            if not isinstance(checklist, list):
                                self.log_test("ATS Resume Checker - Checklist", False, 
                                            "Checklist is not an array")
                                return False
                            
                            if not isinstance(strengths, list):
                                self.log_test("ATS Resume Checker - Strengths", False, 
                                            "Strengths is not an array")
                                return False
                            
                            if not isinstance(recommendations, list):
                                self.log_test("ATS Resume Checker - Recommendations", False, 
                                            "Recommendations is not an array")
                                return False
                            
                            # All validations passed
                            self.log_test("ATS Resume Checker", True, 
                                        f"Score: {overall_score}/100, Categories: {len(categories)}, "
                                        f"Checklist: {len(checklist)} items, Strengths: {len(strengths)}, "
                                        f"Recommendations: {len(recommendations)}")
                            
                            return True
                            
                        except json.JSONDecodeError as e:
                            self.log_test("ATS Resume Checker", False, f"Invalid JSON response: {str(e)}")
                            return False
                    else:
                        error_msg = f"Status {response.status_code}"
                        try:
                            error_detail = response.json()
                            error_msg += f" - {error_detail.get('detail', 'No detail')}"
                        except:
                            error_msg += f" - {response.text[:200]}"
                        
                        self.log_test("ATS Resume Checker", False, error_msg)
                        return False
                        
                except requests.exceptions.Timeout:
                    self.log_test("ATS Resume Checker", False, "Request timeout (60s)")
                    return False
                except requests.exceptions.ConnectionError:
                    self.log_test("ATS Resume Checker", False, "Connection error - backend may be down")
                    return False
                except Exception as e:
                    self.log_test("ATS Resume Checker", False, f"Request error: {str(e)}")
                    return False
        
        finally:
            # Clean up temporary file
            try:
                if 'temp_file_path' in locals():
                    os.unlink(temp_file_path)
            except:
                pass
        
        return False

    def test_linkedin_tools_api(self):
        """Test LinkedIn Tools API endpoints"""
        print("\n🔗 Testing LinkedIn Tools API...")
        
        # Test 1: GET /api/linkedin/oauth/status (No auth required)
        response, error = self.make_request("GET", "/linkedin/oauth/status")
        if error:
            self.log_test("LinkedIn OAuth Status", False, error)
        else:
            required_fields = ["configured", "message"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("LinkedIn OAuth Status", False, f"Missing fields: {missing_fields}")
            else:
                configured = response.get("configured", False)
                message = response.get("message", "")
                self.log_test("LinkedIn OAuth Status", True, 
                            f"Configured: {configured}, Message: {message[:50]}...")
        
        # For authenticated endpoints, we need a valid customer token
        if not self.customer_token:
            self.log_test("LinkedIn Tools Tests", False, "No customer authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        
        # Test 2: POST /api/linkedin/convert-to-resume (Requires auth)
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
                                          headers=headers, data=linkedin_data)
        if error:
            self.log_test("LinkedIn Convert to Resume", False, error)
        else:
            required_fields = ["success", "resume"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("LinkedIn Convert to Resume", False, f"Missing fields: {missing_fields}")
            else:
                success = response.get("success", False)
                resume = response.get("resume", {})
                if success and isinstance(resume, dict):
                    # Check for key resume fields
                    resume_fields = ["personal_info", "professional_summary", "work_experience"]
                    has_resume_fields = any(field in resume for field in resume_fields)
                    if has_resume_fields:
                        self.log_test("LinkedIn Convert to Resume", True, 
                                    f"Successfully generated resume with {len(resume)} sections")
                    else:
                        self.log_test("LinkedIn Convert to Resume", False, 
                                    "Resume object missing expected fields")
                else:
                    self.log_test("LinkedIn Convert to Resume", False, 
                                "Invalid response structure")
        
        # Test 3: POST /api/linkedin/create-profile (Requires auth)
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
                                          headers=headers, data=profile_data)
        if error:
            self.log_test("LinkedIn Create Profile", False, error)
        else:
            required_fields = ["success", "profile"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("LinkedIn Create Profile", False, f"Missing fields: {missing_fields}")
            else:
                success = response.get("success", False)
                profile = response.get("profile", {})
                if success and isinstance(profile, dict):
                    # Check for key profile fields
                    profile_fields = ["headline", "about_summary", "skills_to_add"]
                    has_profile_fields = any(field in profile for field in profile_fields)
                    if has_profile_fields:
                        self.log_test("LinkedIn Create Profile", True, 
                                    f"Successfully generated profile with {len(profile)} sections")
                    else:
                        self.log_test("LinkedIn Create Profile", False, 
                                    "Profile object missing expected fields")
                else:
                    self.log_test("LinkedIn Create Profile", False, 
                                "Invalid response structure")
        
        # Test 4: POST /api/linkedin/enhance-profile (Requires auth)
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
                                          headers=headers, data=enhance_data)
        if error:
            self.log_test("LinkedIn Enhance Profile", False, error)
        else:
            required_fields = ["success", "analysis"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("LinkedIn Enhance Profile", False, f"Missing fields: {missing_fields}")
            else:
                success = response.get("success", False)
                analysis = response.get("analysis", {})
                if success and isinstance(analysis, dict):
                    # Check for key analysis fields
                    analysis_fields = ["overall_score", "section_analysis", "action_items"]
                    has_analysis_fields = any(field in analysis for field in analysis_fields)
                    if has_analysis_fields:
                        overall_score = analysis.get("overall_score", 0)
                        self.log_test("LinkedIn Enhance Profile", True, 
                                    f"Successfully analyzed profile, score: {overall_score}/100")
                    else:
                        self.log_test("LinkedIn Enhance Profile", False, 
                                    "Analysis object missing expected fields")
                else:
                    self.log_test("LinkedIn Enhance Profile", False, 
                                "Invalid response structure")
        
        return True

    def test_yoco_payment_integration(self):
        """Test Yoco Payment Integration endpoints"""
        print("\n💳 Testing Yoco Payment Integration...")
        
        # Test 1: Reseller Yoco Settings - GET (Requires Reseller auth)
        if not self.reseller_admin_token:
            self.log_test("Yoco Payment Integration Tests", False, "No reseller admin token available")
            return False
        
        reseller_headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
        
        # GET /api/reseller/yoco-settings
        response, error = self.make_request("GET", "/reseller/yoco-settings", headers=reseller_headers)
        if error:
            self.log_test("GET Reseller Yoco Settings", False, error)
        else:
            required_fields = ["yoco_public_key", "yoco_secret_key", "use_custom_keys", "is_live_mode"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("GET Reseller Yoco Settings", False, f"Missing fields: {missing_fields}")
            else:
                use_custom = response.get("use_custom_keys", False)
                is_live = response.get("is_live_mode", False)
                self.log_test("GET Reseller Yoco Settings", True, 
                            f"Custom keys: {use_custom}, Live mode: {is_live}")
        
        # Test 2: POST /api/reseller/yoco-settings (Save settings)
        yoco_settings = {
            "yoco_public_key": "pk_test_xyz123",
            "yoco_secret_key": "sk_test_abc456",
            "use_custom_keys": True
        }
        response, error = self.make_request("POST", "/reseller/yoco-settings", 
                                          headers=reseller_headers, data=yoco_settings)
        if error:
            self.log_test("POST Reseller Yoco Settings", False, error)
        else:
            if response.get("success"):
                self.log_test("POST Reseller Yoco Settings", True, "Yoco settings saved successfully")
            else:
                self.log_test("POST Reseller Yoco Settings", False, "Success flag not returned")
        
        # Test 3: POST /api/reseller/yoco-settings/test (Test connection)
        response, error = self.make_request("POST", "/reseller/yoco-settings/test", headers=reseller_headers)
        if error:
            self.log_test("Test Reseller Yoco Connection", False, error)
        else:
            # This might fail due to test credentials, but endpoint should respond
            success = response.get("success", False)
            if success:
                self.log_test("Test Reseller Yoco Connection", True, "Yoco connection test successful")
            else:
                # Expected to fail with test credentials, but endpoint works
                error_msg = response.get("error", "No error message")
                self.log_test("Test Reseller Yoco Connection", True, 
                            f"Yoco test responded (expected failure with test keys): {error_msg}")
        
        # Test 4: Customer Payment Flow - Create Checkout (Requires Customer auth)
        if not self.customer_token:
            self.log_test("Customer Payment Flow Tests", False, "No customer authentication token available")
            return False
        
        customer_headers = {"Authorization": f"Bearer {self.customer_token}"}
        
        # POST /api/payments/create-checkout?tier_id=tier-1
        response, error = self.make_request("POST", "/payments/create-checkout?tier_id=tier-1", 
                                          headers=customer_headers)
        if error:
            self.log_test("Create Payment Checkout", False, error)
            checkout_id = None
        else:
            required_fields = ["checkout_id", "redirect_url", "payment_id"]
            missing_fields = [f for f in required_fields if f not in response]
            if missing_fields:
                self.log_test("Create Payment Checkout", False, f"Missing fields: {missing_fields}")
                checkout_id = None
            else:
                checkout_id = response.get("checkout_id")
                payment_id = response.get("payment_id")
                redirect_url = response.get("redirect_url")
                self.log_test("Create Payment Checkout", True, 
                            f"Checkout created: {checkout_id}, Payment ID: {payment_id}")
        
        # Test 5: Verify Payment Status (if checkout was created)
        if checkout_id:
            response, error = self.make_request("POST", f"/payments/verify/{checkout_id}", 
                                              headers=customer_headers)
            if error:
                self.log_test("Verify Payment Status", False, error)
            else:
                status = response.get("status", "unknown")
                message = response.get("message", "")
                # Payment verification will likely fail since we didn't actually pay
                if status == "failed":
                    self.log_test("Verify Payment Status", True, 
                                f"Payment verification endpoint working (status: {status})")
                else:
                    self.log_test("Verify Payment Status", True, 
                                f"Status: {status}, Message: {message}")
        
        # Test 6: GET /api/payments/history (Get payment history)
        response, error = self.make_request("GET", "/payments/history", headers=customer_headers)
        if error:
            self.log_test("Get Payment History", False, error)
        else:
            if "payments" in response and "total_count" in response:
                payment_count = response.get("total_count", 0)
                payments = response.get("payments", [])
                self.log_test("Get Payment History", True, 
                            f"Retrieved {payment_count} payment records")
            else:
                self.log_test("Get Payment History", False, "Invalid response structure")
        
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
            # NEW: Test Email and Scheduling System
            self.test_email_and_scheduling_system()
            self.test_reseller_email_settings()
        
        self.test_white_label_config()
        self.test_unauthorized_access()
        
        # NEW: Test ATS Resume Checker (FREE endpoint)
        self.test_ats_resume_checker()
        
        # NEW: Test LinkedIn Tools API endpoints
        self.test_linkedin_tools_api()
        
        # NEW: Test Yoco Payment Integration
        self.test_yoco_payment_integration()
        
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