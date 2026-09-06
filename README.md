# BLUEWRITE

**BLUEWRITE: AN AI-ASSISTED REAL-TIME POLICE INCIDENT REPORT GENERATION SYSTEM**

---

## Project Description

BLUEWRITE is a web-based police incident reporting system designed to help police officers create, manage, submit, and print incident reports. The system includes the **BLUEWRITE AI Assistant**, powered through the backend by the Gemini Developer API, to help officers generate professional incident narratives and analyze reports for grammar, clarity, completeness, consistency, and missing information.

BLUEWRITE AI is an **assistant only**. The officer remains responsible for reviewing and finalizing every report. The AI never invents facts, determines guilt, makes legal decisions, automatically submits reports, or replaces officer judgment.

> **Status: UNDER DEVELOPMENT** — The initial project structure and documentation have been created. No application features have been implemented yet.

---

## Objectives

1. Provide officers with a streamlined, professional tool for creating and managing incident reports.
2. Support the full report lifecycle: draft → submitted.
3. Enable officers to generate professional incident narratives with AI assistance.
4. Enable officers to analyze reports for grammar, clarity, completeness, consistency, and missing information.
5. Give admins tools to manage officer accounts and view all incident reports.
6. Maintain strict report ownership so officers can only access their own reports.
7. Keep the AI strictly as an assistant — never an autonomous decision-maker.

---

## Main Features

### Police Officers

- Log in
- View their dashboard
- Create incident reports
- Save reports as drafts
- Edit their own drafts
- Submit reports
- View their own reports
- Search/filter their reports
- Print reports
- Manage their profile
- Use the BLUEWRITE AI Assistant

### Admins

- Log in
- View admin dashboard
- Manage police officer accounts
- Create officers
- Edit officers
- Enable/disable officers
- View all incident reports
- Search/filter reports
- Print reports
- View activity logs
- Manage their own profile

Officers are **disabled** rather than deleted. Historical reports remain associated with their original officer.

---

## User Roles

| Role | Description |
|------|-------------|
| Admin | Manages officer accounts, views all reports, views activity logs |
| Police Officer | Creates, edits, submits, views, searches, and prints their own reports |

There are exactly **two roles**. There is no approval workflow.

---

## Report Status

| Status | Description |
|--------|-------------|
| Draft | In progress, can be edited by the owning officer |
| Submitted | Finalized, cannot be edited |

There is **no** approved, rejected, or pending-approval status.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Tailwind CSS, React Router, Axios, Lucide React |
| Backend | Node.js, Express.js |
| Database | MySQL, mysql2 |
| Authentication | MySQL-backed Express sessions, bcrypt |
| AI | Official Google Gen AI Node.js SDK, Gemini Developer API |

---

## System Architecture

```
React Frontend
        ↓
Express REST API
        ↓
BLUEWRITE AI Service
        ↓
Gemini Developer API
```

The frontend **never** communicates directly with Google AI Studio and never receives the API key. All AI requests go through the authenticated Express REST API.

---

## AI Architecture

```
Frontend
    ↓
Backend (Express REST API)
    ↓
AI Service
    ↓
Official Google Gen AI Node.js SDK
    ↓
Gemini Developer API (`generateContent`)
```

### BLUEWRITE AI Assistant

**Subtitle:** Your Intelligent Police Report Writing Assistant

**Features:**
- **Generate Report** — creates an editable report draft (title, incident details, summary, people roles, and professional report narrative) from the Officer's supplied narrative, leaving unsupported fields blank.
- **Analyze Report** — checks a report for grammar, clarity, completeness, consistency, and missing information.

The AI provides assistance only. Officers review and finalize all reports.

---

## Project Structure

```
BLUEWRITE/
│
├── PROJECT_RULES.md
├── README.md
│
├── docs/
│   ├── Architecture.md
│   ├── DatabaseDesign.md
│   ├── API.md
│   ├── DevelopmentPhases.md
│   ├── AIIntegration.md
│   ├── UserFlows.md
│   ├── UI-Design.md
│   └── Testing.md
│
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── database/
│   │   ├── schema.sql
│   │   └── seeds/
│   │       └── adminSeed.js
│   └── src/
│       ├── app.js
│       ├── config/
│       │   ├── db.js
│       │   └── env.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── officerRoutes.js
│       │   ├── reportRoutes.js
│       │   ├── dashboardRoutes.js
│       │   ├── logRoutes.js
│       │   ├── profileRoutes.js
│       │   └── aiRoutes.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── officerController.js
│       │   ├── reportController.js
│       │   ├── dashboardController.js
│       │   ├── logController.js
│       │   ├── profileController.js
│       │   └── aiController.js
│       ├── services/
│       │   ├── authService.js
│       │   ├── officerService.js
│       │   ├── reportService.js
│       │   ├── dashboardService.js
│       │   ├── logService.js
│       │   ├── aiFactService.js
│       │   ├── aiService.js
│       │   └── googleAIService.js
│       ├── models/
│       │   ├── userModel.js
│       │   ├── reportModel.js
│       │   ├── logModel.js
│       │   └── aiLogModel.js
│       ├── middleware/
│       │   ├── authenticate.js
│       │   ├── authorizeRole.js
│       │   ├── activityLogger.js
│       │   └── errorHandler.js
│       ├── utils/
│       │   ├── response.js
│       │   ├── jwt.js
│       │   ├── password.js
│       │   └── reportNumber.js
│       ├── prompts/
│       │   └── policeReportPrompt.js
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env.example
    ├── .gitignore
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── assets/
        ├── context/
        │   └── AuthContext.jsx
        ├── hooks/
        │   ├── useAuth.js
        │   └── useDebounce.js
        ├── services/
        │   ├── api.js
        │   ├── authService.js
        │   ├── reportService.js
        │   ├── officerService.js
        │   ├── dashboardService.js
        │   └── aiService.js
        ├── utils/
        │   ├── formatDate.js
        │   ├── constants.js
        │   └── printReport.js
        ├── components/
        │   ├── common/
        │   │   ├── Button.jsx
        │   │   ├── Input.jsx
        │   │   ├── Textarea.jsx
        │   │   ├── Select.jsx
        │   │   ├── Modal.jsx
        │   │   ├── Table.jsx
        │   │   ├── Badge.jsx
        │   │   ├── StatCard.jsx
        │   │   ├── Pagination.jsx
        │   │   └── LoadingSpinner.jsx
        │   ├── layout/
        │   │   ├── AdminLayout.jsx
        │   │   ├── OfficerLayout.jsx
        │   │   ├── Sidebar.jsx
        │   │   ├── Header.jsx
        │   │   └── PrivateRoute.jsx
        │   ├── reports/
        │   │   ├── ReportForm.jsx
        │   │   ├── ReportTable.jsx
        │   │   └── PrintableReport.jsx
        │   └── ai/
        │       ├── AIAssistant.jsx
        │       └── AIAnalysisCard.jsx
        └── pages/
            ├── auth/
            │   └── LoginPage.jsx
            ├── officer/
            │   ├── DashboardPage.jsx
            │   ├── CreateReportPage.jsx
            │   ├── EditReportPage.jsx
            │   ├── MyReportsPage.jsx
            │   └── ProfilePage.jsx
            └── admin/
                ├── DashboardPage.jsx
                ├── OfficersPage.jsx
                ├── ReportsPage.jsx
                ├── ActivityLogsPage.jsx
                └── ProfilePage.jsx
```

---

## Development Phases

The project is implemented in phases. All phases are currently marked **NOT STARTED**.

| Phase | Name |
|-------|------|
| Phase 1 | Foundation |
| Phase 2 | Database |
| Phase 3 | Authentication |
| Phase 4 | Officer Reports |
| Phase 5 | Admin Features |
| Phase 6 | Profile |
| Phase 7 | BLUEWRITE AI |
| Phase 8 | Security & Validation |
| Phase 9 | Testing |
| Phase 10 | Final Polish |

See [docs/DevelopmentPhases.md](docs/DevelopmentPhases.md) for full details.

---

## Documentation

| Document | Description |
|----------|-------------|
| [PROJECT_RULES.md](PROJECT_RULES.md) | Master rulebook for AI coding agents and developers |
| [docs/Architecture.md](docs/Architecture.md) | System architecture, request flows, and AI flow |
| [docs/DatabaseDesign.md](docs/DatabaseDesign.md) | Planned database schema and design |
| [docs/API.md](docs/API.md) | Planned REST API endpoints |
| [docs/DevelopmentPhases.md](docs/DevelopmentPhases.md) | Phased development plan |
| [docs/AIIntegration.md](docs/AIIntegration.md) | BLUEWRITE AI Assistant design and rules |
| [docs/UserFlows.md](docs/UserFlows.md) | User flows and flowcharts |
| [docs/UI-Design.md](docs/UI-Design.md) | Design system and UI guidelines |
| [docs/Testing.md](docs/Testing.md) | Testing strategy and test cases |

---

## Setup

Authentication is fully local. Configure MySQL and the session secret in `backend/.env`, then apply the non-destructive secure-auth migration once:

```bash
mysql -u root -p bluewrite_db < backend/database/migrations/20260901_secure_local_authentication.sql
mysql -u root -p bluewrite_db < backend/database/migrations/20260902_lan_login_security.sql
```

New installations should run `backend/database/schema.sql`, which already includes the authentication fields. Authentication does not require Gmail, Google OAuth, Firebase, or an internet connection.

LAN login security uses separate policies: five failed Officer attempts require an Admin unlock, while five failed Administrator attempts cause a 15-minute temporary lock followed by a required Security Review. Source IPs are recorded in Admin Activity Logs. Optional Administrator IP allowlisting is available through `ADMIN_ALLOWED_IPS` and is disabled when blank.

Offline TOTP and recovery codes are intentionally **reserved for a future security phase** and are not implemented.

Officer login additionally uses a six-digit email verification code delivered through Gmail SMTP. Configure a dedicated Gmail sender account with Google two-step verification and a Google App Password in `backend/.env`; never use the Gmail account's normal password. Apply the challenge-table migration once for existing databases:

```bash
mysql -u root -p bluewrite_db < backend/database/migrations/20260903_officer_email_verification.sql
```

New Officer logins require internet access and Gmail SMTP availability. Google AI Studio-assisted report drafting also requires internet access, a configured backend API key, available quota, and access to the configured model. Administrator login, local password verification, roles, sessions, reports, and manual report editing remain database/local-system functions. Every Officer must have a unique valid email configured in Officer Management.

---

## Testing

> ⚠️ **Testing will begin after implementation phases are completed.**

The testing strategy is documented in [docs/Testing.md](docs/Testing.md). All planned test cases are currently marked **NOT TESTED**.

---

## Status

| Component | Status |
|-----------|--------|
| Project structure | ✅ Created |
| Documentation | ✅ Created |
| Backend implementation | 🔲 Not started |
| Frontend implementation | 🔲 Not started |
| Database | 🔲 Not configured |
| Authentication | ✅ Local username/password and server-side sessions implemented |
| BLUEWRITE AI | 🔲 Not implemented |
| Testing | 🔲 Not started |

The project is **under development**. Stay tuned for Phase 1.