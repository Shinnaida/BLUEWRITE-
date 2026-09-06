// BLUEWRITE — App Component
// Defines the application routes with role-protected layouts.

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import PrivateRoute from './components/layout/PrivateRoute';
import AdminLayout from './components/layout/AdminLayout';
import OfficerLayout from './components/layout/OfficerLayout';
import LoginPage from './pages/auth/LoginPage';
import ForcePasswordChangePage from './pages/auth/ForcePasswordChangePage';
import EmailVerificationPage from './pages/auth/EmailVerificationPage';
import AdminSecurityReviewPage from './pages/auth/AdminSecurityReviewPage';
import OfficerDashboardPage from './pages/officer/DashboardPage';
import CreateReportPage from './pages/officer/CreateReportPage';
import EditReportPage from './pages/officer/EditReportPage';
import MyReportsPage from './pages/officer/MyReportsPage';
import ViewReportPage from './pages/officer/ViewReportPage';
import OfficerProfilePage from './pages/officer/ProfilePage';
import AdminDashboardPage from './pages/admin/DashboardPage';
import OfficersPage from './pages/admin/OfficersPage';
import AdminReportsPage from './pages/admin/ReportsPage';
import ActivityLogsPage from './pages/admin/ActivityLogsPage';
import AdminProfilePage from './pages/admin/ProfilePage';
import BackupsPage from './pages/admin/BackupsPage';
import { ROLES } from './utils/constants';

function AppRoutes() {
  const { user, isAuthenticated, isLoading } = useAuthContext();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isLoading ? null : isAuthenticated ? <Navigate to={user.securityReviewRequired?'/security-review':user.mustChangePassword?'/change-password':user.role === ROLES.ADMIN ? '/admin/dashboard' : '/officer/dashboard'} replace /> : <LoginPage />} />
      <Route path="/change-password" element={<ForcePasswordChangePage/>}/>
      <Route path="/verify-email" element={<EmailVerificationPage/>}/>
      <Route path="/security-review" element={<AdminSecurityReviewPage/>}/>

      {/* Officer routes (protected) */}
      <Route
        path="/officer"
        element={
          <PrivateRoute
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            allowedRoles={[ROLES.OFFICER]}
            requirePasswordChangeComplete
            user={user}
          >
            <OfficerLayout user={user} title="Dashboard" />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<OfficerDashboardPage />} />
        <Route path="reports" element={<MyReportsPage />} />
        <Route path="reports/new" element={<CreateReportPage />} />
        <Route path="reports/:id" element={<ViewReportPage />} />
        <Route path="reports/:id/edit" element={<EditReportPage />} />
        <Route path="profile" element={<OfficerProfilePage />} />
      </Route>

      {/* Admin routes (protected) */}
      <Route
        path="/admin"
        element={
          <PrivateRoute
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            allowedRoles={[ROLES.ADMIN]}
            requirePasswordChangeComplete
            user={user}
          >
            <AdminLayout user={user} title="Admin Dashboard" />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="officers" element={<OfficersPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="reports/:id" element={<ViewReportPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
        <Route path="backups" element={<BackupsPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
      </Route>

      {/* Defaults */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;