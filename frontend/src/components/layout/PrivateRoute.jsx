import React from 'react';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
function PrivateRoute({ isAuthenticated=false, isLoading=false, allowedRoles=[], user=null, requirePasswordChangeComplete=false, children }) {
  if(isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><LoadingSpinner text="Restoring your BLUEWRITE session..." /></div>;
  if(!isAuthenticated) return <Navigate to="/login" replace />;
  if(user?.securityReviewRequired)return <Navigate to="/security-review" replace/>;
  if(requirePasswordChangeComplete&&user?.mustChangePassword)return <Navigate to="/change-password" replace/>;
  if(allowedRoles.length>0&&(!user||!allowedRoles.includes(user.role))) return <Navigate to={user?.role==='admin'?'/admin/dashboard':'/officer/dashboard'} replace />;
  return children;
}
export default PrivateRoute;