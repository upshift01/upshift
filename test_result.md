# UpShift White-Label SaaS Testing Protocol

## Test Scope
Test the white-label SaaS functionality including:
1. Super Admin Panel - login, dashboard, reseller management, analytics, invoices
2. Reseller Dashboard - login, dashboard, branding, pricing, customers, settings
3. White-Label API - config endpoint returns correct data
4. Authentication - role-based redirects after login

## Test Credentials
- Super Admin: admin@upshift.co.za / admin123
- Reseller: john@acmecareers.com / acme123456

## Key Flows to Test
1. Super Admin can login and view dashboard with analytics
2. Super Admin can create/manage resellers
3. Super Admin can generate and manage invoices
4. Reseller can login and view their dashboard
5. Reseller can update branding (colors, logo)
6. Reseller can update pricing
7. Reseller can view customers and revenue
8. White-label config API returns reseller branding

## Backend API Endpoints to Test
- POST /api/auth/login - with different roles
- GET /api/admin/analytics
- GET /api/admin/resellers
- POST /api/admin/resellers
- POST /api/admin/resellers/{id}/approve
- GET /api/reseller/profile
- PUT /api/reseller/branding
- PUT /api/reseller/pricing
- GET /api/white-label/config

## Previous Test Results
- Initial implementation complete
- Screenshots verified working for both admin and reseller panels

## Incorporate User Feedback
N/A - First test run
