backend:
  - task: "Reseller Profile API"
    implemented: true
    working: "NA"
    file: "/app/backend/reseller_routes.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Initial test setup - needs verification of GET /api/reseller/profile endpoint"

  - task: "Reseller Pricing Update API"
    implemented: true
    working: "NA"
    file: "/app/backend/reseller_routes.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Initial test setup - needs verification of PUT /api/reseller/pricing endpoint"

  - task: "Strategy Call Pricing API"
    implemented: true
    working: "NA"
    file: "/app/backend/reseller_routes.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Initial test setup - needs verification of strategy call pricing in reseller profile"

  - task: "Pricing Storage in Cents"
    implemented: true
    working: "NA"
    file: "/app/backend/reseller_models.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Initial test setup - needs verification that prices are stored in cents but displayed in Rands"

frontend:
  - task: "Pricing Display in Rands"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/reseller/PricingPage.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Frontend testing not performed - system limitation"

metadata:
  created_by: "testing_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Reseller Profile API"
    - "Reseller Pricing Update API"
    - "Strategy Call Pricing API"
    - "Pricing Storage in Cents"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "testing"
    message: "Starting reseller pricing functionality tests. Will test backend APIs for pricing display, update, and storage verification."
