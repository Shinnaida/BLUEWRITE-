import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import BrandMark from '../../components/common/BrandMark';
import ChangePasswordForm from '../../components/auth/ChangePasswordForm';
import { useAuthContext } from '../../context/AuthContext';

export default function ForcePasswordChangePage(){
  const {user,isAuthenticated,isLoading,changePassword}=useAuthContext();
  const navigate=useNavigate();
  if(isLoading)return null;
  if(!isAuthenticated)return <Navigate to="/login" replace/>;
  if(!user.mustChangePassword)return <Navigate to={user.role==='admin'?'/admin/dashboard':'/officer/dashboard'} replace/>;
  return <main className="flex min-h-screen items-center justify-center bg-[#020817] p-5"><div className="w-full max-w-xl"><div className="mb-6 flex justify-center"><BrandMark size="lg" variant="dark"/></div><ChangePasswordForm forced minimumLength={user.role==='admin'?16:12} user={user} onSubmit={async(values)=>{const updated=await changePassword(values);navigate(updated.role==='admin'?'/admin/dashboard':'/officer/dashboard',{replace:true});}}/></div></main>;
}