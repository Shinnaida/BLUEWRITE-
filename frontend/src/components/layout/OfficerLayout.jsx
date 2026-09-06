// BLUEWRITE — OfficerLayout Component
// Responsive layout for officer pages with sidebar navigation and header.

import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthContext } from '../../context/AuthContext';
import { getReports } from '../../services/reportService';

const REPORT_HISTORY_LIMIT = 15;

const HISTORY_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'az', label: 'A–Z' },
  { value: 'za', label: 'Z–A' },
];

const sortHistory = (rows, sortKey) => {
  const sorted = [...rows];
  if (sortKey === 'oldest') sorted.reverse();
  if (sortKey === 'az') sorted.sort((a, b) => a.label.localeCompare(b.label));
  if (sortKey === 'za') sorted.sort((a, b) => b.label.localeCompare(a.label));
  return sorted;
};

const officerNavSections = [
  { label: 'Workspace', items: [
    { to: '/officer/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/officer/reports/new', label: 'Create Report', icon: FilePlus2, activeKey: 'create-report' },
  ] },
];

function OfficerLayout({ title = 'Dashboard' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reportChildren, setReportChildren] = useState([]);
  const [historySort, setHistorySort] = useState('newest');
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Refresh the sidebar report history whenever navigation happens or a new
  // report is created/updated — like ChatGPT's chat history list.
  useEffect(() => {
    let cancelled = false;
    getReports({ sort: 'newest', limit: REPORT_HISTORY_LIMIT })
      .then((r) => {
        if (cancelled) return;
        const rows = r.data?.data || [];
        setReportChildren(rows.map((report) => ({
          to: `/officer/reports/${report.id}`,
          label: report.title || report.report_number || 'Untitled report',
          status: report.status,
        })));
      })
      .catch(() => {
        if (!cancelled) setReportChildren([]);
      });
    return () => { cancelled = true; };
  }, [pathname]);

  const handleLogout = async () => { try { await logout(); } finally { navigate('/login', { replace: true }); } };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        navSections={officerNavSections}
        historySection={{
          label: 'My Reports',
          items: sortHistory(reportChildren, historySort),
          sort: { value: historySort, options: HISTORY_SORT_OPTIONS, onChange: setHistorySort },
          viewAll: { to: '/officer/reports', label: 'View all reports' },
        }}
        user={user}
        profileTo="/officer/profile"
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        workspaceLabel="Officer Workspace"
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          section="Officer"
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default OfficerLayout;