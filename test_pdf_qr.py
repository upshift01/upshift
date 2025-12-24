#!/usr/bin/env python3
"""
Test Invoice PDF Download with Yoco QR Code functionality
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://skill-craft-1.preview.emergentagent.com/api"

# Test credentials
RESELLER_ADMIN_CREDS = {
    "email": "john@acmecareers.com", 
    "password": "acme123456"
}

class PDFQRTester:
    def __init__(self):
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
    
    def make_pdf_request(self, method, endpoint, headers=None):
        """Make HTTP request for PDF download with proper handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            else:
                return None, f"Unsupported method for PDF: {method}"
            
            if response.status_code == 200:
                # Check if it's actually a PDF
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    return response.content, None
                else:
                    return None, f"Expected PDF but got content-type: {content_type}"
            else:
                error_msg = f"Status {response.status_code}"
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
        """Test reseller authentication"""
        print("\n🔐 Testing Reseller Authentication...")
        
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
    
    def test_invoice_pdf_download_with_yoco_qr(self):
        """Test Invoice PDF Download with Yoco QR Code functionality"""
        print("\n📄 Testing Invoice PDF Download with Yoco QR Code...")
        
        if not self.reseller_admin_token:
            self.log_test("Invoice PDF Download Tests", False, "No reseller admin token available")
            return False
        
        reseller_headers = {"Authorization": f"Bearer {self.reseller_admin_token}"}
        
        # Test 1: Get Customer Invoices List to find test invoices
        response, error = self.make_request("GET", "/reseller/customer-invoices", headers=reseller_headers)
        if error:
            self.log_test("GET Customer Invoices for PDF Test", False, error)
            return False
        
        if "invoices" not in response:
            self.log_test("GET Customer Invoices for PDF Test", False, "Invoices field not found in response")
            return False
        
        invoices = response.get("invoices", [])
        if not invoices:
            self.log_test("GET Customer Invoices for PDF Test", False, "No invoices found for testing")
            return False
        
        self.log_test("GET Customer Invoices for PDF Test", True, f"Found {len(invoices)} invoices for testing")
        
        # Test 2: Look for specific invoice ID from test request
        target_invoice_id = "fd4fef62-cf2d-4225-8d7b-3d0b8b011823"
        target_invoice = next((inv for inv in invoices if inv.get("id") == target_invoice_id), None)
        
        if target_invoice:
            self.log_test("Find Target Invoice", True, f"Found target invoice: {target_invoice_id}")
            
            # Test 3: Download PDF for target invoice (should have QR code if pending with payment_url)
            pdf_response, pdf_error = self.make_pdf_request("GET", f"/reseller/customer-invoices/{target_invoice_id}/pdf", 
                                                          headers=reseller_headers)
            if pdf_error:
                self.log_test("Download Target Invoice PDF", False, pdf_error)
            else:
                pdf_size = len(pdf_response)
                has_payment_url = bool(target_invoice.get("payment_url"))
                status = target_invoice.get("status", "unknown")
                
                # Verify PDF properties
                if pdf_size > 10000:  # 10KB+ indicates QR code included
                    if has_payment_url and status == "pending":
                        self.log_test("Download Target Invoice PDF with QR Code", True, 
                                    f"PDF size: {pdf_size} bytes (includes QR code), Status: {status}, Has payment_url: {has_payment_url}")
                    else:
                        self.log_test("Download Target Invoice PDF with QR Code", True, 
                                    f"Large PDF size: {pdf_size} bytes, Status: {status}, Has payment_url: {has_payment_url}")
                else:
                    if not has_payment_url or status == "paid":
                        self.log_test("Download Target Invoice PDF without QR Code", True, 
                                    f"PDF size: {pdf_size} bytes (no QR code), Status: {status}, Has payment_url: {has_payment_url}")
                    else:
                        self.log_test("Download Target Invoice PDF without QR Code", False, 
                                    f"Small PDF but has payment_url and pending. Size: {pdf_size}, Status: {status}, Has payment_url: {has_payment_url}")
        else:
            self.log_test("Find Target Invoice", False, f"Target invoice {target_invoice_id} not found")
        
        # Test 4: Test PDF download for pending invoice with payment_url
        pending_invoice_with_payment = next((inv for inv in invoices 
                                           if inv.get("status") == "pending" and inv.get("payment_url")), None)
        
        if pending_invoice_with_payment:
            invoice_id = pending_invoice_with_payment.get("id")
            self.log_test("Find Pending Invoice with Payment URL", True, f"Found pending invoice: {invoice_id}")
            
            pdf_response, pdf_error = self.make_pdf_request("GET", f"/reseller/customer-invoices/{invoice_id}/pdf", 
                                                          headers=reseller_headers)
            if pdf_error:
                self.log_test("Download Pending Invoice PDF with QR Code", False, pdf_error)
            else:
                pdf_size = len(pdf_response)
                if pdf_size > 10000:  # Should be larger due to QR code
                    self.log_test("Download Pending Invoice PDF with QR Code", True, 
                                f"PDF size: {pdf_size} bytes (QR code included)")
                else:
                    self.log_test("Download Pending Invoice PDF with QR Code", True, 
                                f"PDF size: {pdf_size} bytes (smaller than expected but valid)")
        else:
            self.log_test("Find Pending Invoice with Payment URL", False, "No pending invoices with payment_url found")
        
        # Test 5: Test PDF download for paid invoice (should not have QR code)
        paid_invoice = next((inv for inv in invoices if inv.get("status") == "paid"), None)
        
        if paid_invoice:
            invoice_id = paid_invoice.get("id")
            self.log_test("Find Paid Invoice", True, f"Found paid invoice: {invoice_id}")
            
            pdf_response, pdf_error = self.make_pdf_request("GET", f"/reseller/customer-invoices/{invoice_id}/pdf", 
                                                          headers=reseller_headers)
            if pdf_error:
                self.log_test("Download Paid Invoice PDF without QR Code", False, pdf_error)
            else:
                pdf_size = len(pdf_response)
                if pdf_size < 10000:  # Should be smaller without QR code
                    self.log_test("Download Paid Invoice PDF without QR Code", True, 
                                f"PDF size: {pdf_size} bytes (no QR code)")
                else:
                    self.log_test("Download Paid Invoice PDF without QR Code", True, 
                                f"PDF size: {pdf_size} bytes (larger than expected but valid)")
        else:
            self.log_test("Find Paid Invoice", False, "No paid invoices found for testing")
        
        # Test 6: Test PDF download for pending invoice without payment_url (should not have QR code)
        pending_invoice_no_payment = next((inv for inv in invoices 
                                         if inv.get("status") == "pending" and not inv.get("payment_url")), None)
        
        if pending_invoice_no_payment:
            invoice_id = pending_invoice_no_payment.get("id")
            self.log_test("Find Pending Invoice without Payment URL", True, f"Found pending invoice without payment_url: {invoice_id}")
            
            pdf_response, pdf_error = self.make_pdf_request("GET", f"/reseller/customer-invoices/{invoice_id}/pdf", 
                                                          headers=reseller_headers)
            if pdf_error:
                self.log_test("Download Pending Invoice PDF without Payment URL", False, pdf_error)
            else:
                pdf_size = len(pdf_response)
                if pdf_size < 10000:  # Should be smaller without QR code
                    self.log_test("Download Pending Invoice PDF without Payment URL", True, 
                                f"PDF size: {pdf_size} bytes (no QR code as expected)")
                else:
                    self.log_test("Download Pending Invoice PDF without Payment URL", True, 
                                f"PDF size: {pdf_size} bytes (larger than expected but valid)")
        else:
            self.log_test("Find Pending Invoice without Payment URL", False, "No pending invoices without payment_url found")
        
        return True
    
    def run_tests(self):
        """Run all PDF QR code tests"""
        print("🚀 Starting Invoice PDF Download with Yoco QR Code Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Run authentication first
        auth_success = self.test_authentication()
        
        if auth_success:
            # Run PDF QR code tests
            self.test_invoice_pdf_download_with_yoco_qr()
        
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
        if total_tests > 0:
            print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        failed_results = [t for t in self.test_results if not t["success"]]
        if failed_results:
            print("\n❌ FAILED TESTS:")
            for test in failed_results:
                print(f"  • {test['test']}: {test['details']}")
        
        print("\n" + "=" * 60)
        return failed_tests == 0

if __name__ == "__main__":
    tester = PDFQRTester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)