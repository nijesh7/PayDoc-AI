# Design System — PayDoc AI

This document establishes the UI/UX design tokens, visual hierarchy, typography, component guidelines, and interaction rules for **PayDoc AI**.

---

## 1. Visual Direction & Design Philosophy

PayDoc AI is designed as a **modern, high-trust, professional SaaS platform** for small and medium-sized business owners, HR managers, and accountants.

Key visual priorities:
- **Clarity over Clutter:** Financial numbers and deadlines must be legible at a glance.
- **Strict Status Semantics:** Color is used purposefully to communicate operational state (Paid, Due Soon, Overdue, Processing).
- **Tabular Precision:** All financial figures, quantities, and dates use monospaced or tabular numerical typography.
- **Side-by-Side Human Verification:** Document intelligence views feature a split screen (document preview on the left, editable extracted fields on the right).

---

## 2. Color Palette & Semantic Tokens

| Token Name | Hex Code | Semantic Role |
|---|---|---|
| `--color-bg` | `#F8FAFC` (Light) / `#0F172A` (Dark) | App canvas background |
| `--color-surface` | `#FFFFFF` (Light) / `#1E293B` (Dark) | Cards, sidebars, modal surfaces, table rows |
| `--color-surface-hover`| `#F1F5F9` (Light) / `#334155` (Dark) | Hover states for list items and table rows |
| `--color-border` | `#E2E8F0` (Light) / `#334155` (Dark) | Card borders, dividers, table hairline lines |
| `--color-text-primary` | `#0F172A` (Light) / `#F8FAFC` (Dark) | Primary headings, body copy, key metrics |
| `--color-text-secondary`| `#475569` (Light) / `#94A3B8` (Dark) | Subheadings, table headers, descriptions |
| `--color-text-muted` | `#94A3B8` (Light) / `#64748B` (Dark) | Helper text, timestamps, placeholder text |
| `--color-primary` | `#4F46E5` (Indigo-600) | Primary CTA buttons, active sidebar links, key accents |
| `--color-primary-hover`| `#4338CA` (Indigo-700) | Hover state for primary buttons |
| `--color-success` | `#16A34A` (Green-600) | **Paid**, **Approved**, **Completed**, **Active**, Positive balance |
| `--color-warning` | `#D97706` (Amber-600) | **Due Soon**, **Pending**, **Draft**, Expiring soon |
| `--color-danger` | `#DC2626` (Red-600) | **Overdue**, **Critical**, **Failed**, Leave deductions, Resigned |
| `--color-info` | `#2563EB` (Blue-600) | **Processing**, Informational banners, In Review |

### Status Badges Configuration
```text
Paid / Approved     → bg-emerald-50 text-emerald-700 border-emerald-200
Due Soon / Pending  → bg-amber-50 text-amber-700 border-amber-200
Overdue / Failed    → bg-rose-50 text-rose-700 border-rose-200
Processing / Draft  → bg-blue-50 text-blue-700 border-blue-200
```

---

## 3. Typography System

- **Primary Font:** `Inter` / `Outfit` / `Geist` (via Next.js `next/font/google`) for headings, body text, form labels, navigation.
- **Tabular Numerical Font:** `Geist Mono` / `JetBrains Mono` / `font-mono` with CSS `font-variant-numeric: tabular-nums` for:
  - All currency values (`₹12,40,000.00`)
  - Percentage rates (`12.5%`, `18% GST`)
  - Employee IDs (`EMP-014`)
  - Invoice numbers (`INV-2026-004`)
  - Dates and timestamps (`15 Oct 2026`, `23:45`)

### Type Scale
- **H1 (Page Title):** 24px (1.5rem), Semi-Bold (600), line-height 1.2
- **H2 (Section Header):** 20px (1.25rem), Semi-Bold (600), line-height 1.3
- **H3 (Card Title):** 16px (1rem), Medium (500), line-height 1.4
- **Hero Numbers (Dashboard KPIs):** 30px–36px (1.875rem–2.25rem), Bold (700), Monospace
- **Body Regular:** 14px (0.875rem), Regular (400), line-height 1.5
- **Small / Captions / Badges:** 12px (0.75rem), Medium (500), line-height 1.4

---

## 4. Layout & Navigation Hierarchy

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Top Bar: [Logo] | [Global Search...] | [Quick Actions] [🔔 (3)] [User] │
├───────────────┬────────────────────────────────────────────────────────┤
│ Sidebar       │ Breadcrumbs & Page Header                              │
│ ├ Dashboard   ├────────────────────────────────────────────────────────┤
│ ├ Employees   │ Action-Required Alert Strip (Overdue / Due Soon items) │
│ ├ Payroll     ├────────────────────────────────────────────────────────┤
│ ├ Payments    │ KPI Cards Grid (4 columns on desktop, 1-2 on mobile)   │
│ ├ Documents   ├────────────────────────────────────────────────────────┤
│ ├ Invoices    │ Main Content Area:                                     │
│ ├ Reports     │ ├ Filter Bar (Search, Status Filter, Date Picker)      │
│ ├ Assistant   │ ├ Data Table / Recharts Visualization                  │
│ └ Settings    │ └ Pagination Controls                                  │
└───────────────┴────────────────────────────────────────────────────────┘
```

### Main Layout Components
1. **Sidebar:** Collapsible on desktop, off-canvas drawer on mobile (`< 1024px`), with quick badges for pending tasks.
2. **Action Required Alert Strip:** Prominent top banner on dashboard and payments pages summarizing immediate actions (e.g., *"3 salary payments due this week • 2 invoices overdue"*).
3. **Data Tables:** Clean rows with subtle dividers, sticky header, multi-column sort, status chips, quick actions menu (Edit, View, Download Payslip/PDF, Delete/Archive).
4. **Side Drawer / Slide-Over:** Used for inspecting employee details, document metadata, or invoice details without navigating away from the table.
5. **Modals:** Centered dialogs for focused tasks (Add Employee, New Payroll Run, Manual Invoice, Process Document).

---

## 5. AI Document Intelligence Split-Screen Review UI

When reviewing an AI-extracted document or invoice:

```text
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ Left Column: Document Viewer         │ Right Column: Extracted Form (Edit)  │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ [ Zoom In / Out / Rotate ]           │ AI Classification: [ Invoice  ▼ ]    │
│                                      │ Confidence: 96% (High)               │
│                                      │                                      │
│  INVOICE #INV-1045                   │ Vendor Name: [ ABC Traders         ] │
│  Vendor: ABC Traders                 │ Invoice Number: [ INV-1045         ] │
│  Date: 01/10/2026                    │ Invoice Date: [ 2026-10-01         ] │
│  Due: 15/10/2026                     │ Due Date: [ 2026-10-15             ] │
│                                      │ Subtotal: [ ₹45,500.00             ] │
│  Total: ₹45,500.00                   │ Tax (GST 18%): [ ₹8,190.00         ] │
│                                      │ Total Amount: [ ₹53,690.00         ] │
│                                      │                                      │
│                                      │ [ Cancel ]     [ Save as Invoice ]   │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

- Editable fields allow the user to immediately fix any misread field.
- If AI extraction fails, the left side still displays the document while the right side displays an empty manual entry form.

---

## 6. Motion & Micro-Interactions

- **AI Ingestion State:** A gentle pulsing shimmer with a step indicator (*"Uploading..."* ➔ *"Extracting text..."* ➔ *"AI Structuring..."*).
- **Form Feedback:** Smooth toast notifications (Top-right corner via `sonner` or `react-hot-toast`) for successful operations.
- **Dialog Animations:** Subtle scale & fade (`opacity-0 scale-95` to `opacity-100 scale-100` over 150ms).
- **Reduced Motion:** Fully honors `prefers-reduced-motion: reduce`.

---

## 7. Responsiveness & Breakpoints

- **Mobile (`< 640px`):** Single column, bottom-sheet drawers, card-based table representations, sticky bottom action bars for forms.
- **Tablet (`640px – 1024px`):** 2-column KPI grid, collapsible sidebar into icon-only mode, horizontally scrolling data tables.
- **Desktop (`≥ 1024px`):** Full 4-column KPI grid, permanent sidebar, split-screen document review view.

---

## 8. Accessibility Standards

- WCAG AA compliant color contrast on all text and UI elements.
- Accessible keyboard navigation (`Tab`, `Esc` for modals, arrow keys for menus).
- Explicit `aria-label` tags on all icon-only buttons (search, notifications, close modals).
- Form inputs have associated `<label>` tags with visible focus outlines (`focus:ring-2 focus:ring-indigo-500`).
