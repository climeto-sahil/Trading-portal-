import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, ChevronDown, ExternalLink } from 'lucide-react';
import { fetchOtherPortals, switchToPortal } from '../lib/portalSwitcher.js';

const ICON_MAP = {
  'shield': '🛡️',
  'monitor': '🖥️',
  'scan': '📄',
  'file-spreadsheet': '📋',
  'filespreadsheet': '📋',
  'file-search': '🔍',
  'filesearch': '🔍',
  'wallet': '💰',
  'message-square': '💬',
  'messagesquare': '💬',
  'globe': '🌐',
  'phone': '📞',
  'file-text': '📄',
  'filetext': '📄',
  'trending-up': '📈',
  'trendingup': '📈',
  'leaf': '🌿',
};

const APP_ID_MAP = {
  'climeto_portal': '🌿',
  'climeto_admin': '🛡️',
  'climeto_desktop': '🖥️',
  'ocr_desktop': '📄',
  'ocr_data_prep': '📋',
  'cpcb_scraper': '🔍',
  'hr_payroll': '💰',
  'rag_chat': '💬',
  'web_tracker': '🌐',
  'call_intelligence_admin': '📞',
  'pdf_tools': '📄',
  'trading_portal': '💹',
  'growth_command': '📈',
};

function renderAppIcon(app) {
  if (app.appId && APP_ID_MAP[app.appId]) return APP_ID_MAP[app.appId];
  if (app.icon) {
    const cleanKey = String(app.icon).toLowerCase().replace(/[\s_-]+/g, '');
    if (ICON_MAP[cleanKey]) return ICON_MAP[cleanKey];
    if (typeof app.icon === 'string' && app.icon.length <= 2) return app.icon;
  }
  return '🌿';
}

export default function PortalSwitcher() {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function loadApps() {
    setLoading(true);
    setError('');
    try {
      const list = await fetchOtherPortals();
      setApps(list);
      setLoaded(true);
    } catch (err) {
      setError(err.message || 'Could not load portals.');
    }
    setLoading(false);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) loadApps();
  }

  async function handleSwitch(appId) {
    setSwitching(appId);
    setError('');
    try {
      await switchToPortal(appId);
    } catch (err) {
      setError(err.message || 'Switch failed.');
      setSwitching(null);
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={wrapRef}>
      <button
        type="button"
        onClick={toggle}
        title="Switch to another Climeto application"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 12px',
          borderRadius: '9px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: open ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
          color: '#f1f5f9',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'Inter, sans-serif',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
      >
        <LayoutGrid size={15} color="#38bdf8" />
        <span>Switch Portal</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          width: '310px',
          maxHeight: '420px',
          overflowY: 'auto',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '14px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7)',
          zIndex: 500,
          padding: '8px',
          fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{
            padding: '8px 10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
              Climeto Applications
            </span>
            <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 600 }}>SSO Connected</span>
          </div>

          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(56, 189, 248, 0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
              Loading portals…
            </div>
          )}

          {error && (
            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#fca5a5', fontSize: '11px', margin: '4px 0' }}>
              {error}
            </div>
          )}

          {!loading && apps.map((app) => (
            <button
              key={app.appId}
              type="button"
              disabled={Boolean(switching)}
              onClick={() => handleSwitch(app.appId)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 10px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: '#f1f5f9',
                textAlign: 'left',
                cursor: switching ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
              }}>
                {renderAppIcon(app)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {app.name}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                  {switching === app.appId ? 'Opening with SSO…' : (app.description || 'Open portal')}
                </div>
              </div>
              <ExternalLink size={14} color="#64748b" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
