# Feature Specification — PayDoc AI

This document provides the exhaustive functional and page-by-page specification for all 13 core modules of **PayDoc AI**.

---

## MODULE 1 — Unified Dashboard (`/dashboard`)

### Purpose
The command center for business owners, HR managers, and accountants, offering an immediate operational overview of headcount, payroll commitments, overdue obligations, and urgent deadlines.

### Key Components & Screens
1. **Action-Required Alert Banner (Top of Page):**
   - Highlighting critical time-sensitive events (e.g., *"3 salary payments due this week • 2 invoices overdue by ₹74,500 • 4 documents expiring this month"*).
   - Quick-action buttons to jump directly into the relevant resolution workflow.
2. **KPI Metric Cards Grid (8 Core Metrics):**
   - **Total Employees / Active Employees:** Total headcount and active status breakdown.
   - **Payroll This Month:** Total net payroll calculated/approved for the current cycle (e.g. `₹12,40,000`).
   - **Pending Salary Payments:** Unpaid salary obligations for current/past cycles (e.g. `₹85,000`).
   - **Overdue Invoices:** Unsettled vendor/client invoices past due date (e.g. `₹74,500`).
   - **Pending Invoices:** Total open invoices awaiting payment.
   - **Total Documents:** Total stored business documents and processing status count.
   - **Upcoming Deadlines:** Count of reminders firing within the next 14 days.
3. **Financial & Operational Charts (Recharts):**
   - **Monthly Expense Trend (Area/Bar Chart):** 6-month historical view comparing Payroll Expenses vs. Vendor Invoice Expenses.
   - **Departmental Payroll Breakdown (Pie/Donut Chart):** Proportion of salary spending by department.
4. **Recent Activity Feed & Quick Actions:**
   - Quick buttons: `+ Add Employee`, `+ New Payroll Run`, `+ Upload Document`, `+ Create Invoice`.
   - Chronological stream of recent payments, document extractions, and approvals.

---

## MODULE 2 — Employee Management (`/employees`, `/employees/[id]`)

### Purpose
Manage employee master records, departments, designations, compensation packages, and linked personal documents.

### Key Screens & Features
1. **Employee Directory (`/employees`):**
   - Filterable data table with columns: Employee ID, Name & Avatar, Department, Designation, Employment Type, Basic Salary, Status badge, Quick Actions.
   - Search by name, email, employee ID, or phone number.
   - Filters by Department, Status (`Active`, `On Leave`, `Inactive`, `Resigned`), and Employment Type (`Full-Time`, `Part-Time`, `Contract`, `Daily Wage`).
   - Pagination and multi-column sorting.
2. **Add / Edit Employee Modal (`/employees/new`):**
   - **Personal Details:** First Name, Last Name, Email, Phone, Address, Emergency Contact.
   - **Job Profile:** Employee ID (auto-generated or custom), Department dropdown, Designation, Date of Joining, Employment Type, Status.
   - **Salary & Compensation:** Salary Type (`Monthly`, `Hourly`, `Daily`), Basic Salary (`numeric(12,2)`), Bank Account Number, Bank Name, IFSC Code, PAN Number.
   - Full Zod schema validation on frontend and backend.
3. **Employee Detail Profile Page (`/employees/[id]`):**
   - **Overview Tab:** Full contact, job, banking, and emergency profile.
   - **Salary Structure Tab:** Base salary and recurring salary components (Allowances & Deductions like HRA, PF, Special Allowance).
   - **Payroll & Payslip History Tab:** Chronological list of all historical payroll runs for this employee with one-click PDF payslip downloads.
   - **Payment History Tab:** List of all salary disbursements (date, method, reference number, status).
   - **Documents Tab:** Attached employee documents (ID proof, offer letter, certificates) with secure signed URL previews.

---

## MODULE 3 — Deterministic Payroll Management (`/payroll`, `/payroll/[id]`)

### Purpose
End-to-end payroll lifecycle management using strict deterministic backend calculations.

### Deterministic Calculation Rules
- Net salary is deterministically computed in Express.js backend services:
  $$\text{Net Salary} = \text{Basic Salary} + \text{Overtime} + \text{Bonus} + \text{Allowances} - \text{Deductions} - \text{Advances} - \text{Leave Deductions}$$
- All numbers calculated with exact decimal arithmetic (`numeric(12,2)`).

### Key Screens & Features
1. **Payroll Runs List (`/payroll`):**
   - Table of all historical and active monthly payroll runs (Month/Year, Total Employees, Total Basic, Total Allowances, Total Deductions, Total Net Payout, Status Badge).
   - Status lifecycle: `Draft` ➔ `Reviewed` ➔ `Approved` ➔ `Paid`.
2. **Create New Payroll Run Modal:**
   - Month & Year selector.
   - System automatically loads all `Active` employees in the organization and runs the deterministic calculation engine to compute initial draft payroll items.
3. **Payroll Run Review & Adjustment Screen (`/payroll/[id]`):**
   - Detailed review table listing every included employee.
   - Inline adjustment modal for HR/Admin to adjust overtime hours, ad-hoc bonuses, advances, or unpaid leave days.
   - Real-time recalculation of total run summary via backend triggers and APIs.
4. **Approval & Payout Workflow:**
   - **Review:** HR marks run as `Reviewed`.
   - **Approve:** Admin/Owner approves the run (locks run from further modifications, marks status `Approved`, generates digital payslips, and creates corresponding `Pending` payment records).
   - **Payment Settlement:** As payments are completed, payment records are updated to `Paid`. When all items are settled, the payroll run transitions to `Paid`.

---

## MODULE 4 — Digital Payslips (`/payroll/[id]/payslips`, `/employees/[id]/payslips`)

### Purpose
Generate and distribute professional, compliant digital payslips with instant PDF export.

### Payslip Contents
- Organization Header: Company Name, Address, Tax ID (GSTIN/PAN), Company Logo.
- Employee Summary: Full Name, Employee ID, Department, Designation, Joining Date, Bank Account & IFSC.
- Period & Status: Pay Period (Month, Year), Working Days, Paid Days, Payment Status.
- Earnings Column: Basic Salary, Overtime, Bonus, Individual Allowances (HRA, Conveyance, Special).
- Deductions Column: Provident Fund (PF), Professional Tax (PT), Income Tax (TDS), Advances, Leave Deductions.
- Net Pay Summary: Total Gross Earnings, Total Deductions, Net Payable (in figures and words).
- PDF Download generated via `jspdf` and `jspdf-autotable`.

---

## MODULE 5 — Payment Tracking (`/payments`)

### Purpose
A unified financial ledger to track employee salary disbursements, vendor invoices, and general business payouts.

### Key Screens & Features
1. **Payments Ledger View (`/payments`):**
   - Tabbed view: `All Payments`, `Salary Payments`, `Invoice Payments`.
   - Columns: Entity / Beneficiary (Employee Name or Vendor), Payment Type, Amount (₹), Due Date, Payment Date, Payment Method, Reference #, Status Badge (`Pending`, `Due Soon`, `Paid`, `Overdue`), Actions.
   - Quick filters: Overdue, Due in 7 Days, Paid this Month.
2. **Record Payment Modal:**
   - Select Payment Method: Bank Transfer, UPI, Cheque, Cash, NEFT/RTGS.
   - Enter Payment Date, Transaction Reference Number (UTR / Cheque #), Notes.
   - Optional receipt/voucher attachment upload to Supabase Storage.
   - Automatically marks status as `Paid` and updates linked payroll item or invoice.

---

## MODULE 6 — Document Management & Storage (`/documents`, `/documents/[id]`)

### Purpose
Secure centralized digital repository for all business contracts, employee records, invoices, receipts, and compliance files.

### Key Screens & Features
1. **Document Repository (`/documents`):**
   - Category navigation tabs: `All Documents`, `Invoices`, `Contracts`, `Payslips`, `Certificates`, `Receipts`, `Employee Docs`, `Tax Documents`, `Company Agreements`.
   - Grid or Table view with thumbnail, file name, document type, related employee/entity, upload date, expiry date, verification status, and processing status.
2. **Document Upload Drawer:**
   - Multi-file drag-and-drop upload supporting PDF, PNG, JPEG.
   - File validation (max 10MB, permitted MIME types).
   - Stored in private Supabase Storage bucket with encrypted paths (`org-<id>/documents/<uuid>`).
   - Automatically queues file for AI Document Intelligence.
3. **Document Detail & Viewer (`/documents/[id]`):**
   - Secure embedded PDF/Image viewer with zoom and rotation controls.
   - Metadata sidebar: Uploaded by, timestamp, file size, expiry date, linked employee or vendor.
   - Secure signed URL generator (15-minute TTL) for downloads.

---

## MODULE 7 — AI Document Intelligence (`/documents/[id]/extract`)

### Purpose
Automate unstructured document understanding, classification, and structured key-value extraction using multimodal AI (Gemini / OpenAI).

### Processing Flow
1. **Text Extraction & OCR Fallback:**
   - Attempt direct text layer extraction via `pdf-parse`.
   - If document is scanned or has insufficient text, automatically route to OCR fallback (`tesseract.js` / Vision API).
2. **AI Classification:**
   - Automatically identifies document type: `Invoice`, `Contract`, `Payslip`, `Certificate`, `Receipt`, `Tax Document`, etc.
3. **Structured Information Extraction:**
   - **For Invoices:** Vendor Name, Invoice Number, Invoice Date, Due Date, Subtotal, Tax Amount, Total Amount, Currency, Description.
   - **For Contracts:** Contracting Parties, Effective Start Date, Expiry Date, Renewal Date, Payment Terms, Critical Obligations / Clauses.
   - **For Certificates / IDs:** Identity Type, Document Number, Issuing Authority, Expiry Date.
4. **Split-Screen Interactive Review UI:**
   - Side-by-side view: Document on the left, pre-filled editable form on the right.
   - Confidence badges on extracted fields.
   - One-click actions:
     - *"Create Draft Invoice"* (creates invoice master record).
     - *"Set Contract Reminders"* (creates smart reminders for renewal/expiry).
     - *"Link to Employee"* (attaches certificate/document to employee profile).
5. **Interactive Document Q&A Drawer:**
   - Allows users to ask natural language questions directly about the active document (e.g. *"What is the penalty clause for late delivery?"*, *"When is the warranty expiring?"*).
   - AI answers strictly using extracted document content.

---

## MODULE 8 — Invoice Management (`/invoices`, `/invoices/[id]`)

### Purpose
Manage incoming vendor bills and outgoing customer invoices with payment settlement tracking.

### Key Screens & Features
1. **Invoices List (`/invoices`):**
   - Columns: Invoice Number, Vendor / Customer, Invoice Date, Due Date, Total Amount, Status (`Draft`, `Pending`, `Due Soon`, `Overdue`, `Paid`), Source (AI Extracted / Manual), Actions.
   - Status filters and date range pickers.
2. **Create / Edit Invoice Modal:**
   - Header: Vendor Name, Invoice Number, Invoice Date, Due Date, Currency (INR).
   - Line Items: Item Description, Quantity, Unit Price, Tax (GST %), Total Line Price.
   - Summary: Auto-calculated Subtotal, Tax Total, Discount, Grand Total.
   - Option to link an uploaded PDF document.
3. **Invoice Detail Page (`/invoices/[id]`):**
   - Full invoice layout with line-item breakdown.
   - Linked payment records and receipts.
   - One-click "Record Payment" action.

---

## MODULE 9 — Smart Reminders & Notifications (`/notifications`, `/reminders`)

### Purpose
Prevent missed payments, penalty charges, and compliance lapses through automated deadline detection.

### Automated Reminder Rules
- **Salary Deadlines:** Reminders triggered 3 days before month-end and on overdue salary statuses.
- **Invoice Due Dates:** Reminders triggered 7 days before due date, on due date, and when overdue.
- **Contract Expirations:** Automated alerts at 30 days, 15 days, and 7 days prior to contract expiry.
- **Document Expirations:** Alerts for expiring compliance certificates, driving licenses, or visa documents.

### Key Screens & Features
- **In-App Notification Center (Bell Icon & `/notifications`):**
  - Instant dropdown and full-page notification feed.
  - Read/unread state, timestamp, clickable link to target record.
- **Reminders Management Tab (`/reminders`):**
  - List of all active, dismissed, and resolved reminders.
  - Ability to snooze or mark reminders as resolved.

---

## MODULE 10 — AI Business Assistant (`/assistant`)

### Purpose
An authorized, context-aware conversational assistant that answers business queries by retrieving live database facts.

### Capabilities & Verified Query Scenarios
- **Payroll Inquiries:**
  - *"How much total salary is pending for this month?"*
  - *"Which employees have not received their salary yet?"*
  - *"What was our total payroll expenditure last month?"*
- **Invoice & Vendor Inquiries:**
  - *"Which invoices are currently overdue and by how much?"*
  - *"What vendor payments are due this upcoming week?"*
  - *"Show me all invoices from ABC Traders."*
- **Contract & Compliance Inquiries:**
  - *"Which vendor contracts expire within the next 30 days?"*
  - *"Are there any employee certificates expiring this month?"*

### Guardrails & Safety
- Express backend verifies user role and organization permissions before retrieving database records.
- Financial numbers are fetched directly from PostgreSQL and fed into the AI prompt — the AI is explicitly instructed never to fabricate or guess monetary figures.

---

## MODULE 11 — Reports & Analytics (`/reports`)

### Purpose
Visual and exportable intelligence on payroll trends, departmental expenditure, invoice liabilities, and compliance health.

### Available Reports & Visualizations
1. **Monthly Payroll Summary Report:**
   - 12-month expense trajectory with breakdown of basic vs. allowances vs. overtime.
2. **Departmental Expense Distribution:**
   - Breakdown of payroll and headcount costs by department.
3. **Payment & Cashflow Report:**
   - Ratio of Paid vs. Pending vs. Overdue payments over time.
4. **Invoice Aging & Liability Report:**
   - Classification of outstanding invoices by aging brackets (0-30 days, 31-60 days, 60+ days).
5. **Document Compliance Audit:**
   - Overview of verified vs. unverified documents and upcoming expirations.
6. **Export Center:**
   - One-click export to formatted PDF reports (`jspdf-autotable`) and CSV spreadsheets.

---

## MODULE 12 — Global Search (`/search` or Command-K Dialog)

### Purpose
Universal search bar accessible from anywhere in the application to find any business record in milliseconds.

### Searchable Entities
- **Employees:** Name, Employee ID, Email, Phone, Designation.
- **Payroll Runs:** Month, Year, Status.
- **Payments:** Reference Number, Beneficiary, Amount.
- **Documents:** File Name, Document Type, Related Employee, Tags.
- **Invoices:** Invoice Number, Vendor Name, Total Amount.

---

## MODULE 13 — Organization Settings & Audit Logs (`/settings`)

### Purpose
Manage tenant metadata, department taxonomies, team members, role assignments, and inspect security audit logs.

### Key Screens
1. **Organization Profile (`/settings`):**
   - Business Name, Slug, Default Currency (`INR`), Fiscal Year Start (April), Company Logo, Address, Tax ID (GSTIN/PAN).
2. **Departments & Designations (`/settings/departments`):**
   - Create, edit, and archive departments and job titles.
3. **Team & Role Management (`/settings/users`):**
   - Invite team members via email.
   - Assign roles: `Admin`, `HR`, `Accountant`, `Employee`.
   - Deactivate or update member roles.
4. **Audit Logs Center (`/settings/audit-logs`):**
   - Chronological table of all mutations (`EMPLOYEE_CREATED`, `PAYROLL_APPROVED`, `PAYMENT_RECORDED`, `INVOICE_CREATED`, `DOCUMENT_DELETED`, `ROLE_CHANGED`).
   - Modal to inspect `old_values` vs. `new_values` JSON diffs, user IP, and timestamp.
