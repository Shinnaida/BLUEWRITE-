import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';

const initialValues = {
  username: '', status: 'Active',
  badge_number: '', first_name: '', middle_name: '', last_name: '',
  rank: '', unit: '', department: '', email: '', phone: '',
};

function validate(values) {
  const errors = {};
  if (!values.username.trim()) errors.username = 'Username is required.';
  else if (values.username.trim().length < 3) errors.username = 'Username must be at least 3 characters.';
  else if (!/^[a-zA-Z0-9._-]+$/.test(values.username.trim())) errors.username = 'Use only letters, numbers, periods, underscores, and hyphens.';
  if (!values.badge_number.trim()) errors.badge_number = 'Badge number is required.';
  if (!values.first_name.trim()) errors.first_name = 'First name is required.';
  if (!values.last_name.trim()) errors.last_name = 'Last name is required.';
  if (!values.email.trim()) errors.email = 'Email is required for login verification.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  return errors;
}

export default function AddOfficerModal({ isOpen, onClose, onCreate }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  if (!isOpen) return null;

  const change = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: name === 'username' ? value.toLowerCase() : value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };
  const close = () => {
    if (submitting) return;
    setValues(initialValues); setErrors({}); onClose();
  };
  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    setSubmitting(true); setErrors({});
    try {
      await onCreate({ ...values, username: values.username.trim() });
      setValues(initialValues);
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to create Officer account.';
      if (message.toLowerCase().includes('username')) setErrors({ username: message });
      else if (message.toLowerCase().includes('badge')) setErrors({ badge_number: message });
      else if (message.toLowerCase().includes('email')) setErrors({ email: message });
      else setErrors({ form: message });
    } finally { setSubmitting(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-officer-title">
    <button type="button" className="absolute inset-0 cursor-default bg-slate-950/60" onClick={close} aria-label="Close Add Officer form" />
    <form onSubmit={submit} className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div><h2 id="add-officer-title" className="text-xl font-bold text-slate-950">Add Officer</h2><p className="text-sm text-slate-600">Create an Officer profile and BLUEWRITE login account.</p></div>
        <button type="button" onClick={close} disabled={submitting} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={20}/></button>
      </div>
      <div className="space-y-7 p-6">
        {errors.form && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{errors.form}</p>}
        <section><h3 className="mb-4 border-b border-slate-200 pb-2 text-base font-bold text-slate-900">Account Information</h3><div className="grid gap-4 sm:grid-cols-2">
          <Input name="username" label="Username" value={values.username} onChange={change} error={errors.username} required disabled={submitting} maxLength={100} autoComplete="off" />
          <div><label htmlFor="status" className="mb-1.5 block text-sm font-semibold text-slate-800">Account Status <span className="text-red-500">*</span></label><select id="status" name="status" value={values.status} onChange={change} disabled={submitting} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-police-blue-600 focus:outline-none focus:ring-2 focus:ring-police-blue-600/20"><option>Active</option><option>Disabled</option></select></div>
          <div className="sm:col-span-2 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><KeyRound size={20} className="shrink-0"/><p>BLUEWRITE will generate a strong temporary password. It will be shown once after account creation and must be changed by the Officer at first login.</p></div>
        </div></section>
        <section><h3 className="mb-4 border-b border-slate-200 pb-2 text-base font-bold text-slate-900">Officer Information</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input name="badge_number" label="Badge Number" value={values.badge_number} onChange={change} error={errors.badge_number} required disabled={submitting} maxLength={30}/>
          <Input name="first_name" label="First Name" value={values.first_name} onChange={change} error={errors.first_name} required disabled={submitting} maxLength={100}/>
          <Input name="middle_name" label="Middle Name" value={values.middle_name} onChange={change} disabled={submitting} maxLength={100}/>
          <Input name="last_name" label="Last Name" value={values.last_name} onChange={change} error={errors.last_name} required disabled={submitting} maxLength={100}/>
          <Input name="rank" label="Rank" value={values.rank} onChange={change} disabled={submitting} maxLength={100}/>
          <Input name="unit" label="Unit" value={values.unit} onChange={change} disabled={submitting} maxLength={150}/>
          <Input name="department" label="Department" value={values.department} onChange={change} disabled={submitting} maxLength={150}/>
          <Input name="email" label="Email" type="email" value={values.email} onChange={change} error={errors.email} required disabled={submitting} maxLength={255}/>
          <Input name="phone" label="Contact Number" type="tel" value={values.phone} onChange={change} disabled={submitting} maxLength={50}/>
        </div></section>
      </div>
      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4"><Button type="button" variant="secondary" onClick={close} disabled={submitting}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Officer'}</Button></div>
    </form>
  </div>;
}