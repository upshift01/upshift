# UpShift API Contracts & Integration Plan

## API Endpoints

### Resume Management

#### POST /api/resumes
Create a new resume
- **Request**: Resume data (fullName, email, experiences, education, etc.)
- **Response**: Created resume with ID
- **AI Integration**: Optional AI improvement of summary section
- **Odoo**: Syncs resume to Odoo custom model (placeholder)

#### GET /api/resumes/{resume_id}
Get a specific resume
- **Response**: Resume data

#### GET /api/resumes
Get all resumes for user
- **Response**: List of resumes

#### POST /api/resumes/generate-pdf
Generate PDF from resume data
- **Request**: Resume data
- **Response**: PDF file download

### AI Resume Improvement

#### POST /api/ai/improve-section
Improve a specific resume section with AI
- **Request**: { section: string, content: string, context?: string }
- **Response**: { improved_text: string }
- **AI**: Uses GPT-4.1 via emergentintegrations

#### POST /api/ai/analyze-resume
Analyze uploaded resume file
- **Request**: FormData with file
- **Response**: ResumeAnalysisResult (scores + improvements)
- **AI**: Uses GPT-4.1 for detailed analysis

#### POST /api/ai/job-match
Match resume to job description
- **Request**: { resume_text: string, job_description: string }
- **Response**: { match_score: number, strengths: [], gaps: [], recommendations: [] }

### Cover Letter Management

#### POST /api/cover-letters/generate
Generate AI cover letter
- **Request**: CoverLetterCreate data
- **Response**: Generated cover letter text
- **AI**: Uses GPT-4.1 to generate personalized letter
- **Odoo**: Saves to Odoo (placeholder)

#### GET /api/cover-letters/{id}
Get a specific cover letter
- **Response**: Cover letter data

#### GET /api/cover-letters
Get all cover letters for user
- **Response**: List of cover letters

### Templates

#### GET /api/templates
Get all available CV templates
- **Response**: List of template metadata

#### GET /api/templates/{id}
Get specific template
- **Response**: Template data

## Frontend-Backend Integration

### Current Mock Data
Located in `/app/frontend/src/mockData.js`:
- `resumeTemplates`: 6 templates with thumbnails
- `features`: 6 feature cards
- `testimonials`: 3 user testimonials
- `industries`: 12 SA industries
- `sampleImprovements`: 3 before/after examples

### Pages to Integrate

1. **Home.jsx**
   - Already using mock data
   - No backend calls needed initially

2. **ResumeBuilder.jsx**
   - POST to `/api/resumes` on generate
   - POST to `/api/ai/improve-section` for AI assist button
   - POST to `/api/resumes/generate-pdf` for PDF download

3. **ResumeImprover.jsx**
   - POST to `/api/ai/analyze-resume` with uploaded file
   - Display AI analysis results
   - POST to `/api/resumes` to save improved version

4. **CoverLetterGenerator.jsx**
   - POST to `/api/cover-letters/generate` with form data
   - Display generated letter
   - Save to database

5. **Templates.jsx**
   - GET from `/api/templates` instead of mock data
   - Use template selection in builder

## MongoDB Collections

### resumes
```javascript
{
  _id: ObjectId,
  id: string (UUID),
  user_id: string (optional),
  fullName: string,
  email: string,
  phone: string,
  idNumber: string,
  address, city, province, postalCode: strings,
  industry: string,
  summary: string,
  experiences: Array<WorkExperience>,
  education: Array<Education>,
  skills: Array<string>,
  languages: Array<Language>,
  created_at: datetime,
  updated_at: datetime,
  odoo_record_id: string (optional)
}
```

### cover_letters
```javascript
{
  _id: ObjectId,
  id: string (UUID),
  user_id: string (optional),
  fullName, email, phone, recipientName, companyName, jobTitle: strings,
  jobDescription, keySkills, whyInterested: strings,
  generated_content: string,
  created_at: datetime,
  odoo_record_id: string (optional)
}
```

### users (future)
```javascript
{
  _id: ObjectId,
  id: string (UUID),
  email: string,
  name: string,
  created_at: datetime,
  odoo_partner_id: string (optional)
}
```

## Odoo Integration (Placeholder)

All Odoo integration is currently implemented as placeholders in `/app/backend/odoo_integration.py`.

To enable when Odoo is ready:
1. Set environment variables: ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD
2. Implement actual xmlrpc calls in odoo_integration.py
3. Create custom Odoo models for resumes and cover letters
4. Map UpShift data to Odoo fields

## AI Service (OpenAI GPT-4.1)

Located in `/app/backend/ai_service.py`

Uses `emergentintegrations` library with EMERGENT_LLM_KEY.

All AI prompts are tuned for South African job market context.

## Testing Plan

1. Test resume creation and storage
2. Test AI improvement suggestions
3. Test resume analysis
4. Test cover letter generation
5. Test PDF generation
6. Verify Odoo placeholder logging
7. Frontend integration testing
