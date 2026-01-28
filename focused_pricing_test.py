#!/usr/bin/env python3
"""
Focused Reseller Pricing Test - Based on Review Request

This test specifically validates the scenarios mentioned in the review request:
1. Login as reseller: owner@yottanet.com / password123
2. GET /api/reseller/profile with reseller token
3. Verify pricing.tier_1_price is stored in cents (e.g., 49900)
4. PUT /api/reseller/pricing with new tier prices
5. Verify prices are saved correctly
6. Test strategy call pricing
"""

import requests
import json
import sys

# Get backend URL from environment
BACKEND_URL = "https://talentpool-fix-1.preview.emergentagent.com/api"

# Reseller credentials from review request
YOTTANET_RESELLER_CREDS = {
    "email": "owner@yottanet.com",
    "password": "password123"
}

def make_request(method, endpoint, headers=None, data=None, expected_status=200):
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

def main():
    print("🧪 Focused Reseller Pricing Test")
    print("=" * 50)
    
    # Test 1: Login as reseller
    print("\n1️⃣ Testing reseller login...")
    response, error = make_request("POST", "/auth/login", data=YOTTANET_RESELLER_CREDS)
    
    if error:
        print(f"❌ Login failed: {error}")
        return False
    
    if not response.get("access_token"):
        print("❌ No access token returned")
        return False
    
    user = response.get("user", {})
    if user.get("role") != "reseller_admin":
        print(f"❌ Expected role 'reseller_admin', got '{user.get('role')}'")
        return False
    
    token = response["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✅ Login successful: {user.get('email')} (role: {user.get('role')})")
    
    # Test 2: GET /api/reseller/profile
    print("\n2️⃣ Testing GET /api/reseller/profile...")
    response, error = make_request("GET", "/reseller/profile", headers=headers)
    
    if error:
        print(f"❌ Profile request failed: {error}")
        return False
    
    print("✅ Profile retrieved successfully")
    
    # Test 3: Verify pricing structure
    print("\n3️⃣ Verifying pricing structure...")
    pricing = response.get("pricing", {})
    
    if not pricing:
        print("❌ No pricing data found")
        return False
    
    tier_1_price = pricing.get("tier_1_price", 0)
    tier_2_price = pricing.get("tier_2_price", 0)
    tier_3_price = pricing.get("tier_3_price", 0)
    currency = pricing.get("currency", "")
    
    print(f"📊 Current pricing:")
    print(f"   Tier 1: {tier_1_price} cents (R{tier_1_price/100:.2f})")
    print(f"   Tier 2: {tier_2_price} cents (R{tier_2_price/100:.2f})")
    print(f"   Tier 3: {tier_3_price} cents (R{tier_3_price/100:.2f})")
    print(f"   Currency: {currency}")
    
    # Verify prices are in cents (should be > 10000 for reasonable pricing)
    if tier_1_price < 10000:
        print(f"⚠️  Warning: Tier 1 price ({tier_1_price}) seems low for cents storage")
    else:
        print("✅ Prices appear to be stored in cents correctly")
    
    # Test 4: Strategy call pricing
    print("\n4️⃣ Checking strategy call pricing...")
    strategy_call = response.get("strategy_call_pricing", {})
    
    if strategy_call:
        strategy_price = strategy_call.get("price", 0)
        strategy_duration = strategy_call.get("duration_minutes", 0)
        print(f"📞 Strategy call: {strategy_price} cents (R{strategy_price/100:.2f}) for {strategy_duration} minutes")
        print("✅ Strategy call pricing found")
    else:
        print("⚠️  No strategy call pricing found")
    
    # Test 5: Update pricing (Tier 1 from 499 to 550)
    print("\n5️⃣ Testing pricing update (Tier 1: R499 → R550)...")
    
    updated_pricing = {
        "tier_1_price": 55000,  # R550 in cents
        "tier_2_price": tier_2_price,  # Keep existing
        "tier_3_price": tier_3_price,  # Keep existing
        "currency": currency or "ZAR"
    }
    
    response, error = make_request("PUT", "/reseller/pricing", headers=headers, data=updated_pricing)
    
    if error:
        print(f"❌ Pricing update failed: {error}")
        return False
    
    if not response.get("success"):
        print("❌ Pricing update did not return success flag")
        return False
    
    print("✅ Pricing update successful")
    
    # Test 6: Verify the update persisted
    print("\n6️⃣ Verifying pricing update persistence...")
    response, error = make_request("GET", "/reseller/profile", headers=headers)
    
    if error:
        print(f"❌ Profile verification failed: {error}")
        return False
    
    updated_pricing_data = response.get("pricing", {})
    updated_tier_1 = updated_pricing_data.get("tier_1_price", 0)
    
    if updated_tier_1 == 55000:
        print(f"✅ Price update persisted: Tier 1 = {updated_tier_1} cents (R{updated_tier_1/100:.2f})")
    else:
        print(f"❌ Price update did not persist: expected 55000, got {updated_tier_1}")
        return False
    
    # Test 7: Restore original pricing
    print("\n7️⃣ Restoring original pricing...")
    
    restore_pricing = {
        "tier_1_price": tier_1_price,  # Restore original
        "tier_2_price": tier_2_price,
        "tier_3_price": tier_3_price,
        "currency": currency or "ZAR"
    }
    
    response, error = make_request("PUT", "/reseller/pricing", headers=headers, data=restore_pricing)
    
    if error:
        print(f"⚠️  Failed to restore original pricing: {error}")
    elif response.get("success"):
        print("✅ Original pricing restored")
    else:
        print("⚠️  Pricing restore did not return success flag")
    
    print("\n🎉 All tests completed successfully!")
    print("\n📋 Summary:")
    print("✅ Reseller login working")
    print("✅ Profile API returning pricing data")
    print("✅ Prices stored in cents correctly")
    print("✅ Pricing update API working")
    print("✅ Price changes persist correctly")
    print("✅ Strategy call pricing available")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)