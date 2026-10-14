import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';

export default function NotificationCenter({ authFetch, onUnreadChange }) {
  const [rows, setRows] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      const { response, data } = await authFetch(`/api/notifications?${params.toString()}`);
      if (!response.ok || !data.success) {
        setError(data.message || 'Could not load notifications.');
      } else {
        setRows(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        if (onUnreadChange) onUnreadChange(data.unreadCount || 0);
      }
    } catch {
      setError('Could not reach the notification service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('');
  }, []);

  const openOne = async (row) => {
    setSelected(row);
    if (!row.unread) return;
    const { response, data } = await authFetch(`/api/notifications/${row._id}/read`, { method: 'POST', body: '{}' });
    if (response.ok && data.success) {
      setRows((prev) => prev.map((item) => (item._id === row._id ? { ...item, unread: false } : item)));
      setUnreadCount((count) => {
        const next = Math.max(0, count - 1);
        if (onUnreadChange) onUnreadChange(next);
        return next;
      });
      setSelected({ ...row, unread: false });
    }
  };

  const markAll = async () => {
    const { response, data } = await authFetch('/api/notifications/read-all', { method: 'POST', body: '{}' });
    if (response.ok && data.success) {
      setRows((prev) => prev.map((item) => ({ ...item, unread: false })));
      setUnreadCount(0);
      if (onUnreadChange) onUnreadChange(0);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '920px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} /> In-app notifications
          </h2>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '13px' }}>
              {unreadCount} unread. A new deal is posted in this app and sent to the Zoho Cliq channel.
            </p>
        </div>
        <button className="btn btn-outline" onClick={markAll} disabled={unreadCount === 0}>
          <CheckCheck size={14} /> Mark all read
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search deal id, counterparty, or user"
          onKeyDown={(e) => { if (e.key === 'Enter') load(search); }}
        />
        <button className="btn btn-primary" onClick={() => load(search)}>Search</button>
      </div>

      {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      {loading ? <p>Loading notifications...</p> : rows.length === 0 ? (
        <p style={{ padding: '16px', background: '#fff', borderRadius: '12px' }}>No deal notifications yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rows.map((row) => (
            <button
              key={row._id}
              onClick={() => openOne(row)}
              style={{
                textAlign: 'left',
                border: '1px solid #e2e8f0',
                background: row.unread ? '#eff6ff' : '#fff',
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <strong>{row.title} · {row.dealId}</strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{row.unread ? 'Unread' : 'Read'}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>
                {row.createdByName ? `${row.createdByName} created this deal` : 'Deal created'}
                {row.counterpartyName ? ` · ${row.counterpartyName}` : ''}
                {' · '}
                {row.zohoStatus === 'sent' ? 'Sent to Zoho Cliq' : row.zohoStatus === 'failed' ? 'Zoho Cliq was not reached' : 'Zoho Cliq pending'}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3>{selected.dealId}</h3>
              <button className="btn-icon" onClick={() => setSelected(null)}>Close</button>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.5 }}>{selected.message}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
