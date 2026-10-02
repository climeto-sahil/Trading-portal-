import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function SsoPage({ onComplete }) {
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Signing you in…');
  const started = useRef(false);
  const { ssoLogin } = useAuth();

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError('Missing SSO token in URL.');
      return;
    }

    (async () => {
      try {
        setStatus('Verifying session with Climeto SSO…');
        const res = await ssoLogin(token);

        if (!res.success) {
          setError(res.message || 'SSO sign-in failed. Please verify credentials or try again.');
          return;
        }

        setStatus('Redirecting to dashboard…');
        // Clean SSO URL
        const clean = window.location.pathname.replace(/\/sso\/?$/, '') || '/';
        window.history.replaceState({}, '', clean);
        if (onComplete) onComplete();
      } catch (err) {
        setError(err.message || 'Could not complete SSO sign-in.');
      }
    })();
  }, [ssoLogin, onComplete]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: '20px',
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '36px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          margin: '0 auto 20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          boxShadow: '0 10px 20px -5px rgba(5, 150, 105, 0.4)'
        }}>
          💹
        </div>

        <h2 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 700, marginBottom: '8px' }}>
          Trading Portal SSO
        </h2>

        {error ? (
          <div>
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '14px',
              marginTop: '16px',
              color: '#fca5a5',
              fontSize: '0.9rem',
              lineHeight: 1.4
            }}>
              {error}
            </div>
            <button
              onClick={() => {
                window.history.replaceState({}, '', '/');
                window.location.reload();
              }}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                borderRadius: '10px',
                background: '#059669',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '10px' }}>
              {status}
            </p>
            <div style={{
              width: '32px',
              height: '32px',
              margin: '24px auto 0',
              borderRadius: '50%',
              border: '3px solid rgba(16, 185, 129, 0.2)',
              borderTopColor: '#10b981',
              animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
