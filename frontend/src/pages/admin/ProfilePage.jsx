// BLUEWRITE — Admin ProfilePage
import React from 'react';
import { ShieldCheck, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import Badge from '../../components/common/Badge';
import { useAuthContext } from '../../context/AuthContext';
import ChangePasswordForm from '../../components/auth/ChangePasswordForm';
export default function ProfilePage(){const {user,changePassword}=useAuthContext();return <div className="space-y-6"><div><h2 className="text-2xl font-bold">My Profile</h2><p>View your administrator account details and manage your password.</p></div><div className="rounded-lg border bg-white p-6"><ShieldCheck/><h3>{user.username}</h3><Badge variant="admin">Administrator</Badge></div><div className="grid gap-6 lg:grid-cols-2"><div className="rounded-lg border bg-white p-6"><Mail/>Authenticated BLUEWRITE account: {user.username}<Phone/>Contact details are managed locally.<MapPin/>BLUEWRITE Administration</div><div className="rounded-lg border bg-white p-6"><Building2/>System Administration — Records Management</div></div><ChangePasswordForm minimumLength={16} onSubmit={changePassword}/></div>}