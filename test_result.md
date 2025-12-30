# Test Configuration

## Current Tests - Custom .docx CV Template Feature

tests:
  - task: "Custom .docx Template Upload"
    implemented: true
    working: unknown
    url: "/admin/cv-templates"
    endpoints: "POST /api/cv-templates/upload"
    expected: "Admin should be able to upload .docx templates with placeholders"
    priority: "high"
    test_credentials: "admin@upshift.works / admin123"
    needs_retesting: true
    
  - task: "Template Categories API"
    implemented: true
    working: unknown
    endpoints: "GET /api/cv-templates/categories"
    expected: "Should return list of template categories"
    priority: "medium"
    needs_retesting: true
    
  - task: "Template List for Users"
    implemented: true
    working: unknown
    url: "/builder"
    endpoints: "GET /api/cv-templates/list"
    expected: "Users should see custom templates in the CV Builder template selection"
    priority: "high"
    test_credentials: "test@upshift.works / password123"
    needs_retesting: true
    
  - task: "PDF Generation from Custom Template"
    implemented: true
    working: unknown
    endpoints: "POST /api/cv-templates/generate"
    expected: "System should generate PDF from .docx template with user data replacing placeholders"
    priority: "critical"
    test_credentials: "test@upshift.works / password123"
    needs_retesting: true
    
  - task: "Template Selection in CV Builder UI"
    implemented: true
    working: unknown
    url: "/builder"
    expected: "Custom templates should display with 'Custom' badge, clicking should select template"
    priority: "high"
    test_credentials: "test@upshift.works / password123"
    needs_retesting: true

## Test Data

template_data:
  test_template_id: "032d19bd-6d58-4c0a-b69b-ba109f22524c"
  placeholders: ["{{FULL_NAME}}", "{{EMAIL}}", "{{PHONE}}", "{{ADDRESS}}", "{{ID_NUMBER}}", "{{SUMMARY}}", "{{EXPERIENCE_SECTION}}", "{{EDUCATION_SECTION}}", "{{SKILLS}}", "{{LANGUAGES}}"]

cv_test_data:
  full_name: "John Smith"
  email: "john.smith@email.com"
  phone: "+27 82 123 4567"
  address: "Cape Town, South Africa"
  
## Incorporate User Feedback

- Focus on end-to-end flow: Upload template → Select in builder → Generate PDF
- Verify the Custom badge appears on templates
- Verify PDF contains replaced placeholder values
- Test that built-in templates still work alongside custom ones
