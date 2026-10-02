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

  if (params.get('climeto_sso') !== '1') return false;

  const token = readSsoParam(params, 'token');
  const tokenKey = params.get('tokenKey') || 'trading_portal_token';
  const userKey = params.get('userKey') || 'trading_portal_user';
  const currentUser = readSsoParam(params, 'currentUser');

  if (token) {
    localStorage.setItem('trading_portal_token', token);
    if (tokenKey !== 'trading_portal_token') {
      localStorage.setItem(tokenKey, token);
    }
  }

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

  // Remove SSO parameters from address bar cleanly
  ['climeto_sso', 'token', 'tokenKey', 'userKey', 'currentUser'].forEach((k) =>
    params.delete(k),
  );

  const clean =
    window.location.pathname +
    (params.toString() ? `?${params.toString()}` : '') +
    window.location.hash;

  window.history.replaceState({}, '', clean);
  return Boolean(token);
}
