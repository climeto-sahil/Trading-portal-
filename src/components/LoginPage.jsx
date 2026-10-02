import { useState, useEffect } from 'react';
import {
  Eye, EyeOff, Lock, User, Briefcase, AlertCircle, ArrowRight,
  CheckCircle2, X, ChevronDown, ChevronUp, KeyRound, Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage({ onNavigateToSignup }) {
  const { login, forgotPassword } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotId, setForgotId] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(null);
  const [forgotError, setForgotError] = useState('');

  const [showDevAccounts, setShowDevAccounts] = useState(false);

  useEffect(() => {
    localStorage.removeItem('trading_portal_remembered_id');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const errors = {};
    if (!identifier.trim()) errors.identifier = 'Please enter your email or mobile number.';
    if (!password) errors.password = 'Please enter your password.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await login(identifier.trim(), password);
      if (!result.success) {
        if (result.status === 'PENDING') setErrorMessage('Your account is awaiting Admin approval.');
        else if (result.status === 'SUSPENDED') setErrorMessage('Your account has been suspended. Contact Admin.');
        else setErrorMessage(result.message || 'Invalid email/mobile or password.');
      } else {
        if (rememberMe) localStorage.setItem('trading_portal_remembered_id', identifier.trim());
        else localStorage.removeItem('trading_portal_remembered_id');
      }
    } catch (_) {
      setErrorMessage('Unable to connect to server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError(''); setForgotSuccess(null);
    if (!forgotId.trim()) { setForgotError('Please enter your registered email or mobile.'); return; }
    setForgotLoading(true);
    try {
      const res = await forgotPassword(forgotId.trim());
      if (res.success) setForgotSuccess(res.data);
      else setForgotError(res.data?.message || 'No account found with that detail.');
    } catch (_) {
      setForgotError('Server connection error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const fillDemo = (email, pass) => {
    setIdentifier(email); setPassword(pass);
    setFieldErrors({}); setErrorMessage('');
  };

  const inputBase = {
    width: '100%', padding: '11px 14px 11px 40px',
    border: '1.5px solid #d1d5db', borderRadius: '10px',
    fontSize: '14px', color: '#111827', background: '#fff',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'Inter, sans-serif',
  };

  const inputError = { ...inputBase, border: '1.5px solid #f87171', background: '#fff5f5' };

  return (
    <>
      {/* Full Page Wrapper */}
      <div style={{
        minHeight: '100vh', background: '#f1f5f9',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 16px', position: 'relative', overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}>
        {/* Background Blobs */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '360px', height: '360px', borderRadius: '50%',
          background: 'radial-gradient(circle, #bfdbfe 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-80px',
          width: '360px', height: '360px', borderRadius: '50%',
          background: 'radial-gradient(circle, #c7d2fe 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Dot Grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '28px 28px', opacity: 0.15,
        }} />

        {/* ─── AUTH CARD ─── */}
        <div style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '460px',
          background: '#ffffff', borderRadius: '20px',
          boxShadow: '0 4px 40px rgba(15,23,42,0.12)',
          border: '1px solid #e2e8f0', overflow: 'hidden',
        }}>

          {/* ── BRAND HEADER ── */}
          <div style={{
            padding: '28px 32px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '10px',
            background: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}>
              <Briefcase size={26} color="#fff" strokeWidth={2.2} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '18px', fontWeight: 700, color: '#fff',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                TRADING PORTAL ERP
              </div>
              <div style={{
                fontSize: '10px', fontWeight: 600, color: '#bfdbfe',
                letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '2px',
              }}>
                B2B COMMODITIES MANAGEMENT
              </div>
            </div>
          </div>

          {/* ── FORM BODY ── */}
          <div style={{ padding: '28px 32px 24px' }}>

            {/* Welcome */}
            <div style={{ marginBottom: '22px' }}>
              <h2 style={{
                fontSize: '22px', fontWeight: 700, color: '#0f172a',
                margin: 0, letterSpacing: '-0.02em',
              }}>
                Welcome Back <span style={{ display: 'inline-block' }}>👋</span>
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Sign in to continue managing your deals, purchases and sales.
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div style={{
                marginBottom: '18px', padding: '11px 14px',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 500 }}>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>

              {/* Email/Mobile Field */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: 700,
                  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
                }}>
                  Email or Mobile Number
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    color: '#9ca3af', pointerEvents: 'none', display: 'flex',
                  }}>
                    <User size={17} />
                  </div>
                  <input
                    type="text"
                    id="login-identifier"
                    autoComplete="username"
                    disabled={isSubmitting}
                    placeholder="Enter email or mobile number"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setFieldErrors(p => ({ ...p, identifier: '' }));
                      setErrorMessage('');
                    }}
                    style={fieldErrors.identifier ? inputError : inputBase}
                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px #dbeafe'; }}
                    onBlur={(e) => { e.target.style.borderColor = fieldErrors.identifier ? '#f87171' : '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                {fieldErrors.identifier && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px', fontWeight: 500 }}>
                    ⚠ {fieldErrors.identifier}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{
                    fontSize: '11px', fontWeight: 700, color: '#374151',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotError(''); setForgotSuccess(null);
                      setForgotId(identifier.trim());
                      setIsForgotOpen(true);
                    }}
                    style={{
                      fontSize: '12px', fontWeight: 600, color: '#2563eb',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.target.style.textDecoration = 'none'}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    color: '#9ca3af', pointerEvents: 'none', display: 'flex',
                  }}>
                    <Lock size={17} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors(p => ({ ...p, password: '' }));
                      setErrorMessage('');
                    }}
                    style={{ ...(fieldErrors.password ? inputError : inputBase), paddingRight: '44px' }}
                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px #dbeafe'; }}
                    onBlur={(e) => { e.target.style.borderColor = fieldErrors.password ? '#f87171' : '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
                      display: 'flex', alignItems: 'center', padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px', fontWeight: 500 }}>
                    ⚠ {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#4b5563' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#3b82f6' }}
                  />
                  Remember me
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%', height: '48px',
                  background: isSubmitting ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  color: '#fff', border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  letterSpacing: '0.04em', boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
                  transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,0.35)'; }}
              >
                {isSubmitting ? (
                  <>
                    <svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN TO DASHBOARD</span>
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>

            {/* Divider with text */}
            <div style={{
              display: 'flex', alignItems: 'center', margin: '20px 0 16px', gap: '10px'
            }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Or Unified Access
              </span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {/* Sign in with Climeto SSO Button */}
            <button
              type="button"
              onClick={() => {
                const portalUrl = import.meta.env.VITE_PORTAL_URL || 'https://portal.climeto.in';
                window.location.href = portalUrl;
              }}
              style={{
                width: '100%', height: '44px',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              <span>🌿</span>
              <span>Sign in with Climeto SSO Hub</span>
            </button>

            {/* Create Account Link */}
            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToSignup}
                style={{
                  fontSize: '13px', fontWeight: 700, color: '#2563eb',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                onMouseLeave={e => e.target.style.textDecoration = 'none'}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '20px', fontSize: '11px', color: '#94a3b8', zIndex: 10, position: 'relative' }}>
          © 2026 Trading Portal ERP • B2B Commodities Management System
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {isForgotOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsForgotOpen(false); }}
        >
          <div style={{
            width: '100%', maxWidth: '420px',
            background: '#fff', borderRadius: '18px',
            boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
            border: '1px solid #e2e8f0', overflow: 'hidden',
            fontFamily: 'Inter, sans-serif',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <KeyRound size={19} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Reset Your Password</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Secure recovery for B2B accounts</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'none', border: '1px solid #e2e8f0',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#94a3b8',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {forgotSuccess ? (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: '#ecfdf5', margin: '0 auto 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckCircle2 size={34} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Instructions Dispatched!</div>
                  <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.6', marginBottom: '16px' }}>
                    {forgotSuccess.message}
                  </p>
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
                    padding: '12px 14px', textAlign: 'left', marginBottom: '20px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>Next Steps:</div>
                    {['Check your inbox or SMS for a secure reset link.', 'The link expires in 15 minutes.', 'Contact Admin for urgent manual reset.'].map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#15803d', marginBottom: '4px' }}>
                        <span>•</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    style={{
                      width: '100%', height: '42px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                      color: '#fff', border: 'none', cursor: 'pointer',
                      fontSize: '13px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit}>
                  <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '18px', lineHeight: '1.6' }}>
                    Enter your registered email address or mobile number. We'll verify your trading account and dispatch recovery instructions.
                  </p>

                  {forgotError && (
                    <div style={{
                      padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                      borderRadius: '9px', marginBottom: '14px',
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                    }}>
                      <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span style={{ fontSize: '12px', color: '#b91c1c' }}>{forgotError}</span>
                    </div>
                  )}

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{
                      display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151',
                      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
                    }}>
                      Registered Email or Mobile
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                        color: '#9ca3af', pointerEvents: 'none', display: 'flex',
                      }}>
                        <Mail size={16} />
                      </div>
                      <input
                        type="text"
                        disabled={forgotLoading}
                        placeholder="e.g. name@company.com or 9876543210"
                        value={forgotId}
                        onChange={(e) => setForgotId(e.target.value)}
                        style={{ ...inputBase, fontSize: '13px' }}
                        onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px #dbeafe'; }}
                        onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setIsForgotOpen(false)}
                      style={{
                        flex: 1, height: '42px', borderRadius: '10px',
                        background: '#fff', border: '1.5px solid #e2e8f0',
                        color: '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      style={{
                        flex: 1, height: '42px', borderRadius: '10px',
                        background: forgotLoading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                        color: '#fff', border: 'none', cursor: forgotLoading ? 'not-allowed' : 'pointer',
                        fontSize: '13px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #9ca3af; }
        input:focus { outline: none; }
      `}</style>
    </>
  );
}
