# Create Incident Report Page Architecture

## Overview
The Create Incident Report page (`/officer/reports/new`) allows officers to create new incident reports with a comprehensive form, AI writing assistance, local draft persistence, and validation. Built as a React page component within the OfficerLayout.

## Tech Stack
- **Frontend**: React 18, Vite, React Router v6
- **Styling**: Tailwind CSS
- **State Management**: React useState + localStorage for draft persistence
- **API Client**: Axios (shared instance from `services/api.js`)
- **AI Integration**: Custom AIReportChat component + backend Google AI Studio
- **Icons**: Lucide React

---

## Route Structure
```
/officer/reports/new
  └─ Protected by PrivateRoute (requires OFFICER role + password change complete)
      └─ Rendered within OfficerLayout (sidebar + header)
          └─ CreateReportPage component
```

**Route Definition** (`frontend/src/App.jsx:55`):
```jsx
<Route path="reports/new" element={<CreateReportPage />} />
```

---

## Component Hierarchy

```
CreateReportPage (pages/officer/CreateReportPage.jsx)
├── ReportForm (components/reports/ReportForm.jsx)
│   ├── Input (components/common/Input.jsx)
│   ├── Select (components/common/Select.jsx)
│   └── Textarea (components/common/Textarea.jsx)
├── AIReportChat (components/ai/AIReportChat.jsx)
│   ├── Button, Textarea, HighlightedText (internal)
│   └── Uses aiService.requestReportAssistance
├── ConfirmDialog (components/common/Modal.jsx)
├── Toast (components/common/Toast.jsx)
└── Button (components/common/Button.jsx)
```

---

## Data Flow

### 1. Page Load
```
CreateReportPage mounts
    │
    ▼
Check localStorage for 'bluewrite:create-draft'
    │
    ▼
If found → Show "Unsaved local draft found" banner with Restore/Discard
    │
    ▼
Render ReportForm (empty or restored) + AIReportChat (disabled until draft saved)
```

### 2. Form Interaction
```
User edits form fields
    │
    ▼
handleChange → setFormData(newData) → ReportForm re-renders
    │
    ▼
Debounced localStorage save (500ms delay)
    │
    ▼
window.localStorage.setItem('bluewrite:create-draft', JSON.stringify(formData))
    │
    ▼
Update saveState message: "Draft saved locally at HH:MM AM/PM"
```

### 3. Save as Draft
```
User clicks "Save as Draft"
    │
    ▼
validate(false) → checks required fields touched so far
    │
    ▼
createReport(formData) → POST /api/reports
    │
    ▼
Backend: reportController.create → reportService.createReport
    │
    ▼
MySQL: INSERT INTO reports (status='Draft') + INSERT INTO report_people
    │
    ▼
Response: { id, report_number: "BW-2026-000001", ... }
    │
    ▼
localStorage.removeItem('bluewrite:create-draft')
    │
    ▼
navigate(`/officer/reports/${id}/edit`)
```

### 4. Submit Report
```
User clicks "Submit Report"
    │
    ▼
validate(true) → ALL required fields + narrative ≥30 chars
    │
    ▼
ConfirmDialog opens: "Submit Incident Report?"
    │
    ▼
User confirms
    │
    ▼
createReport(formData) → POST /api/reports (if not already saved)
    │
    ▼
submitReport(reportId) → PATCH /api/reports/:id/submit
    │
    ▼
Backend: reportController.submit → reportService.submitReport
    │
    ▼
MySQL: UPDATE reports SET status='Submitted', submitted_at=CURRENT_TIMESTAMP
    │
    ▼
localStorage.removeItem('bluewrite:create-draft')
    │
    ▼
navigate('/officer/reports')
```

---

## Form Fields (ReportForm)

### Report Information Section
| Field | Name | Type | Required | Notes |
|-------|------|------|----------|-------|
| Report Number | `report_number` | Input (disabled) | Auto | Auto-generated on save |
| Incident Type | `incident_type` | Select | Yes | 8 options from constants |
| Report Title | `title` | Input | No | Brief title |
| Incident Date | `incident_date` | Input (date) | Yes | |
| Incident Time | `incident_time` | Input (time) | Yes | |
| Location | `location` | Input | Yes | Full width on mobile |

### People Involved Section
| Field | Name | Type | Required |
|-------|------|------|----------|
| Complainant | `complainant` | Input | No |
| Victim | `victim` | Input | No |
| Suspect | `suspect` | Input | No |
| Witness | `witness` | Input | No |

### Incident Details Section
| Field | Name | Type | Required | Validation |
|-------|------|------|----------|------------|
| Summary | `summary` | Textarea (4 rows) | No | |
| Narrative | `narrative` | Textarea (10 rows) | Yes (on submit) | ≥30 chars on submit |

**Incident Type Options** (`constants.js:35-44`):
- theft, assault, burglary, traffic, vandalism, disturbance, fraud, other

---

## Validation Logic (`CreateReportPage.jsx:54-64`)

```javascript
const validate = (isSubmit) => {
  const nextErrors = {};
  // Touched field validation (on blur/change)
  if (isSubmit || formData.incident_type) if (!formData.incident_type?.trim()) nextErrors.incident_type = 'Incident type is required.';
  if (isSubmit || formData.incident_date) if (!formData.incident_date?.trim()) nextErrors.incident_date = 'Incident date is required.';
  if (isSubmit || formData.incident_time) if (!formData.incident_time?.trim()) nextErrors.incident_time = 'Incident time is required.';
  if (isSubmit || formData.location) if (!formData.location?.trim()) nextErrors.location = 'Incident location is required.';
  // Submit-only validation
  if (isSubmit && (!formData.narrative || formData.narrative.trim().length < 30)) nextErrors.narrative = 'Narrative must be at least 30 characters.';
  return Object.keys(nextErrors).length === 0;
};
```

---

## Local Draft Persistence

### Storage Key
```
bluewrite:create-draft
```

### Auto-Save
- Triggered on every `formData` change
- 500ms debounce via `setTimeout`
- Stores full formData object as JSON

### Restore Flow
1. On mount: check localStorage → show banner if exists
2. User clicks "Restore Draft" → parse JSON → setFormData
3. User clicks "Discard Draft" → remove localStorage item

### Before Unload Warning
```javascript
window.addEventListener('beforeunload', (event) => {
  if (Object.keys(formData).length) {
    event.preventDefault();
    event.returnValue = 'You have unsaved changes.';
  }
});
```

---

## AI Report Assistant (AIReportChat)

### Availability
- **Disabled** when `reportId === null` (report not yet saved as draft)
- **Disabled** when `reportStatus !== 'Draft'` (submitted reports)
- Shows informational message when unavailable

### Features
| Action | Key | Purpose |
|--------|-----|---------|
| Generate Report | `generate` | Create full report draft from narrative |
| Improve Writing | `improve` | Enhance narrative clarity/grammar |
| Check Narrative | `check` | Review narrative for issues |

### Writing Presets (6 options)
- Make more concise
- Improve grammar and clarity
- Improve chronological order
- Use neutral wording
- Identify details to verify
- Remove repetition

### Safety Validation
- **Allowed**: Writing improvements only (grammar, clarity, structure, tone)
- **Blocked**: Inventing facts, investigative decisions, legal conclusions, unrelated content
- **Patterns**: `writingIntentPattern` (allow) vs `unsafeWritingPattern` (block)

### Data Sent to AI
```javascript
allowedReportData = {
  title, incident_type, incident_date, incident_time, location,
  summary, narrative, complainant, victim, suspect, witness
}
```

### On Suggestion Accepted
```javascript
onInsertSuggestion((draft) => {
  setFormData((current) => ({ ...current, ...draft }));
  // Shows toast: "AI report draft applied. Review every field before saving."
});
```

---

## Backend Integration

### Endpoints Used
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/reports` | Create draft report |
| PATCH | `/api/reports/:id/submit` | Submit draft as final |

### Create Report Request Body
```json
{
  "title": "string",
  "incident_type": "theft|assault|burglary|traffic|vandalism|disturbance|fraud|other",
  "incident_date": "YYYY-MM-DD",
  "incident_time": "HH:MM",
  "location": "string",
  "summary": "string",
  "narrative": "string",
  "complainant": "string",
  "victim": "string",
  "suspect": "string",
  "witness": "string"
}
```

### Backend Create Flow (`reportService.js:10`)
```sql
-- Transaction begins
INSERT INTO reports (report_number, officer_id, title, incident_type, incident_date, incident_time, location, summary, narrative, status)
VALUES ('TMP-...', ?, ?, ?, ?, ?, ?, ?, ?, 'Draft')

-- Generate permanent report number
UPDATE reports SET report_number = 'BW-2026-000001' WHERE id = ?

-- Insert people involved
INSERT INTO report_people (report_id, person_type, first_name, last_name, ...) VALUES ...

-- Log activity
INSERT INTO activity_logs (actor_user_id, action, target_type, target_id, description, metadata)
VALUES (?, 'REPORT_CREATED', 'Report', 'BW-2026-000001', 'Created incident report BW-2026-000001.', '{reportStatus: "Draft"}')

-- Transaction commits
```

### Submit Validation (Backend) (`reportService.js:12`)
```javascript
const missing = ['incident_type','incident_date','incident_time','location','narrative']
  .filter(k => !String(old[k] || '').trim());

if (missing.length || old.narrative.trim().length < 30) {
  throw Error('Required fields missing or narrative too short');
}
```

---

## Navigation Routes

| Action | Route | Target Page |
|--------|-------|-------------|
| Cancel | `/officer/reports` | MyReportsPage |
| Save as Draft | `/officer/reports/:id/edit` | EditReportPage |
| Submit Report | `/officer/reports` | MyReportsPage |
| View All Reports | `/officer/reports` | MyReportsPage |

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| API 401 | Redirect to `/login?expired=1` (Axios interceptor) |
| API 403 | "Only Officers may create reports" / permission message |
| Validation errors | Inline field errors + formMessage banner |
| Save draft failure | `formMessage`: "Unable to save report." |
| Submit failure | `formMessage`: "Unable to submit report." |
| AI request timeout | Error in AI panel: "Google AI Studio did not respond..." |
| AI safety refusal | Error in AI panel: "This assistant supports incident-report writing only..." |

---

## State Management (CreateReportPage)

```javascript
const [formData, setFormData] = useState({});           // All form fields
const [errors, setErrors] = useState({});               // Validation errors
const [formMessage, setFormMessage] = useState('');     // General error/success
const [showSubmitConfirm, setShowSubmitConfirm] = useState(false); // Submit dialog
const [localDraftFound, setLocalDraftFound] = useState(false);    // localStorage banner
const [saveState, setSaveState] = useState('');         // Auto-save timestamp
const [toast, setToast] = useState({ message: '', type: 'info' }); // AI toast
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/pages/officer/CreateReportPage.jsx` | Main page component |
| `frontend/src/components/reports/ReportForm.jsx` | Form UI with all fields |
| `frontend/src/components/ai/AIReportChat.jsx` | AI writing assistant |
| `frontend/src/services/reportService.js` | API calls (createReport, submitReport) |
| `frontend/src/services/aiService.js` | AI assistance API |
| `frontend/src/utils/constants.js` | Incident type options |
| `backend/src/controllers/reportController.js` | Request handlers |
| `backend/src/services/reportService.js` | Database operations |
| `frontend/src/components/common/Modal.jsx` | ConfirmDialog |
| `frontend/src/components/common/Toast.jsx` | Toast notifications |

---

## Environment Configuration

**Frontend** (`frontend/.env.example`):
```
VITE_API_BASE_URL=http://localhost:3000/api
```

**Backend** - Requires:
- MySQL database with `reports` and `report_people` tables
- Google AI Studio API key for AI features
- Session-based authentication