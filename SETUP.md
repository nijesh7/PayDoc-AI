# Setup Guide — PayDoc AI

This document provides setup instructions for configuring environment variables, Supabase credentials, and AI API keys for **PayDoc AI**.

---

## 1. Prerequisites

- **Node.js**: v18.17.0 or higher
- **npm** or **pnpm**
- **Supabase Account**: [supabase.com](https://supabase.com) (free tier is sufficient)
- **AI Provider API Key**:
  - **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/) (Recommended)
  - OR **OpenAI API Key** from [OpenAI Platform](https://platform.openai.com/)

---

## 2. Environment Variables Configuration

### Backend Environment Variables (`backend/.env`)

Create `backend/.env` with the following keys:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Supabase Credentials (Server-Side)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Provider Configuration
# Choose 'gemini' or 'openai'
AI_PROVIDER=gemini

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# OpenAI API (Optional fallback)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# JWT Secret (for internal session checks if applicable)
JWT_SECRET=your_secure_jwt_secret_key
```

> [!WARNING]
> Never commit `backend/.env` or expose `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY` to the client bundle or public repositories.

---

### Frontend Environment Variables (`frontend/.env.local`)

Create `frontend/.env.local` with the following keys:

```env
# Public Supabase Access
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API Endpoint
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 3. Supabase Project Setup Checklist

1. **Create a new Supabase Project**:
   - Go to [database.new](https://database.new) and create a project named `paydoc-ai`.
2. **Execute Database Migrations**:
   - Open the Supabase SQL Editor.
   - Run the migration scripts in order from `supabase/migrations/`:
     - `0001_initial_schema.sql` (Creates all tables, constraints, and triggers)
     - `0002_rls_policies.sql` (Enables Row Level Security and RBAC policies)
3. **Configure Supabase Storage**:
   - In the Supabase Dashboard, navigate to **Storage**.
   - Create a private bucket named `documents`.
   - Ensure public access is turned **OFF** (signed URLs will be used for all document access).
4. **Authentication Configuration**:
   - Navigate to **Authentication ➔ Providers**.
   - Ensure **Email** provider is enabled.
   - (Optional) Disable email confirmation for local development under **Authentication ➔ URL Configuration**.

---

## 4. Initial Seed Data (Optional)

To populate the database with a starter organization and default departments:
- Open Supabase SQL Editor.
- Run `supabase/seed.sql` to create standard departments (Engineering, Human Resources, Finance & Accounts, Operations, Sales & Marketing).
