/**
 * Climeto SSO bootstrap for Trading Portal.
 * Reads ?climeto_sso=1&token=...&tokenKey=...&userKey=...&currentUser=...
 * and stores in localStorage before cleaning the URL.
 */
function readSsoParam(params, key) {
  const raw = params.get(key);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function applyClimetoSsoFromUrl() {
  if (typeof window === 'undefined') return false;

  const hash = window.location.hash?.replace(/^#/, '').trim();
  const params =
    hash && (hash.includes('climeto_sso=1') || hash.includes('token='))
      ? new URLSearchParams(hash)
      : new URLSearchParams(window.location.search);

  const token = readSsoParam(params, 'token');
  const isSso = params.get('climeto_sso') === '1' || Boolean(token) || window.location.pathname.includes('/sso');

  if (!isSso || !token) return false;

  const tokenKey = params.get('tokenKey') || 'trading_portal_token';
  const userKey = params.get('userKey') || 'trading_portal_user';
  const currentUser = readSsoParam(params, 'currentUser');

  // Stash in sessionStorage so AuthContext can exchange it with backend
  sessionStorage.setItem('pending_sso_token', token);

  if (currentUser) {
    try {
      localStorage.setItem('trading_portal_user', currentUser);
      if (userKey !== 'trading_portal_user') {
        localStorage.setItem(userKey, currentUser);
      }
    } catch {
      /* ignore storage errors */
    }
  }

  return Boolean(token);
}
