# Implementation Plan — PayDoc AI

This document defines the actionable build checklist, database checkpoints, backend API implementations, and frontend UI delivery order for **PayDoc AI**.

---

## Milestone Checklist

### Milestone 1: Multi-Tenant Database & Core Scaffolding
- [ ] Draft initial PostgreSQL migration in `supabase/migrations/0001_initial_schema.sql` (all 15 tables with UUIDs, `numeric(12,2)`, foreign keys, and updated_at triggers).
- [ ] Draft RLS policies in `supabase/migrations/0002_rls_policies.sql` (organization isolation and RBAC helper functions).
- [ ] Present migrations to user for execution in Supabase SQL Editor.
- [ ] Set up Express backend structure (`/backend`) with TypeScript, error middleware, auth middleware, and Supabase client.
- [ ] Set up Next.js 14+ App Router frontend (`/frontend`) with Tailwind CSS, Lucide React, and Supabase browser client.

### Milestone 2: Employee & Department Management (MVP Core 1)
- [ ] Backend: Build `departments` CRUD endpoints (`GET /api/departments`, `POST /api/departments`).
- [ ] Backend: Build `employees` CRUD endpoints with Zod validation (`GET /api/employees`, `POST /api/employees`, `GET /api/employees/:id`, `PUT /api/employees/:id`).
- [ ] Frontend: Implement `/employees` directory data table with search, filters (department, status, employment type), and pagination.
- [ ] Frontend: Implement `AddEmployeeModal` with React Hook Form + Zod schema validation.
- [ ] Frontend: Implement `/employees/[id]` detail page with tabs: Overview, Salary Structure, Payroll History, Documents.

### Milestone 3: Deterministic Payroll Engine & Digital Payslips (MVP Core 2)
- [ ] Backend: Implement deterministic calculation functions (`calculateBasicSalary`, `calculateOvertime`, `calculateBonus`, `calculateAllowances`, `calculateDeductions`, `calculateAdvance`, `calculateNetSalary`).
- [ ] Backend: Implement `POST /api/payroll/runs` (launches draft payroll run loading active employees).
- [ ] Backend: Implement `GET /api/payroll/runs/:id` and `PUT /api/payroll/items/:id` (adjustments review).
- [ ] Backend: Implement `POST /api/payroll/runs/:id/approve` (locks run, triggers payslip & payment creation).
- [ ] Backend / Frontend: Implement PDF payslip generator service using `jspdf` and `jspdf-autotable`.
- [ ] Frontend: Implement `/payroll` runs list and `/payroll/[id]` run review page with inline employee adjustment modals.

### Milestone 4: Payment Tracking & Disbursements (MVP Core 3)
- [ ] Backend: Implement `GET /api/payments` with filters by type (`salary`, `invoice`), status (`pending`, `due_soon`, `paid`, `overdue`), and dates.
- [ ] Backend: Implement `POST /api/payments/:id/pay` (records payment date, method, reference number, receipt link).
- [ ] Frontend: Implement `/payments` unified financial ledger with status badges and quick action filters.
- [ ] Frontend: Implement `RecordPaymentModal` with payment method selector and UTR/reference number inputs.

### Milestone 5: Document Management & Secure Storage (MVP Core 4)
- [ ] Supabase: Configure private storage bucket `documents`.
- [ ] Backend: Implement `POST /api/documents/upload` (stores file in Supabase Storage and inserts metadata into `documents` table).
- [ ] Backend: Implement `GET /api/documents` and `GET /api/documents/:id/signed-url` (generates temporary 15-min signed URLs).
- [ ] Frontend: Implement `/documents` category repository (Invoices, Contracts, Payslips, Certificates, Receipts, Tax, HR).
- [ ] Frontend: Implement drag-and-drop document upload drawer.

### Milestone 6: AI Document Intelligence & Split-Screen Review (MVP Core 5)
- [ ] Backend: Implement document text extraction pipeline (`pdf-parse` with OCR fallback via `tesseract.js` / Vision API).
- [ ] Backend: Implement `AIProvider` wrapper supporting Google Gemini API and OpenAI API.
- [ ] Backend: Implement document classification and structured extraction prompts with strict Zod JSON schemas for invoices and contracts.
- [ ] Backend: Save extraction outputs and confidence scores to `document_extractions` table.
- [ ] Frontend: Implement split-screen review modal (`/documents/[id]/extract`) with side-by-side document preview and pre-filled editable form.
- [ ] Frontend: Add one-click "Create Draft Invoice" and "Create Contract Reminders" actions with manual fallback on failure.

### Milestone 7: Invoice Management
- [ ] Backend: Implement `GET /api/invoices`, `POST /api/invoices`, `GET /api/invoices/:id`, `PUT /api/invoices/:id`.
- [ ] Frontend: Implement `/invoices` table with status badges (`Draft`, `Pending`, `Due Soon`, `Overdue`, `Paid`).
- [ ] Frontend: Implement `CreateInvoiceModal` with dynamic line items, auto-calculated subtotal, GST, discounts, and total.

### Milestone 8: Smart Reminders & In-App Notifications
- [ ] Backend: Implement deadline detection logic for salary due dates, overdue invoices, expiring contracts (30, 15, 7 days), and expiring certificates.
- [ ] Backend: Implement `GET /api/notifications`, `PUT /api/notifications/:id/read`, `GET /api/reminders`.
- [ ] Frontend: Implement Action-Required alert strip on `/dashboard`.
- [ ] Frontend: Implement header notification center dropdown with unread badge counter.

### Milestone 9: AI Business Assistant
- [ ] Backend: Implement `POST /api/assistant/query` with intent classification and database context retriever (queries live payroll, unpaid employees, overdue invoices).
- [ ] Backend: Assembly of factual context prompt to Gemini/OpenAI API with strict non-hallucination guardrails.
- [ ] Frontend: Implement `/assistant` interactive chat interface with suggested query chips and linked record shortcuts.

### Milestone 10: Reports & Analytics, Global Search & Security Hardening
- [ ] Backend: Implement `GET /api/analytics/overview` (monthly expense trends, department breakdowns, payment status ratios).
- [ ] Backend: Implement `GET /api/search` across employees, payroll, payments, invoices, and documents.
- [ ] Backend: Implement immutable audit logging middleware (`audit_logs` table).
- [ ] Frontend: Implement `/reports` dashboard with Recharts visualizations and export to PDF/CSV.
- [ ] Frontend: Implement Command-K Global Search modal.
- [ ] Frontend / Backend: Complete RLS audit, security review, and deployment configuration.
