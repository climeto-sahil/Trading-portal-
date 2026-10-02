/**
 * Portal Switcher logic for Trading Portal
 * Communicates with Climeto Central Auth to fetch other apps and switch between portals.
 */

export const CURRENT_APP_ID = 'trading_portal';

const CLIMETO_API_URL = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  ? 'https://api.climeto.in'
  : (import.meta.env.VITE_CLIMETO_API_URL || 'https://api.climeto.in');

const CLIMETO_PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'https://portal.climeto.in';

export const FALLBACK_APPS = [
  {
    appId: 'climeto_portal',
    name: 'Climeto Hub',
    description: 'Main single sign-on platform portal',
    frontendUrl: CLIMETO_PORTAL_URL,
    icon: '🌿',
  },
  {
    appId: 'climeto_admin',
    name: 'Admin Panel',
    description: 'User management, telemetry & platform settings',
    frontendUrl: 'https://climeto-admin.vercel.app',
    icon: '🛡️',
  },
  {
    appId: 'climeto_desktop',
    name: 'Climeto Desktop',
    description: 'EPR compliance, invoices & automation',
    frontendUrl: 'https://app.climeto.in',
    icon: '🖥️',
  },
  {
    appId: 'cpcb_scraper',
    name: 'CPCB Scraper',
    description: 'PIBO/PWP lists & EPR certificate audit',
    frontendUrl: 'https://cpcb-scraper-frontend.vercel.app',
    icon: '🔍',
  },
  {
    appId: 'hr_payroll',
    name: 'HR Payroll',
    description: 'Salary slips & Zoho payroll automation',
    frontendUrl: 'https://hr-payroll-automation-web-application-ezg0qmpfx.vercel.app',
    icon: '💰',
  },
  {
    appId: 'rag_chat',
    name: 'RAG Chat',
    description: 'Legal AI document chat & compliance QA',
    frontendUrl: 'http://localhost:5175',
    icon: '💬',
  },
  {
    appId: 'web_tracker',
    name: 'WebTracker',
    description: 'Government portal change monitoring',
    frontendUrl: 'https://webtracker-1.onrender.com',
    icon: '🌐',
  },
  {
    appId: 'call_intelligence_admin',
    name: 'Call Intelligence',
    description: 'Executive calls, devices & audio intelligence',
    frontendUrl: 'https://climet-ai-call-intelligence.vercel.app',
    icon: '📞',
  },
  {
    appId: 'pdf_tools',
    name: 'PDF Tools',
    description: 'GST invoice PDF utilities & processing',
    frontendUrl: 'http://localhost:5173',
    icon: '📄',
  },
];

export function getClimetoAuthToken() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('climeto_sso_raw_token') ||
    localStorage.getItem('trading_portal_token')
  );
}

/**
 * Fetch list of accessible Climeto apps for the logged in user
 */
export async function fetchOtherPortals() {
  const token = getClimetoAuthToken();
  if (!token) {
    return FALLBACK_APPS.filter((a) => a.appId !== CURRENT_APP_ID);
  }

  try {
    const res = await fetch(`${CLIMETO_API_URL.replace(/\/$/, '')}/api/auth/my-apps`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Climeto-Client': 'trading-portal',
      },
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data?.apps) && data.apps.length > 0) {
      const apps = data.apps.filter((a) => a.appId !== CURRENT_APP_ID);
      // Prepend Climeto Hub
      return [
        {
          appId: 'climeto_portal',
          name: 'Climeto Hub',
          description: 'Main single sign-on applications portal',
          frontendUrl: CLIMETO_PORTAL_URL,
          icon: '🌿',
        },
        ...apps,
      ];
    }
  } catch (err) {
    console.warn('[fetchOtherPortals] Failed to fetch live apps, using fallback:', err.message);
  }

  return FALLBACK_APPS.filter((a) => a.appId !== CURRENT_APP_ID);
}

/**
 * Build deep-link switch URL for the target application
 */
export function buildSwitchUrl(app, token, user) {
  const base = String(app.frontendUrl || '').replace(/\/$/, '');

  if (app.appId === 'climeto_portal') {
    return base;
  }

  if (app.appId === 'climeto_admin' || app.appId === 'climeto_desktop') {
    return `${base}/sso?token=${encodeURIComponent(token)}`;
  }

  const landing = app.appId === 'cpcb_scraper' ? '/sso' : '/';
  const params = new URLSearchParams({
    climeto_sso: '1',
    token: token || '',
    tokenKey: app.tokenStorageKey || 'token',
  });

  if (app.userStorageKey) params.set('userKey', app.userStorageKey);
  if (user) params.set('currentUser', JSON.stringify(user));

  return `${base}${landing}?${params.toString()}`;
}

/**
 * Switch to another portal seamlessly
 */
export async function switchToPortal(targetAppId) {
  if (targetAppId === 'climeto_portal') {
    window.location.href = CLIMETO_PORTAL_URL;
    return;
  }

  const token = getClimetoAuthToken();
  if (!token) {
    const fallback = FALLBACK_APPS.find((a) => a.appId === targetAppId);
    if (fallback?.frontendUrl) {
      window.location.href = fallback.frontendUrl;
      return;
    }
    throw new Error('No active session to switch portal.');
  }

  try {
    const res = await fetch(`${CLIMETO_API_URL.replace(/\/$/, '')}/api/auth/switch-app`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Climeto-Client': 'trading-portal',
      },
      body: JSON.stringify({ appId: targetAppId }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.token && data.app?.frontendUrl) {
      window.location.href = buildSwitchUrl(data.app, data.token, data.user);
      return;
    }
  } catch (err) {
    console.warn('[switchToPortal] Switch API call failed, attempting direct SSO redirect:', err.message);
  }

  // Fallback direct redirection with current token
  const fallback = FALLBACK_APPS.find((a) => a.appId === targetAppId);
  if (fallback) {
    window.location.href = buildSwitchUrl(fallback, token, null);
    return;
  }

  throw new Error('Unable to switch to selected portal.');
}
