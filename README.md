# PayDoc AI

> **AI-Powered Payroll, Payment & Document Intelligence Platform for Modern Businesses**

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014%20(App%20Router)-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express.js-green?style=flat-square&logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Database%20%26%20Auth-Supabase%20(PostgreSQL)-emerald?style=flat-square&logo=supabase)](https://supabase.com/)
[![AI](https://img.shields.io/badge/AI%20Layer-Google%20Gemini%20%2F%20OpenAI-orange?style=flat-square)](https://ai.google.dev/)

---

## 1. Overview

**PayDoc AI** is a full-stack, multi-tenant SaaS platform built for small and medium-sized businesses (MSMEs) to centralize their employee management, payroll processing, salary payment tracking, invoice lifecycle, business document repository, and smart reminders with integrated AI document intelligence and natural language business querying.

Unlike disconnected tools (spreadsheets, paper records, WhatsApp chats, and local file folders), PayDoc AI unifies operations into a single deterministic financial ledger and automated document intelligence workflow.

---

## 2. Core Value Proposition & Key Workflows

### 📄 AI Document & Invoice Lifecycle
```text
Upload Document / Invoice PDF/Image
       ↓
Supabase Storage (Secure Private Bucket)
       ↓
Text Extraction & OCR Fallback
       ↓
AI Classification & Field Extraction (Gemini / OpenAI)
       ↓
Draft Invoice / Contract / Certificate Created
       ↓
Smart Reminders Generated (Expiry & Due Dates)
       ↓
Track Payment / Ask AI Assistant Questions
```

### 💰 Deterministic Payroll & Payment Lifecycle
```text
Employee Profiles & Attendance / Salary Setup
       ↓
Monthly Payroll Run Initialization (Draft)
       ↓
Deterministic Express.js Calculation Engine (Basic + Overtime + Allowances - Deductions - Advances)
       ↓
Payroll Review & Approval (HR / Admin)
       ↓
Digital Payslip Generation (Downloadable PDF)
       ↓
Payment Tracking (Pending -> Due Soon -> Paid)
       ↓
Employee Self-Service Access (Strict Isolation)
```

---

## 3. Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router), React, TypeScript | Server & Client Components, Responsive SaaS UI |
| **Styling** | Tailwind CSS | Clean, professional, accessible design system |
| **Form Management** | React Hook Form + Zod | Strict schema validation on all inputs |
| **Icons & Charts** | Lucide React, Recharts | Interactive financial & operational analytics |
| **Backend API** | Node.js + Express.js (REST) | Business logic, deterministic calculations, orchestrator |
| **Database** | Supabase PostgreSQL | Multi-tenant schema, RLS, strict constraints |
| **Authentication** | Supabase Auth | Session management, RBAC (Admin, HR, Accountant, Employee) |
| **Storage** | Supabase Storage | Private buckets with signed URLs for sensitive files |
| **AI / Document Engine** | Google Gemini API / OpenAI API | Abstracted `AIProvider` for classification, extraction, Q&A |
| **Document Processing** | `pdf-parse`, OCR Fallback (`tesseract.js` / Vision API) | Hybrid PDF parser with vision OCR fallback |
| **PDF Generation** | `jspdf`, `jspdf-autotable` | Digital payslips and financial export reports |

---

## 4. User Roles & Access Control

- **Admin / Business Owner**: Full organization control, user/role management, payroll approval, payments, invoices, documents, audit logs, AI business assistant, organization settings.
- **HR**: Employee CRUD, employee documents, prepare payroll runs, generate digital payslips, view payment history. (Cannot alter organization ownership or critical billing/system settings).
- **Accountant**: View payroll, manage invoices, track salary and vendor payments, generate financial reports, view payment analytics.
- **Employee**: Strictly scoped self-service portal — view own profile, salary structure, payslips, personal payment history, and permitted personal documents. Never sees other employees' confidential records.

---

## 5. Core Modules

1. **Dashboard**: High-level KPI cards (Total Employees, Payroll This Month, Pending Payments, Overdue Invoices, Documents, Upcoming Deadlines), quick actions, and smart alerts.
2. **Employee Management**: Profile records, department, designation, employment type (Full-Time, Part-Time, Contract, Daily Wage), salary details, emergency contacts, document attachments.
3. **Payroll Management**: Deterministic backend calculation engine (`calculateBasicSalary`, `calculateOvertime`, `calculateBonus`, `calculateAllowances`, `calculateDeductions`, `calculateAdvance`, `calculateNetSalary`). Lifecycle: `Draft` -> `Reviewed` -> `Approved` -> `Paid`.
4. **Digital Payslips**: Professional payslip generator with downloadable PDF exports.
5. **Payment Tracking**: Granular tracking of employee salary payouts and vendor disbursements (`Pending`, `Due Soon`, `Paid`, `Overdue`).
6. **Document Management**: Centralized repository for employee certificates, contracts, payslips, invoices, receipts, tax documents, and agreements with secure Supabase Storage.
7. **AI Document Intelligence**: Automated document classification, metadata extraction, contract clause discovery, and invoice data structuring.
8. **Invoice Management**: Manual and AI-assisted invoice creation, line items, tax calculation, due dates, and payment settlement tracking.
9. **Smart Reminders**: Automated alerts for impending salary dates, overdue invoices, expiring contracts, and document renewal deadlines.
10. **AI Business Assistant**: Context-aware natural language assistant answering authorized financial and operational queries on live database data.
11. **Global Search**: Fast search across employees, payroll runs, payments, invoices, and documents with filter categories.
12. **Reports & Analytics**: Visual charts for monthly expenses, department breakdowns, payment status ratios, with PDF/CSV export.
13. **Audit Logs**: Immutable activity log tracking user actions, entity mutations, and role changes.

---

## 6. Architecture & Data Integrity Principles

1. **Deterministic Payroll Calculation Rule**: Financial math is **never** executed or estimated by AI. All calculations are strictly deterministic and implemented in tested Express.js backend services.
2. **Multi-Tenant Data Isolation**: Every business record is tagged with `organization_id` and enforced via PostgreSQL Row Level Security (RLS) policies and backend tenant filters.
3. **AI with Manual Fallback**: Every AI extraction pipeline provides pre-filled editable forms so users can verify, edit, or manually enter data when extraction is partial or unavailable.
4. **Zero Fake Data Policy**: Real database relations and authenticated endpoints are used end-to-end.

---

## 7. Project Documentation

- [AGENTS.md](file:///d:/PayDoc-AI/AGENTS.md) — Development constitution, coding standards, and architectural rules.
- [ARCHITECTURE.md](file:///d:/PayDoc-AI/ARCHITECTURE.md) — Detailed full-stack software architecture, data flows, and module structure.
- [DATABASE.md](file:///d:/PayDoc-AI/DATABASE.md) — Complete PostgreSQL schema, tables, constraints, indexes, and RLS policies.
- [DESIGN.md](file:///d:/PayDoc-AI/DESIGN.md) — UI/UX design system, color tokens, typography, component standards, and responsive rules.
- [FEATURES.md](file:///d:/PayDoc-AI/FEATURES.md) — Comprehensive functional specification across all 13 modules and screens.
- [FEATURE_DELIVERY.md](file:///d:/PayDoc-AI/FEATURE_DELIVERY.md) — Phased milestone execution roadmap and verification checklists.

---

## 8. License

This project is licensed under the MIT License - see the [LICENSE](file:///d:/PayDoc-AI/LICENSE) file for details.