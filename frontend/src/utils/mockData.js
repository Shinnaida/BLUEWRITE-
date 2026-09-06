// BLUEWRITE — Mock Data
// Realistic fictional placeholder data for UI demonstration (Phase 1.3).
// This data is for display only. It is NOT connected to the backend.

// Current demo user
export const mockCurrentOfficer = {
  id: 1,
  first_name: 'Marcus',
  last_name: 'Reyes',
  email: 'marcus.reyes@police.gov',
  badge_number: 'BW-1042',
  role: 'officer',
  status: 'active',
};

export const mockCurrentAdmin = {
  id: 1,
  first_name: 'Diana',
  last_name: 'Cruz',
  email: 'diana.cruz@police.gov',
  badge_number: 'BW-0001',
  role: 'admin',
  status: 'active',
};

// Incident reports (officer view)
export const mockReports = [
  {
    id: 1,
    report_number: 'BW-2026-0001',
    title: 'Retail Store Theft',
    incident_type: 'Theft',
    incident_date: '2026-08-10T14:30:00',
    location: '123 Main Street, Downtown',
    status: 'submitted',
    officer_name: 'Marcus Reyes',
    badge_number: 'BW-1042',
    summary:
      'Suspect allegedly removed merchandise from a retail store without payment and fled on foot.',
    narrative:
      'On August 10, 2026 at approximately 2:30 PM, I responded to a reported theft at 123 Main Street. The complainant stated that an unknown male subject removed several items of merchandise and left the store without paying. The suspect was last seen heading east on Main Street. Store security footage was secured for review.',
  },
  {
    id: 2,
    report_number: 'BW-2026-0002',
    title: 'Traffic Collision - Two Vehicles',
    incident_type: 'Traffic Incident',
    incident_date: '2026-08-12T09:15:00',
    location: 'Intersection of 5th Ave & Oak St',
    status: 'draft',
    officer_name: 'Marcus Reyes',
    badge_number: 'BW-1042',
    summary: 'Two-vehicle collision at a controlled intersection. No injuries reported.',
    narrative:
      'On August 12, 2026 at approximately 9:15 AM, I was dispatched to a two-vehicle collision at the intersection of 5th Avenue and Oak Street. Both drivers were present and no injuries were reported. Damage was limited to the vehicles involved.',
  },
  {
    id: 3,
    report_number: 'BW-2026-0003',
    title: 'Residential Burglary',
    incident_type: 'Burglary',
    incident_date: '2026-08-08T22:40:00',
    location: '45 Cedar Lane, North District',
    status: 'submitted',
    officer_name: 'Marcus Reyes',
    badge_number: 'BW-1042',
    summary:
      'Forced entry into a residence. Several items reported missing by the homeowner.',
    narrative:
      'On August 8, 2026 at approximately 10:40 PM, I responded to a burglary report at 45 Cedar Lane. The homeowner reported that the rear door had been forced open and several electronic items were missing. A crime scene unit was requested to process the scene.',
  },
  {
    id: 4,
    report_number: 'BW-2026-0004',
    title: 'Public Disturbance',
    incident_type: 'Disturbance',
    incident_date: '2026-08-14T18:05:00',
    location: 'Riverside Park',
    status: 'draft',
    officer_name: 'Marcus Reyes',
    badge_number: 'BW-1042',
    summary: 'Loud noise complaint at a public park after hours.',
    narrative:
      'On August 14, 2026 at approximately 6:05 PM, I responded to a noise complaint at Riverside Park. A group was observed playing loud music. The group was advised of the park noise ordinance and complied.',
  },
  {
    id: 5,
    report_number: 'BW-2026-0005',
    title: 'Vandalism - Public Property',
    incident_type: 'Vandalism',
    incident_date: '2026-08-15T07:50:00',
    location: 'City Hall Plaza',
    status: 'draft',
    officer_name: 'Marcus Reyes',
    badge_number: 'BW-1042',
    summary: 'Graffiti discovered on public building exterior.',
    narrative:
      'On August 15, 2026 at approximately 7:50 AM, I observed graffiti on the exterior wall of City Hall Plaza. Photographs were taken and facilities management was notified for removal.',
  },
];

// All reports (admin view — includes other officers)
export const mockAllReports = [
  ...mockReports,
  {
    id: 6,
    report_number: 'BW-2026-0006',
    title: 'Suspicious Person',
    incident_type: 'Other',
    incident_date: '2026-08-13T23:20:00',
    location: 'Maple Street Parking Garage',
    status: 'submitted',
    officer_name: 'Alicia Grant',
    badge_number: 'BW-1087',
    summary: 'Report of a suspicious individual in a parking garage.',
    narrative:
      'On August 13, 2026 at approximately 11:20 PM, I responded to a report of a suspicious person at the Maple Street Parking Garage. The individual was identified and no criminal activity was observed.',
  },
  {
    id: 7,
    report_number: 'BW-2026-0007',
    title: 'Fraud Report',
    incident_type: 'Fraud',
    incident_date: '2026-08-11T13:10:00',
    location: '88 Commerce Drive',
    status: 'submitted',
    officer_name: 'James Okafor',
    badge_number: 'BW-1103',
    summary: 'Report of an online purchase scam.',
    narrative:
      'On August 11, 2026 at approximately 1:10 PM, I took a fraud report at 88 Commerce Drive. The complainant stated they paid for goods online that were never delivered. Evidence was collected for follow-up investigation.',
  },
];

// Officers (admin view)
export const mockOfficers = [
  {
    id: 1,
    badge_number: 'BW-1042',
    first_name: 'Marcus',
    last_name: 'Reyes',
    email: 'marcus.reyes@police.gov',
    status: 'active',
  },
  {
    id: 2,
    badge_number: 'BW-1087',
    first_name: 'Alicia',
    last_name: 'Grant',
    email: 'alicia.grant@police.gov',
    status: 'active',
  },
  {
    id: 3,
    badge_number: 'BW-1103',
    first_name: 'James',
    last_name: 'Okafor',
    email: 'james.okafor@police.gov',
    status: 'active',
  },
  {
    id: 4,
    badge_number: 'BW-1156',
    first_name: 'Sofia',
    last_name: 'Mendez',
    email: 'sofia.mendez@police.gov',
    status: 'disabled',
  },
  {
    id: 5,
    badge_number: 'BW-1189',
    first_name: 'Daniel',
    last_name: 'Kim',
    email: 'daniel.kim@police.gov',
    status: 'active',
  },
];

// Activity logs (admin view)
export const mockActivityLogs = [
  { id: 'SEC-0005', actorId: 'BW-1042', actorName: 'Marcus Reyes', actorRole: 'Officer', action: 'Login Successful', targetType: 'Security', targetId: 'DEMO-SESSION', description: 'Officer demo access session started successfully.', timestamp: '2026-08-21T09:02:00', metadata: { outcome: 'Success', source: 'Mock security record' } },
  { id: 'SEC-0004', actorId: 'BW-1156', actorName: 'Sofia Mendez', actorRole: 'Officer', action: 'Disabled Account Login Blocked', targetType: 'Security', targetId: 'BW-1156', description: 'A fictional access attempt for a disabled Officer account was blocked.', timestamp: '2026-08-21T08:57:00', metadata: { outcome: 'Blocked', source: 'Mock security record' } },
  { id: 'SEC-0003', actorId: 'UNKNOWN', actorName: 'Unknown User', actorRole: 'Unknown', action: 'Repeated Login Attempts Detected', targetType: 'Security', targetId: 'AUTH-DEMO', description: 'Multiple fictional unsuccessful access attempts were detected for administrative review.', timestamp: '2026-08-21T08:54:00', metadata: { outcome: 'Review Required', attemptCount: 3, source: 'Mock security record' } },
  { id: 'SEC-0002', actorId: 'BW-1087', actorName: 'Alicia Grant', actorRole: 'Officer', action: 'Failed Login Attempt', targetType: 'Security', targetId: 'BW-1087', description: 'A fictional unsuccessful login attempt was recorded. No credential content is stored.', timestamp: '2026-08-21T08:50:00', metadata: { outcome: 'Failed', source: 'Mock security record' } },
  { id: 'SEC-0001', actorId: 'BW-1103', actorName: 'James Okafor', actorRole: 'Officer', action: 'Session Expired', targetType: 'Security', targetId: 'DEMO-SESSION', description: 'A fictional inactive session expired and required the user to sign in again.', timestamp: '2026-08-21T08:46:00', metadata: { outcome: 'Expired', source: 'Mock security record' } },
  {
    id: 'LOG-0012', actorId: 'BW-1042', actorName: 'Marcus Reyes', actorRole: 'Officer', action: 'Report Submitted', targetType: 'Report', targetId: 'BW-2026-0001', description: 'Submitted incident report BW-2026-0001.', timestamp: '2026-08-21T08:42:00', metadata: { reportStatus: 'Submitted' },
  },
  {
    id: 'LOG-0011', actorId: 'BW-1087', actorName: 'Alicia Grant', actorRole: 'Officer', action: 'Report Edited', targetType: 'Report', targetId: 'BW-2026-0006', description: 'Updated incident report BW-2026-0006.', timestamp: '2026-08-21T08:21:00', metadata: { reportStatus: 'Submitted' },
  },
  {
    id: 'LOG-0010', actorId: 'BW-0001', actorName: 'Diana Cruz', actorRole: 'Administrator', action: 'Officer Enabled', targetType: 'Officer', targetId: 'BW-1156', targetName: 'Sofia Mendez', description: 'Restored Officer Sofia Mendez to active status.', timestamp: '2026-08-21T08:04:00',
  },
  {
    id: 'LOG-0009', actorId: 'BW-1103', actorName: 'James Okafor', actorRole: 'Officer', action: 'Report Printed', targetType: 'Report', targetId: 'BW-2026-0007', description: 'Printed incident report BW-2026-0007.', timestamp: '2026-08-21T07:49:00',
  },
  {
    id: 'LOG-0008', actorId: 'BW-1042', actorName: 'Marcus Reyes', actorRole: 'Officer', action: 'Draft Saved', targetType: 'Report', targetId: 'BW-2026-0002', description: 'Saved draft incident report BW-2026-0002.', timestamp: '2026-08-20T16:10:00', metadata: { reportStatus: 'Draft' },
  },
  {
    id: 'LOG-0007', actorId: 'BW-1042', actorName: 'Marcus Reyes', actorRole: 'Officer', action: 'Report Viewed', targetType: 'Report', targetId: 'BW-2026-0003', description: 'Viewed incident report BW-2026-0003.', timestamp: '2026-08-20T14:05:00',
  },
  { id: 'LOG-0006', actorId: 'BW-0001', actorName: 'Diana Cruz', actorRole: 'Administrator', action: 'Officer Disabled', targetType: 'Officer', targetId: 'BW-1156', targetName: 'Sofia Mendez', description: 'Disabled Officer Sofia Mendez.', timestamp: '2026-08-20T11:30:00' },
  { id: 'LOG-0005', actorId: 'BW-1087', actorName: 'Alicia Grant', actorRole: 'Officer', action: 'Officer Profile Updated', targetType: 'Officer', targetId: 'BW-1087', targetName: 'Alicia Grant', description: 'Updated Officer profile information.', timestamp: '2026-08-20T10:18:00' },
  { id: 'LOG-0004', actorId: 'BW-1042', actorName: 'Marcus Reyes', actorRole: 'Officer', action: 'Report Created', targetType: 'Report', targetId: 'BW-2026-0005', description: 'Created incident report BW-2026-0005.', timestamp: '2026-08-20T07:58:00', metadata: { reportStatus: 'Draft' } },
  { id: 'LOG-0003', actorId: 'BW-0001', actorName: 'Diana Cruz', actorRole: 'Administrator', action: 'Administrator Viewed Report', targetType: 'Report', targetId: 'BW-2026-0007', description: 'Viewed incident report BW-2026-0007.', timestamp: '2026-08-19T15:45:00' },
  { id: 'LOG-0002', actorId: 'BW-1103', actorName: 'James Okafor', actorRole: 'Officer', action: 'Report Submitted', targetType: 'Report', targetId: 'BW-2026-0007', description: 'Submitted incident report BW-2026-0007.', timestamp: '2026-08-19T14:36:00', metadata: { reportStatus: 'Submitted' } },
  { id: 'LOG-0001', actorId: 'BW-0001', actorName: 'Diana Cruz', actorRole: 'Administrator', action: 'Administrator Viewed Officer Profile', targetType: 'Officer', targetId: 'BW-1042', targetName: 'Marcus Reyes', description: 'Viewed Officer Marcus Reyes profile.', timestamp: '2026-08-19T09:12:00' },
];

// Officer dashboard stats
export const mockOfficerStats = {
  draft_reports: 3,
  submitted_reports: 2,
  reports_this_month: 5,
};

// Admin dashboard stats
export const mockAdminStats = {
  total_reports: 7,
  draft_reports: 3,
  submitted_reports: 4,
  active_officers: 4,
};

// Reports by incident type (admin dashboard)
export const mockReportsByType = [
  { type: 'Theft', count: 1 },
  { type: 'Traffic Incident', count: 1 },
  { type: 'Burglary', count: 1 },
  { type: 'Disturbance', count: 1 },
  { type: 'Vandalism', count: 1 },
  { type: 'Fraud', count: 1 },
  { type: 'Other', count: 1 },
];

// Monthly reports (admin dashboard)
export const mockMonthlyReports = [
  { month: 'Mar', count: 3 },
  { month: 'Apr', count: 5 },
  { month: 'May', count: 4 },
  { month: 'Jun', count: 7 },
  { month: 'Jul', count: 6 },
  { month: 'Aug', count: 7 },
];

// AI placeholder analysis
export const mockAIAnalysis = {
  readiness: 92,
  grammar: { score: 95, label: 'Excellent' },
  completeness: { score: 78, label: 'Needs Attention' },
  suggestions: [
    'Add witness information if available.',
    'Specify the exact location.',
    'Include additional incident details if available.',
  ],
};

// Officer dashboard supporting panels (static UI-only demo data)
export const mockOfficerAttention = [
  { id: 1, report_number: 'BW-2026-0002', issue: 'Missing witness information', last_edited: 'Today, 09:24' },
  { id: 2, report_number: 'BW-2026-0004', issue: 'Incident narrative incomplete', last_edited: 'Yesterday, 16:10' },
  { id: 3, report_number: 'BW-2026-0005', issue: 'Location details need review', last_edited: 'Aug 15, 07:58' },
];

export const mockOfficerActivity = [
  { id: 1, action: 'Created report', report_number: 'BW-2026-0005', time: 'Today, 07:58', icon: 'create' },
  { id: 2, action: 'Edited report', report_number: 'BW-2026-0002', time: 'Yesterday, 16:10', icon: 'edit' },
  { id: 3, action: 'Submitted report', report_number: 'BW-2026-0001', time: 'Aug 15, 09:30', icon: 'submit' },
  { id: 4, action: 'Viewed report', report_number: 'BW-2026-0003', time: 'Aug 14, 14:05', icon: 'view' },
];

export const mockOfficerWorkload = {
  today: 2,
  week: 7,
  month: 18,
  drafts_remaining: 3,
};

// Admin dashboard supporting panels (static UI-only demo data)
export const mockOfficerStatus = { total: 5, active: 4, disabled: 1 };

export const mockTopReportingOfficers = [
  { name: 'Marcus Reyes', badge: 'BW-1042', reports: 14 },
  { name: 'Alicia Grant', badge: 'BW-1087', reports: 11 },
  { name: 'James Okafor', badge: 'BW-1103', reports: 9 },
];

export const mockRecentOfficerAccounts = [
  { name: 'Sofia Mendez', badge: 'BW-1156', unit: 'North District', status: 'disabled', updated: 'Aug 15, 08:55' },
  { name: 'Daniel Kim', badge: 'BW-1189', unit: 'Central Patrol', status: 'active', updated: 'Aug 14, 11:20' },
  { name: 'Alicia Grant', badge: 'BW-1087', unit: 'Investigations', status: 'active', updated: 'Aug 12, 15:40' },
];