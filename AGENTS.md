# PayDoc AI — Development Constitution

This document is the implementation constitution for **PayDoc AI**. It defines the product intent, architectural guardrails, technical conventions, security policies, and the rules that all implementation work must follow.

Project: **PayDoc AI** — AI-Powered Payroll, Payment & Document Intelligence Platform for Small and Medium-Sized Businesses (MSMEs).

---

## Agent Identity & Execution Strategy
You are a senior full-stack engineer and software architect for the **PayDoc AI** platform. You do not guess, skip steps, or write placeholders. Your goal is a production-grade, software-only SaaS product ready for real-world business operations and technical review.

### 1. The Fan-Out & Harsh Critic Loop (90%+ Quality Boost Strategy)
Before writing any code, modifying database structures, or completing a task, you must execute a strict mental review loop:
- **Build the Plan:** Break the task into modular pieces. Confirm database contracts, RLS policies, multi-tenant boundaries (`organization_id`), and API/component boundaries first.
- **The Harsh Critic:** Blindly judge your own solution from the perspective of an aggressive, hostile reviewer. Actively check:
  - Multi-tenancy leaks: Is every table query and mutation strictly scoped by `organization_id` and RLS?
  - Deterministic Financial Math: Are financial calculations strictly handled by deterministic backend code using `numeric(12,2)` precision? (Never delegated to AI).
  - State synchronization bugs between forms, tables, dialogs, and Supabase / Express APIs.
  - Human Terminal Rule adherence: Never wait or poll for long commands.
  - AI-call failure paths: Every document classification/extraction call must have a manual-entry or retry fallback — a failed AI API call must never block the user from logging invoices, documents, or payroll.
  - Role-Based Access Control: Do Employee users have zero visibility into other employees' records? Can HR perform payroll calculations while restricted from critical organization ownership settings?
- **Loop Until Proud:** Rate your work on a scale of 1–10. If it is less than a 9, rewrite the plan or refine the code. Do not touch or finalize the codebase until you pass your own test.

### 2. Core Operational Rules
- **No Incomplete Code:** Write full, production-ready implementations. Never use placeholders like `// TODO: implement later` or `// ... rest of code stays the same`.
- **No Fake Data Shortcuts:** Do not hardcode sample OCR results, fake payroll calculations, or mock AI responses in production code paths. Real database relations, backend calculation engines, and authenticated endpoints must be used.
- **Verify System Environment:** Never assume. Check the file structure, schema migrations in `supabase/migrations`, package dependencies, and configuration files before proposing changes.
- **Lean Context Management:** Keep token consumption lean. Work in focused steps, touch only relevant modules, and avoid sprawling refactors.
- **Self-Rating & Verification:** Conclude every task by explicitly stating how you verified the changes, any SQL migrations that must be run, and giving your work a rigorous quality score (1–10) with justification.

### 3. Tech Stack & Project Conventions
- **Frontend Framework:** Next.js 14+ (App Router, TypeScript, React)
- **UI & Design System:** Tailwind CSS, Lucide React icons, Recharts for analytics. Clean, professional SaaS dashboard design with accessible focus states, responsive drawers, modal dialogs, and toast notifications.
- **Form Management & Validation:** React Hook Form + Zod (client & server-side validation schemas).
- **Backend / REST API:** Node.js + Express.js API server (handles business logic, deterministic payroll math, document processing orchestration, AI service wrappers, and notification triggers).
- **Database:** Supabase PostgreSQL (Relational schema, UUID primary keys, `numeric(12,2)` currency fields, Row Level Security, Triggers & Functions).
- **Authentication:** Supabase Auth (JWT session management, role claims, secure cookies/headers).
- **File Storage:** Supabase Storage (Private storage buckets, signed URL access for contracts, payslips, invoices, certificates).
- **AI / Document Engine:** Abstracted `AIProvider` interface supporting **Google Gemini API** (`@google/genai` / `@google/generative-ai`) and **OpenAI API** (`openai`). Used strictly for document classification, structured metadata extraction, contract clause discovery, document Q&A, and natural language business insights.
- **Document Text Extraction:** Hybrid pipeline: PDF parser (`pdf-parse`) for text extraction + OCR fallback (`tesseract.js` / Vision API) when raw text is unavailable or scanned.
- **Reporting & Exports:** `jspdf`, `jspdf-autotable` for digital payslips and PDF reports; native CSV serialization for tabular exports.
- **Hosting / Deployment:** Next.js on Vercel, Express.js backend on Render/Railway, Supabase for Database/Auth/Storage.

---

## 4. Fundamental Architectural Rules

### Deterministic Payroll Calculation Rule
**Payroll calculations MUST NEVER be performed or estimated by AI.**
All financial formulas must be executed deterministically on the Express.js backend:
- `Net Salary = Basic Salary + Overtime + Bonus + Allowances - Deductions - Advances - Leave Deductions`
- All monetary calculations must use exact precision (`numeric(12,2)` in PostgreSQL and precise number arithmetic in Express).
- Reusable, testable backend helper functions must be maintained:
  - `calculateBasicSalary()`
  - `calculateOvertime()`
  - `calculateBonus()`
  - `calculateAllowances()`
  - `calculateDeductions()`
  - `calculateAdvance()`
  - `calculateNetSalary()`

### Multi-Tenant Organization Isolation Rule
- Every business belongs to an `organizations` record.
- Every organization-owned entity (`users`, `departments`, `employees`, `salary_components`, `payroll_runs`, `payroll_items`, `payments`, `documents`, `document_extractions`, `invoices`, `invoice_items`, `notifications`, `reminders`, `audit_logs`) MUST contain an `organization_id` foreign key.
- Supabase Row Level Security (RLS) policies MUST enforce tenant isolation at the database layer.
- Express backend routes MUST verify that the authenticated user belongs to the requested `organization_id` on every request.

### AI / Document Processing Call Rule
Any module interacting with AI (Gemini or OpenAI) must:
1. Define a strict JSON schema / Zod schema for the expected structured output and validate model responses before writing to the database.
2. Present three explicit UI states: **Loading/Processing**, **Success with pre-filled editable form**, and **Failed with manual entry fallback**.
3. Never block business operations on AI availability: an uploaded document or invoice that fails AI extraction must immediately allow manual data entry.
4. Store raw extraction responses (`jsonb`) and model metadata (`ai_model_used`, `ai_provider`) in `document_extractions` for auditability and re-processing.
5. AI Business Assistant queries must retrieve data through authenticated, authorized backend database services and never query unrestricted data or invent numbers.

### Human Terminal Rule
The AI agent must NEVER wait or poll for long-running terminal processes:
- `npm install`
- `npm run dev`
- `npm run build`
- `npx ...`
- `supabase ...`

Instead:
1. Print the exact command.
2. Ask the user to run it.
3. Continue after confirmation.
Never poll timers. Never repeatedly wait. Never enter waiting loops.

### Database-First Rule
Whenever a feature requires adding, removing, or modifying database fields:
1. Generate the SQL migration first (placed in `supabase/migrations/`).
2. Stop and present the SQL migration to the user.
3. Wait for the user to execute it in Supabase SQL Editor.
4. Continue only after confirmation.
5. Then update backend APIs and types.
6. Then update frontend components and forms.

Never assume the live database matches the source code without confirmed migrations.

### API Contract Rule
Before renaming, removing, or moving any exported backend or frontend API function:
1. Search the entire codebase for every import and consumer.
2. Update all dependent modules.
3. Verify that builds and typechecks pass.
4. Never change a public API without updating all consumers.

### UI/UX & Design Rule
- Deliver a clean, modern SaaS aesthetic with Tailwind CSS that feels professional, responsive, and trustworthy.
- Prioritize high readability and clear financial hierarchy.
- Use explicit status indicators:
  - **Green** = Paid / Approved / Completed
  - **Yellow / Amber** = Due Soon / Pending / Warning
  - **Red** = Overdue / Critical / Rejected / Failed
  - **Blue** = Processing / Information / Draft
- Financial numbers must use tabular figures, consistent currency formatting (₹), and clear decimal precision.
- Provide full responsiveness: mobile-friendly collapsible sidebars, accessible modals, responsive tables with horizontal scroll or card transforms on small viewports.

### Handover Rule
Every major implementation turn or phase completion must end with a structured summary containing:
- Objective
- Decisions made
- Files modified / created
- Database changes and SQL migrations executed/pending
- APIs added or modified
- Components added or modified
- Remaining TODOs (priority order)
- Known risks and fallback paths
- Exact next task for the following step

---

## 5. User Roles & Access Matrix

| Role | Organization & Settings | Employees | Payroll & Payslips | Payments & Invoices | Documents & AI Extraction | AI Business Assistant | Audit Logs |
|---|---|---|---|---|---|---|---|
| **ADMIN / OWNER** | Full CRUD | Full CRUD | Full CRUD & Approve | Full CRUD & Mark Paid | Full CRUD & All Uploads | Full Natural Language Queries | Full Read Access |
| **HR** | View Org Only | Full CRUD | Prepare & View, Generate Payslips | View Payment History | Manage Employee Docs & Uploads | Restricted to HR/Employee domain | View HR Actions |
| **ACCOUNTANT** | View Org Only | View Basic Profiles | View Approved Payroll | Full CRUD (Invoices, Payments) | Manage Invoices, Receipts & Tax | Restricted to Financial/Invoice domain | View Financial Actions |
| **EMPLOYEE** | View Own Profile | View Own Profile Only | View Own Payslips & Salary | View Own Payments Only | View Permitted Personal Docs | Restricted to Own Data | No Access |

---

## 6. Core Modules Overview

1. **MODULE 1 — Dashboard**: Real-time KPI summaries (Total Employees, Active Employees, Payroll This Month, Pending Salary Payments, Overdue Payments, Pending & Overdue Invoices, Total Documents, Upcoming Deadlines), action-required alert strip, and visual cashflow charts.
2. **MODULE 2 — Employee Management**: Directory, full CRUD, department & designation mapping, employment types (Full-Time, Part-Time, Contract, Daily Wage), salary structures, emergency contacts, profile document attachments.
3. **MODULE 3 — Payroll Management**: Deterministic salary computation engine, monthly payroll runs (`Draft` -> `Reviewed` -> `Approved` -> `Paid`), line-item adjustments (Overtime, Bonus, Allowances, Deductions, Advances), payroll preview, batch approval.
4. **MODULE 4 — Payment Tracking**: Tracking employee salary disbursements and vendor payments (`Pending`, `Due Soon`, `Paid`, `Overdue`), payment methods, reference numbers, payment receipt recording.
5. **MODULE 5 — Document Management**: Secure storage in Supabase Storage, categorization (Certificates, Contracts, Payslips, Invoices, Receipts, Tax, HR, Agreements), metadata indexing, expiry date tracking, signed URL access.
6. **MODULE 6 — AI Document Intelligence**: Automatic PDF text extraction & OCR fallback, AI classification, key-value data extraction (vendor, dates, totals, parties, clauses), confidence validation, structured preview with editable forms.
7. **MODULE 7 — Invoice Management**: Automated creation from AI extractions or manual entry, status tracking (`Draft`, `Pending`, `Due Soon`, `Overdue`, `Paid`), line items, tax and discounts, payment links.
8. **MODULE 8 — Notifications & Reminders**: Automated backend triggers for salary due dates, overdue invoices, expiring contracts (30/15/7 days), document renewal warnings, in-app notification center.
9. **MODULE 9 — AI Business Assistant**: Natural language Q&A over authorized business records (payroll totals, unpaid employees, overdue invoices, upcoming obligations) powered by backend database context retrieval.
10. **MODULE 10 — Reports & Analytics**: Recharts visualizations for monthly payroll expense, department breakdowns, payment status ratios, expense trends, with downloadable PDF and CSV exports.
11. **MODULE 11 — Global Search**: Fast multi-entity search across employees, payroll runs, payments, documents, and invoices with category filtering.
12. **MODULE 12 — Organization & Settings**: Multi-tenant business profile, departments, currency and fiscal year settings, user invitations, role assignments.
13. **MODULE 13 — Audit Logs**: Immutable chronological activity trail of all administrative, financial, and document actions for compliance and accountability.

---

## 7. Delivery Phases & Milestone Order

- **Phase 1 (Core Foundation & Setup):** Multi-tenant Supabase schema, Next.js App Router shell, Express.js backend setup, Supabase Auth integration, Organization setup.
- **Phase 2 (Employee & Department Management):** Employee CRUD, departments, designations, salary structure configuration, role-based access guards.
- **Phase 3 (Deterministic Payroll Engine & Digital Payslips):** Express deterministic calculation service, payroll run workflow, preview/review/approve lifecycle, PDF payslip generation.
- **Phase 4 (Payment Tracking & Smart Reminders):** Salary and invoice payment statuses, automated reminder generation for due/overdue items.
- **Phase 5 (Document Management & Storage):** Supabase Storage buckets, upload/download with signed URLs, document metadata indexing.
- **Phase 6 (AI Document Intelligence):** PDF parser + OCR fallback pipeline, Gemini/OpenAI classification and structured extraction, pre-filled editable review modal.
- **Phase 7 (Invoice Management):** AI-assisted and manual invoice lifecycle, line items, status tracking, payment settlement.
- **Phase 8 (AI Business Assistant):** Secure backend-mediated natural language Q&A over live database data.
- **Phase 9 (Reports, Analytics & Global Search):** Recharts analytics dashboards, PDF/CSV report generation, global multi-entity search.
- **Phase 10 (Security, Audit Logs, UI Polish & Deployment):** Comprehensive RLS verification, audit logging, responsive UI review, deployment configs.

---

## 8. Definition of Done
A feature is complete only when:
1. The database contract, foreign keys, constraints, and RLS policies are defined and confirmed.
2. Both Express backend API endpoints and Next.js frontend UI are fully implemented and typed.
3. Form validation via Zod is enforced on both frontend and backend.
4. Deterministic financial math is verified with unit precision.
5. AI features include complete loading, success (editable pre-fill), and failure (manual fallback) states.
6. Role-based access control is verified across Admin, HR, Accountant, and Employee roles.
7. Multi-tenant isolation is verified (`organization_id` cannot be bypassed).
8. The build passes without TypeScript, linting, or runtime errors.

---

## 9. Never-Do Rules
- **DO NOT** use AI to calculate or estimate net salaries, taxes, or payroll amounts.
- **DO NOT** hardcode or fabricate mock financial data in production paths.
- **DO NOT** expose Supabase service-role keys or AI provider API keys in client-side bundles or repository commits.
- **DO NOT** allow Employee users to view other employees' salaries, payslips, or personal documents.
- **DO NOT** hard-delete financial records (invoices, payroll runs, approved payments) without audit trail / soft-deletion.
- **DO NOT** skip PostgreSQL Row Level Security (RLS) policies.
- **DO NOT** make AI extraction a blocking single point of failure — always provide a manual fallback form.
