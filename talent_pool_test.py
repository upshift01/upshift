#!/usr/bin/env python3
"""
Talent Pool Feature Test - Focused testing for the new Talent Pool feature
"""

import requests
import json
import sys

# Get backend URL from environment
BACKEND_URL = "https://hirematch-53.preview.emergentagent.com/api"

def test_talent_pool_public_endpoints():
    """Test the public talent pool endpoints"""
    print("🎯 Testing Talent Pool Public Endpoints...")
    
    results = []
    
    # Test 1: GET /api/talent-pool/industries
    print("\n🔹 Test 1: Industries API")
    try:
        response = requests.get(f"{BACKEND_URL}/talent-pool/industries", timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and isinstance(data.get("industries"), list):
                industries = data["industries"]
                expected_industries = ["Technology", "Healthcare", "Finance"]
                found = [ind for ind in expected_industries if ind in industries]
                print(f"✅ Industries API: Found {len(industries)} industries including {found}")
                results.append(("GET Industries", True, f"Found {len(industries)} industries"))
            else:
                print(f"❌ Industries API: Invalid response structure")
                results.append(("GET Industries", False, "Invalid response structure"))
        else:
            print(f"❌ Industries API: Status {response.status_code}")
            results.append(("GET Industries", False, f"Status {response.status_code}"))
    except Exception as e:
        print(f"❌ Industries API: {str(e)}")
        results.append(("GET Industries", False, str(e)))
    
    # Test 2: GET /api/talent-pool/experience-levels
    print("\n🔹 Test 2: Experience Levels API")
    try:
        response = requests.get(f"{BACKEND_URL}/talent-pool/experience-levels", timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and isinstance(data.get("levels"), list):
                levels = data["levels"]
                expected_levels = ["entry", "mid", "senior", "executive"]
                found_levels = []
                for level in levels:
                    if isinstance(level, dict) and level.get("id") in expected_levels:
                        found_levels.append(level.get("id"))
                
                if len(found_levels) >= 4:
                    print(f"✅ Experience Levels API: Found all expected levels: {found_levels}")
                    results.append(("GET Experience Levels", True, f"Found {len(found_levels)} levels"))
                else:
                    print(f"❌ Experience Levels API: Missing levels. Found: {found_levels}")
                    results.append(("GET Experience Levels", False, f"Missing levels: {found_levels}"))
            else:
                print(f"❌ Experience Levels API: Invalid response structure")
                results.append(("GET Experience Levels", False, "Invalid response structure"))
        else:
            print(f"❌ Experience Levels API: Status {response.status_code}")
            results.append(("GET Experience Levels", False, f"Status {response.status_code}"))
    except Exception as e:
        print(f"❌ Experience Levels API: {str(e)}")
        results.append(("GET Experience Levels", False, str(e)))
    
    # Test 3: GET /api/talent-pool/recruiter/plans
    print("\n🔹 Test 3: Recruiter Plans API")
    try:
        response = requests.get(f"{BACKEND_URL}/talent-pool/recruiter/plans", timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and isinstance(data.get("plans"), list):
                plans = data["plans"]
                if len(plans) == 3:
                    # Check prices
                    expected_prices = [99900, 249900, 799900]  # R999, R2499, R7999 in cents
                    plan_prices = [plan.get("price") for plan in plans if isinstance(plan, dict)]
                    
                    if all(price in expected_prices for price in plan_prices):
                        print(f"✅ Recruiter Plans API: Found 3 plans with correct prices: R{plan_prices[0]/100:.0f}, R{plan_prices[1]/100:.0f}, R{plan_prices[2]/100:.0f}")
                        results.append(("GET Recruiter Plans", True, f"3 plans with correct prices"))
                    else:
                        print(f"❌ Recruiter Plans API: Incorrect prices: {plan_prices}")
                        results.append(("GET Recruiter Plans", False, f"Incorrect prices: {plan_prices}"))
                else:
                    print(f"❌ Recruiter Plans API: Expected 3 plans, got {len(plans)}")
                    results.append(("GET Recruiter Plans", False, f"Expected 3 plans, got {len(plans)}"))
            else:
                print(f"❌ Recruiter Plans API: Invalid response structure")
                results.append(("GET Recruiter Plans", False, "Invalid response structure"))
        else:
            print(f"❌ Recruiter Plans API: Status {response.status_code}")
            results.append(("GET Recruiter Plans", False, f"Status {response.status_code}"))
    except Exception as e:
        print(f"❌ Recruiter Plans API: {str(e)}")
        results.append(("GET Recruiter Plans", False, str(e)))
    
    return results

def test_talent_pool_authenticated_endpoints():
    """Test authenticated talent pool endpoints using test@example.com"""
    print("\n🔐 Testing Talent Pool Authenticated Endpoints...")
    
    results = []
    
    # Try to login with test@example.com
    print("\n🔹 Login Test")
    try:
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=30)
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print(f"✅ Login successful")
                headers = {"Authorization": f"Bearer {token}"}
                
                # Test opt-in
                print("\n🔹 Test Talent Pool Opt-in")
                opt_in_data = {
                    "full_name": "Test Candidate",
                    "job_title": "Software Developer", 
                    "industry": "Technology",
                    "experience_level": "mid",
                    "location": "Johannesburg",
                    "skills": ["Python", "JavaScript", "React"],
                    "summary": "Experienced developer looking for new opportunities"
                }
                
                try:
                    response = requests.post(f"{BACKEND_URL}/talent-pool/opt-in", 
                                           json=opt_in_data, headers=headers, timeout=30)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            print(f"✅ Talent Pool Opt-in successful")
                            results.append(("POST Talent Pool Opt-in", True, "Successfully opted in"))
                        else:
                            print(f"❌ Talent Pool Opt-in: Success flag false")
                            results.append(("POST Talent Pool Opt-in", False, "Success flag false"))
                    elif response.status_code == 400 and "Already opted" in response.text:
                        # Already opted in - this is expected behavior
                        print(f"✅ Talent Pool Opt-in: Already opted in (expected)")
                        results.append(("POST Talent Pool Opt-in", True, "Already opted in"))
                    else:
                        print(f"❌ Talent Pool Opt-in: Status {response.status_code} - {response.text}")
                        results.append(("POST Talent Pool Opt-in", False, f"Status {response.status_code}"))
                except Exception as e:
                    print(f"❌ Talent Pool Opt-in: {str(e)}")
                    results.append(("POST Talent Pool Opt-in", False, str(e)))
                
                # Test get my profile
                print("\n🔹 Test Get My Profile")
                try:
                    response = requests.get(f"{BACKEND_URL}/talent-pool/my-profile", 
                                          headers=headers, timeout=30)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("opted_in"):
                            print(f"✅ Get My Profile: User is opted in")
                            results.append(("GET My Talent Profile", True, "User opted in"))
                        else:
                            print(f"✅ Get My Profile: User not opted in")
                            results.append(("GET My Talent Profile", True, "User not opted in"))
                    else:
                        print(f"❌ Get My Profile: Status {response.status_code}")
                        results.append(("GET My Talent Profile", False, f"Status {response.status_code}"))
                except Exception as e:
                    print(f"❌ Get My Profile: {str(e)}")
                    results.append(("GET My Talent Profile", False, str(e)))
                
                # Test get contact requests
                print("\n🔹 Test Get Contact Requests")
                try:
                    response = requests.get(f"{BACKEND_URL}/talent-pool/contact-requests", 
                                          headers=headers, timeout=30)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and isinstance(data.get("requests"), list):
                            requests_count = len(data["requests"])
                            print(f"✅ Get Contact Requests: Found {requests_count} requests")
                            results.append(("GET Contact Requests", True, f"{requests_count} requests"))
                        else:
                            print(f"❌ Get Contact Requests: Invalid response structure")
                            results.append(("GET Contact Requests", False, "Invalid response"))
                    else:
                        print(f"❌ Get Contact Requests: Status {response.status_code}")
                        results.append(("GET Contact Requests", False, f"Status {response.status_code}"))
                except Exception as e:
                    print(f"❌ Get Contact Requests: {str(e)}")
                    results.append(("GET Contact Requests", False, str(e)))
                    
            else:
                print(f"❌ Login: No access token")
                results.append(("Login", False, "No access token"))
        else:
            print(f"❌ Login: Status {response.status_code}")
            results.append(("Login", False, f"Status {response.status_code}"))
    except Exception as e:
        print(f"❌ Login: {str(e)}")
        results.append(("Login", False, str(e)))
    
    return results

def main():
    """Run all talent pool tests"""
    print("🎯 TALENT POOL FEATURE TESTING")
    print("=" * 50)
    
    all_results = []
    
    # Test public endpoints
    public_results = test_talent_pool_public_endpoints()
    all_results.extend(public_results)
    
    # Test authenticated endpoints
    auth_results = test_talent_pool_authenticated_endpoints()
    all_results.extend(auth_results)
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TALENT POOL TEST SUMMARY")
    print("=" * 50)
    
    total_tests = len(all_results)
    passed_tests = len([r for r in all_results if r[1]])
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests: {total_tests}")
    print(f"✅ Passed: {passed_tests}")
    print(f"❌ Failed: {failed_tests}")
    
    if failed_tests > 0:
        print("\n🔍 FAILED TESTS:")
        for test_name, success, details in all_results:
            if not success:
                print(f"  • {test_name}: {details}")
    
    print(f"\nSuccess Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    return failed_tests == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)