# UpShift - AI-Driven White-Label SaaS Resume Platform

## Original Problem Statement
Build "UpShift," an AI-driven, white-label SaaS resume and career services platform. The platform enables:
- Main site for direct customers
- Reseller portals with custom branding
- Admin portal for platform management
- AI-powered CV/resume building, ATS checking, and career tools

## User Personas
1. **Job Seekers (Customers)**: Create CVs, check ATS scores, generate cover letters, browse jobs, submit proposals
2. **Recruiters**: Browse and subscribe to talent pool for hiring candidates
3. **Employers**: Post job opportunities, review proposals, manage contracts (NEW - Jan 2025)
4. **Resellers**: White-label the platform with custom branding and pricing
5. **Super Admin**: Manage entire platform, resellers, users, and content

## Core Requirements

### Phase 1 - Foundation (COMPLETED)
- [x] User authentication (JWT-based)
- [x] CV Builder with AI assistance
- [x] ATS Checker tool
- [x] Skills Generator
- [x] Cover Letter Generator
- [x] Customer Dashboard
- [x] Pricing and subscription tiers

### Phase 2 - White-Label (COMPLETED)
- [x] Reseller portal with branding customization
- [x] Partner/subdomain routing
- [x] Custom domain setup
- [x] Reseller pricing configuration
- [x] Email template customization

### Phase 3 - Admin & Payments (COMPLETED)
- [x] Super Admin dashboard
- [x] Yoco payment integration
- [x] Invoice generation
- [x] Subscription management
- [x] User management

### Phase 4 - Talent Pool (COMPLETED - Dec 2025)
- [x] Public talent pool page with recruiter subscription plans
- [x] Admin management (candidates, subscriptions, pricing)
- [x] Reseller management (scoped to their candidates)
- [x] Customer opt-in to talent pool
- [x] Yoco payment for recruiter subscriptions
- [x] Contact request system
- [x] Email notifications for contact requests (to candidate when recruiter requests, to recruiter when candidate responds)
- [x] **Candidate Profile Picture Upload** (Jan 2025) - Candidates can upload profile pictures to their Talent Pool profile
- [x] **CV Download for Recruiters** (Jan 2025) - Recruiters can download candidate CVs when available
- [x] **Remote Worker Filter** (Jan 2025) - Recruiters can filter candidates by Remote Worker status
- [x] **Remote Worker Badge** (Jan 2025) - Displays "Remote Worker" badge on candidate cards
- [x] **Super Admin Access** (Jan 2025) - Super admins now have full recruiter access without subscription

### Phase 5 - Remote Work Space (IN PROGRESS - Jan 2025)
- [x] **Phase 5.1: Job Posting Portal** (COMPLETED)
  - [x] Job posting form with AI-assisted description generation
  - [x] AI-powered skill suggestions
  - [x] Support for USD and ZAR currencies
  - [x] Job types: Full-time, Contract, Gig/Micro-task
  - [x] Remote type options: Fully Remote, Hybrid, Flexible
  - [x] Timeline options: Ongoing, 1-3 months, 3-6 months, etc.
  - [x] Location/region preferences
  - [x] My Jobs management page (pause, activate, delete)
  - [x] Job details page with owner controls
- [x] **Phase 5.2: Talent Matching Dashboard** (COMPLETED)
  - [x] AI-curated job recommendations for job seekers (`/remote-jobs/recommendations`)
  - [x] Match scores based on skills, experience, industry
  - [x] Company dashboard showing matched candidates from Talent Pool
  - [x] "Find Matches" button on My Jobs page
  - [x] Regional filtering (South Africa, Africa, Europe, Asia, Americas)
  - [x] Match reasons display (skills matched, experience level, remote worker)
  - [x] "Job Matches" link added to customer sidebar with AI badge
- [x] **Phase 5.3: Bid/Proposal System** (COMPLETED - Jan 2025)
  - [x] Job seekers submit proposals via `/remote-jobs/{jobId}/apply`
  - [x] AI-powered proposal generation with "Generate with AI" button
  - [x] AI proposal improvement with "Improve" button
  - [x] Proposed rate (hourly/monthly/fixed) in USD or ZAR
  - [x] Availability selection (immediate, 1-week, 2-weeks, 1-month)
  - [x] Portfolio links attachment
  - [x] Profile snapshot automatically attached to proposals
  - [x] "My Proposals" page for job seekers (`/remote-jobs/my-proposals`)
  - [x] Status tracking: Pending, Shortlisted, Accepted, Rejected, Withdrawn
  - [x] Withdraw proposal functionality
  - [x] "Job Proposals" page for employers (`/remote-jobs/{jobId}/proposals`)
  - [x] Shortlist and Reject buttons for employers
  - [x] View Full Profile link for employers
  - [x] Stats dashboard with proposal counts
- [ ] **Phase 5.4: Contract & Payment System** (COMPLETED - Jan 2025)
  - [x] Contract creation from accepted proposals
  - [x] Contract details: title, description, dates, payment terms
  - [x] Payment types: fixed, hourly, monthly
  - [x] Payment schedules: on completion, weekly, bi-weekly, monthly, milestones
  - [x] Milestone system with due dates and amounts
  - [x] Milestone workflow: pending → submitted → approved → paid
  - [x] Contract signing by contractor
  - [x] Contract status: draft, active, completed, cancelled
  - [x] My Contracts page with filters (by status, by role)
  - [x] Contract stats dashboard
  - [x] Payment progress tracking
  - [x] "Create Contract" button on accepted proposals
  - [x] Navigation links in Navbar and sidebar
- [x] **Phase 5.5: Payment Gateway Integration** (COMPLETED - Jan 2025)
  - [x] Stripe checkout integration for contract/milestone funding
  - [x] Escrow Protection UI for employers
  - [x] "Fund Contract" button to fund entire contract
  - [x] "Fund" button on individual milestones
  - [x] Payment status verification after Stripe redirect
  - [x] Webhook handling for payment events
  - [x] "Release Payment" button for approved milestones
  - [x] Transaction history tracking
  - [x] Support for USD and ZAR currencies
  - [x] Contractor view showing escrow protection status
  - [x] **Dual Payment Gateway Support** (Jan 2025) - Added Yoco as alternative to Stripe
  - [x] **Payment Provider Selection Modal** (Jan 2025) - Employers can choose between Stripe/Yoco
  - [x] **Admin Payment Settings Page** (Jan 2025) - Configure Stripe/Yoco API keys from UI
  - [x] **Test Connection** (Jan 2025) - Test payment gateway connections from admin
  - [x] **Default Provider Selection** (Jan 2025) - Set default payment provider
- [ ] **Phase 5.6: Advanced Payment Features** (FUTURE)
  - [ ] Stripe Connect for direct contractor payouts
  - [ ] Automatic payment release on milestone approval
  - [ ] Payment dispute handling
  - [ ] Refund processing

## Technical Stack
- **Frontend**: React 18, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Yoco (South African), Stripe (International)
- **AI**: OpenAI GPT-4o via Emergent LLM Key

## Key API Endpoints

### Stripe Connect (NEW - Jan 2025)
- `GET /api/stripe-connect/status` - Get contractor's Connect account status
- `POST /api/stripe-connect/onboard` - Create Connect account and onboarding link
- `POST /api/stripe-connect/dashboard-link` - Get link to Stripe Express dashboard
- `POST /api/stripe-connect/payout` - Create payout to contractor (employer action)
- `GET /api/stripe-connect/earnings` - Get contractor's earnings summary

### Employer Analytics (NEW - Jan 2025)
- `GET /api/employer/analytics` - Get comprehensive job analytics
- `GET /api/employer/analytics/{job_id}` - Get detailed analytics for specific job

### WebSocket Notifications (NEW - Jan 2025)
- `WS /api/ws/notifications?token=<jwt>` - WebSocket endpoint for real-time notifications
- `GET /api/ws/notifications` - Get user's notifications list
- `POST /api/ws/notifications/{id}/read` - Mark notification as read
- `POST /api/ws/notifications/read-all` - Mark all notifications as read

### Employer Management (NEW - Jan 2025)
- `GET /api/employer-management/employers` - List employers (filtered by reseller if applicable)
- `GET /api/employer-management/employers/{id}` - Get employer details with stats
- `POST /api/employer-management/employers` - Create new employer
- `PUT /api/employer-management/employers/{id}` - Update employer details
- `POST /api/employer-management/employers/{id}/reset-password` - Reset password
- `POST /api/employer-management/employers/{id}/suspend` - Suspend employer
- `POST /api/employer-management/employers/{id}/reactivate` - Reactivate employer
- `PUT /api/employer-management/employers/{id}/subscription` - Update subscription
- `DELETE /api/employer-management/employers/{id}` - Delete employer (super admin only)

### Talent Pool
- `GET /api/talent-pool/industries` - List industries
- `GET /api/talent-pool/experience-levels` - List experience levels
- `GET /api/talent-pool/recruiter/plans` - Get subscription plans
- `GET /api/talent-pool/browse` - Browse candidates (requires subscription)
- `POST /api/talent-pool/opt-in` - Customer opts into talent pool
- `POST /api/talent-pool/subscribe/{plan_id}` - Create subscription checkout
- `POST /api/talent-pool/verify-payment/{subscription_id}` - Verify and activate subscription
- `POST /api/talent-pool/upload-profile-picture` - Upload candidate profile picture
- `GET /api/talent-pool/profile-picture/{filename}` - Serve profile picture
- `POST /api/talent-pool/ai/improve-skills` - AI skill suggestions
- `POST /api/talent-pool/ai/improve-bio` - AI bio generation
- `POST /api/talent-pool/ai/improve-summary` - AI summary generation
- `GET /api/talent-pool/admin/candidates` - Admin: Get all candidates
- `POST /api/talent-pool/admin/candidates` - Admin: Add candidate
- `PUT /api/talent-pool/admin/candidates/{id}/status` - Admin: Approve/reject
- `DELETE /api/talent-pool/admin/candidates/{id}` - Admin: Delete candidate
- `GET/PUT /api/talent-pool/admin/pricing` - Admin: Get/update pricing

### Employer (NEW - Jan 2025)
- `GET /api/employer/plans` - Get employer subscription plans
- `GET /api/employer/subscription` - Get current subscription status
- `GET /api/employer/dashboard-stats` - Get employer dashboard stats
- `POST /api/employer/subscribe/{plan_id}` - Subscribe to plan (Yoco checkout)
- `POST /api/employer/verify-payment` - Verify payment and activate subscription
- `GET /api/employer/can-post-job` - Check if employer can post more jobs

### Remote Jobs (Phase 5)
- `GET /api/remote-jobs/options` - Get form options (job types, currencies, etc.)
- `GET /api/remote-jobs/jobs` - List active jobs (public, with filters)
- `GET /api/remote-jobs/jobs/{id}` - Get job details (public)
- `POST /api/remote-jobs/jobs` - Create job posting (authenticated)
- `PUT /api/remote-jobs/jobs/{id}` - Update job posting (owner only)
- `DELETE /api/remote-jobs/jobs/{id}` - Delete job posting (owner only)
- `POST /api/remote-jobs/jobs/{id}/toggle-status` - Pause/activate job (owner only)
- `GET /api/remote-jobs/my-jobs` - Get user's posted jobs (authenticated)
- `POST /api/remote-jobs/ai/generate-description` - AI job description generator
- `POST /api/remote-jobs/ai/suggest-skills` - AI skill suggestions for job

## Database Collections
- `users` - User accounts with roles
- `user_cvs` - CV documents
- `talent_pool_profiles` - Candidate profiles in talent pool (includes `profile_picture_url`, `cv_url`, `is_remote_worker`)
- `recruiter_subscriptions` - Recruiter access subscriptions
- `contact_requests` - Recruiter-candidate contact requests
- `platform_settings` - Platform configuration including pricing
- `remote_jobs` - Remote job postings (NEW)

## Credentials
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@upshift.works | Admin@2025! |
| Demo Reseller | demo@talenthub.upshift.works | demo123 |
| Test Job Seeker | test@example.com | password123 |
| Test Recruiter | john@woo.co.za | Test@1234 |
| Test Employer | employer@testcompany.com | Test@1234 |

## Recent Changes (Jan 2025)
1. **Employer Role & Subscription System** - NEW
   - Added "Employer" as separate user role (distinct from Job Seeker and Recruiter)
   - Employer registration with 2-day free trial (3 job posts)
   - Employer subscription plans: Starter R299/mo (10 jobs), Professional R599/mo (50 jobs), Enterprise R1999/mo (unlimited)
   - Employer Dashboard at `/employer` with subscription management and stats
2. **Role-Based Access Control for Remote Jobs**
   - Job Seekers: Browse jobs, submit proposals, view contracts
   - Employers: Post jobs (with subscription), review proposals, manage contracts
   - Recruiters: No access to Remote Jobs (Talent Pool only)
   - Public: Browse jobs only
3. **Dual Payment Gateway** - Added Yoco as alternative to Stripe for contract/milestone funding
4. **Admin Payment Settings** - New admin page at `/admin/payment-settings` to configure Stripe and Yoco API keys
5. **Reseller Payment Settings** - Resellers can configure their own payment gateway keys
6. **Payment Provider Selection** - Modal allowing employers to choose Stripe or Yoco when funding contracts
7. **ZAR Removed from Stripe** - Stripe now USD only, Yoco for ZAR payments
8. **Email Notifications** - Added for contract events (proposal accepted, contract created, signed, milestone funded, payment released)
9. **Candidate Profile Picture Upload** - Added ability for candidates to upload profile pictures
10. **Remote Worker Checkbox** - Added "Remote Worker" checkbox to Talent Pool profile
11. **Remote Work Space (Phase 5.1)** - Complete job posting portal with AI-assisted descriptions

## Recent Fixes (Dec 2025)
1. **Hardcoded Phone Number** - Fixed to use dynamic settings
2. **Certifications Tab** - Added to CV Builder with .docx export
3. **ATS Checker Pricing** - Fixed to fetch from database dynamically
4. **Free Tools User Gate** - Requires login for ATS Checker/Skills Generator
5. **Admin Login** - Fixed password field inconsistency
6. **Talent Pool Pricing Bug** - Fixed the `/api/talent-pool/recruiter/plans` endpoint to fetch dynamic pricing from database instead of returning hardcoded values. Admin pricing updates now reflect on public page and Yoco checkouts.

## Upcoming Tasks (P1)
- [x] Email Notifications for contract events (COMPLETED - Jan 2025)
  - [x] Proposal accepted notification
  - [x] Contract created notification (to contractor)
  - [x] Contract signed/activated notification (to both parties)
  - [x] Milestone funded notification (to both parties)
  - [x] Payment released notification (to contractor)
  - [x] **New proposal notification to employer** (COMPLETED - Jan 2025)
- [x] **Stripe Connect for Contractor Payouts** (COMPLETED - Jan 2025)
  - [x] Contractor onboarding to Stripe Connect (Express accounts)
  - [x] Connect status checking and management
  - [x] Dashboard link generation for connected accounts
  - [x] Payout creation with platform fee deduction (5%)
  - [x] Earnings summary for contractors
  - [x] Frontend page at `/stripe-connect`
- [x] **Job Analytics for Employers** (COMPLETED - Jan 2025)
  - [x] Overall stats (jobs, proposals, contracts, conversion rate)
  - [x] Financial overview (contract value, paid out, pending)
  - [x] Per-job analytics (proposals, contracts, engagement)
  - [x] Proposal trends (last 30 days)
  - [x] Individual job details view
  - [x] Frontend page at `/employer/analytics`
- [x] **SMTP Configuration Fix** (COMPLETED - Jan 2025)
  - Fixed SSL/TLS mismatch (port 587 requires TLS, not SSL)
- [x] **Real-time WebSocket Notifications** (COMPLETED - Jan 2025)
  - WebSocket service for real-time push notifications
  - Notification bell component with badge count
  - Notification dropdown showing recent notifications
  - Mark as read / Mark all as read functionality
  - Auto-reconnect on connection loss
  - Integrated with proposal submission (employers notified instantly)
- [x] **Employer Management for Admin/Reseller** (COMPLETED - Jan 2025)
  - List employers with filtering (search, status, subscription)
  - Create new employers (auto-generate password option)
  - Edit employer details
  - Reset employer password
  - Suspend/Reactivate employers (pauses their jobs)
  - Update employer subscription (plan, duration)
  - View detailed employer stats (jobs, contracts)
  - Super Admin: full access to all employers
  - Reseller: access only to employers they created
- [x] **Navbar Redesign** (COMPLETED - Jan 2025)
  - Fixed congested navbar by implementing user dropdown menu
  - Avatar with name and role displayed
  - Dropdown includes: Dashboard, My Contracts, Settings, Logout
  - Role-specific menu items (Payment Settings for admin, Payout Settings for job seekers)
  - Logout button now clearly visible and accessible
- [x] **Extended Real-time Notifications** (COMPLETED - Jan 2025)
  - Contract created notification (to contractor)
  - Contract signed notification (to employer)
  - Milestone submitted notification (to employer)
  - Milestone approved notification (to contractor)
  - Payment received notification (to contractor)
- [x] **Email Notifications for Admin Actions** (COMPLETED - Jan 2025)
  - Email sent when admin creates new employer account
  - Email with new password when admin resets employer password
  - Email when employer account is suspended
  - Email when employer account is reactivated
- [x] **Admin/Reseller UI Theme Update** (COMPLETED - Jan 2025)
  - Changed AdminEmployers page from dark to light theme
  - ResellerEmployers inherits light theme from AdminEmployers
  - AdminEmailTemplates already had light theme
- [ ] **Email Template Customization** (IN PROGRESS)
  - Backend routes created (`/api/email-templates/`)
  - Frontend page at `/super-admin/email-templates`
  - Needs: Full CRUD integration, update email_service to use DB templates
- [ ] **Browser Push Notifications** (IN PROGRESS)
  - Service worker file created (`/public/sw.js`)
  - Backend routes for subscriptions (`/api/push/`)
  - Frontend hook (`usePushNotifications.js`)
  - Needs: Implementation of service worker logic and subscription flow
- [ ] **Stripe Connect Full Integration** (BLOCKED)
  - Boilerplate exists, needs valid Stripe API key to complete
- [ ] Odoo Integration
- [ ] Customer CV/vacancy upload to Talent Pool

## Known Issues
- **Admin Login Fragility** - KNOWN ISSUE (recurring, needs RCA)
- **Yoco Payment Flow** - VERIFIED ✅ (Subscription checkout working)
- **Stripe Payments** - BLOCKED (invalid test API key `sk_test_emergent`)
- **Screenshot Tool Session Loss** - Known tooling limitation with session persistence

## Future/Backlog (P2-P3)
- [ ] Refactor remaining partner pages (PartnerPricing, PartnerHome)
- [ ] Secure/remove emergency admin endpoints
- [ ] Clean up duplicate admin accounts
- [ ] Address linting errors in ATSChecker, SkillsGenerator
- [ ] Gig-style matching for micro-tasks
