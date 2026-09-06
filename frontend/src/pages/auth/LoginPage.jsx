// BLUEWRITE — LoginPage
// Port of the approved login mockup: tactical grid + CRT scanline backdrop,
// square-cornered panels, left-accent cards, and the RESTRICTED ACCESS console.
// Height tiers (@700px/@600px/@500px) keep the page fitting at 100% zoom on
// short laptop viewports. The error banner is conditional (real app state) and
// the compliance disclaimer wording is kept verbatim.

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Eye, EyeOff, Lock, Shield, User } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { PRODUCT_NAME } from '../../utils/constants';
import GlitchTextBits from '../../components/common/GlitchText';
import LetterGlitch from '../../components/common/LetterGlitch';

// Formats the current instant as Philippine time (PHT, UTC+8) in HH:MM:SS.
// Intl handles the +08:00 offset (including PST/PHT quirks) via the IANA zone.
const PHT_TIME_FORMAT = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const getPhilippineTime = () => PHT_TIME_FORMAT.format(new Date);

// Glitch scramble glyphs used during the per-second clock tick.
const GLITCH_GLYPHS = '01<>/#@$%&*+=?!';

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

// GlitchDigits — renders each character in its own inline-block span. Every time
// `text` changes (each clock tick), the changed trailing digits (the seconds)
// get a brief glyph scramble on top of the CSS `hud-glitch` RGB-split jitter.
// The HH:MM part stays steady so the clock remains readable.
function GlitchDigits({ text }) {
  const previous = React.useRef(text);
  // Active glitch window: { from: <first scrambled index> } or null when steady.
  const [glitch, setGlitch] = React.useState(null);

  React.useEffect(() => {
    if (text === previous.current) return undefined;
    const previousText = previous.current;
    previous.current = text;

    // Reduced motion: resolve straight to the new digits, no scramble.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    // Find the first differing index; only glitch when the seconds digits moved
    // (an HH:MM rollover resolves instantly so the clock stays readable).
    let firstDiff = 0;
    while (firstDiff < text.length && text[firstDiff] === previousText[firstDiff]) {
      firstDiff += 1;
    }
    if (firstDiff < text.length - 2) return undefined;

    setGlitch({ from: firstDiff });
    const id = window.setTimeout(() => setGlitch(null), 190);
    return () => window.clearTimeout(id);
  }, [text]);

  return (
    <>
      {text.split('').map((char, index) => {
        const isGlitching = glitch !== null && index >= glitch.from && char !== ':';
        const display = isGlitching
          ? GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)]
          : char;
        return (
          <span
            key={isGlitching ? `hud-g-${index}` : `hud-s-${index}-${char}`}
            aria-hidden="true"
            className={isGlitching ? 'hud-glitch hud-glitch-char' : 'hud-glitch-char'}
          >
            {display}
          </span>
        );
      })}
    </>
  );
}

// GlitchText — copies `text` into two aria-hidden ghost layers over the base
// content (children). Fires a brief RGB-split/slice burst on an independent
// random 6–10s idle loop. `paused` suspends both the scheduling and any
// in-flight burst (used while the form has focus / is submitting / errored).
function GlitchText({ text, paused = false, children }) {
  const [burst, setBurst] = React.useState(false);
  const pausedRef = React.useRef(paused);
  pausedRef.current = paused;

  React.useEffect(() => {
    // Reduced motion: never schedule, stay fully static.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let timer;
    let resetTimer;
    const loop = () => {
      timer = window.setTimeout(() => {
        if (!pausedRef.current) {
          setBurst(true);
          resetTimer = window.setTimeout(() => setBurst(false), 280);
        }
        loop();
      }, 12000 + Math.random() * 8000); // every 12–20s, randomized (longer pause)
    };
    loop();
    return () => {
      window.clearTimeout(timer);
      if (resetTimer) window.clearTimeout(resetTimer);
    };
  }, []);

  const showBurst = burst && !paused;
  return (
    <span className="relative inline-block">
      {/* Base layer — the only content exposed to assistive tech */}
      <span className="relative z-10">{children}</span>
      {/* Decorative ghost layers (never read by screen readers) */}
      <span
        aria-hidden="true"
        className={`hud-glitch-ghost hud-glitch-ghost-a ${showBurst ? 'hud-glitch-active' : ''}`}
      >
        {text}
      </span>
      <span
        aria-hidden="true"
        className={`hud-glitch-ghost hud-glitch-ghost-b ${showBurst ? 'hud-glitch-active' : ''}`}
      >
        {text}
      </span>
    </span>
  );
}

// §3.1-style top status bar restyled to the mockup (mini two-tone wordmark,
// glowing cyan Philippine-time clock, pipe-separated readouts).
function TopStatusBar() {
  const [time, setTime] = React.useState(getPhilippineTime);

  // Live tick — resyncs against the wall clock every second so it never drifts.
  React.useEffect(() => {
    const id = window.setInterval(() => setTime(getPhilippineTime()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="relative z-20 flex h-11 shrink-0 items-center justify-between border-b border-line bg-void px-4 sm:px-6">
      <div className="font-mono-hud text-[11px] font-bold tracking-[0.26em] text-paper sm:text-xs">
        <span>BLUE</span>
        <span className="text-cyan">WRITE</span>
      </div>

      <p
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-baseline gap-1.5 font-mono-hud text-sm font-bold tabular-nums text-cyan [text-shadow:0_0_12px_rgba(0,240,255,0.45)] sm:text-base"
        title="Philippine Standard Time (PHT, UTC+8)"
      >
        <span className="sr-only">Current Philippine time: </span>
        <span aria-hidden="true" className="text-[10px] font-medium tracking-[0.2em] text-cyan-dim sm:text-[11px]">
          PHT
        </span>
        <span className="relative">
          <span className="sr-only" aria-live="off">{time}</span>
          <span aria-hidden="true" className="inline-flex tabular-nums">
            <GlitchDigits text={time} />
          </span>
        </span>
      </p>

      <div className="hidden items-center gap-2 font-mono-hud text-[10px] tracking-[0.14em] text-steel md:flex">
        <span>
          SYS_STATUS: <span className="text-green-ok">OPTIMAL</span>
        </span>
        <span aria-hidden="true" className="text-line-bright">
          |
        </span>
        <span>
          ENC_LEVEL: <span className="text-cyan">AES-256</span>
        </span>
      </div>
      <div className="md:hidden" aria-hidden="true" />
    </header>
  );
}

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------
function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthContext();
  const [username, setUsername] = React.useState('');
  const [realUsername, setRealUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(
    searchParams.get('expired') === '1' ? 'Your session has expired. Please sign in again.' : ''
  );
  const [formFocused, setFormFocused] = React.useState(false);

  // Pause the ambient wordmark/heading glitch while the user is engaged with
  // the form (focus, submitting, or an error is showing) — see the addendum §3.
  const glitchPaused = formFocused || submitting || Boolean(error);

  const clearFieldErrors = () => {
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const user = await login({ username: username.trim(), password });
      setPassword('');
      navigate(
        user.verificationRequired
          ? '/verify-email'
          : user.securityReviewRequired
            ? '/security-review'
            : user.mustChangePassword
              ? '/change-password'
              : user.role === 'admin'
                ? '/admin/dashboard'
                : '/officer/dashboard',
        { replace: true }
      );
    } catch (requestError) {
      if (!requestError.response) setError('Unable to connect to BLUEWRITE. Please try again.');
      else setError(requestError.response.data?.message || 'Unable to sign in. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-void font-body-hud text-steel antialiased">
      {/* Tactical grid backdrop (hairlines + radial mask, 20% opacity) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,#1E293B_1px,transparent_1px),linear-gradient(to_bottom,#1E293B_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]"
      />

      {/* CRT scanline overlay (4px lines, fixed, non-interactive) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px]"
      />

{/* LetterGlitch background effect - full-screen canvas-based glitch animation */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ opacity: 0.18 }}
      >
        <LetterGlitch
          glitchSpeed={35}
          centerVignette={false}
          outerVignette={true}
          smooth={true}
          glitchColors={['#2b4539', '#61dca3', '#61b3dc']}
          backgroundColor="transparent"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <TopStatusBar />

      {/* Scrollable content region (top bar stays fixed above) */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full px-4 py-4 sm:px-8 sm:py-6 [@media(max-height:700px)]:py-2">
          <div className="m-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16 lg:p-6 xl:gap-20">

            {/* ============ LEFT COLUMN — brand, system context ============ */}
            <section className="flex min-w-0 flex-col items-start space-y-6 [@media(max-height:700px)]:space-y-4 [@media(max-height:600px)]:space-y-3">
              <div className="flex flex-col items-start space-y-4 [@media(max-height:600px)]:space-y-2.5">

                {/* square cyan-bordered document emblem */}
                <div className="border-2 border-cyan bg-cyan/10 p-3 shadow-[0_0_20px_rgba(0,240,255,0.2)] [@media(max-height:600px)]:p-2">
                  <svg
                    className="h-10 w-10 text-cyan [@media(max-height:600px)]:h-8 [@media(max-height:600px)]:w-8]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      strokeWidth="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M12 3v18" />
                  </svg>
                </div>

                <div>
                  <h1 className="text-5xl font-extrabold tracking-tighter text-paper drop-shadow-[0_0_28px_rgba(255,255,255,0.35)] [@media(max-height:700px)]:text-5xl [@media(max-height:600px)]:text-3xl lg:text-[9.5rem] 2xl:text-[9rem] 3xl:text-9xl [@media(max-width:1024px)]:text-7xl [@media(max-width:480px)]:text-3xl">
                    <GlitchTextBits speed={0.25} intensity="extreme" enableOnHover={false} className="inline-block">
                      BLUEWRITE
                    </GlitchTextBits>
                  </h1>
                  <div className="mt-2 flex items-center gap-2 font-mono-hud text-xs uppercase tracking-[0.2em] text-cyan [@media(max-height:600px)]:text-[11px]">
                    <span aria-hidden="true" className="h-2 w-2 animate-pulse bg-cyan" />
                    AI-Assisted Police Incident Reporting
                  </div>
                </div>

                <p className="inline-block border-b border-line pb-2 font-mono-hud text-xs uppercase text-steel [@media(max-height:600px)]:text-[11px]">
                  // Secure Incident Documentation System v2.4.1
                </p>
              </div>

              <div className="space-y-4 [@media(max-height:700px)]:space-y-3 [@media(max-height:600px)]:space-y-2">
                {/* value card — thick cyan left accent */}
                <div className="border-4 border-l-cyan border-y-line border-r-line border-y border-r bg-panel/50 p-4 backdrop-blur-sm [@media(max-height:600px)]:p-3">
                  <div className="mb-2 flex items-center gap-3">
                    <Shield
                      size={20}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="shrink-0 text-cyan"
                    />
                    <h3 className="font-bold tracking-wide text-paper [@media(max-height:600px)]:text-base">
                      Professional. Secure. Responsible.
                    </h3>
                  </div>
                  <p className="pl-8 text-sm leading-6 text-steel [@media(max-height:600px)]:pl-8 [@media(max-height:600px)]:text-[13px] [@media(max-height:600px)]:leading-5">
                    Supporting officers in accurate and efficient incident documentation.
                  </p>
                </div>

                {/* advisory card — thick amber left accent, compliance copy verbatim */}
                <div className="border-4 border-l-amber border-y-line border-r-line border-y border-r bg-panel/50 p-4 backdrop-blur-sm [@media(max-height:600px)]:p-3">
                  <div className="mb-2 flex items-center gap-3">
                    <AlertTriangle
                      size={20}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="shrink-0 text-amber"
                    />
                    <h3 className="font-bold tracking-wide text-paper [@media(max-height:600px)]:text-base">
                      System Advisory
                    </h3>
                  </div>
                  <p className="pl-8 text-sm leading-6 text-steel [@media(max-height:600px)]:pl-8 [@media(max-height:600px)]:text-[13px] [@media(max-height:600px)]:leading-5">
                    AI-generated suggestions are provided as writing assistance only. The reporting
                    officer remains responsible for reviewing and verifying all report content.
                  </p>
                </div>
              </div>
            </section>

            {/* ============ RIGHT COLUMN — RESTRICTED ACCESS console ============ */}
            <section className="relative mx-auto w-full max-w-[520px] lg:mx-0">
              {/* corner brackets (top-left / bottom-right) */}
              <div
                aria-hidden="true"
                className="absolute -left-2 -top-2 z-20 h-6 w-6 border-l-2 border-t-2 border-cyan"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-2 -right-2 z-20 h-6 w-6 border-b-2 border-r-2 border-cyan"
              />

              <div className="relative z-10 border border-line bg-panel/80 p-6 shadow-2xl backdrop-blur-md sm:p-8 lg:p-8 [@media(max-height:700px)]:p-6 [@media(max-height:600px)]:p-5 [@media(max-height:500px)]:p-4">
                {/* console header */}
                <div className="mb-6 text-center [@media(max-height:700px)]:mb-4 [@media(max-height:600px)]:mb-3 [@media(max-height:500px)]:mb-2">
                  <div className="mb-3 inline-block rounded-full border border-line-bright bg-panel-raised p-2.5 [@media(max-height:500px):hidden]">
                    <Lock size={26} strokeWidth={1.5} aria-hidden="true" className="text-paper" />
                  </div>
                  <h2 className="text-xl font-bold tracking-wide text-paper sm:text-2xl [@media(max-height:500px)]:text-lg">
                    RESTRICTED ACCESS
                  </h2>
                  <p className="mt-1.5 font-mono-hud text-xs uppercase text-cyan [@media(max-height:500px)]:mt-0.5">
                    Authenticate to access system
                  </p>
                </div>

                <form
                  className="space-y-5 [@media(max-height:700px)]:space-y-3 [@media(max-height:600px)]:space-y-2.5"
                  onSubmit={handleSubmit}
                  noValidate
                  onFocus={() => setFormFocused(true)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setFormFocused(false);
                  }}
                >
                  {/* conditional ERR_401 banner */}
                  {error && (
                    <div
                      role="alert"
                      className="flex items-center gap-3 border-l-4 border-red-error bg-red-error-bg/40 p-3"
                    >
                      <AlertTriangle
                        size={18}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="shrink-0 text-red-error"
                      />
                      <p className="font-mono-hud text-xs leading-5 text-red-error-text sm:text-sm">
                        ERR_401: {error}
                      </p>
                    </div>
                  )}

                  {/* OPERATOR ID */}
                  <div className="space-y-2 [@media(max-height:600px)]:space-y-1">
                    <label
                      htmlFor="username"
                      className="font-mono-hud text-xs uppercase tracking-widest text-steel [@media(max-height:600px)]:text-[11px]"
                    >
                      Operator ID
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <User size={18} strokeWidth={1.5} aria-hidden="true" className="text-cyan-dim" />
                      </div>
                      <input
                        id="username"
                        name="username"
                        autoComplete="username"
                        type="text"
                        value={username}
                        onChange={(event) => {
                          setUsername(event.target.value);
                          clearFieldErrors();
                        }}
                        disabled={submitting}
                        className="w-full border border-line-bright bg-black/50 px-4 py-2.5 pl-11 font-mono-hud text-sm text-paper caret-cyan transition-all placeholder:text-cyan-dim/70 focus:border-cyan focus:shadow-[0_0_12px_rgba(0,240,255,0.3)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [@media(max-height:600px)]:py-2"
                        placeholder="Enter your username"
                      />
                      {username === 'devmode--' && (
                        <input
                          id="realUsername"
                          name="realUsername"
                          autoComplete="username"
                          type="text"
                          value={realUsername}
                          onChange={(event) => setRealUsername(event.target.value)}
                          disabled={submitting}
                          className="mt-2 w-full border border-amber bg-black/50 px-4 py-2 pl-11 font-mono-hud text-sm text-paper caret-amber transition-all placeholder:text-amber-dim/70 focus:border-amber focus:shadow-[0_0_12px_rgba(245,158,11,0.3)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [@media(max-height:600px)]:py-2"
                          placeholder="Real username to unlock"
                        />
                      )}
                    </div>
                  </div>

                  {/* PASSCODE */}
                  <div className="space-y-2 [@media(max-height:600px)]:space-y-1">
                    <label
                      htmlFor="password"
                      className="font-mono-hud text-xs uppercase tracking-widest text-steel [@media(max-height:600px)]:text-[11px]"
                    >
                      Passcode
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Lock size={18} strokeWidth={1.5} aria-hidden="true" className="text-cyan-dim" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          clearFieldErrors();
                        }}
                        disabled={submitting}
                        className="w-full border border-line-bright bg-black/50 px-4 py-2.5 pl-11 font-mono-hud text-sm text-paper caret-cyan transition-all placeholder:text-cyan-dim/70 focus:border-cyan focus:shadow-[0_0_12px_rgba(0,240,255,0.3)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [@media(max-height:600px)]:py-2"
                        placeholder="••••••••••••"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <button
                          type="button"
                          onClick={() => setShowPassword((visible) => !visible)}
                          disabled={submitting}
                          className="p-1 text-cyan-dim transition-colors hover:text-cyan focus:text-cyan focus:outline-none disabled:opacity-60"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* INITIALIZE SESSION */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group mt-1 flex w-full items-center justify-center gap-2 bg-cyan py-3 font-extrabold uppercase tracking-[0.2em] text-black shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all duration-300 hover:bg-white hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] focus:shadow-[0_0_25px_rgba(0,240,255,0.5)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 [@media(max-height:600px)]:py-2"
                  >
                    {submitting ? 'Initializing Session' : 'Initialize Session'}
                    <ArrowRight
                      size={16}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </button>
                </form>

                {/* footer reassurance note */}
                <div className="mt-6 border border-line bg-black/30 p-4 [@media(max-height:700px)]:mt-4 [@media(max-height:600px)]:mt-3 [@media(max-height:500px)]:p-3">
                  <div className="flex items-start gap-3">
                    <Lock
                      size={18}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-cyan-dim"
                    />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-steel">
                        Secure Database Access
                      </h4>
                      <p className="mt-1 font-mono-hud text-xs text-cyan-dim [@media(max-height:600px)]:text-[11px]">
                        Sign in with assigned credentials. Access logged against internal system
                        matrix.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;