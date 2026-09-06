import React from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck, CheckCircle2, Circle } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';

function PasswordStrengthMeter({ strength, label }) {
  const segmentColors = {
    0: 'bg-slate-200',
    1: 'bg-red-500',
    2: 'bg-amber-500',
    3: 'bg-blue-500',
    4: 'bg-emerald-500',
  };
  const labelColors = {
    0: 'text-slate-500',
    1: 'text-red-600',
    2: 'text-amber-600',
    3: 'text-blue-600',
    4: 'text-emerald-600',
  };

  return (
    <div className="space-y-1.5" role="status" aria-live="polite" aria-label={`Password strength: ${label}`}>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded transition-colors duration-200 ${
              i <= strength ? segmentColors[strength] : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${labelColors[strength]}`}>{label}</p>
    </div>
  );
}

function RequirementRow({ met, text, testId }) {
  return (
    <div
      className={`flex items-center gap-2 text-sm transition-colors duration-150 ${
        met ? 'text-emerald-700' : 'text-slate-500'
      }`}
      data-testid={testId}
    >
      {met ? (
        <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
      ) : (
        <Circle size={16} className="text-slate-300 flex-shrink-0" aria-hidden="true" />
      )}
      <span>{text}</span>
    </div>
  );
}

function calculateStrength(password, username, badgeNumber) {
  if (!password) return { score: 0, label: 'Very weak', requirements: {} };

  const reqs = {
    length: password.length >= 12,
    letter: /[a-zA-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
    noPersonal: !(
      (username && password.toLowerCase().includes(username.toLowerCase())) ||
      (badgeNumber && password.includes(badgeNumber))
    ),
  };

  const metCount = Object.values(reqs).filter(Boolean).length;
  let score = metCount;

  if (password.length >= 16) score += 1;
  if (password.length >= 20) score += 1;

  score = Math.min(score, 4);

  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return { score, label: labels[score], requirements: reqs };
}

export default function ChangePasswordForm({ onSubmit, forced = false, minimumLength = 12, user }) {
  const [values, setValues] = React.useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [visible, setVisible] = React.useState({ current: false, next: false, confirm: false });
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [confirmTouched, setConfirmTouched] = React.useState(false);

  const username = user?.username || user?.badgeNumber || '';
  const badgeNumber = user?.badgeNumber || '';

  const { score, label, requirements } = calculateStrength(values.newPassword, username, badgeNumber);
  const passwordsMatch = values.newPassword === values.confirmPassword || values.confirmPassword === '';
  const showMismatch = confirmTouched && values.confirmPassword && !passwordsMatch;

  const change = (event) => {
    console.log('change:', event.target.name, event.target.value);
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
    setMessage('');
    setSuccess(false);
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    setValues((current) => ({ ...current, [event.target.name]: pastedText }));
    setMessage('');
    setSuccess(false);
  };

  const field = (name, label, key, autoComplete) => (
    <div className="relative">
      <Input
        name={name}
        label={label}
        type={visible[key] ? 'text' : 'password'}
        value={values[name]}
        onChange={change}
        onPaste={handlePaste}
        required
        disabled={submitting}
        autoComplete={autoComplete}
        className="[&_input]:pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => ({ ...current, [key]: !current[key] }))}
        className="absolute right-3 top-[38px] rounded p-1 text-slate-500 hover:text-slate-900"
        aria-label={`${visible[key] ? 'Hide' : 'Show'} ${label}`}
      >
        {visible[key] ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSuccess(false);
    if (values.newPassword !== values.confirmPassword) {
      setMessage('New password and confirmation do not match.');
      return;
    }
    console.log('Submitting changePassword with:', { 
      currentPassword: values.currentPassword, 
      newPassword: values.newPassword,
      currentPasswordLength: values.currentPassword.length,
      newPasswordLength: values.newPassword.length
    });
    setSubmitting(true);
    try {
      await onSubmit(values);
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess(true);
      setMessage('Password changed successfully.');
    } catch (error) {
      console.error('changePassword error:', error.response?.data, error.response?.status);
      const response = error.response?.data;
      setMessage(Array.isArray(response?.errors) ? response.errors.join(' ') : (response?.message || 'Unable to change password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
          {forced ? <ShieldCheck size={22} /> : <KeyRound size={22} />}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-950">{forced ? 'Create Your Permanent Password' : 'Change Password'}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {forced
              ? 'Your temporary password must be replaced before you can access BLUEWRITE.'
              : 'Verify your current password before choosing a new one.'}
          </p>
        </div>
      </div>

      {field('currentPassword', forced ? 'Current / Temporary Password' : 'Current Password', 'current', 'current-password')}
      {field('newPassword', 'New Password', 'next', 'new-password')}

      <div className="space-y-3 pt-1">
        <PasswordStrengthMeter strength={score} label={label} />

        <div className="space-y-2" role="list" aria-label="Password requirements">
          <RequirementRow met={requirements.length} text={`At least ${minimumLength} characters`} testId="req-length" />
          <RequirementRow met={requirements.letter} text="Contains a letter" testId="req-letter" />
          <RequirementRow met={requirements.number} text="Contains a number" testId="req-number" />
          <RequirementRow met={requirements.special} text="Contains a special character" testId="req-special" />
          <RequirementRow
            met={requirements.noPersonal}
            text="Does not contain your username or badge number"
            testId="req-personal"
          />
        </div>
      </div>

      <div
        onBlur={() => setConfirmTouched(true)}
        className="relative"
      >
        <Input
          name="confirmPassword"
          label="Confirm New Password"
          type={visible.confirm ? 'text' : 'password'}
          value={values.confirmPassword}
          onChange={change}
          required
          disabled={submitting}
          autoComplete="new-password"
          className="[&_input]:pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => ({ ...current, confirm: !current.confirm }))}
          className="absolute right-3 top-[38px] rounded p-1 text-slate-500 hover:text-slate-900"
          aria-label={`${visible.confirm ? 'Hide' : 'Show'} Confirm New Password`}
        >
          {visible.confirm ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {showMismatch && (
        <p className="text-xs text-red-600" role="alert">Passwords don't match</p>
      )}

      {message && (
        <p
          role={success ? 'status' : 'alert'}
          className={`rounded-lg border p-3 text-sm font-semibold ${
            success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Changing Password...' : 'Change Password'}
      </Button>
    </form>
  );
}