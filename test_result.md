# Test Configuration

## Features Implemented

### User Manual / Help Center
- Route: /help and /help-center
- Backend endpoint: GET /api/help/user-manual/pdf (PDF download)
- Backend endpoint: GET /api/help/content (Get all help content JSON)
- Backend endpoint: GET /api/help/content/{section_key} (Get specific section)
- Footer link added under "Quick Links"

### Previous Features (from handoff)
- Reseller CV Templates Page (/reseller-dashboard/cv-templates)
- Customer/Reseller Analytics Activity Logging
- Welcome Email on Sign-up

## Tests Required

tests:
  - task: "Help Center Page Load"
    url: "/help"
    expected: "Help Center page loads with hero section, search, download button, and topic cards"
    
  - task: "PDF Manual Download"
    endpoints: "GET /api/help/user-manual/pdf"
    expected: "Returns PDF file with Content-Disposition header"
    
  - task: "Help Content API"
    endpoints: "GET /api/help/content"
    expected: "Returns JSON with user_guide and reseller_guide sections"
    
  - task: "Topic Card Expansion"
    url: "/help"
    expected: "Clicking on a topic card expands to show step-by-step guide and tips"
    
  - task: "Category Filtering"
    url: "/help"
    expected: "Clicking 'For Users' shows only user topics, 'For Partners' shows partner topics"
    
  - task: "Search Functionality"
    url: "/help"
    expected: "Typing in search filters topics by title and description"

## Incorporate User Feedback
- Test Help Center page renders correctly
- Test PDF download works
- Test topic expansion and navigation
- Test footer link to Help Center
