# UpShift - AI-Driven White-Label SaaS Resume Platform

## Original Problem Statement
Build "UpShift," an AI-driven, white-label SaaS resume and career services platform. The platform enables:
- Main site for direct customers
- Reseller portals with custom branding
- Admin portal for platform management
- AI-powered CV/resume building, ATS checking, and career tools

## User Personas
1. **Job Seekers (Customers)**: Create CVs, check ATS scores, generate cover letters
2. **Recruiters**: Browse and subscribe to talent pool for hiring
3. **Resellers**: White-label the platform with custom branding and pricing
4. **Super Admin**: Manage entire platform, resellers, users, and content
5. **Companies/Employers**: Post remote job opportunities (NEW)

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
- [ ] **Phase 5.5: Payment Gateway Integration** (FUTURE)
  - [ ] Stripe/Yoco escrow integration
  - [ ] Automatic payments on milestone approval
  - [ ] Payment dispute handling

## Technical Stack
- **Frontend**: React 18, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Yoco (South African payment gateway)
- **AI**: OpenAI GPT-4o via Emergent LLM Key

## Key API Endpoints

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

### Remote Jobs (NEW - Phase 5)
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
| Test Customer | test@example.com | password123 |
| Test Recruiter | john@woo.co.za | Test@1234 |

## Recent Changes (Jan 2025)
1. **Candidate Profile Picture Upload** - Added ability for candidates to upload profile pictures (stored locally at `/app/public/uploads/profile_pictures`)
2. **Enhanced Candidate Cards** - Recruiter browse view now displays profile pictures with gradient avatar fallback
3. **CV Download Button** - CV download button only shows when candidate has attached a CV
4. **Job Seeker Registration Redirect** - Fixed to redirect to dashboard instead of pricing page
5. **CV Selection Fix** - Fixed talent pool CV attachment to use correct `user_documents` collection
6. **AI Improve Skills** - Added AI-powered skill generation button in Talent Pool profile form
7. **Bio Field with AI** - Added new Bio text area with AI generate/improve functionality
8. **AI Improve Summary** - Added AI improve button for Professional Summary
9. **Remote Worker Checkbox** - Added "Remote Worker" checkbox to Talent Pool profile
10. **Remote Work Space (Phase 5.1)** - Complete job posting portal with AI-assisted descriptions
5. **CV Selection Fix** - Fixed talent pool CV attachment to use correct `user_documents` collection
6. **AI Improve Skills** - Added AI-powered skill generation button in Talent Pool profile form
7. **Bio Field with AI** - Added new Bio text area with AI generate/improve functionality

## Recent Fixes (Dec 2025)
1. **Hardcoded Phone Number** - Fixed to use dynamic settings
2. **Certifications Tab** - Added to CV Builder with .docx export
3. **ATS Checker Pricing** - Fixed to fetch from database dynamically
4. **Free Tools User Gate** - Requires login for ATS Checker/Skills Generator
5. **Admin Login** - Fixed password field inconsistency
6. **Talent Pool Pricing Bug** - Fixed the `/api/talent-pool/recruiter/plans` endpoint to fetch dynamic pricing from database instead of returning hardcoded values. Admin pricing updates now reflect on public page and Yoco checkouts.

## Upcoming Tasks (P1)
- [ ] Odoo Integration
- [ ] Customer CV/vacancy upload to Talent Pool

## Future/Backlog (P2-P3)
- [ ] Refactor remaining partner pages (PartnerPricing, PartnerHome)
- [ ] Secure/remove emergency admin endpoints
- [ ] Clean up duplicate admin accounts
- [ ] Address linting errors in ATSChecker, SkillsGenerator
