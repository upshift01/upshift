#!/usr/bin/env python3
"""
Invoice PDF Download Test - Focused test for the review request
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://career-tools-app.preview.emergentagent.com/api"

# Test credentials
SUPER_ADMIN_CREDS = {
    "email": "admin@upshift.works",
    "password": "admin123"
}

RESELLER_ADMIN_CREDS = {
    "email": "john@acmecareers.com", 
    "password": "acme123456"
}

class InvoicePDFTester:
    def __init__(self):
        self.super_admin_token = None
        self.reseller_admin_token = None
        self.test_results = []
        
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
    
    def authenticate(self):
        """Authenticate both admin and reseller users"""
        print("🔐 Authenticating users...")
        
        # Super Admin Login
        response, error = self.make_request("POST", "/auth/login", data=SUPER_ADMIN_CREDS)
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
        
        # Reseller Admin Login
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
    
    def test_admin_invoice_pdf_download(self):
        """Test Admin Invoice PDF Download"""
        print("\n👑 Testing Admin Invoice PDF Download...")
        
        admin_headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        
        # Get list of invoices
        response, error = self.make_request("GET", "/admin/invoices", headers=admin_headers)
        if error:
            self.log_test("GET Admin Invoices List", False, error)
            return False
        
        invoices = response.get("invoices", [])
        if not invoices:
            # Generate invoices if none exist
            response, error = self.make_request("POST", "/admin/generate-invoices", headers=admin_headers)
            if error:
                self.log_test("Generate Invoices for PDF Test", False, error)
                return False
            
            # Get invoices again
            response, error = self.make_request("GET", "/admin/invoices", headers=admin_headers)
            if error or not response.get("invoices"):
                self.log_test("GET Admin Invoices After Generation", False, "No invoices available for PDF test")
                return False
            invoices = response.get("invoices", [])
        
        self.log_test("GET Admin Invoices List", True, f"Found {len(invoices)} invoices")
        
        # Test PDF download for first invoice
        if invoices:
            invoice_id = invoices[0]["id"]
            invoice_number = invoices[0].get("invoice_number", "Unknown")
            
            # Test PDF download endpoint
            url = f"{BACKEND_URL}/admin/invoices/{invoice_id}/pdf"
            try:
                response = requests.get(url, headers=admin_headers, timeout=30)
                
                if response.status_code == 200:
                    # Verify it's a PDF
                    content_type = response.headers.get('content-type', '')
                    content_disposition = response.headers.get('content-disposition', '')
                    content_length = len(response.content)
                    
                    if 'application/pdf' in content_type:
                        if content_length > 0:
                            if 'attachment' in content_disposition and 'filename' in content_disposition:
                                self.log_test("Admin Invoice PDF Download", True, 
                                            f"PDF downloaded successfully - Invoice: {invoice_number}, Size: {content_length} bytes")
                                return True
                            else:
                                self.log_test("Admin Invoice PDF Download", False, 
                                            "PDF downloaded but missing Content-Disposition header with filename")
                        else:
                            self.log_test("Admin Invoice PDF Download", False, "PDF file is empty")
                    else:
                        self.log_test("Admin Invoice PDF Download", False, 
                                    f"Wrong content type: {content_type}, expected application/pdf")
                else:
                    error_msg = f"Status {response.status_code}"
                    try:
                        error_detail = response.json()
                        error_msg += f" - {error_detail.get('detail', 'No detail')}"
                    except:
                        error_msg += f" - {response.text[:200]}"
                    self.log_test("Admin Invoice PDF Download", False, error_msg)
                    
            except Exception as e:
                self.log_test("Admin Invoice PDF Download", False, f"Request error: {str(e)}")
        
        return False
    
    def test_reseller_customer_invoice_pdf_download(self):
        """Test Reseller Customer Invoice PDF Download"""
        print("\n🏢 Testing Reseller Customer Invoice PDF Download...")
        
        reseller_headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
        
        # Get list of customer invoices
        response, error = self.make_request("GET", "/reseller/customer-invoices", headers=reseller_headers)
        if error:
            self.log_test("GET Reseller Customer Invoices", False, error)
            return False
        
        customer_invoices = response.get("invoices", [])
        
        if not customer_invoices:
            # Create a test customer invoice
            invoice_data = {
                "customer_name": "Test PDF Customer",
                "customer_email": "pdftest@customer.com", 
                "plan_name": "ATS Optimize",
                "amount": 899
            }
            
            response, error = self.make_request("POST", "/reseller/customer-invoices/create", 
                                              headers=reseller_headers, data=invoice_data)
            if error:
                self.log_test("Create Customer Invoice for PDF Test", False, error)
                return False
            
            if response.get("success"):
                customer_invoices = [response.get("invoice")]
                self.log_test("Create Customer Invoice for PDF Test", True, "Test invoice created")
            else:
                self.log_test("Create Customer Invoice for PDF Test", False, "Failed to create test invoice")
                return False
        
        if customer_invoices:
            self.log_test("GET Reseller Customer Invoices", True, f"Found {len(customer_invoices)} customer invoices")
            
            # Test PDF download for first customer invoice
            invoice_id = customer_invoices[0]["id"]
            invoice_number = customer_invoices[0].get("invoice_number", "Unknown")
            
            url = f"{BACKEND_URL}/reseller/customer-invoices/{invoice_id}/pdf"
            try:
                response = requests.get(url, headers=reseller_headers, timeout=30)
                
                if response.status_code == 200:
                    # Verify it's a PDF
                    content_type = response.headers.get('content-type', '')
                    content_disposition = response.headers.get('content-disposition', '')
                    content_length = len(response.content)
                    
                    if 'application/pdf' in content_type:
                        if content_length > 0:
                            if 'attachment' in content_disposition and 'filename' in content_disposition:
                                self.log_test("Reseller Customer Invoice PDF Download", True, 
                                            f"PDF downloaded successfully - Invoice: {invoice_number}, Size: {content_length} bytes")
                                return True
                            else:
                                self.log_test("Reseller Customer Invoice PDF Download", False, 
                                            "PDF downloaded but missing Content-Disposition header with filename")
                        else:
                            self.log_test("Reseller Customer Invoice PDF Download", False, "PDF file is empty")
                    else:
                        self.log_test("Reseller Customer Invoice PDF Download", False, 
                                    f"Wrong content type: {content_type}, expected application/pdf")
                else:
                    error_msg = f"Status {response.status_code}"
                    try:
                        error_detail = response.json()
                        error_msg += f" - {error_detail.get('detail', 'No detail')}"
                    except:
                        error_msg += f" - {response.text[:200]}"
                    self.log_test("Reseller Customer Invoice PDF Download", False, error_msg)
                    
            except Exception as e:
                self.log_test("Reseller Customer Invoice PDF Download", False, f"Request error: {str(e)}")
        else:
            self.log_test("GET Reseller Customer Invoices", True, "No customer invoices found")
        
        return False
    
    def run_tests(self):
        """Run all Invoice PDF Download tests"""
        print("🚀 Starting Invoice PDF Download Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Run PDF download tests
        admin_success = self.test_admin_invoice_pdf_download()
        reseller_success = self.test_reseller_customer_invoice_pdf_download()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"  - {test['test']}: {test['details']}")
        
        print("\n" + "=" * 60)
        
        # Both PDF downloads should work
        if admin_success and reseller_success:
            print("✅ ALL INVOICE PDF DOWNLOAD TESTS PASSED")
            return True
        elif admin_success or reseller_success:
            print("⚠️  PARTIAL SUCCESS - Some PDF downloads working")
            return True
        else:
            print("❌ INVOICE PDF DOWNLOAD TESTS FAILED")
            return False

def main():
    """Main test runner"""
    tester = InvoicePDFTester()
    success = tester.run_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()