// BLUEWRITE — Application Constants

// User roles
export const ROLES = {
  ADMIN: 'admin',
  OFFICER: 'officer',
};

// User statuses
export const USER_STATUSES = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
};

// Report statuses (only two — no approval workflow)
export const REPORT_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
};

// Report status options for selects
export const REPORT_STATUS_OPTIONS = [
  { value: REPORT_STATUSES.DRAFT, label: 'Draft' },
  { value: REPORT_STATUSES.SUBMITTED, label: 'Submitted' },
];

// User status options for selects
export const USER_STATUS_OPTIONS = [
  { value: USER_STATUSES.ACTIVE, label: 'Active' },
  { value: USER_STATUSES.DISABLED, label: 'Disabled' },
  { value: 'locked', label: 'Locked' },
];

// Incident type options
export const INCIDENT_TYPE_OPTIONS = [
  { value: 'theft', label: 'Theft' },
  { value: 'assault', label: 'Assault' },
  { value: 'burglary', label: 'Burglary' },
  { value: 'traffic', label: 'Traffic Incident' },
  { value: 'vandalism', label: 'Vandalism' },
  { value: 'disturbance', label: 'Disturbance' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'other', label: 'Other' },
];

// Map a raw incident_type value (single slug or comma-separated slugs like
// "theft,assault"; "other:etail" is a custom Other type) to display labels.
// Unknown slugs pass through as-is.
export function formatIncidentTypes(value) {
  if (!value) return '';
  return String(value)
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean)
    .map((slug) => {
      if (slug.startsWith('other:')) {
        const custom = slug.slice(6).trim();
        return custom ? `Other (${custom})` : 'Other';
      }
      return INCIDENT_TYPE_OPTIONS.find((o) => o.value === slug)?.label || slug;
    })
    .join(', ');
}

// Product branding
export const PRODUCT_NAME = 'BLUEWRITE';
export const PRODUCT_TITLE =
  'BLUEWRITE: AN AI-ASSISTED REAL-TIME POLICE INCIDENT REPORT GENERATION SYSTEM';
export const APP_SUBTITLE = 'AI-Assisted Police Reporting System';
export const SIDEBAR_SUBTITLE = 'Police Reporting System';
export const AI_ASSISTANT_NAME = 'BLUEWRITE AI Assistant';
export const AI_ASSISTANT_SUBTITLE = 'Your Intelligent Police Report Writing Assistant';
export const AI_ASSISTANT_NOTICE =
  'The AI provides writing assistance and suggestions only. The reporting officer remains responsible for the final report.';