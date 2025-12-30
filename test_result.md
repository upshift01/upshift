# Test Configuration - References Feature

## Tests for References Field Addition

tests:
  - task: "References Tab in CV Builder"
    implemented: true
    url: "/builder"
    expected: "References tab should appear in CV Builder with fields for name, title, company, email, phone"
    priority: "high"
    test_credentials: "test@upshift.works / password123"
    
  - task: "PDF Generation with References (Built-in Templates)"
    implemented: true
    endpoints: "POST /api/cv/generate-pdf"
    expected: "PDF should include References section when references are provided"
    priority: "high"
    
  - task: "PDF Generation with References (Custom .docx Templates)"
    implemented: true
    endpoints: "POST /api/cv-templates/generate"
    expected: "Custom template PDF should replace {{REFERENCES_SECTION}} placeholder"
    priority: "high"
    
  - task: "Placeholders Documentation includes References"
    implemented: true
    endpoints: "GET /api/cv-templates/placeholders"
    expected: "Should return references section with {{REFERENCES_SECTION}}, {{REF_1_NAME}}, etc."
    priority: "medium"

## Incorporate User Feedback

- Verify References tab appears as the last step before PDF generation
- Test adding multiple references
- Verify references appear in generated PDF
