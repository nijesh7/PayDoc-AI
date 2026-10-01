# Antigravity Guidelines for PayDoc AI

Please refer to the comprehensive repository constitution and execution strategy defined in [AGENTS.md](./AGENTS.md).

All architectural rules, including:
- **Agent Identity & Execution Strategy**
- **The Fan-Out & Harsh Critic Loop (90%+ Quality Boost)**
- **Deterministic Payroll Calculation Rule (Financial math strictly handled by Express.js backend — never AI)**
- **Multi-Tenant Organization Isolation Rule (Every table scoped by `organization_id` & RLS)**
- **AI / Document Processing Call Rule (Strict JSON schema validation, editable pre-filled forms, manual fallback)**
- **Human Terminal Rule (Never poll or block on long-running CLI commands)**
- **Database-First Rule (Draft SQL migrations first, wait for user confirmation before touching APIs/UI)**
- **UI/UX Rule (Clean, professional SaaS aesthetic with Tailwind CSS, clear status colors, tabular numbers)**
- **Handover Rule (Structured handover summary at the end of every implementation task)**

are strictly enforced in this project.

### Core Stack Reference
- **Frontend:** Next.js 14+ (App Router, TypeScript, React, Tailwind CSS, Lucide React, Recharts, React Hook Form, Zod)
- **Backend:** Node.js + Express.js REST API Server (business logic, deterministic payroll calculation, AI orchestration)
- **Database, Auth & Storage:** Supabase PostgreSQL with Row Level Security, Supabase Auth, Supabase Storage (private buckets with signed URLs)
- **AI Layer:** Abstracted `AIProvider` supporting Google Gemini API (`@google/genai` / `@google/generative-ai`) and OpenAI API (`openai`) for document classification, metadata extraction, contract clause discovery, and natural language business insights.
- **Document Processing:** PDF parsing (`pdf-parse`) + OCR fallback (`tesseract.js` / Vision API) + Structured Extraction.

Refer to [FEATURES.md](./FEATURES.md) for full page/module functional specifications, [DATABASE.md](./DATABASE.md) for the PostgreSQL schema contract, [ARCHITECTURE.md](./ARCHITECTURE.md) for system architecture, [DESIGN.md](./DESIGN.md) for design tokens, and [FEATURE_DELIVERY.md](./FEATURE_DELIVERY.md) for milestone execution tracking.
