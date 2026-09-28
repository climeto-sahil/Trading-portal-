import { useState, useMemo } from 'react';
import {
  User, Mail, Phone, Lock, Building, Briefcase,
  AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function SignupPage({ onNavigateToLogin }) {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '',
    confirmPassword: '', company: '', role: 'MY_AGENT',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: '', color: '#e2e8f0', textColor: '#94a3b8' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444', textColor: '#dc2626' };
    if (score <= 3) return { score: 2, label: 'Medium', color: '#f59e0b', textColor: '#d97706' };
    return { score: 3, label: 'Strong', color: '#10b981', textColor: '#059669' };
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    setFieldErrors(p => ({ ...p, [name]: '' }));
    setErrorMessage('');
  };
                     
  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full Name is required.';
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Valid email is required.';
    if (formData.phone.trim() && formData.phone.replace(/\D/g,'').length < 10) errors.phone = 'Mobile must be 10 digits if provided.';
    if (!formData.password || formData.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!agreeTerms) errors.terms = 'You must agree to continue.';
    if (formData.role === 'ADMIN') errors.role = 'ADMIN accounts cannot be created via public signup.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(''); setSuccessMessage('');
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const result = await register(formData);
      if (result.success) {
        setSuccessMessage(result.data.message || 'Your account is waiting for Admin approval.');
      } else {
        setErrorMessage(result.data.message || 'Registration failed. Please verify your details.');
      }
    } catch (_) {
      setErrorMessage('Unable to connect to server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase = {
    width: '100%', padding: '10px 12px 10px 36px',
    border: '1.5px solid #d1d5db', borderRadius: '10px',
    fontSize: '13px', color: '#111827', background: '#fff',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'Inter, sans-serif',
  };

  const inputErr = { ...inputBase, border: '1.5px solid #f87171', background: '#fff5f5' };

  const FieldRow = ({ id, label, name, type = 'text', icon, placeholder, hasToggle, show, setShow, value, err, isPass }) => (
    <div>
      <label style={{
        display: 'block', fontSize: '10px', fontWeight: 700, color: '#374151',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
          color: '#9ca3af', pointerEvents: 'none', display: 'flex',
        }}>
          {icon}
        </div>
        <input
          id={id} type={hasToggle ? (show ? 'text' : 'password') : type}
          name={name} disabled={isSubmitting} placeholder={placeholder}
          value={value} onChange={handleChange}
          style={{ ...(err ? inputErr : inputBase), paddingRight: hasToggle ? '38px' : '12px' }}
          onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px #dbeafe'; }}
          onBlur={e => { e.target.style.borderColor = err ? '#f87171' : '#d1d5db'; e.target.style.boxShadow = 'none'; }}
        />
        {hasToggle && (
          <button
            type="button"
            aria-label={show ? 'Hide' : 'Show'}
            onClick={() => setShow(!show)}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
              display: 'flex', alignItems: 'center', padding: 0,
            }}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {err && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', fontWeight: 500 }}>⚠ {err}</p>}
    </div>
  );

  return (
    <>
      <div style={{
        minHeight: '100vh', background: '#f1f5f9',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 16px', position: 'relative', overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}>
        {/* Background Blobs */}
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'radial-gradient(circle, #bfdbfe 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'radial-gradient(circle, #c7d2fe 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.13, pointerEvents: 'none' }} />

        {/* Card */}
        <div style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '520px',
          background: '#fff', borderRadius: '20px',
          boxShadow: '0 4px 40px rgba(15,23,42,0.12)',
          border: '1px solid #e2e8f0', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '20px 28px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '11px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Briefcase size={20} color="#fff" strokeWidth={2.2} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>TRADING PORTAL ERP</div>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#bfdbfe', letterSpacing: '0.14em', textTransform: 'uppercase' }}>B2B COMMODITIES MANAGEMENT</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToLogin}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '12px', fontWeight: 600, color: '#bfdbfe',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
              }}
            >
              <ArrowLeft size={13} /> Back to Login
            </button>
          </div>

          {/* Form Body */}
          <div style={{ padding: '24px 28px 28px' }}>
            {successMessage ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: '68px', height: '68px', borderRadius: '50%',
                  background: '#ecfdf5', margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle2 size={36} color="#10b981" />
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Account Created!</div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Your trading account has been registered successfully.</p>
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px',
                  padding: '14px 16px', textAlign: 'left', marginBottom: '20px',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                    ✅ Status: Pending Admin Approval
                  </div>
                  <p style={{ fontSize: '12px', color: '#15803d', lineHeight: '1.6' }}>{successMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  style={{
                    width: '100%', maxWidth: '260px', height: '44px',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    color: '#fff', border: 'none', borderRadius: '11px',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Create Your Account</h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Join the Trading Portal and manage your trading activities.</p>
                </div>

                {errorMessage && (
                  <div style={{
                    padding: '11px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: '10px', marginBottom: '18px',
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                  }}>
                    <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#b91c1c' }}>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {/* Account Type REMOVED */}

                  {/* Name + Company */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {FieldRow({ id: "s-name", label: "Full Name", name: "name", placeholder: "e.g. Ramesh Verma", icon: <User size={15} />, value: formData.name, err: fieldErrors.name })}
                    {FieldRow({ id: "s-company", label: "Company Name", name: "company", placeholder: "e.g. Acme Pvt Ltd", icon: <Building size={15} />, value: formData.company, err: fieldErrors.company })}
                  </div>

                  {/* Email + Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {FieldRow({ id: "s-email", label: "Business Email", name: "email", type: "email", placeholder: "name@company.com", icon: <Mail size={15} />, value: formData.email, err: fieldErrors.email })}
                    {FieldRow({ id: "s-phone", label: "Mobile Number", name: "phone", type: "tel", placeholder: "e.g. 9876543210", icon: <Phone size={15} />, value: formData.phone, err: fieldErrors.phone })}
                  </div>

                  {/* Password + Confirm */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {FieldRow({ id: "s-password", label: "Password", name: "password", placeholder: "Min 8 characters", icon: <Lock size={15} />, value: formData.password, err: fieldErrors.password, hasToggle: true, show: showPassword, setShow: setShowPassword })}
                    {FieldRow({ id: "s-confirm", label: "Confirm Password", name: "confirmPassword", placeholder: "Re-enter password", icon: <Lock size={15} />, value: formData.confirmPassword, err: fieldErrors.confirmPassword, hasToggle: true, show: showConfirmPassword, setShow: setShowConfirmPassword })}
                  </div>

                  {/* Password Strength */}
                  {formData.password && (
                    <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Password Strength</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: passwordStrength.textColor }}>{passwordStrength.label}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                        {[1, 2, 3].map(i => (
                          <div key={i} style={{
                            height: '5px', borderRadius: '3px',
                            background: i <= passwordStrength.score ? passwordStrength.color : '#e2e8f0',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                      <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>
                        Use 8+ characters with numbers, uppercase letters & symbols.
                      </p>
                    </div>
                  )}

                  {/* Terms */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={e => { setAgreeTerms(e.target.checked); setFieldErrors(p => ({ ...p, terms: '' })); }}
                        style={{ width: '15px', height: '15px', marginTop: '1px', cursor: 'pointer', accentColor: '#3b82f6', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.5' }}>
                        I agree to the{' '}
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>Terms & Conditions</span>
                        {' '}and{' '}
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>Privacy Policy</span>
                        {' '}governing this platform.
                      </span>
                    </label>
                    {fieldErrors.terms && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '5px', fontWeight: 500 }}>⚠ {fieldErrors.terms}</p>}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%', height: '46px',
                      background: isSubmitting ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                      color: '#fff', border: 'none', borderRadius: '12px',
                      fontSize: '13px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: '0 4px 14px rgba(59,130,246,0.30)',
                      fontFamily: 'Inter, sans-serif', marginTop: '4px',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg style={{ animation: 'spin 0.8s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        Creating Account...
                      </>
                    ) : (
                      <><span>CREATE ACCOUNT</span><ArrowRight size={15} strokeWidth={2.5} /></>
                    )}
                  </button>
                </form>

                <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.target.style.textDecoration = 'none'}
                  >
                    Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: '20px', fontSize: '11px', color: '#94a3b8', zIndex: 10, position: 'relative' }}>
          © 2026 Trading Portal ERP • B2B Commodities Management System
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #9ca3af; }
        input:focus { outline: none; }
      `}</style>
    </>
  );
}
