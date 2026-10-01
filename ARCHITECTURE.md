# Architecture Guide — PayDoc AI

This document defines the software architecture, system boundaries, component relationships, data flows, and security models for **PayDoc AI** — the AI-Powered Payroll, Payment & Document Intelligence Platform.

---

## 1. System Architecture Overview

PayDoc AI is built as a modular full-stack SaaS platform comprising a modern **Next.js** frontend web application, an **Express.js (Node.js)** REST API backend server, **Supabase** (PostgreSQL, Authentication, and Private Storage), and a pluggable **AI Provider** layer (Google Gemini API / OpenAI API).

```text
                                PAYDOC AI
                                    |
             +----------------------+----------------------+
             |                                             |
     Next.js Frontend                             Express.js Backend
   (App Router + Tailwind)                          (Node.js REST)
             |                                             |
             |                                  +----------+----------+
             |                                  |                     |
             |                            Business Logic          AI Layer
             |                         & Deterministic Math   (Gemini / OpenAI)
             |                                  |                     |
             +----------------------------------+---------------------+
                                                |
                                        Supabase Cloud
                               +----------------+----------------+
                               |                |                |
                          PostgreSQL          Auth            Storage
                        (with RLS & SQL)     (JWT & RBAC)  (Private Buckets)
```

---

## 2. Core Architectural Principles

1. **Deterministic Financial Math:** Payroll and monetary operations are **never** delegated to AI. All salary, tax, overtime, allowance, and deduction calculations are deterministically computed and validated in the Express.js backend using explicit formulas and exact decimal handling (`numeric(12,2)`).
2. **Strict Multi-Tenant Isolation:** Every data entity belongs to an `organization_id`. Access is guarded at multiple layers: Express backend JWT middleware, tenant query filters, and PostgreSQL Row Level Security (RLS) policies.
3. **Pluggable AI Abstraction:** AI features (document classification, information extraction, contract intelligence, document Q&A, and business assistant) are accessed through an abstracted `AIProvider` interface. The system supports swapping between **Google Gemini** and **OpenAI** without changing business logic.
4. **Resilient Document Processing Pipeline:** Document ingestion combines text extraction (`pdf-parse`) with an OCR fallback (`tesseract.js` / Vision API) and structured AI parsing. Every AI output is validated against Zod schemas and presented to the user in an editable pre-filled form before finalizing.
5. **Zero Secret Leakage:** Supabase service-role keys and AI provider API keys reside strictly on the server-side environment (`.env`). The client bundle only receives `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 3. Directory Structure

The project is structured with a clear separation between frontend application, backend API server, shared schemas, and database migrations:

```text
paydoc-ai/
├── backend/                       # Node.js + Express.js REST API Server
│   ├── src/
│   │   ├── config/                # Environment variables, Supabase admin client
│   │   ├── middleware/            # Auth, RBAC, tenant isolation, error handling
│   │   ├── modules/               # Feature-specific domain controllers & services
│   │   │   ├── auth/              # User profile & organization binding
│   │   │   ├── employees/         # Employee CRUD, departments, designations
│   │   │   ├── payroll/           # Deterministic salary calculation & payroll runs
│   │   │   ├── payslips/          # PDF generation & payslip distribution
│   │   │   ├── payments/          # Salary & invoice payment tracking
│   │   │   ├── documents/         # Upload, metadata, storage management
│   │   │   ├── documentAi/        # PDF parse, OCR fallback, AI extraction
│   │   │   ├── invoices/          # Invoice management & line item calculations
│   │   │   ├── reminders/         # Automated deadline & renewal detection
│   │   │   ├── assistant/         # AI Business Assistant (database-backed Q&A)
│   │   │   ├── analytics/         # Reports, summary aggregations, export feeds
│   │   │   ├── search/            # Multi-entity global search service
│   │   │   ├── organization/      # Organization settings & member management
│   │   │   └── audit/             # Immutable audit log recorder
│   │   ├── services/
│   │   │   ├── ai/                # AIProvider interface (GeminiProvider, OpenAIProvider)
│   │   │   ├── storage/           # Supabase Storage wrapper (signed URLs, uploads)
│   │   │   └── pdf/               # PDF generation (jspdf) & parsing (pdf-parse)
│   │   ├── utils/                 # Deterministic math, formatters, date helpers
│   │   ├── routes.ts              # Express master route definitions
│   │   └── server.ts              # Express application bootstrap
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                      # Next.js 14+ Web Application (App Router)
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages & layouts
│   │   │   ├── (auth)/            # Login, register, forgot-password
│   │   │   ├── (dashboard)/       # Authenticated layout with sidebar & header
│   │   │   │   ├── dashboard/     # High-level KPI overview & alert strip
│   │   │   │   ├── employees/     # Employee directory, profile, add/edit modals
│   │   │   │   ├── payroll/       # Payroll runs, review, approval & payslips
│   │   │   │   ├── payments/      # Payment tracking (salaries & invoices)
│   │   │   │   ├── documents/     # Document repository & upload drawer
│   │   │   │   ├── invoices/      # Invoice management & creation flows
│   │   │   │   ├── reports/       # Analytics charts & export center
│   │   │   │   ├── assistant/     # AI Business Assistant chat interface
│   │   │   │   ├── notifications/ # Notification center & reminder lists
│   │   │   │   └── settings/      # Organization profile, roles, preferences
│   │   │   ├── layout.tsx         # Root layout with fonts & providers
│   │   │   └── page.tsx           # Landing / redirect route
│   │   ├── components/            # Reusable UI component library
│   │   │   ├── ui/                # Buttons, inputs, modals, cards, badges, tabs
│   │   │   ├── layout/            # Sidebar, Header, MobileNav, SearchBar
│   │   │   ├── forms/             # React Hook Form wrappers with Zod validation
│   │   │   ├── tables/            # Paginated, sortable, filterable data tables
│   │   │   └── charts/            # Recharts wrappers (bar, area, pie, trend)
│   │   ├── hooks/                 # Custom React hooks (useAuth, useTenant, usePermissions)
│   │   ├── lib/                   # Supabase browser client, API fetch client, utils
│   │   ├── types/                 # Frontend TypeScript definitions
│   │   └── styles/                # Tailwind CSS globals
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── shared/                        # Shared TypeScript types, enums & Zod validation schemas
│   ├── schemas/                   # Zod schemas (payroll, employee, invoice, document)
│   └── types/                     # Shared entity interfaces & API contracts
│
└── supabase/                      # Supabase configuration & migrations
    ├── migrations/                # Versioned SQL migrations (tables, RLS, triggers)
    └── seed.sql                   # Reference seed data (departments, demo organization)
```

---

## 4. Authentication & Authorization Architecture

### 4.1. Authentication Flow
1. User logs in via Next.js frontend using **Supabase Auth** (Email + Password).
2. Supabase Auth returns a JWT session token containing `user_id` and user metadata.
3. The frontend stores the session securely and includes the `Bearer <token>` in all requests to the Express backend API.
4. Express `authMiddleware` validates the JWT against Supabase Auth, retrieves the user profile and current active `organization_id`, and attaches `req.user` and `req.organizationId` to the request.

### 4.2. Role-Based Access Control (RBAC) Matrix
The application enforces four distinct user roles:

| Module / Action | Admin / Owner | HR | Accountant | Employee |
|---|---|---|---|---|
| **Organization Settings** | Full Control | Read Only | Read Only | No Access |
| **Manage Users & Roles** | Full Control | No Access | No Access | No Access |
| **Employee Directory** | Full CRUD | Full CRUD | View Profiles | View Own Profile Only |
| **Employee Salaries & Components** | Full CRUD | Full CRUD | View Only | View Own Details Only |
| **Payroll Runs (Create/Calculate)** | Full Control | Create & Review | View Approved | No Access |
| **Payroll Approval** | Approve & Finalize | No Access | No Access | No Access |
| **Digital Payslips** | Generate & View All | Generate & View All | View All | View & Download Own Only |
| **Payment Tracking** | Full CRUD | View History | Full CRUD | View Own Payments Only |
| **Invoices** | Full CRUD | View Invoices | Full CRUD | No Access |
| **Document Upload & Storage** | All Documents | Employee Docs & HR | Invoices & Receipts | Upload Own Permitted Docs |
| **AI Document Intelligence** | Full Access | Full Access | Full Access | No Access |
| **AI Business Assistant** | All Queries | HR / Employee Domain | Financial / Invoices | Own Information Only |
| **Reports & Analytics** | Full Analytics | HR Analytics | Financial Analytics | Personal Summary Only |
| **Audit Logs** | Full View | View HR Logs | View Finance Logs | No Access |

---

## 5. Deterministic Payroll Engine Architecture

Financial math is strictly segregated into deterministic backend services.

```text
[ HR / Admin Initiates Run ]
              ↓
  Select Month & Year
              ↓
  Load Active Employees in Organization
              ↓
[ Express Payroll Calculator ]
  ├── calculateBasicSalary(employee)
  ├── calculateOvertime(hours, hourlyRate)
  ├── calculateBonus(employee, period)
  ├── calculateAllowances(fixed, variable)
  ├── calculateDeductions(tax, pf, esi, custom)
  ├── calculateAdvance(advanceDeductions)
  └── calculateNetSalary(...)
              ↓
  Store in payroll_items (Status: Draft)
              ↓
  HR Reviews Individual Line Items
              ↓
  Admin Approves (Status: Approved)
              ↓
  Generate Payslip Records (PDF generated on-demand)
              ↓
  Create Linked Payment Records (Status: Pending)
```

### Key Safety Invariants
- `payroll_items.net_salary = basic_salary + overtime + bonus + allowances - deductions - advances - leave_deductions`
- All financial values stored with `numeric(12,2)` precision.
- Payroll status state machine: `Draft` ➔ `Reviewed` ➔ `Approved` ➔ `Paid`.
- Transition to `Approved` locks the payroll run from further edits.
- Transition to `Paid` requires explicit payment reconciliation — never automated.

---

## 6. AI Document Intelligence & OCR Architecture

The document intelligence pipeline automates document classification and structured data extraction with human-in-the-loop verification.

```text
[ User Uploads PDF / Image ]
              ↓
   Validate Size (< 10MB) & MIME Type
              ↓
   Save to Supabase Storage ('documents' private bucket)
              ↓
   Create document record (status: 'uploaded')
              ↓
[ Express Document Processing Worker ]
   ├── Step 1: Text Extraction (pdf-parse)
   ├── Step 2: If text length < 50 chars -> OCR Fallback (Vision API / tesseract.js)
   ├── Step 3: AI Provider (Gemini / OpenAI) with strict Zod JSON schema:
   │     ├── Classify Document (Invoice, Contract, Payslip, Certificate, Receipt, etc.)
   │     └── Extract Structured Key-Values (Vendor, Invoice#, Dates, Amounts, Parties, Terms)
   └── Step 4: Validate Extracted Data against Zod Schema
              ↓
   Save to document_extractions table (status: 'completed')
              ↓
[ Frontend Interactive Review Modal ]
   ├── Display side-by-side: Document Preview + Pre-filled Editable Form
   ├── User confirms or edits fields
   └── Creates Draft Invoice / Contract / Employee Document Record
```

---

## 7. AI Business Assistant Architecture

The AI Business Assistant allows authorized users to ask natural language questions regarding their organization's actual live data without risk of data hallucination.

```text
[ User Asks: "How much salary is pending this month?" ]
              ↓
   Next.js Frontend (/assistant)
              ↓
   Express API (/api/assistant/query)
              ↓
   Verify User Token, Role & Organization ID
              ↓
[ Intent Classifier & Data Retriever ]
   ├── Identify query domain (Payroll, Payments, Invoices, Contracts, Employees)
   ├── Enforce Role Restrictions (e.g., Employee cannot query company payroll)
   └── Query PostgreSQL Database for precise aggregations & live records
              ↓
[ Prompt Context Assembly ]
   ├── Format retrieved factual data into structured system prompt
   └── Instruct AI Provider: "Answer strictly based on the provided verified data. Do not invent numbers."
              ↓
[ AI Provider (Gemini / OpenAI) ]
              ↓
   Natural language response returned to user with direct links to relevant records
```

---

## 8. Smart Reminders & Notification Architecture

The reminder engine continuously monitors deadlines and status transitions:
- **Salary Payment Reminders:** Triggered 3 days prior to month-end and on overdue salary statuses.
- **Invoice Reminders:** Triggered 7 days before due date, on due date, and when status turns `Overdue`.
- **Contract Expiry Reminders:** Triggered at 30 days, 15 days, and 7 days before contract expiration date.
- **Document Renewal Reminders:** Triggered when employee certificates or compliance documents approach expiration.

Reminders are materialized in the `reminders` table and surfaced via the in-app notification center and dashboard alert strip.

---

## 9. Storage & File Security Architecture

- All files (invoices, contracts, payslips, employee certificates) are stored in **Supabase Storage** private buckets:
  - `org-<id>/documents/`
  - `org-<id>/invoices/`
  - `org-<id>/payslips/`
- Direct public URLs are disabled.
- Frontend accesses files exclusively via time-limited **Signed URLs** (e.g., 15-minute TTL) generated on-demand by the Express backend after validating user authorization.

---

## 10. Audit Logging Architecture

Every critical action creates an immutable record in the `audit_logs` table:
- `user_id`: Acting user
- `organization_id`: Tenant context
- `action`: e.g. `EMPLOYEE_CREATED`, `PAYROLL_APPROVED`, `INVOICE_PAID`, `DOCUMENT_DELETED`
- `entity_type`: e.g. `payroll_runs`, `invoices`, `employees`
- `entity_id`: UUID of the affected entity
- `old_data` & `new_data`: JSON snapshots for diff tracking
- `ip_address` & `user_agent`
- `created_at`: Exact timestamp

---

## 11. Scalability & Future Growth

The architecture is built to support future extensions without rewrites:
- **Vector Search / Semantic Q&A:** Integrate `pgvector` in Supabase PostgreSQL for embedding-based semantic search across thousands of contracts and policy documents.
- **Automated Bank Payouts:** Webhook integrations with payment gateways (RazorpayX / Cashfree) for automated salary disbursements.
- **WhatsApp Bot Interface:** Webhook receiver in Express reusing the existing API controllers for mobile conversational queries.
- **Multi-Branch Hierarchy:** Extend `organizations` with branch/subsidiary sub-trees.
