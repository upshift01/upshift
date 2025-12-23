# Test Results - Reseller Customer Signup E2E Test

## Test Scenario: White-Label Customer Registration Flow

### Prerequisites:
- Reseller account exists: john@acmecareers.com / acme123456
- Reseller ID: 7feb3d26-0c61-4e84-85ed-8a42ad977f4b (Acme Careers)

### Test Cases:

1. **Customer Registration via Platform (no reseller)**
   - Register at /register without white-label
   - Verify reseller_id is null for new user
   
2. **Customer Registration via Reseller**
   - Simulate white-label config with reseller_id
   - Register new customer
   - Verify customer is associated with reseller
   
3. **Reseller Dashboard Shows New Customer**
   - Login as reseller admin
   - Navigate to Customers
   - Verify new customer appears in list

### API Endpoints:
- POST /api/auth/register - Now accepts reseller_id parameter
- GET /api/white-label/config - Returns reseller_id for white-label domains
- GET /api/reseller/customers - Lists reseller's customers

### Test Credentials:
- Super Admin: admin@upshift.works / admin123
- Reseller Admin: john@acmecareers.com / acme123456
- Test Customer: testcustomer_[timestamp]@test.com / TestPass123!
