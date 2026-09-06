import React from 'react';
import { Shield, LogOut, RefreshCw } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { useAuthContext } from '../../context/AuthContext';
import * as authService from '../../services/authService';

function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  // Show first char, 3 dots, last char for readability
  const maskedLocal = local.length > 4
    ? local[0] + '•••' + local[local.length - 1]
    : local.length > 2
      ? local[0] + '•'.repeat(local.length - 2) + local[local.length - 1]
      : '••';
  return `${maskedLocal}@${domain}`;
}

function OTPInput({ value, onChange, onComplete, disabled, error, autoFocus, autoSubmit }) {
  const inputsRef = React.useRef([]);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);

  React.useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  React.useEffect(() => {
    if (autoSubmit && onComplete && value.every(d => d !== '')) {
      onComplete();
    }
  }, [value, autoSubmit, onComplete]);

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleChange = (e, index) => {
    const digit = e.target.value.replace(/\D/g, '').slice(0, 1);
    onChange(index, digit);

    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e, index) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const digits = paste.split('');
    digits.forEach((d, i) => {
      if (index + i < 6) onChange(index + i, d);
    });
    const nextIndex = Math.min(index + digits.length, 5);
    inputsRef.current[nextIndex]?.focus();
  };

  const handleFocus = (index) => setFocusedIndex(index);
  const handleBlur = () => setFocusedIndex(-1);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" role="group" aria-label="Verification code">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={(e) => handlePaste(e, i)}
          onFocus={() => handleFocus(i)}
          onBlur={handleBlur}
          disabled={disabled}
            className={`
              w-12 h-14 sm:w-14 sm:h-16
              rounded-xl border-2 bg-[#041126]
              text-center font-mono text-2xl sm:text-3xl tracking-[0.15em] text-white
              outline-none transition-all duration-150
              ${error
                ? 'border-red-500 bg-red-950/30 animate-otp-shake'
                : focusedIndex === i
                  ? 'border-cyan-400 ring-2 ring-cyan-400/30'
                  : 'border-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30'}
              disabled:cursor-not-allowed disabled:opacity-50
            `}
          aria-label={`Digit ${i + 1} of 6`}
        />
      ))}
    </div>
  );
}

export default function EmailVerificationPage() {
  const { user, completeEmailVerification } = useAuthContext();
  const navigate = useNavigate();

  const [status, setStatus] = React.useState(null);
  const [code, setCode] = React.useState(Array(6).fill(''));
  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState('info');
  const [hasError, setHasError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [timer, setTimer] = React.useState(300);
  const [attempts, setAttempts] = React.useState(3);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [errorShake, setErrorShake] = React.useState(false);

  React.useEffect(() => {
    authService.getEmailVerificationStatus()
      .then((response) => setStatus(response.data.data))
      .catch(() => setStatus(false))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (timer > 0) {
      const id = window.setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
      return () => window.clearInterval(id);
    }
  }, [timer]);

  React.useEffect(() => {
    if (resendCooldown > 0) {
      const id = window.setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
      return () => window.clearInterval(id);
    }
  }, [resendCooldown]);

  React.useEffect(() => {
    if (errorShake) {
      const id = window.setTimeout(() => setErrorShake(false), 400);
      return () => window.clearTimeout(id);
    }
  }, [errorShake]);

  if (user) return <Navigate to={user.mustChangePassword ? '/change-password' : '/officer/dashboard'} replace />;
  if (!loading && status === false) return <Navigate to="/login" replace />;

  const isComplete = code.every((d) => d !== '');
  const isExpired = timer === 0;
  const isLocked = attempts === 0;
  const verifyDisabled = !isComplete || submitting || loading || isExpired || isLocked;

  const handleCodeChange = (index, digit) => {
    const nextCode = [...code];
    nextCode[index] = digit;
    setCode(nextCode);
    if (hasError) {
      setHasError(false);
      setMessage('');
      setMessageType('info');
    }
  };

  const handleAutoSubmit = React.useCallback(() => {
    if (isComplete && !verifyDisabled) {
      submit(new Event('submit'));
    }
  }, [isComplete, verifyDisabled]);

  const submit = async (event) => {
    event.preventDefault();
    if (!isComplete || verifyDisabled) return;

    setSubmitting(true);
    setMessage('');
    try {
      const verified = await completeEmailVerification(code.join(''));
      navigate(verified.mustChangePassword ? '/change-password' : '/officer/dashboard', { replace: true });
    } catch (error) {
      const msg = error.response?.data?.message || 'Incorrect code.';
      setMessage(msg);
      setMessageType('error');
      setHasError(true);
      setAttempts((a) => Math.max(0, a - 1));
      setCode(Array(6).fill(''));
      setErrorShake(true);
      setTimeout(() => inputsRef?.current?.[0]?.focus(), 50);
    } finally {
      setSubmitting(false);
    }
  };

  const inputsRef = React.useRef(null);

  const resend = async () => {
    if (resendCooldown > 0) return;
    setSubmitting(true);
    setMessage('');
    try {
      const response = await authService.resendEmailVerification();
      setStatus(response.data.data);
      setResendCooldown(30);
      setTimer(300);
      setAttempts(3);
      setCode(Array(6).fill(''));
      setHasError(false);
      setMessage('A new verification code was sent.');
      setMessageType('success');
      setTimeout(() => inputsRef?.current?.[0]?.focus(), 50);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to resend the code.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async () => {
    try { await authService.cancelEmailVerification(); }
    finally { navigate('/login', { replace: true }); }
  };

  const getHeading = () => {
    if (isExpired) return 'This code has expired';
    if (hasError) return 'That code didn\'t match';
    return 'Check your email';
  };

  const getSubtext = () => {
    if (isExpired) return 'Request a new code to continue.';
    const masked = status?.maskedEmail ? maskEmail(status.maskedEmail) : 'your Officer email';
    return `Enter the 6-digit code sent to <strong>${masked}</strong>.`;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-void p-4 text-paper font-body-hud">
      <div className="w-full max-w-md pt-4">
        <section className="relative rounded-2xl border border-line bg-panel/80 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-2xl bg-panel border border-line shadow-lg">
            <Shield size={28} className="text-cyan" aria-hidden="true" />
          </div>

          <div className="text-center pt-4">
            <h1 className="text-2xl font-black tracking-tight text-paper">{getHeading()}</h1>
            <p className="mt-2 text-sm leading-6 text-steel" dangerouslySetInnerHTML={{ __html: getSubtext() }} />
          </div>

          <form onSubmit={submit} className="mt-8 space-y-6">
            <div>
              <label className="sr-only">Verification code</label>
              <OTPInput
                ref={inputsRef}
                value={code}
                onChange={handleCodeChange}
                onComplete={handleAutoSubmit}
                disabled={submitting || isExpired || isLocked}
                error={hasError}
                autoFocus
                autoSubmit={!submitting && !isExpired && !isLocked}
              />
            </div>

            {message && (
              <p role="status" aria-live="polite" className={`
                rounded-lg p-3 text-sm text-center
                ${messageType === 'error'
                  ? 'border border-red-error/50 bg-red-error-bg/40 text-red-error-text'
                  : messageType === 'success'
                    ? 'border border-green-ok/50 bg-green-ok/10 text-green-ok'
                    : 'border border-cyan/30 bg-cyan/10 text-cyan'
                }
              `}>
                {message}
              </p>
            )}

            <div className="flex items-center justify-center gap-3 text-xs font-mono-hud text-steel">
              <span className="px-2 py-1 rounded bg-black/30 border border-line">
                Code expires in {formatTime(timer)}
              </span>
              {isExpired && (
                <span className="text-red-error">Code expired</span>
              )}
              {submitting && <span className="text-cyan">Verifying…</span>}
            </div>
          </form>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={cancel}
              disabled={submitting}
              className="flex-1"
            >
              <LogOut size={15} className="mr-2" aria-hidden="true" />
              Cancel
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={resend}
              disabled={submitting || resendCooldown > 0}
              className="flex-1"
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : <><RefreshCw size={15} className="mr-2" aria-hidden="true" />Resend code</>}
            </Button>
          </div>

          <p className="mt-6 text-center text-[11px] font-mono-hud text-cyan-dim/70">
            Bluewrite staff will never ask you to disclose this code.
          </p>
        </section>
      </div>
    </main>
  );
}