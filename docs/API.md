# BLUEWRITE — REST API Documentation

---

## 1. Overview

This document describes the **planned** REST API endpoints for BLUEWRITE.

> ⚠️ **STATUS: PLANNED** — Implementation has not started yet. These endpoints are planned and may be refined during development.

All endpoints are prefixed with `/api`.

---

## 2. General Conventions

### Base URL

```
http://localhost:3000/api
```

(Exact port confirmed during Phase 1 implementation.)

### Authentication

Most endpoints require the server-side BLUEWRITE session cookie. The browser sends it with `withCredentials`; JavaScript cannot read it because it is `httpOnly`.

### Response Format

All responses use a consistent JSON envelope:

```json
{
  "success": true,
  "message": "Optional message",
  "data": { }
}
```

### Errors

```json
{
  "success": false,
  "message": "Error details",
  "errors": [ ]
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 3. Auth Endpoints

### POST /api/auth/login

Authenticate a local user and create a server-side session.

For Officers, valid credentials return `verificationRequired: true` and send a code to the masked Admin-managed email. A normal authenticated session is not created until `/api/auth/verify-email` succeeds. Admin login continues directly to its local session/security-review flow.

**Access:** Public

**Request Body:**

```json
{
  "username": "jdoe",
  "password": "password123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "jdoe",
      "first_name": "John",
      "last_name": "Doe",
      "role": "officer",
      "status": "active",
      "mustChangePassword": false
    }
  }
}
```

---

### GET /api/auth/verify-email/status

Returns the masked destination for a restricted pending Officer login session.

### POST /api/auth/verify-email

Accepts `{ "code": "123456" }`. A valid single-use code completes Officer authentication and regenerates the session ID. Codes expire after five minutes and allow no more than five incorrect attempts.

### POST /api/auth/verify-email/resend

Sends a replacement code after the cooldown. The previous code becomes invalid. A maximum of three sends is allowed per login challenge.

### POST /api/auth/verify-email/cancel

Destroys the pending verification session and returns the Officer to login.

---

### POST /api/auth/change-password

Change the authenticated user's password. This is the only normal protected endpoint available while `mustChangePassword` is true.

```json
{
  "currentPassword": "current-or-temporary-password",
  "newPassword": "new-permanent-password",
  "confirmPassword": "new-permanent-password"
}
```

The backend verifies the current password, enforces the password policy, stores only a new bcrypt hash, clears `must_change_password`, records `PASSWORD_CHANGED`, revokes older sessions, and regenerates the current session ID.

---

### GET /api/auth/security-review

Returns recent failed Administrator login events, timestamps, and source IPs when a Security Review is required. Accessible only to the authenticated flagged Administrator.

### POST /api/auth/security-review

Completes the required review with `{ "decision": "recognized" }` or `{ "decision": "unrecognized" }`. Unrecognized activity sets `mustChangePassword` and blocks the dashboard until the Administrator changes the password.

---

### GET /api/auth/me

Return the currently authenticated user's profile.

**Access:** Authenticated (admin, officer)

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "jdoe",
    "email": "jdoe@police.gov",
    "first_name": "John",
    "last_name": "Doe",
    "badge_number": "B-1001",
    "role": "officer",
    "status": "active"
  }
}
```

---

## 4. Report Endpoints

> **Ownership rule:** Officers can only access reports where `officer_id = current user id`.
> **Status rule:** Reports have only `draft` and `submitted`.
> **Edit rule:** Submitted reports cannot be edited.
> **No approval workflow exists.**

---

### GET /api/reports

List incident reports.

**Access:** Authenticated

**Role behavior:**

- **Officer:** returns only their own reports.
- **Admin:** returns all reports.

**Query Parameters (planned):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by title, report number, location |
| `status` | string | Filter by `draft` or `submitted` |
| `incident_type` | string | Filter by incident type |
| `page` | number | Page number (default 1) |
| `limit` | number | Items per page (default 10) |
| `sort_by` | string | `created_at`, `incident_date`, `report_number` |
| `sort_order` | string | `asc` or `desc` |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "report_number": "BLW-2026-0001",
        "title": "Theft Report — Main Street",
        "incident_type": "Theft",
        "incident_date": "2026-08-12T09:30:00.000Z",
        "location": "123 Main Street",
        "status": "draft",
        "submitted_at": null,
        "created_at": "2026-08-12T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

---

### POST /api/reports

Create a new incident report as a **draft**.

**Access:** Authenticated (officer)

**Request Body (planned):**

```json
{
  "title": "Theft Report — Main Street",
  "incident_type": "Theft",
  "incident_date": "2026-08-12T09:30:00.000Z",
  "location": "123 Main Street",
  "narrative": "At approximately 0930 hours..."
}
```

**Behavior:**

- Report is created with `status = 'draft'`.
- `officer_id` is set to the authenticated officer.
- A unique `report_number` is generated.

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "report_number": "BLW-2026-0001",
    "status": "draft"
  }
}
```

---

### GET /api/reports/:id

Get a single incident report.

**Access:** Authenticated

**Role behavior:**

- **Officer:** can only view their own reports (`officer_id = current user`).
- **Admin:** can view any report.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "report_number": "BLW-2026-0001",
    "officer_id": 3,
    "officer_name": "John Doe",
    "badge_number": "B-1001",
    "title": "Theft Report — Main Street",
    "incident_type": "Theft",
    "incident_date": "2026-08-12T09:30:00.000Z",
    "location": "123 Main Street",
    "narrative": "At approximately 0930 hours...",
    "status": "draft",
    "review_notes": null,
    "submitted_at": null,
    "created_at": "2026-08-12T10:00:00.000Z",
    "updated_at": "2026-08-12T10:00:00.000Z"
  }
}
```

---

### PUT /api/reports/:id

Update an incident report.

**Access:** Authenticated (officer)

**Constraints:**

- Officer must own the report.
- Report must be in `draft` status.
- Submitted reports **cannot** be edited.

**Request Body (planned):**

```json
{
  "title": "Updated Title",
  "incident_type": "Theft",
  "incident_date": "2026-08-12T09:30:00.000Z",
  "location": "123 Main Street",
  "narrative": "Updated narrative text..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "draft",
    "updated_at": "2026-08-12T11:00:00.000Z"
  }
}
```

---

### PATCH /api/reports/:id/submit

Submit a draft report.

**Access:** Authenticated (officer)

**Constraints:**

- Officer must own the report.
- Report must be in `draft` status.
- On success, status changes to `submitted` and `submitted_at` is set.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "submitted",
    "submitted_at": "2026-08-12T11:30:00.000Z"
  }
}
```

**Errors:**

- `403` — Not the owner, or report already submitted.
- `400` — Report is missing required fields (validation planned).

---

## 5. Officer Endpoints (Admin Only)

> All officer management endpoints require the `admin` role.

---

### GET /api/officers

List police officer accounts.

**Access:** Admin

**Query Parameters (planned):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by name, username, badge |
| `status` | string | Filter by `active` or `disabled` |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 3,
        "username": "jdoe",
        "first_name": "John",
        "last_name": "Doe",
        "badge_number": "B-1001",
        "status": "active",
        "report_count": 5,
        "last_login_at": "2026-08-11T08:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

---

### POST /api/officers

Create a new police officer account.

**Access:** Admin

**Request Body (planned):**

```json
{
  "username": "jsmith",
  "email": "jsmith@police.gov",
  "password": "TemporaryPass123!",
  "first_name": "Jane",
  "last_name": "Smith",
  "badge_number": "B-1002"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 4,
    "username": "jsmith",
    "role": "officer",
    "status": "active"
  }
}
```

---

### PUT /api/officers/:id

Update a police officer account.

**Access:** Admin

**Request Body (planned):**

```json
{
  "email": "jane.smith@police.gov",
  "first_name": "Jane",
  "last_name": "Smith",
  "badge_number": "B-1002"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 4,
    "username": "jsmith",
    "updated_at": "2026-08-12T12:00:00.000Z"
  }
}
```

---

### PATCH /api/officers/:id/status

Enable or disable an officer account.

**Access:** Admin

**Request Body:**

```json
{
  "status": "disabled"
}
```

**Valid values:** `active`, `disabled`

**Behavior:**

- Officers are **disabled**, never deleted.
- Historical reports remain associated with the officer.
- A disabled officer cannot log in.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 4,
    "status": "disabled"
  }
}
```

---

## 6. Dashboard Endpoints

### GET /api/dashboard/admin

Return admin dashboard statistics.

**Access:** Admin

**Planned data:**

```json
{
  "success": true,
  "data": {
    "total_officers": 12,
    "active_officers": 10,
    "total_reports": 45,
    "draft_reports": 20,
    "submitted_reports": 25,
    "recent_reports": [],
    "recent_logs": []
  }
}
```

---

### GET /api/dashboard/officer

Return officer dashboard statistics.

**Access:** Officer

**Planned data:**

```json
{
  "success": true,
  "data": {
    "total_reports": 8,
    "draft_reports": 3,
    "submitted_reports": 5,
    "recent_reports": [],
    "recent_ai_usage": []
  }
}
```

---

## 7. Log Endpoints

### GET /api/logs

Return activity logs.

**Access:** Admin

**Query Parameters (planned):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | number | Filter by user |
| `action` | string | Filter by action |
| `from_date` | string | Filter by start date |
| `to_date` | string | Filter by end date |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "user_id": 3,
        "username": "jdoe",
        "action": "SUBMIT_REPORT",
        "details": "Report #BLW-2026-0001 submitted",
        "ip_address": "192.168.1.10",
        "created_at": "2026-08-12T11:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

---

## 8. Profile Endpoints

### GET /api/profile

Return the authenticated user's profile.

**Access:** Authenticated (admin, officer)

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "jdoe",
    "email": "jdoe@police.gov",
    "first_name": "John",
    "last_name": "Doe",
    "badge_number": "B-1001",
    "role": "officer",
    "status": "active"
  }
}
```

---

### PUT /api/profile

Update the authenticated user's profile.

**Access:** Authenticated (admin, officer)

**Request Body (planned):**

```json
{
  "email": "john.doe@police.gov",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "john.doe@police.gov",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

---

### PUT /api/profile/password

Change the authenticated user's password.

**Access:** Authenticated (admin, officer)

**Request Body (planned):**

```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass456!",
  "confirm_password": "NewPass456!"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## 9. AI Endpoints

> **Critical rule:** The frontend must never communicate directly with Google AI Studio or receive the Google AI Studio API key. All AI requests go through these authenticated backend endpoints.

---

### POST /api/ai/report-assist

Generate an editable BLUEWRITE report draft from the Officer-provided raw narrative. The response proposes the real report fields; unsupported values remain blank.

**Access:** Authenticated (officer)

**Request Body:**

```json
{
  "action": "generate",
  "reportId": 1,
  "reportData": {
    "narrative": "On 2026-08-12 at 09:30, complainant Alex Cruz reported a theft at 123 Main Street."
  },
  "writingInstruction": "Use concise professional wording.",
  "presetKeys": ["concise", "neutral"]
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "action": "generate",
    "suggestion": "At approximately 0930 hours, responding personnel attended to...",
    "reportDraft": {
      "title": "Reported Theft at 123 Main Street",
      "incident_type": "theft",
      "incident_date": "2026-08-12",
      "incident_time": "09:30",
      "location": "123 Main Street",
      "summary": "Alex Cruz reported a theft at 123 Main Street.",
      "narrative": "At approximately 0930 hours...",
      "complainant": "Alex Cruz",
      "victim": "",
      "suspect": "",
      "witness": ""
    },
    "reportFieldIssues": [],
    "reviewReady": true,
    "retryCount": 0,
    "aiProvider": "Google AI Studio",
    "aiModel": "configured backend model"
  }
}
```

**Behavior:**

- The AI generates a structured report draft from the supplied narrative.
- Supported title, incident details, summary, people roles, and report narrative are **returned to the Officer for review**.
- Existing Officer-entered fields remain canonical. Unsupported AI-proposed fields are blanked and listed in `reportFieldIssues`.
- The AI never automatically saves or submits anything.
- Google AI Studio is called through the official `@google/genai` SDK using a stateless Gemini `generateContent` request.
- Technical provider/model/outcome metadata is logged in `activity_logs`; full prompts and generated reports are not logged.

---

Use the same endpoint with `action: "improve"` to revise wording or `action: "check"` to return review findings. All actions require an authenticated Officer, an authorized Officer-owned Draft report, and valid context.

Analyze a report for grammar, clarity, completeness, consistency, and missing information.

**Access:** Authenticated (officer)

**Check Request Body:**

```json
{
  "action": "check",
  "reportId": 1,
  "reportData": {
    "narrative": "Officer-entered narrative to review"
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "action": "check",
    "suggestion": "- Verify the sequence of the supplied events.",
    "aiProvider": "Google AI Studio",
    "aiModel": "configured backend model"
  }
}
```

**Behavior:**

- The AI analyzes the report and returns findings.
- The analysis is for **assistance only**.
- The officer decides whether to apply recommendations.
- The AI never determines guilt or makes legal decisions.
- Technical usage metadata is logged without full report content.

---

## 10. Endpoint Summary

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/api/auth/login` | Public | Log in |
| GET | `/api/auth/me` | Authenticated | Current user |
| GET | `/api/reports` | Officer / Admin | List reports (officer: own only) |
| POST | `/api/reports` | Officer | Create draft report |
| GET | `/api/reports/:id` | Officer / Admin | Get single report |
| PUT | `/api/reports/:id` | Officer (owner, draft) | Update draft report |
| PATCH | `/api/reports/:id/submit` | Officer (owner, draft) | Submit report |
| GET | `/api/officers` | Admin | List officers |
| POST | `/api/officers` | Admin | Create officer |
| PUT | `/api/officers/:id` | Admin | Update officer |
| PATCH | `/api/officers/:id/status` | Admin | Enable/disable officer |
| PATCH | `/api/officers/:id/unlock` | Admin | Unlock an Officer after failed logins |
| POST | `/api/officers/:id/reset-password` | Admin | Generate one-time temporary Officer credentials |
| GET | `/api/auth/security-review` | Admin (flagged session) | View suspicious login activity |
| POST | `/api/auth/security-review` | Admin (flagged session) | Complete security review |
| GET | `/api/auth/verify-email/status` | Pending Officer | View masked verification destination |
| POST | `/api/auth/verify-email` | Pending Officer | Complete email verification |
| POST | `/api/auth/verify-email/resend` | Pending Officer | Resend login code |
| POST | `/api/auth/verify-email/cancel` | Pending Officer | Cancel pending login |
| GET | `/api/dashboard/admin` | Admin | Admin dashboard stats |
| GET | `/api/dashboard/officer` | Officer | Officer dashboard stats |
| GET | `/api/logs` | Admin | Activity logs |
| GET | `/api/profile` | Authenticated | Get profile |
| PUT | `/api/profile` | Authenticated | Update profile |
| PUT | `/api/profile/password` | Authenticated | Change password |
| POST | `/api/ai/report-assist` | Officer (owner, draft) | Generate, improve, or check an AI narrative |
| POST | `/api/ai/report-assist/accepted` | Officer (owner, draft) | Record acceptance or rejection of an AI suggestion |

---

## 11. Status

The AI endpoints above are implemented. Authentication and report-ownership rules remain authoritative even when client payloads contain other identifiers.