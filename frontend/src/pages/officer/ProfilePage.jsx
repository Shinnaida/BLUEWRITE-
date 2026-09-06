// BLUEWRITE — Officer ProfilePage
import React from 'react';
import { UserCircle, Mail, Shield, MapPin, Phone, BadgeCheck, Building2 } from 'lucide-react';
import Badge from '../../components/common/Badge';
import { useAuthContext } from '../../context/AuthContext';
import ChangePasswordForm from '../../components/auth/ChangePasswordForm';

function ProfilePage() {
  const { user, changePassword } = useAuthContext();
  const officer = user.officer;
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold text-slate-950">My Profile</h2><p className="text-sm text-slate-600">View your account details and manage your password.</p></div><div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-4"><UserCircle size={36}/><div><h3 className="text-xl font-semibold">{officer.firstName} {officer.lastName}</h3><p className="text-sm">Badge: {officer.badgeNumber}</p></div><Badge variant="officer">Officer</Badge></div></div><div className="grid gap-6 lg:grid-cols-2"><div className="rounded-lg border bg-white p-6"><Mail size={18}/><span>Account: {user.username}</span><Phone size={18}/><span>Contact details are managed by an Administrator.</span><MapPin size={18}/><span>{officer.unit || 'Unassigned unit'}</span></div><div className="rounded-lg border bg-white p-6"><Building2 size={18}/><span>{officer.unit || 'Police Department'}</span><BadgeCheck size={18}/><span>Badge Number: {officer.badgeNumber}</span><Shield size={18}/><span>{officer.rank || 'Officer'}</span></div></div><ChangePasswordForm onSubmit={changePassword}/></div>;
}
export default ProfilePage;