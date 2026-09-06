# BLUEWRITE — Development Phases

---

## Overview

BLUEWRITE is developed in small, incremental phases. Each phase must be **completed and tested** before moving to the next phase. Per PROJECT_RULES.md, work stops and waits for approval after each requested phase.

**Current status: All phases NOT STARTED.**

---

## Phase 1 — FOUNDATION

**Status:** ✅ IMPLEMENTED WITH GOOGLE AI STUDIO

### Objective

Set up the project foundation for both backend and frontend.

### Tasks

- [ ] Scaffold backend: `package.json`, entry point (`server.js`, `src/app.js`)
- [ ] Scaffold frontend: Vite + React + Tailwind CSS setup
- [ ] Configure environment variables (`backend/.env.example`, `frontend/.env.example`)
- [ ] Add `.gitignore` files for backend and frontend
- [ ] Create basic Express server health-check endpoint
- [ ] Set up Vite dev server and proxy configuration
- [ ] Create the base App shell and placeholder routes
- [ ] Set up frontend services layer (Axios instance)
- [ ] Create a test page to confirm the stack works end-to-end

### Expected Result

- Backend and frontend start successfully.
- A basic server health check returns OK.
- Frontend loads with the BLUEWRITE placeholder page.
- No application features implemented yet.

### Testing

- Backend starts without errors.
- `GET /` or `GET /api/health` returns OK.
- Frontend dev server starts without errors.
- Frontend can reach the backend through the proxy.

---

## Phase 2 — DATABASE

**Status:** 🔲 NOT STARTED

### Objective

Create and configure the MySQL database schema.

### Tasks

- [ ] Create `database/schema.sql`
- [ ] Create tables: `users`, `incident_reports`, `activity_logs`, `ai_logs`
- [ ] Define ENUM constraints (roles, user statuses, report statuses)
- [ ] Define foreign keys and indexes
- [ ] Create `database/seeds/adminSeed.js` for the default admin account (bcrypt-hashed)
- [ ] Implement `src/config/db.js` (MySQL connection pool)
- [ ] Implement `src/config/env.js` (environment configuration)
- [ ] Document any schema refinements in `docs/DatabaseDesign.md`

### Expected Result

- Database schema loads into MySQL without errors.
- Default admin seed script runs successfully.
- Connection pool works from the backend.

### Testing

- `schema.sql` executes without errors.
- Tables, ENUMs, FKs, and indexes are verified.
- Admin seed creates one admin user with a hashed password.
- Database connection from Node.js is confirmed.

---

## Phase 3 — AUTHENTICATION

**Status:** 🔲 NOT STARTED

### Objective

Implement JWT-based authentication with bcrypt password hashing.

### Tasks

- [ ] Implement `src/utils/password.js` (bcrypt hash/compare)
- [ ] Implement `src/utils/jwt.js` (sign/verify tokens)
- [ ] Implement `src/models/userModel.js` (user queries)
- [ ] Implement `src/services/authService.js` (login logic, disabled-user check)
- [ ] Implement `src/controllers/authController.js`
- [ ] Implement `src/routes/authRoutes.js`
- [ ] Implement `src/middleware/authenticate.js`
- [ ] Implement `src/middleware/authorizeRole.js`
- [ ] Implement `src/utils/response.js`
- [ ] Implement `src/middleware/errorHandler.js`
- [ ] Frontend: implement `AuthContext.jsx`, `useAuth.js`
- [ ] Frontend: implement `LoginPage.jsx`
- [ ] Frontend: implement `authService.js` (login, me)
- [ ] Frontend: implement `PrivateRoute.jsx`

### Expected Result

- Admins and officers can log in.
- Disabled users cannot log in.
- Protected routes return 401 without a token.

### Testing

- Login success returns a valid JWT.
- Login failure returns 401.
- Disabled account login returns 403.
- `/api/auth/me` returns the current user with a valid token.
- Frontend login page authenticates and redirects by role.

---

## Phase 4 — OFFICER REPORTS

**Status:** 🔲 NOT STARTED

### Objective

Implement the full officer report lifecycle: create, edit, submit, view, search, print.

### Tasks

- [ ] Implement `src/utils/reportNumber.js` (unique report number generator)
- [ ] Implement `src/models/reportModel.js`
- [ ] Implement `src/services/reportService.js` (ownership enforcement)
- [ ] Implement `src/controllers/reportController.js`
- [ ] Implement `src/routes/reportRoutes.js`
- [ ] Implement `src/middleware/activityLogger.js`
- [ ] Frontend: implement `reportService.js`
- [ ] Frontend: implement `MyReportsPage.jsx`
- [ ] Frontend: implement `CreateReportPage.jsx`
- [ ] Frontend: implement `EditReportPage.jsx`
- [ ] Frontend: implement `components/reports/ReportForm.jsx`
- [ ] Frontend: implement `components/reports/ReportTable.jsx`
- [ ] Frontend: implement `OfficerLayout.jsx`, `Sidebar.jsx`, `Header.jsx`
- [ ] Frontend: implement `Officer DashboardPage.jsx`
- [ ] Frontend: implement `utils/printReport.js` and `PrintableReport.jsx`
- [ ] Frontend: implement `utils/formatDate.js`, `utils/constants.js`

### Expected Result

- Officers can create drafts, edit drafts, and submit reports.
- Officers can view only their own reports.
- Submitted reports cannot be edited.
- Officers can search/filter and print reports.

### Testing

- Officer creates a draft → status `draft`.
- Officer edits own draft → changes persist.
- Officer cannot edit another officer's report (403).
- Officer cannot edit a submitted report (403).
- Submit changes status to `submitted` and sets `submitted_at`.
- Search/filter works correctly.
- Print output is correctly formatted.

---

## Phase 5 — ADMIN FEATURES

**Status:** 🔲 NOT STARTED

### Objective

Implement admin features: officer management, view all reports, view logs.

### Tasks

- [ ] Implement `src/models/userModel.js` admin queries
- [ ] Implement `src/services/officerService.js`
- [ ] Implement `src/controllers/officerController.js`
- [ ] Implement `src/routes/officerRoutes.js`
- [ ] Implement `src/services/logService.js`
- [ ] Implement `src/controllers/logController.js`
- [ ] Implement `src/routes/logRoutes.js`
- [ ] Implement `src/models/logModel.js`
- [ ] Frontend: implement `officerService.js`
- [ ] Frontend: implement `AdminLayout.jsx`
- [ ] Frontend: implement `Admin DashboardPage.jsx`
- [ ] Frontend: implement `OfficersPage.jsx`
- [ ] Frontend: implement `Admin ReportsPage.jsx`
- [ ] Frontend: implement `ActivityLogsPage.jsx`

### Expected Result

- Admins can create, edit, and enable/disable officers.
- Disabled officers are not deleted; historical reports remain associated.
- Admins can view all reports and filter them.
- Admins can view activity logs.
- Admins cannot approve reports (no approval workflow).

### Testing

- Admin creates an officer → appears in the list.
- Admin edits an officer → changes persist.
- Admin disables an officer → officer cannot log in.
- Admin re-enables an officer → officer can log in.
- Disabled officer's reports remain visible in admin reports.
- Admin filters reports and logs correctly.

---

## Phase 6 — PROFILE

**Status:** 🔲 NOT STARTED

### Objective

Implement profile management for both roles.

### Tasks

- [ ] Implement profile queries in `src/models/userModel.js`
- [ ] Implement `src/services/profileService.js` (if needed) or extend authService
- [ ] Implement `src/controllers/profileController.js`
- [ ] Implement `src/routes/profileRoutes.js`
- [ ] Frontend: implement `ProfilePage.jsx` for officer
- [ ] Frontend: implement `ProfilePage.jsx` for admin

### Expected Result

- Users can view and update their profile.
- Users can change their password with current-password verification.

### Testing

- Profile loads with current user data.
- Profile updates persist.
- Password change works with correct current password.
- Password change fails with incorrect current password.

---

## Phase 7 — BLUEWRITE AI

**Status:** 🔲 NOT STARTED

### Objective

Implement the BLUEWRITE AI Assistant using the official Google Gen AI Node.js SDK and Gemini Developer API (backend-only).

### Tasks

- [x] Implement `src/services/googleAIService.js`
- [x] Implement `src/services/aiService.js`
- [ ] Implement `src/models/aiLogModel.js`
- [ ] Implement `src/controllers/aiController.js`
- [ ] Implement `src/routes/aiRoutes.js`
- [ ] Frontend: implement `aiService.js`
- [ ] Frontend: implement `components/ai/AIAssistant.jsx`
- [ ] Frontend: implement `components/ai/AIAnalysisCard.jsx`
- [ ] Integrate AI Assistant into the report form

### Expected Result

- Officers can generate an editable AI report draft from the supplied narrative.
- Officers can analyze a report for grammar, clarity, completeness, consistency, and missing information.
- AI output is editable by the officer.
- AI never submits reports automatically.
- AI requests go through the backend only (no direct frontend → Google AI Studio).
- Technical AI usage metadata is logged in `activity_logs` without full prompts/responses.

### Testing

- Generate Report returns structured values for the editable report fields and leaves unsupported fields blank.
- Analyze report returns findings that display in the AI analysis card.
- Audit entries identify provider/model/outcome without storing confidential report payloads.
- Frontend never calls Google AI Studio directly and never receives the API key.

---

## Phase 8 — SECURITY & VALIDATION

**Status:** 🔲 NOT STARTED

### Objective

Harden the application with security best practices and full validation.

### Tasks

- [ ] Validate all input on the **backend** (request schemas)
- [ ] Validate all input on the **frontend** (form validation)
- [ ] Confirm all SQL is parameterized
- [ ] Confirm password hashing is used everywhere
- [ ] Confirm JWT secret is loaded from environment
- [ ] Add rate limiting to login (planned)
- [ ] Add security headers (planned)
- [ ] Recheck ownership enforcement on every report route
- [ ] Recheck role enforcement on every admin route
- [ ] Recheck that submitted reports cannot be edited

### Expected Result

- All inputs are validated on both frontend and backend.
- No SQL injection, no plaintext passwords, no exposed secrets.
- Route-level ownership and role checks are airtight.

### Testing

- Invalid payloads return 400 with meaningful messages.
- SQL injection attempts fail.
- Role-based access is verified: officer cannot access admin routes.
- Ownership-based access is verified: officer cannot access another officer's report.

---

## Phase 9 — TESTING

**Status:** 🔲 NOT STARTED

### Objective

Execute the full planned testing strategy from `docs/Testing.md`.

### Tasks

- [ ] Test authentication flows
- [ ] Test authorization (roles, ownership)
- [ ] Test report lifecycle (create, edit, submit, view, print)
- [ ] Test admin features (officer management, reports, logs)
- [ ] Test database operations
- [ ] Test API endpoints
- [ ] Test AI features
- [ ] Test UI components and pages
- [ ] Test responsive design
- [ ] Run security checks

### Expected Result

- All planned test cases are executed and passed/failed are recorded.
- Fix any defects found.

### Testing

- See `docs/Testing.md` for the full test case table.

---

## Phase 10 — FINAL POLISH

**Status:** 🔲 NOT STARTED

### Objective

Polish the application for final delivery and capstone demonstration.

### Tasks

- [ ] Review UI consistency across all pages
- [ ] Review accessibility (keyboard navigation, focus states, ARIA labels)
- [ ] Add loading and empty states
- [ ] Add confirmation dialogs for destructive actions (planned)
- [ ] Review responsive behavior on tablet and mobile
- [ ] Final documentation review and synchronization
- [ ] Prepare demonstration data (sample officer account and demo reports)
- [ ] Prepare the final demo script

### Expected Result

- Professional, consistent, accessible UI.
- Documentation matches implementation.
- Ready for capstone demonstration.

### Testing

- Full walkthrough of all user flows from `docs/UserFlows.md`.
- Final test pass of all test cases.

---

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | 🔲 NOT STARTED |
| 2 | Database | 🔲 NOT STARTED |
| 3 | Authentication | 🔲 NOT STARTED |
| 4 | Officer Reports | 🔲 NOT STARTED |
| 5 | Admin Features | 🔲 NOT STARTED |
| 6 | Profile | 🔲 NOT STARTED |
| 7 | BLUEWRITE AI | 🔲 NOT STARTED |
| 8 | Security & Validation | 🔲 NOT STARTED |
| 9 | Testing | 🔲 NOT STARTED |
| 10 | Final Polish | 🔲 NOT STARTED |

---

## Rules

- Complete and test the current phase before moving to the next phase.
- Stop and wait for approval after each requested phase.
- Do not mark unfinished features as complete.
- Keep documentation synchronized with implementation.