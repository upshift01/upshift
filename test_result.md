# Test Results - 7-Day Free Trial System

## Test Focus
Testing the new 7-day free trial system for white-label resellers.

## Features to Test

### Backend APIs
1. **Create Reseller with Trial** - POST /api/admin/resellers with start_as_trial=true
2. **Get Trial Resellers** - GET /api/admin/resellers/trials  
3. **Extend Trial** - POST /api/admin/resellers/{id}/extend-trial?days=N
4. **Convert Trial to Paid** - POST /api/admin/resellers/{id}/convert-trial
5. **Reseller Trial Status** - GET /api/reseller/trial-status

### Frontend Pages
1. **White-Label Page** - Should show "7-day free trial" (not 14-day)
2. **Admin Resellers Page** - Should show trial status badges (Trial Xd left, Trial Expired)
3. **Admin Resellers Actions** - Should show "Convert to Paid" and "Extend Trial" for trial resellers
4. **Reseller Dashboard** - Should show trial banner with days remaining

## Test Credentials
- Super Admin: admin@upshift.works / admin123
- Reseller Admin: john@acmecareers.com / acme123456

## Incorporate User Feedback
- Verify 7-day trial text on White-Label page
- Verify trial status badges in admin reseller list
- Verify trial actions in admin dropdown menu
