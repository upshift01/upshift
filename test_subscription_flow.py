#!/usr/bin/env python3
"""
Test script specifically for Reseller Trial Expiration and Subscription flow
"""

import requests
import json
import sys

# Get backend URL from environment
BACKEND_URL = "https://upshift-jobs.preview.emergentagent.com/api"

# Demo reseller credentials from review request
DEMO_RESELLER_CREDS = {
    "email": "demo@talenthub.upshift.works",
    "password": "demo123"
}

def make_request(method, endpoint, headers=None, data=None, expected_status=200):
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

def test_reseller_subscription_flow():
    """Test Reseller Trial Expiration and Subscription flow as per review request"""
    print("💳 Testing Reseller Subscription Flow...")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    # Step 1: Login as demo reseller
    print("\n🔹 Step 1: Demo Reseller Login")
    response, error = make_request("POST", "/auth/login", data=DEMO_RESELLER_CREDS)
    
    if error:
        print(f"❌ Demo Reseller Login Failed: {error}")
        return False
    
    if not response.get("access_token"):
        print("❌ Demo Reseller Login Failed: No access token returned")
        return False
    
    user = response.get("user", {})
    if user.get("role") != "reseller_admin":
        print(f"❌ Demo Reseller Login Failed: Expected role 'reseller_admin', got '{user.get('role')}'")
        return False
    
    demo_reseller_token = response["access_token"]
    print(f"✅ Demo Reseller Login: Role: {user.get('role')}, Email: {user.get('email')}")
    
    headers = {"Authorization": f"Bearer {demo_reseller_token}"}
    
    # Step 2: Test Subscription Plans API
    print("\n🔹 Step 2: Subscription Plans API - GET /api/reseller/subscription/plans")
    response, error = make_request("GET", "/reseller/subscription/plans", headers=headers)
    
    if error:
        print(f"❌ Subscription Plans API Failed: {error}")
        return False
    
    # Validate response structure
    if not response.get("success"):
        print("❌ Subscription Plans API Failed: Success flag not returned")
        return False
    
    plans = response.get("plans", [])
    if len(plans) != 3:
        print(f"❌ Subscription Plans API Failed: Expected 3 plans, got {len(plans)}")
        return False
    
    # Check for required plans: starter, professional, enterprise
    plan_ids = [plan.get("id") for plan in plans]
    expected_plans = ["starter", "professional", "enterprise"]
    missing_plans = [p for p in expected_plans if p not in plan_ids]
    
    if missing_plans:
        print(f"❌ Subscription Plans API Failed: Missing plans: {missing_plans}")
        return False
    
    # Validate each plan has required fields
    all_plans_valid = True
    plan_details = []
    
    for plan in plans:
        plan_id = plan.get("id")
        name = plan.get("name")
        price = plan.get("price")
        price_display = plan.get("price_display")
        monthly_cv_limit = plan.get("monthly_cv_limit")
        features = plan.get("features", [])
        
        # Check required fields
        if not all([plan_id, name, price is not None, price_display, monthly_cv_limit is not None, features]):
            print(f"❌ Plan {plan_id} Validation Failed: Missing required fields")
            all_plans_valid = False
            continue
        
        # Validate specific plan details from review request
        if plan_id == "starter":
            if price_display != "R2,499" or monthly_cv_limit != 1000:
                print(f"❌ Starter Plan Details Failed: Expected R2,499/1000 CVs, got {price_display}/{monthly_cv_limit} CVs")
                all_plans_valid = False
        elif plan_id == "professional":
            if price_display != "R4,999" or monthly_cv_limit != 3500:
                print(f"❌ Professional Plan Details Failed: Expected R4,999/3500 CVs, got {price_display}/{monthly_cv_limit} CVs")
                all_plans_valid = False
        elif plan_id == "enterprise":
            if price_display != "Custom" or monthly_cv_limit != -1:
                print(f"❌ Enterprise Plan Details Failed: Expected Custom/-1 CVs, got {price_display}/{monthly_cv_limit} CVs")
                all_plans_valid = False
        
        plan_details.append(f"{name} ({price_display}, {monthly_cv_limit if monthly_cv_limit != -1 else 'Unlimited'} CVs)")
    
    if all_plans_valid:
        print(f"✅ Subscription Plans API: 3 plans returned: {', '.join(plan_details)}")
    else:
        return False
    
    # Step 3: Test Trial Status API
    print("\n🔹 Step 3: Trial Status API - GET /api/reseller/trial-status")
    response, error = make_request("GET", "/reseller/trial-status", headers=headers)
    
    if error:
        print(f"❌ Trial Status API Failed: {error}")
        return False
    
    # Validate response structure
    required_fields = ["is_trial", "days_remaining", "trial_expired"]
    missing_fields = [f for f in required_fields if f not in response]
    
    if missing_fields:
        print(f"❌ Trial Status API Failed: Missing required fields: {missing_fields}")
        return False
    
    # Validate field types
    is_trial = response.get("is_trial")
    days_remaining = response.get("days_remaining")
    trial_expired = response.get("trial_expired")
    
    if not isinstance(is_trial, bool):
        print(f"❌ Trial Status API Failed: is_trial should be boolean, got {type(is_trial)}")
        return False
    
    if not isinstance(days_remaining, int) or days_remaining < 0:
        print(f"❌ Trial Status API Failed: days_remaining should be non-negative integer, got {days_remaining}")
        return False
    
    if not isinstance(trial_expired, bool):
        print(f"❌ Trial Status API Failed: trial_expired should be boolean, got {type(trial_expired)}")
        return False
    
    # Additional optional fields validation
    trial_status = response.get("trial_status", "unknown")
    trial_start_date = response.get("trial_start_date")
    trial_end_date = response.get("trial_end_date")
    
    print(f"✅ Trial Status API: Trial: {is_trial}, Days remaining: {days_remaining}, Expired: {trial_expired}, Status: {trial_status}")
    
    print("\n" + "=" * 60)
    print("📊 RESELLER SUBSCRIPTION FLOW TEST SUMMARY")
    print("=" * 60)
    print("✅ Demo Reseller Login: SUCCESS")
    print("✅ Subscription Plans API: SUCCESS - 3 plans (Starter R2,499, Professional R4,999, Enterprise Custom)")
    print("✅ Trial Status API: SUCCESS - Returns is_trial, days_remaining, trial_expired flags")
    print("\n🎉 ALL BACKEND TESTS PASSED!")
    print("\nNote: Frontend UI testing (subscription page navigation, pricing cards, Select Plan buttons) is not performed as per system limitations.")
    
    return True

if __name__ == "__main__":
    success = test_reseller_subscription_flow()
    sys.exit(0 if success else 1)