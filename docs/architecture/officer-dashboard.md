# Officer Dashboard Architecture

## Overview
The Officer Dashboard (`/officer/dashboard`) is a React-based single-page application component providing police officers with an overview of their incident reporting activity. Built with Vite + React 18, Tailwind CSS, and React Router v6.

## Tech Stack
- **Frontend**: React 18, Vite, React Router v6
- **Styling**: Tailwind CSS with custom police-blue color palette
- **State Management**: React Context (AuthContext) + local component state
- **API Client**: Axios with interceptors for auth handling
- **Icons**: Lucide React
- **Backend**: Node.js/Express with MySQL

---

## Route Structure
```
/officer/dashboard
  └─ Protected by PrivateRoute (requires OFFICER role + password change complete)
      └─ Rendered within OfficerLayout (sidebar + header)
          └─ DashboardPage component
```

**Route Definition** (`frontend/src/App.jsx:53`):
```jsx
<Route path="dashboard" element={<OfficerDashboardPage />} />
```

---

## Component Hierarchy

```
DashboardPage (pages/officer/DashboardPage.jsx)
├── StatCard (components/common/StatCard.jsx) ×3
├── ReportStatusOverview (components/reports/ReportStatusOverview.jsx)
│   └── StatusBar (internal)
├── ReportTable (components/reports/ReportTable.jsx)
│   └── Table (components/common/Table.jsx)
│   └── Badge (components/common/Badge.jsx)
│   └── Button (components/common/Button.jsx)
├── WorkloadItem (inline component)
└── Quick Actions Buttons
```

---

## Data Flow

### 1. Dashboard Load Sequence
```
DashboardPage mounts
    │
    ▼
useEffect calls getOfficerDashboard() (services/dashboardService.js:18)
    │
    ▼
Axios GET /api/dashboard/officer (api.js baseURL: VITE_API_BASE_URL)
    │
    ▼
Backend: dashboardRoutes.js → dashboardController.officer → dashboardService.officer
    │
    ▼
MySQL Query: reports table filtered by officer_id
    │
    ▼
Response: { total_reports, draft_reports, submitted_reports, reports_today,
            reports_this_week, reports_this_month, recentReports[] }
    │
    ▼
Frontend state update → Re-render with live data
```

### 2. API Response Structure
```javascript
// Backend returns (dashboardService.js:2):
{
  total_reports: number,
  draft_reports: number,
  submitted_reports: number,
  reports_today: number,
  reports_this_week: number,
  reports_this_month: number,
  recentReports: [
    {
      id: number,
      report_number: string,
      incident_type: string,
      incident_date: string,
      status: 'Draft' | 'Submitted',
      // ... other report fields
    }
  ]
}
```

---

## Dashboard Sections

### 1. Header
- Page title: "Dashboard"
- Subtitle: "Welcome back. Here is an overview of your incident reporting activity."

### 2. Stat Cards (3-column grid)
| Card | Icon | Color | Data Source |
|------|------|-------|-------------|
| Draft Reports | FilePlus | amber | `stats.draft_reports` |
| Submitted Reports | CheckCircle2 | police-blue | `stats.submitted_reports` |
| Reports This Month | CalendarDays | police-blue | `stats.reports_this_month` |

### 3. Reports Needing Attention (xl:col-span-2)
- Filters `recentReports` for `status === 'Draft'`
- Each item shows: report number, "Draft report awaiting completion"
- Action: "Continue Editing" button → navigates to `/officer/reports/:id/edit`
- Empty states: "No draft reports need attention" / "Loading your reports..."

### 4. My Workload (4-item grid)
| Metric | Source |
|--------|--------|
| Today | `stats.reports_today` |
| This Week | `stats.reports_this_week` |
| This Month | `stats.reports_this_month` |
| Drafts Remaining | `stats.draft_reports` |

### 5. Report Status Overview
- Component: `ReportStatusOverview`
- Calculates percentages via `calculateReportStatus()` utility
- Shows progress bars for Draft (amber) and Submitted (blue)
- Displays total count

### 6. Primary Actions (lg:grid-cols-[1.2fr_0.8fr])
| Action | Navigation |
|--------|------------|
| Create New Report | `/officer/reports/new` |
| BLUEWRITE AI Assistant | Informational card (links to AI features in report editor) |

### 7. Quick Actions
- Create Report → `/officer/reports/new`
- View My Reports → `/officer/reports`

### 8. Recent Reports Table
- Component: `ReportTable`
- Columns: Report #, Type, Incident Date, Status, Actions
- Actions per row: View, Edit (Draft only), Print
- "View All" link → `/officer/reports`

---

## State Management

### DashboardPage Local State
```javascript
const [live, setLive] = useState(null);           // Full API response
const [isLoading, setIsLoading] = useState(true); // Loading spinner
const [loadError, setLoadError] = useState('');   // Error message
```

### Derived State
```javascript
const recentReports = live?.recentReports || [];
const attentionReports = recentReports.filter(r => r.status === 'Draft');
const stats = live || { /* defaults all zeros */ };
const workload = hasReports ? { today, week, month, drafts } : zeros;
```

---

## Backend Integration

### Endpoint
```
GET /api/dashboard/officer
Headers: Cookie (session/auth)
Auth: requireAuth + requireRole('officer')
```

### Controller (`backend/src/controllers/dashboardController.js`)
```javascript
exports.officer = async (req, res) => {
  try {
    return success(res, await s.officer(req.user.officer.id));
  } catch {
    return error(res, 'Unable to load dashboard.', 500);
  }
};
```

### Service Query (`backend/src/services/dashboardService.js:2`)
```sql
SELECT 
  COUNT(*) total_reports,
  COALESCE(SUM(status='Draft'),0) draft_reports,
  COALESCE(SUM(status='Submitted'),0) submitted_reports,
  COALESCE(SUM(DATE(created_at)=CURRENT_DATE),0) reports_today,
  COALESCE(SUM(YEARWEEK(created_at,1)=YEARWEEK(CURRENT_DATE,1)),0) reports_this_week,
  COALESCE(SUM(YEAR(created_at)=YEAR(CURRENT_DATE) AND MONTH(created_at)=MONTH(CURRENT_DATE)),0) reports_this_month
FROM reports WHERE officer_id=?

SELECT * FROM reports WHERE officer_id=? ORDER BY created_at DESC LIMIT 4
```

---

## Navigation Routes from Dashboard

| Action | Route | Component |
|--------|-------|-----------|
| Create Report | `/officer/reports/new` | CreateReportPage |
| View Report | `/officer/reports/:id` | ViewReportPage |
| Edit Report | `/officer/reports/:id/edit` | EditReportPage |
| My Reports List | `/officer/reports` | MyReportsPage |
| Profile | `/officer/profile` | ProfilePage |
| Print Report | `/officer/reports/:id?print=true` | ViewReportPage (print mode) |

---

## Layout Wrapper (OfficerLayout)

Provides:
- **Sidebar**: Navigation sections (Workspace, Account)
- **Header**: Title, user menu, mobile menu toggle
- **Main**: Outlet for child routes
- **Responsive**: Collapsible sidebar, mobile drawer

**Nav Sections** (`OfficerLayout.jsx:11-18`):
```javascript
const officerNavSections = [
  { label: 'Workspace', items: [
    { to: '/officer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/officer/reports/new', label: 'Create Report', icon: FilePlus2 },
    { to: '/officer/reports', label: 'My Reports', icon: Files },
  ]},
  { label: 'Account', items: [{ to: '/officer/profile', label: 'Profile', icon: UserCircle }] },
];
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| API 401 | Redirect to `/login?expired=1` (api.js interceptor) |
| API 403 | Show permission error message |
| Load failure | `loadError` state → "Unable to load report status. Please try again." |
| Empty data | Default zero stats, "No draft reports need attention" |
| Loading | Skeleton/spinner via `isLoading` state |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/pages/officer/DashboardPage.jsx` | Main dashboard component |
| `frontend/src/services/dashboardService.js` | API client methods |
| `frontend/src/services/api.js` | Axios instance + interceptors |
| `backend/src/routes/dashboardRoutes.js` | Route definitions |
| `backend/src/controllers/dashboardController.js` | Request handlers |
| `backend/src/services/dashboardService.js` | Database queries |
| `frontend/src/components/layout/OfficerLayout.jsx` | Layout wrapper |
| `frontend/src/components/reports/ReportTable.jsx` | Reports table |
| `frontend/src/components/reports/ReportStatusOverview.jsx` | Status visualization |
| `frontend/src/components/common/StatCard.jsx` | Statistic cards |
| `frontend/src/utils/reportStatus.js` | Percentage calculations |
| `frontend/src/App.jsx` | Route configuration |

---

## Environment Configuration

**Frontend** (`frontend/.env.example`):
```
VITE_API_BASE_URL=http://localhost:3000/api
```

**Backend** (`backend/src/config/env.js`):
- Database connection via `db.js`
- Session/auth configuration