// BLUEWRITE — AdminLayout Component
// Responsive layout for admin pages with sidebar navigation and header.

import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, ScrollText, DatabaseBackup } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthContext } from '../../context/AuthContext';

const adminNavSections = [
  { label: 'Overview', items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  { label: 'Management', items: [
    { to: '/admin/officers', label: 'Officers', icon: Users },
    { to: '/admin/reports', label: 'Reports', icon: FileText, activeKey: 'admin-reports' },
  ] },
  { label: 'Monitoring', items: [
    { to: '/admin/activity-logs', label: 'Activity Logs', icon: ScrollText },
    { to: '/admin/backups', label: 'Backups', icon: DatabaseBackup },
  ] },
];

function AdminLayout({ title = 'Admin Dashboard' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const handleLogout = async () => { try { await logout(); } finally { navigate('/login', { replace: true }); } };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        navSections={adminNavSections}
        user={user}
        profileTo="/admin/profile"
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        workspaceLabel="Administrator Workspace"
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          section="Admin"
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

export default AdminLayout;