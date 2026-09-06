# BLUEWRITE — UI Design System

**Brand:** BLUEWRITE  
**Official Title:** BLUEWRITE: AN AI-ASSISTED REAL-TIME POLICE INCIDENT REPORT GENERATION SYSTEM  
**AI Assistant:** BLUEWRITE AI Assistant — *Your Intelligent Police Report Writing Assistant*

---

## 1. Design Direction

The BLUEWRITE interface should feel:

- **Professional** — suitable for a police/government environment
- **Trustworthy** — clear, honest, dependable
- **Modern** — current, clean, contemporary
- **Clean** — uncluttered, well-organized
- **Organized** — logical layout and hierarchy
- **Accessible** — usable by everyone
- **Responsive** — works on desktop, tablet, and mobile

**Design inspiration:**

- LinkedIn
- Microsoft Fluent Design
- Modern enterprise dashboards

**Avoid:**

- Neon colors
- Gaming aesthetics
- Excessive gradients
- Excessive glassmorphism
- Overly decorative UI

---

## 2. Colors

The palette is rooted in professional navy and police blue with white and light gray surfaces.

| Token | Hex | Usage |
|-------|-----|-------|
| `navy-900` | `#0F172A` | Darkest text, footer, deep accents |
| `navy-800` | `#1E293B` | Sidebar, dark surfaces |
| `navy-700` | `#334155` | Secondary dark surfaces |
| `police-blue-700` | `#1D4ED8` | Primary buttons, active links |
| `police-blue-600` | `#2563EB` | Primary actions, focus states |
| `police-blue-500` | `#3B82F6` | Hover states, links |
| `police-blue-100` | `#DBEAFE` | Selected/highlight backgrounds |
| `white` | `#FFFFFF` | Page background, cards |
| `gray-50` | `#F9FAFB` | Alternate section background |
| `gray-100` | `#F3F4F6` | Card borders, subtle dividers |
| `gray-300` | `#D1D5DB` | Input borders, dividers |
| `gray-500` | `#6B7280` | Secondary text, placeholders |
| `gray-700` | `#374151` | Body text |
| `gray-900` | `#111827` | Primary text |
| `success` | `#16A34A` | Submitted status, positive |
| `warning` | `#D97706` | Warnings, draft emphasis |
| `danger` | `#DC2626` | Errors, destructive actions |

### Semantics

| Element | Color |
|---------|-------|
| Primary background | White / gray-50 |
| Primary text | gray-900 |
| Secondary text | gray-500 |
| Primary buttons | police-blue-600 |
| Sidebar | navy-800 |
| Active nav item | police-blue-600 / police-blue-100 |
| Draft badge | warning / amber |
| Submitted badge | success / green |
| Error text | danger |

---

## 3. Typography

- **Primary font:** Inter (or a system font stack as fallback)
  - `Inter`, `Segoe UI`, system-ui, sans-serif
- **Headings:** Semi-bold / bold, tighter letter-spacing
- **Body:** Regular, 14–16px, comfortable line height
- **Monospace:** For report numbers and codes where useful

### Scale (planned)

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `display` | 30–36px | Bold | Page hero / titles |
| `h1` | 24–28px | Bold | Page titles |
| `h2` | 20–22px | Semi-bold | Section titles |
| `h3` | 16–18px | Semi-bold | Card titles |
| `body` | 14–16px | Regular | Default text |
| `small` | 12–13px | Regular | Labels, meta, captions |
| `label` | 12–13px | Medium | Form labels |
| `badge` | 11–12px | Semi-bold | Status badges |

---

## 4. Spacing

Use a consistent 4px spacing scale (Tailwind default).

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps |
| `space-2` | 8px | Compact gaps |
| `space-3` | 12px | Small gaps |
| `space-4` | 16px | Standard gaps |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | Page-level spacing |

- Page content: max-width container (~1200px), centered.
- Card padding: 16–24px.
- Section spacing: 24–32px.

---

## 5. Buttons

| Variant | Style | Usage |
|---------|-------|-------|
| Primary | Solid police-blue-600, white text | Main actions (Submit, Save, Create) |
| Secondary | White bg, gray/blue border, dark text | Alternative actions (Cancel, Back) |
| Danger | Solid danger red | Destructive actions (Disable, Delete) |
| Ghost | Transparent, dark text, subtle hover | Low-emphasis actions (table row actions) |
| Link | Text-only blue | Inline navigation |

### States

- **Default** — solid, clear
- **Hover** — one shade darker
- **Focus** — visible focus ring (accessibility)
- **Disabled** — reduced opacity, non-interactive
- **Loading** — spinner inside button, disabled while pending

Button height: ~40px (comfortable touch target). Rounded corners: 6–8px.

---

## 6. Forms

- Labels above inputs, 12–13px medium.
- Inputs: white background, gray-300 border, 14px text, 40px height.
- Focus: police-blue-600 border + focus ring.
- Placeholders: gray-500.
- Validation errors: red text below the field; red border on invalid field.
- Required fields clearly marked.

### Inputs

- Text inputs
- Textareas
- Selects
- Search inputs
- Date/time pickers

---

## 7. Cards

- White background.
- Subtle border (gray-100 / gray-200) or light shadow.
- Rounded corners (8–12px).
- Padding 16–24px.
- Optional header with title and actions.
- Used for dashboards, stat cards, forms, and info panels.

---

## 8. Tables

- Clean, professional data tables.
- Header row: gray-50 background, medium dark text.
- Row hover: light gray highlight.
- Borders: subtle gray dividers.
- Align: left for text, right for numbers.
- Status shown as badges.
- Row actions: edit, view, print (icon buttons or links).
- Pagination below the table.
- Empty state with a clear message when no data.

---

## 9. Badges

| Badge | Style |
|-------|-------|
| Draft | Amber/warning background, dark amber text |
| Submitted | Green/success background, dark green text |
| Active | Green background, dark green text |
| Disabled | Gray background, gray text |
| Admin | Navy/blue background, white text |
| Officer | Blue-light background, blue text |

Badges are small, rounded, semi-bold, uppercase or title-case.

---

## 10. Sidebar

- Fixed left sidebar, navy-800 background.
- White / light text for items.
- Active item: police-blue-600 highlight or light blue background.
- Includes: BLUEWRITE branding at top, nav items, logout at bottom.
- Collapsible on smaller screens.

### Officer Nav

- Dashboard
- My Reports
- Create Report
- Profile

### Admin Nav

- Dashboard
- Officers
- Reports
- Activity Logs
- Profile

---

## 11. Header

- Top bar, white background, subtle bottom border.
- Page/context title on the left.
- Search (where applicable) and user menu on the right.
- User menu shows name, role, and logout.

---

## 12. Dashboard

- Grid of **stat cards** at the top (e.g., Total Reports, Drafts, Submitted).
- Stat cards: white, icon, large number, label.
- Below: recent items (recent reports / recent logs).
- Clean, scannable layout using the card component.

---

## 13. Report Form

- Multi-section layout:
  - Incident details (type, date/time, location)
  - Title
  - Narrative (large textarea)
  - Review notes (optional)
- Clear, labeled sections separated by spacing.
- Action bar: **Save Draft**, **Submit Report**, **Cancel**.
- AI Assistant panel integrated (see below).

---

## 14. AI Panel

The BLUEWRITE AI Assistant panel is a distinct, labeled panel within the report form.

- Header: "BLUEWRITE AI Assistant" + subtitle "Your Intelligent Police Report Writing Assistant".
- Buttons: **Generate Report**, **Analyze Report**.
- Loading state while the AI processes.
- Results:
  - Narrative result fills the editable narrative textarea.
  - Analysis result displays in an **AI Analysis Card** with scores and recommendations.
- Clear disclaimer: "AI provides assistance only. The officer is responsible for the final report."

---

## 15. Responsive Design

- **Desktop:** sidebar visible, multi-column layouts.
- **Tablet:** sidebar collapses to icons or hamburger; stacked cards.
- **Mobile:** single-column stack, full-width controls, hamburger navigation.

Tables become horizontally scrollable or card-based on small screens.

---

## 16. Accessibility

- Visible focus states on all interactive elements.
- Sufficient color contrast for all text (WCAG AA target).
- Semantic HTML (labels, headings, landmarks).
- Keyboard-navigable menus and modals.
- ARIA labels where needed.
- Status/badges not color-only (include text).
- Error messages tied to their fields.

---

## 17. Component Inventory

| Component | Purpose |
|-----------|---------|
| Button | Action buttons (variants + states) |
| Input | Text fields |
| Textarea | Multi-line text |
| Select | Dropdowns |
| Modal | Dialogs and confirmations |
| Table | Data tables |
| Badge | Status/labels |
| StatCard | Dashboard statistics |
| Pagination | Table pagination |
| LoadingSpinner | Loading states |
| Sidebar | Navigation |
| Header | Top bar |
| ReportForm | Report entry form |
| ReportTable | Reports list/table |
| PrintableReport | Print view |
| AIAssistant | AI panel |
| AIAnalysisCard | AI analysis results |

---

## 18. Status

This document describes the **planned UI design system**. Implementation has not started yet. The project is **under development**.