# Feature Delivery Plan & Milestone Roadmap — PayDoc AI

This document defines the milestone sequence, delivery order, verification checkpoints, and testing gates for building **PayDoc AI**.

---

## 1. Core MVP Delivery Principles

The initial working product focuses squarely on the five critical operational capabilities before expanding into advanced secondary modules:

1. **Employee Management** (Directory, profiles, compensation structure, departments)
2. **Deterministic Payroll** (Backend calculation engine, monthly run lifecycle, PDF payslips)
3. **Payment Tracking** (Salary disbursements and status tracking)
4. **Document Management** (Supabase Storage upload, categorization, private access)
5. **AI Document Intelligence** (PDF text extraction, OCR fallback, Gemini/OpenAI extraction with editable preview)

Once these five core flows are verified end-to-end on live PostgreSQL data, the secondary modules are delivered:
6. **Invoice Management** (AI-assisted invoice creation and line-item tracking)
7. **Smart Reminders & Notifications** (Automated salary/invoice/contract deadline alerts)
8. **AI Business Assistant** (Database-backed natural language query engine)
9. **Reports & Analytics** (Recharts visual dashboards, PDF & CSV export)
10. **Global Search, Audit Logs & Security Hardening** (Universal search, audit logging, RLS audit, production deployment)

---

## 2. Phased Milestone Roadmap

### Phase 1: Foundation, Multi-Tenant Schema & Authentication
- **Database:** Execute baseline migration creating `organizations`, `users`, `departments`, `employees`, `salary_components`, `payroll_runs`, `payroll_items`, `payments`, `documents`, `document_extractions`, `invoices`, `invoice_items`, `notifications`, `reminders`, `audit_logs` with RLS policies and triggers.
- **Backend Setup:** Express.js REST server bootstrap with TypeScript, Supabase Admin client, error handler middleware, and JWT authentication middleware.
- **Frontend Setup:** Next.js 14+ App Router shell, Tailwind CSS design system tokens, Supabase client integration, authentication pages (`/login`, `/register`).
- **Verification Gate:** Register organization, log in, verify JWT authentication and organization scoping in Express middleware.

---

### Phase 2: Employee & Department Management
- **Backend APIs:**
  - `GET /api/employees` (list with search, department filter, status filter, pagination)
  - `POST /api/employees` (create employee with Zod validation)
  - `GET /api/employees/:id` (employee profile, salary components, documents)
  - `PUT /api/employees/:id` (update profile)
  - `GET /api/departments` & `POST /api/departments`
- **Frontend Screens:**
  - `/employees` (Directory data table with filters, search, and status badges)
  - `/employees/new` (Add Employee modal with React Hook Form + Zod)
  - `/employees/[id]` (Detail page with Overview, Salary, History, and Documents tabs)
- **Verification Gate:** Add employees across multiple departments and employment types; verify uniqueness of `employee_id` and `email` per organization.

---

### Phase 3: Deterministic Payroll Engine & Digital Payslips
- **Backend Services:**
  - Reusable deterministic calculation functions: `calculateBasicSalary()`, `calculateOvertime()`, `calculateBonus()`, `calculateAllowances()`, `calculateDeductions()`, `calculateAdvance()`, `calculateNetSalary()`.
  - `POST /api/payroll/runs` (Initialize monthly payroll run for active employees)
  - `GET /api/payroll/runs` & `GET /api/payroll/runs/:id` (Run details with employee breakdown)
  - `PUT /api/payroll/items/:id` (Adjust overtime, bonuses, deductions for individual employee)
  - `POST /api/payroll/runs/:id/approve` (Lock run, mark `Approved`, generate payslip entries, generate pending payments)
  - `GET /api/payslips/:id/pdf` (Generate dynamic PDF payslip using `jspdf` & `jspdf-autotable`)
- **Frontend Screens:**
  - `/payroll` (Payroll runs list with status badges: `Draft`, `Reviewed`, `Approved`, `Paid`)
  - `/payroll/new` (Month/Year selector to launch new run)
  - `/payroll/[id]` (Detailed review table with editable employee adjustments modal)
  - Payslip PDF download dialog and employee self-service view
- **Verification Gate:** Run payroll for 10+ employees with varying allowances, overtime hours, and deductions; verify net salary exact arithmetic matches manually calculated numbers down to ₹0.01 precision.

---

### Phase 4: Payment Tracking & Disbursement Ledger
- **Backend APIs:**
  - `GET /api/payments` (Filter by type `salary`/`invoice`, status `pending`/`due_soon`/`paid`/`overdue`, date range)
  - `POST /api/payments/:id/pay` (Record payment date, method, reference number, upload receipt)
  - `GET /api/payments/summary` (Aggregated pending and overdue payment totals)
- **Frontend Screens:**
  - `/payments` (Ledger table with status badges and quick filters)
  - Record Payment modal (payment method selector, UTR/reference number input, receipt upload)
- **Verification Gate:** Mark salary payments as paid; verify payroll run status automatically transitions to `Paid` once all items are settled.

---

### Phase 5: Document Management & Secure Storage
- **Backend Services:**
  - Supabase Storage private bucket configuration (`documents`)
  - `POST /api/documents/upload` (Upload file, store in Supabase Storage, insert metadata record)
  - `GET /api/documents` (List by category, employee, verification status)
  - `GET /api/documents/:id/signed-url` (Generate 15-minute temporary signed URL for secure viewing)
- **Frontend Screens:**
  - `/documents` (Category tabs: All, Invoices, Contracts, Payslips, Certificates, Receipts, Tax, HR)
  - Document Upload Drawer with drag-and-drop file upload
  - `/documents/[id]` (Embedded PDF/Image viewer with metadata sidebar)
- **Verification Gate:** Upload private employee contract PDF; verify non-authorized user cannot access raw storage URL without valid signed URL token.

---

### Phase 6: AI Document Intelligence & Information Extraction
- **Backend Services:**
  - Hybrid text extraction pipeline: `pdf-parse` for text extraction with OCR fallback (`tesseract.js` / Vision API) for scanned documents.
  - Abstracted `AIProvider` interface supporting Gemini (`@google/genai`) and OpenAI (`openai`).
  - Document classifier prompt with strict JSON schema (Invoice, Contract, Payslip, Certificate, Receipt, etc.).
  - Structured field extractor (Vendor, invoice #, dates, amounts, parties, terms).
  - Validation of extracted data against Zod schemas before database insertion into `document_extractions`.
- **Frontend Screens:**
  - Document Processing split-screen review modal (Document viewer on left, pre-filled editable form on right).
  - One-click actions: "Create Invoice Draft", "Create Contract Reminders", "Attach to Employee".
  - Manual entry fallback when AI extraction is partial or fails.
- **Verification Gate:** Upload sample invoice and sample contract; verify AI correctly identifies document type and extracts amounts/dates with high confidence; verify editing fields in UI correctly saves clean data.

---

### Phase 7: Invoice Management
- **Backend APIs:**
  - `GET /api/invoices` & `GET /api/invoices/:id`
  - `POST /api/invoices` (Create invoice manually or from AI extraction with line items)
  - `PUT /api/invoices/:id` (Update status: `Draft`, `Pending`, `Due Soon`, `Overdue`, `Paid`)
- **Frontend Screens:**
  - `/invoices` (Table with status badges, vendor names, total amounts, due dates)
  - `/invoices/new` (Invoice builder modal with dynamic line items, auto tax & total calculation)
  - `/invoices/[id]` (Invoice view with printable preview and payment history)
- **Verification Gate:** Create invoice from extracted document; verify line items and total amounts calculate correctly; record payment and verify payment ledger updates.

---

### Phase 8: Smart Reminders & In-App Notifications
- **Backend Services:**
  - Scheduled worker or on-demand check for upcoming/overdue payments, expiring contracts (30, 15, 7 days), and expiring documents.
  - `GET /api/notifications` & `PUT /api/notifications/:id/read`
  - `GET /api/reminders` & `PUT /api/reminders/:id/status`
- **Frontend Screens:**
  - Dashboard Action-Required alert strip
  - In-app Notification dropdown in header (bell icon with unread count badge)
  - `/reminders` management tab
- **Verification Gate:** Set test contract expiring in 10 days; verify reminder is generated and alert appears on dashboard and notification dropdown.

---

### Phase 9: AI Business Assistant
- **Backend Services:**
  - `POST /api/assistant/query` (Handles conversational natural language queries)
  - Intent classification & SQL query context retriever (queries live payroll sums, unpaid employee list, overdue invoices, expiring contracts)
  - Structured prompt assembly and AI provider execution (Gemini / OpenAI) with strict instructions never to hallucinate financial data.
- **Frontend Screens:**
  - `/assistant` (Interactive conversational chat interface with suggested query chips and linked record shortcuts)
- **Verification Gate:** Ask assistant *"How much salary is pending this month?"* and *"Which invoices are overdue?"*; verify responses strictly match actual database calculations.

---

### Phase 10: Reports & Analytics, Global Search & Security Hardening
- **Backend Services:**
  - `GET /api/analytics/overview` (Monthly expense trends, department breakdowns, payment status ratios)
  - `GET /api/search?q=...` (Multi-entity search across employees, payroll, payments, invoices, documents)
  - PDF export generator for monthly reports (`jspdf-autotable`) and CSV serializer
  - Immutable audit log middleware recording all administrative and financial mutations
- **Frontend Screens:**
  - `/reports` (Interactive Recharts dashboards, period selector, export to PDF/CSV)
  - Global Search Command-K modal
  - `/settings/audit-logs` (Audit trail viewer with JSON diff inspector)
- **Verification Gate:** Full regression test across all 4 user roles (Admin, HR, Accountant, Employee) verifying RLS boundary enforcement and zero cross-tenant data leakage.

---

## 3. Deliberate Invariants & Safety Rules

- **Zero AI in Financial Math:** All salary and invoice totals are calculated in deterministic Express backend functions using exact `numeric(12,2)` arithmetic.
- **No Blocking AI Dependency:** Every document processing step has a full manual data entry fallback.
- **Multi-Tenant Scoping:** Every query and mutation is filtered by `organization_id` and verified by Supabase RLS.
- **No Secret Leakage:** Service-role keys and AI provider keys remain strictly on the backend server.
