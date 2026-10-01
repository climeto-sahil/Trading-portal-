import React from 'react';
import { Briefcase, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateTransactionTotal } from '../utils/calculations';

export default function AllDealsDashboard({ deals, transactions, counterParties, role, currentDealId, onDeleteDeal, onToggleDeal, renderDealDetails }) {
  
  const statusColors = {
    Confirmed: { bg: '#dcfce7', color: '#166534', dot: '#16a34a' },
    Enquiry: { bg: '#fef9c3', color: '#854d0e', dot: '#ca8a04' },
    Completed: { bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6' },
    Cancelled: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  };

  return (
    <div style={{ width: '100%', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ 
          width: '32px', height: '32px', borderRadius: '8px', 
          background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <Briefcase size={16} color="var(--primary)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>All Deals List</h3>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Showing {deals.length} recorded deals</div>
        </div>
      </div>

      {deals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-faint)', fontStyle: 'italic', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          No deals found matching the current filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {deals.map(deal => {
            const cp = counterParties?.find(c => c._id === deal.counterPartyId || c._id === deal.counterPartyId?._id);
            const dealTxs = transactions?.filter(t => t.dealId === deal.dealId) || [];
            
            const totalPurchase = dealTxs.filter(t => t.type === 'Purchase').reduce((s, t) => s + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
            const totalSale = dealTxs.filter(t => t.type === 'Sale').reduce((s, t) => s + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
            
            const sc = statusColors[deal.status] || { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' };
            const isExpanded = currentDealId === deal.dealId;

            return (
              <div key={deal._id || deal.dealId} style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  onClick={() => onToggleDeal(deal.dealId)}
                className="card"
                style={{
                  padding: '16px 24px', borderRadius: '12px',
                  border: isExpanded ? '1.5px solid var(--primary)' : '1.5px solid var(--border)', 
                  background: isExpanded ? 'var(--bg-subtle)' : '#fff',
                  cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '24px',
                  zIndex: 2, position: 'relative'
                }}
                onMouseEnter={e => { if(!isExpanded) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--primary-glow)'; e.currentTarget.style.background = 'var(--bg-subtle)'; } }}
                onMouseLeave={e => { if(!isExpanded) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; } }}
              >
                
                {/* Left Section: Deal Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                      {deal.dealId}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: sc.bg, color: sc.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                      {deal.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                    <span>{cp?.name || deal.counterPartyId?.name || deal.counterPartyId || 'N/A'}</span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span>{new Date(deal.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Middle Section: Stats Grid */}
                <div style={{ display: 'flex', gap: '16px', flex: 1, maxWidth: '400px' }}>
                  <div style={{ flex: 1, textAlign: 'center', background: '#f8fafc', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>TXN</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{dealTxs.length}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', background: '#eff6ff', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.05em' }}>BUY</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e40af', marginTop: '2px' }}>{totalPurchase > 0 ? `₹${(totalPurchase/100000).toFixed(1)}L` : '—'}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', background: '#faf5ff', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#9333ea', fontWeight: 700, letterSpacing: '0.05em' }}>SELL</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#7c3aed', marginTop: '2px' }}>{totalSale > 0 ? `₹${(totalSale/100000).toFixed(1)}L` : '—'}</div>
                  </div>
                </div>

                {/* Right Section: Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    className="btn btn-outline"
                    onClick={(e) => { e.stopPropagation(); onToggleDeal(deal.dealId); }}
                    style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {isExpanded ? 'Close' : 'View'}
                  </button>
                  
                  {role === 'ADMIN' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteDeal(deal); }}
                      title="Delete Deal"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                        border: 'none', borderRadius: '8px', padding: '8px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Accordion Content (Deal Details) */}
              {isExpanded && (
                <div style={{
                  background: 'var(--bg-page)',
                  border: '1.5px solid var(--primary)',
                  borderTop: 'none',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  padding: '24px',
                  marginTop: '-10px',
                  paddingTop: '34px',
                  boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.02)'
                }}>
                  {renderDealDetails(deal.dealId)}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
