import { useState, useEffect } from 'react';
import { Users, Shield, Trash2, CheckCircle, ArrowLeft, RefreshCw, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminUserManagement({ onBackToDashboard, onShowToast }) {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [newRole, setNewRole] = useState('MY_AGENT');
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, userId: null });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, data } = await authFetch('/api/admin/users');
      if (response.ok && data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.message || 'Failed to load user records.');
      }
    } catch (err) {
      setError('Network error loading users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (userId, status) => {
    try {
      const { response, data } = await authFetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });

      if (response.ok && data.success) {
        onShowToast(`User status updated to ${status}`);
        setUsers(users.map(u => (u._id === userId ? { ...u, status } : u)));
      } else {
        onShowToast(data.message || 'Status update failed.');
      }
    } catch (err) {
      onShowToast('Error updating status.');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUserForRole) return;
    try {
      const { response, data } = await authFetch(`/api/admin/users/${selectedUserForRole._id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok && data.success) {
        onShowToast(`Role updated to ${newRole}`);
        setUsers(users.map(u => (u._id === selectedUserForRole._id ? { ...u, role: newRole } : u)));
        setSelectedUserForRole(null);
      } else {
        onShowToast(data.message || 'Role change failed.');
      }
    } catch (err) {
      onShowToast('Error changing role.');
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmConfig.userId) return;
    try {
      const { response, data } = await authFetch(`/api/admin/users/${confirmConfig.userId}`, {
        method: 'DELETE',
      });

      if (response.ok && data.success) {
        onShowToast('User account deleted.');
        setUsers(users.filter(u => u._id !== confirmConfig.userId));
        setConfirmConfig({ isOpen: false, userId: null });
      } else {
        onShowToast(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      onShowToast('Error deleting user.');
    }
  };

  return (
    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Top Banner */}
      <div style={{
        background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(15,23,42,0.05)', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            padding: '12px', background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
            color: '#1d4ed8', borderRadius: '12px', boxShadow: 'inset 0 0 0 1px #bfdbfe'
          }}>
            <Users size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '0.02em' }}>
              ADMIN USER MANAGEMENT
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0', fontWeight: 500 }}>
              Manage system accounts, approve pending agents, and control access permissions.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchUsers}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
              borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff',
              color: '#334155', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <button
            onClick={onBackToDashboard}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
              borderRadius: '8px', border: 'none', background: '#2563eb',
              color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)', transition: 'all 0.2s'
            }}
          >
            <ArrowLeft size={16} /> Back to Trading Workspace
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* Users Table */}
      <div style={{
        background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(15,23,42,0.05)', overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h2 style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', margin: 0 }}>
            Registered Accounts ({users.length})
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live User Records
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['User Details', 'Contact', 'Company', 'Role', 'Status', 'Registered', 'Actions'].map((head, i) => (
                  <th key={head} style={{
                    padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569',
                    textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0',
                    textAlign: i === 6 ? 'right' : 'left'
                  }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 500 }}>
                    Loading users from database...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 500 }}>
                    No users registered in system.
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isPending = u.status === 'PENDING';
                  const isActive = u.status === 'ACTIVE';
                  const isSuspended = u.status === 'SUSPENDED';

                  return (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {/* Name & ID */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{u.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>{u.agentId || 'No Agent ID'}</div>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '14px 16px', fontSize: '0.8rem' }}>
                        <div style={{ color: '#334155', fontWeight: 600 }}>{u.email}</div>
                        <div style={{ color: '#64748b', marginTop: '2px' }}>{u.phone}</div>
                      </td>

                      {/* Company */}
                      <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                        {u.company || '—'}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                          borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                          background: u.role === 'ADMIN' ? '#dbeafe' : u.role === 'MY_AGENT' ? '#d1fae5' : '#fef3c7',
                          color: u.role === 'ADMIN' ? '#1e40af' : u.role === 'MY_AGENT' ? '#065f46' : '#92400e',
                          border: `1px solid ${u.role === 'ADMIN' ? '#bfdbfe' : u.role === 'MY_AGENT' ? '#a7f3d0' : '#fde68a'}`
                        }}>
                          <Shield size={12} /> {u.role.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
                          borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800,
                          background: isActive ? '#dcfce7' : isPending ? '#fef9c3' : '#fee2e2',
                          color: isActive ? '#166534' : isPending ? '#854d0e' : '#991b1b',
                        }}>
                          <span style={{ fontSize: '10px' }}>●</span> {u.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 16px', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                        {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          {isPending && (
                            <button
                              title="Approve User Account"
                              style={{
                                padding: '4px 10px', background: '#10b981', color: '#fff', borderRadius: '6px',
                                border: 'none', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                              }}
                              onClick={() => handleUpdateStatus(u._id, 'ACTIVE')}
                            >
                              <CheckCircle size={13} /> Approve
                            </button>
                          )}

                          {isActive && (
                            <button
                              title="Suspend User"
                              style={{
                                padding: '4px 10px', background: '#f1f5f9', color: '#475569', borderRadius: '6px',
                                border: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
                              }}
                              onClick={() => handleUpdateStatus(u._id, 'SUSPENDED')}
                            >
                              Suspend
                            </button>
                          )}

                          {isSuspended && (
                            <button
                              title="Activate User"
                              style={{
                                padding: '4px 10px', background: '#f1f5f9', color: '#10b981', borderRadius: '6px',
                                border: '1px solid #d1fae5', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
                              }}
                              onClick={() => handleUpdateStatus(u._id, 'ACTIVE')}
                            >
                              Activate
                            </button>
                          )}

                          <button
                            title="Change Role"
                            style={{ padding: '6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            onClick={() => { setSelectedUserForRole(u); setNewRole(u.role); }}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            title="Delete User"
                            style={{ padding: '6px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            onClick={() => setConfirmConfig({ isOpen: true, userId: u._id })}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {selectedUserForRole && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Change Role</h3>
              <button style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setSelectedUserForRole(null)}>
                &times;
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                Updating role for <strong style={{ color: '#0f172a' }}>{selectedUserForRole.name}</strong>
              </p>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Select New Role</label>
              <select
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', marginBottom: '24px', outline: 'none' }}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="ADMIN">ADMIN (Full System Control)</option>
                <option value="MY_AGENT">MY AGENT (Company Dealing Broker)</option>
                <option value="COUNTER_AGENT">COUNTER AGENT (Counter Party Rep)</option>
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  onClick={() => setSelectedUserForRole(null)}
                >
                  Cancel
                </button>
                <button
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  onClick={handleUpdateRole}
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmConfig.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Delete User Account</h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete this user? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmConfig({ isOpen: false, userId: null })}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
