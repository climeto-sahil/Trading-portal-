import { useState, useMemo, useEffect } from 'react';
import { 
  Plus, X, Edit, Edit3, Trash2, ChevronRight, ChevronDown, 
  Briefcase, FileText, IndianRupee, Eye, Users, 
  Search, Filter, MoreVertical, Copy, CheckCircle, XCircle,
  Phone, MessageSquare, Mail, MapPin, Shield, ArrowDownUp,
  ExternalLink, UserCheck, Lock, Building, Calendar, BarChart3, TrendingUp, TrendingDown,
  LogOut, User as UserIcon, RefreshCw
} from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './components/LoginPage.jsx';
import SignupPage from './components/SignupPage.jsx';
import AdminUserManagement from './components/AdminUserManagement.jsx';
import AllDealsDashboard from './components/AllDealsDashboard.jsx';
import { calculateTransactionTotal, aggregateTransactions, getRateSummaryForTransactions } from './utils/calculations.js';


const CATEGORIES = ['Cat 1', 'Cat 2', 'Cat 3'];
const MATERIAL_TYPES = ['Recycling', 'EOL'];
const CATEGORY_COMBOS = CATEGORIES.flatMap(c => MATERIAL_TYPES.map(t => ({ category: c, materialType: t, label: `${c} — ${t}` })));

const formatRate = (rate) => {
    if (!rate) return "—";
    const num = parseFloat(rate);
    return `₹${num} / KG`;
  };



  const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};


// --- DEAL ACTIONS DROPDOWN COMPONENT ---
function DealActionsDropdown({ deal, role, uniqueKey, openDropdownId, setOpenDropdownId, updateDealStatus, deleteDeal, onViewDeal, openProfile, onAddTransaction }) {
  if (!deal) return null;
  const isOpen = openDropdownId === uniqueKey;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {deal.status === 'Enquiry' && (role === 'ADMIN' || role === 'MY_AGENT') && (
        <button className="btn btn-outline" style={{ color: 'var(--success)', borderColor: 'var(--success)', padding: '2px 8px', fontSize: '0.75rem', height: '26px', minHeight: '26px' }} onClick={(e) => { e.stopPropagation(); updateDealStatus('Confirmed', deal); }}>
          Confirm Deal
        </button>
      )}
      <div className="dropdown-container" style={{ position: 'relative' }}>
        <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.75rem', height: '26px', minHeight: '26px', background: '#4f46e5' }} onClick={(e) => { e.stopPropagation(); setOpenDropdownId(isOpen ? null : uniqueKey); }}>
          Options
        </button>
        {isOpen && (
          <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, minWidth: '180px' }} onClick={e => e.stopPropagation()}>
            <button className="dropdown-item" onClick={() => { setOpenDropdownId(null); onViewDeal(deal.dealId); }}>View Deal Details</button>
            <button className="dropdown-item" onClick={() => { setOpenDropdownId(null); openProfile('Agent', deal.counterPartyAgentId); }}>View Counter Agent</button>
            <button className="dropdown-item" onClick={() => { setOpenDropdownId(null); openProfile('Agent', deal.myAgentId); }}>View My Agent</button>
            {role === 'ADMIN' && (
              <>
                <div className="divider" style={{ margin: '4px 0' }}></div>
                <button className="dropdown-item" onClick={() => { setOpenDropdownId(null); updateDealStatus('Confirmed', deal); }}>Mark as Confirmed</button>
                <button className="dropdown-item" onClick={() => { setOpenDropdownId(null); updateDealStatus('Completed', deal); }}>Mark as Completed</button>
                <button className="dropdown-item text-danger" onClick={() => { setOpenDropdownId(null); updateDealStatus('Cancelled', deal); }}>Cancel Deal</button>
                <button className="dropdown-item text-danger" onClick={() => { setOpenDropdownId(null); deleteDeal(deal); }}>Delete Deal</button>
              </>
            )}
            {(role === 'ADMIN' || role === 'MY_AGENT') && onAddTransaction && (
              <>
                <div className="divider" style={{ margin: '4px 0' }}></div>
                <button className="dropdown-item" onClick={() => { setOpenDropdownId(null); onAddTransaction(deal.dealId, 'Purchase'); }}>Add Purchase</button>
                <button className="dropdown-item" onClick={() => { setOpenDropdownId(null); onAddTransaction(deal.dealId, 'Sale'); }}>Add Sale</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- CATEGORY DASHBOARD COMPONENT ---
function CategoryDashboard({ transactions, counterParties, agents, role, deals, updateDealStatus, deleteDeal, onViewDeal, onViewTransaction, onDeleteTransaction, onEditTransaction, onProfileClick, onAddTransaction }) {
  const [expandedDeals, setExpandedDeals] = useState({});
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleDeal = (dealId) => {
    setExpandedDeals(prev => ({ ...prev, [dealId]: !prev[dealId] }));
  };

  const normalizeCat = (c) => {
    if (!c) return 'Cat 1';
    const up = c.toUpperCase();
    if (up === 'CAT 1') return 'Cat 1';
    if (up === 'CAT 2') return 'Cat 2';
    if (up === 'CAT 3') return 'Cat 3';
    if (up === 'CAT 4') return 'Cat 4';
    return c;
  };

  // Generate unique categories based on all existing transactions, fallback to standard if none
  const CATEGORIES_LIST = useMemo(() => {
    const combos = new Map();
    // Add default categories
    ['Cat 1', 'Cat 2', 'Cat 3'].forEach(c => {
      ['Recycling', 'EOL'].forEach(m => {
        combos.set(`${c}-${m}`, { label: `${c} — ${m}`, category: c, materialType: m });
      });
    });
    // Add any categories present in transactions
    transactions.forEach(t => {
      const c = normalizeCat(t.category);
      const m = t.materialType || 'Recycling';
      combos.set(`${c}-${m}`, { label: `${c} — ${m}`, category: c, materialType: m });
    });
    return Array.from(combos.values());
  }, [transactions]);

  const groupTxsByDeal = (txs) => {
    const grouped = {};
    txs.forEach(tx => {
      if(!grouped[tx.dealId]) grouped[tx.dealId] = [];
      grouped[tx.dealId].push(tx);
    });
    return grouped;
  };

  return (
    <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px', color: '#0f172a' }}>Global Category Dashboard</h2>
      
      {(() => {
        const emptyDeals = deals?.filter(d => !transactions.some(t => t.dealId === d.dealId)) || [];
        if (emptyDeals.length === 0) return null;
        return (
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '16px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Empty / Draft Deals ({emptyDeals.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#a16207', margin: '0 0 16px 0' }}>
              These deals currently have no transactions. Add a Purchase or Sale to move them into a category.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {emptyDeals.map(deal => (
                 <div key={deal.dealId} onClick={() => onViewDeal(deal.dealId)} style={{ background: '#fff', border: '1px solid #fde047', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                   <div>
                     <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#713f12', display: 'block' }}>{deal.dealId}</span>
                     <span style={{ fontSize: '0.75rem', color: '#a16207' }}>Status: {deal.status}</span>
                   </div>
                   <div onClick={e => e.stopPropagation()}>
                     <DealActionsDropdown deal={deal} role={role} uniqueKey={`empty-${deal.dealId}`} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} updateDealStatus={updateDealStatus} deleteDeal={deleteDeal} onViewDeal={onViewDeal} openProfile={onProfileClick} onAddTransaction={onAddTransaction} />
                   </div>
                 </div>
              ))}
            </div>
          </div>
        );
      })()}

      {CATEGORIES_LIST.map(combo => {
        const pTxs = transactions.filter(t => t.type === 'Purchase' && normalizeCat(t.category) === combo.category && (t.materialType || 'Recycling') === combo.materialType);
        const sTxs = transactions.filter(t => t.type === 'Sale' && normalizeCat(t.category) === combo.category && (t.materialType || 'Recycling') === combo.materialType);
        
        if (pTxs.length === 0 && sTxs.length === 0) return null;
        
        const pTxsGrouped = groupTxsByDeal(pTxs);
        const sTxsGrouped = groupTxsByDeal(sTxs);

        return (
          <div key={combo.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>{combo.label}</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '20px' }}>
              {/* Purchase Side */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #bae6fd', paddingBottom: '8px' }}>
                  <h4 style={{ color: '#0369a1', margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>PURCHASE TRANSACTIONS</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pTxs.length === 0 ? <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No purchase transactions</p> : Object.entries(pTxsGrouped).map(([dealId, txList]) => {
                    const uniqueKey = `${combo.label}-Purchase-${dealId}`;
                    const isExpanded = !!expandedDeals[uniqueKey];
                    const deal = deals?.find(d => d.dealId === dealId);
                    return (
                      <div key={dealId} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <div onClick={() => toggleDeal(uniqueKey)} style={{ cursor: 'pointer', background: '#f1f5f9', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: isExpanded ? '8px 8px 0 0' : '8px' }}>
                           <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             Deal: {dealId} <span style={{fontWeight: 'normal', color: '#64748b'}}>({txList.length})</span>
                             {(() => {
                               const qty = txList.reduce((acc, t) => acc + (Number(t.quantity)||0), 0);
                               const unit = txList[0]?.unit || 'MT';
                               const rate = txList[0]?.ratePerKg || 0;
                               return (
                                 <span style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                   <span style={{ color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', display: 'flex', gap: '4px' }}>
                                     <span style={{opacity: 0.7, fontWeight: 500}}>Qty:</span> {qty.toLocaleString()} {unit}
                                   </span>
                                   <span style={{ color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', display: 'flex', gap: '4px' }}>
                                     <span style={{opacity: 0.7, fontWeight: 500}}>Rate:</span> ₹{Number(rate).toLocaleString()} / KG
                                   </span>
                                 </span>
                               );
                             })()}
                           </span>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                             <div onClick={e => e.stopPropagation()}>
                               <DealActionsDropdown deal={deal} role={role} uniqueKey={uniqueKey} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} updateDealStatus={updateDealStatus} deleteDeal={deleteDeal} onViewDeal={onViewDeal} openProfile={onProfileClick} onAddTransaction={onAddTransaction} />
                             </div>
                             {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                           </div>
                        </div>
                        {isExpanded && (
                           <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                             {txList.map(tx => (
                                <TransactionCard key={tx._id || tx.id} tx={tx} 
                                  counterParty={counterParties.find(c => c._id === tx.counterPartyId || c.name === tx.counterPartyId?.name)}
                                  counterAgent={agents.find(a => a._id === tx.counterPartyAgentId || a.name === tx.counterPartyAgentId?.name)}
                                  myAgent={agents.find(a => a._id === tx.myAgentId || a.name === tx.myAgentId?.name)}
                                  currentUserRole={role}
                                  onView={() => onViewTransaction(tx)}
                                  onEdit={() => onEditTransaction(tx)}
                                  onDelete={() => onDeleteTransaction(tx)}
                                  onProfileClick={(type, id) => onProfileClick(type, id, tx)}
                                />
                             ))}
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sale Side */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #ddd6fe', paddingBottom: '8px' }}>
                  <h4 style={{ color: '#6d28d9', margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>SALE TRANSACTIONS</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sTxs.length === 0 ? <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No sale transactions</p> : Object.entries(sTxsGrouped).map(([dealId, txList]) => {
                    const uniqueKey = `${combo.label}-Sale-${dealId}`;
                    const isExpanded = !!expandedDeals[uniqueKey];
                    const deal = deals?.find(d => d.dealId === dealId);
                    return (
                      <div key={dealId} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        <div onClick={() => toggleDeal(uniqueKey)} style={{ cursor: 'pointer', background: '#f1f5f9', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: isExpanded ? '8px 8px 0 0' : '8px' }}>
                           <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             Deal: {dealId} <span style={{fontWeight: 'normal', color: '#64748b'}}>({txList.length})</span>
                             {(() => {
                               const qty = txList.reduce((acc, t) => acc + (Number(t.quantity)||0), 0);
                               const unit = txList[0]?.unit || 'MT';
                               const rate = txList[0]?.ratePerKg || 0;
                               return (
                                 <span style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                   <span style={{ color: '#6d28d9', background: '#f3e8ff', padding: '2px 8px', borderRadius: '4px', display: 'flex', gap: '4px' }}>
                                     <span style={{opacity: 0.7, fontWeight: 500}}>Qty:</span> {qty.toLocaleString()} {unit}
                                   </span>
                                   <span style={{ color: '#6d28d9', background: '#f3e8ff', padding: '2px 8px', borderRadius: '4px', display: 'flex', gap: '4px' }}>
                                     <span style={{opacity: 0.7, fontWeight: 500}}>Rate:</span> ₹{Number(rate).toLocaleString()} / KG
                                   </span>
                                 </span>
                               );
                             })()}
                           </span>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                             <div onClick={e => e.stopPropagation()}>
                               <DealActionsDropdown deal={deal} role={role} uniqueKey={uniqueKey} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} updateDealStatus={updateDealStatus} deleteDeal={deleteDeal} onViewDeal={onViewDeal} openProfile={onProfileClick} onAddTransaction={onAddTransaction} />
                             </div>
                             {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                           </div>
                        </div>
                        {isExpanded && (
                           <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                             {txList.map(tx => (
                                <TransactionCard key={tx._id || tx.id} tx={tx} 
                                  counterParty={counterParties.find(c => c._id === tx.counterPartyId || c.name === tx.counterPartyId?.name)}
                                  counterAgent={agents.find(a => a._id === tx.counterPartyAgentId || a.name === tx.counterPartyAgentId?.name)}
                                  myAgent={agents.find(a => a._id === tx.myAgentId || a.name === tx.myAgentId?.name)}
                                  currentUserRole={role}
                                  onView={() => onViewTransaction(tx)}
                                  onEdit={() => onEditTransaction(tx)}
                                  onDelete={() => onDeleteTransaction(tx)}
                                  onProfileClick={(type, id) => onProfileClick(type, id, tx)}
                                />
                             ))}
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {

  const { user, role, isAuthenticated, loading: authLoading, logout, authFetch } = useAuth();
  
  // Auth view: 'login' | 'signup'
  const [authView, setAuthView] = useState('login');
  
  // Dashboard view: 'workspace' | 'admin-users' | 'all-deals'
  const [activeTab, setActiveTab] = useState('all-deals');

  // Core Data States (Fetched from REST API)
  const [deals, setDeals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [counterParties, setCounterParties] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [currentDealId, setCurrentDealId] = useState(null);

  // Deal Panel
  const [isDealPanelOpen, setIsDealPanelOpen] = useState(false);
  const [dealSearchQuery, setDealSearchQuery] = useState('');
  const [dealStatusFilter, setDealStatusFilter] = useState('All');
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSummaryFilter, setActiveSummaryFilter] = useState('ALL'); // ALL, ENQUIRIES, CONFIRMED, PURCHASE, SALE
  const [dashboardMode, setDashboardMode] = useState('category'); // NEW STATE: 'deal' or 'category'
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [catFilter, setCatFilter] = useState('All');
  
  // UI States
  const [expandedCats, setExpandedCats] = useState({});
  
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalMode, setTxModalMode] = useState('add');
  const [activeTxData, setActiveTxData] = useState(null);
  
  const [dealDrawerOpen, setDealDrawerOpen] = useState(false);
  const [dealDrawerDeal, setDealDrawerDeal] = useState(null);
  
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealModalMode, setDealModalMode] = useState('edit'); // 'add', 'edit'
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [addCatForm, setAddCatForm] = useState({ category: 'Cat 2', materialType: 'Recycling', type: 'Purchase' });
  
  const [isTxDrawerOpen, setIsTxDrawerOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  
  // Profile Drawer
  const [profileDrawer, setProfileDrawer] = useState(null);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });
  const [acceptedLinkedDeals, setAcceptedLinkedDeals] = useState({});
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch data from backend on auth or tab change
  const loadTradingData = async () => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    try {
      const [dealsRes, txsRes, agentsRes, cpRes] = await Promise.all([
        authFetch('/api/deals'),
        authFetch('/api/transactions'),
        authFetch('/api/agents'),
        authFetch('/api/counterparties'),
      ]);

      const loadedDeals = dealsRes.data?.deals || [];
      const loadedTxs = txsRes.data?.transactions || [];
      const loadedAgents = agentsRes.data?.agents || [];
      const loadedCp = cpRes.data?.counterparties || [];

      setDeals(loadedDeals);
      setTransactions(loadedTxs);
      setAgents(loadedAgents);
      setCounterParties(loadedCp);

      // Default selected deal
      if (loadedDeals.length > 0 && (!currentDealId || !loadedDeals.some(d => d.dealId === currentDealId))) {
        setCurrentDealId(loadedDeals[0].dealId);
      }
    } catch (err) {
      console.error('Error fetching trading data:', err);
      showToast('Error loading live data from server.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTradingData();
    }
  }, [isAuthenticated, user?.role]);

  // Derived Data
  const currentDeal = deals.find(d => d.dealId === currentDealId || d._id === currentDealId);
  
  const currentLinkedIds = acceptedLinkedDeals[currentDealId] || [];
  
  const currentCatNames = useMemo(() => {
    if (!currentDeal) return new Set();
    return new Set([
      ...(currentDeal.categories || []).map(c => c.name),
      ...transactions.filter(t => t.dealId === currentDealId).map(t => t.category)
    ]);
  }, [currentDeal, transactions]);

  const matchingDeals = useMemo(() => {
    if (!currentDeal || currentCatNames.size === 0) return [];
    return deals.filter(d => {
      if (d.dealId === currentDealId) return false;
      if (currentLinkedIds.includes(d.dealId)) return false;
      const otherCatNames = new Set([
        ...(d.categories || []).map(c => c.name),
        ...transactions.filter(t => t.dealId === d.dealId).map(t => t.category)
      ]);
      return [...currentCatNames].some(cat => otherCatNames.has(cat));
    });
  }, [deals, currentDeal, currentCatNames, currentLinkedIds, transactions]);
  // Compute global summary for top cards
  const totalEnquiries = deals.filter(d => d.status === 'Enquiry').length;
  const totalConfirmed = deals.filter(d => d.status === 'Confirmed').length;
  const activeDealIds = new Set(deals.map(deal => deal.dealId || deal._id));
  const validTransactions = transactions.filter(t => activeDealIds.has(t.dealId));
  const globalTotalPurchase = validTransactions.filter(t => t.type === 'Purchase').reduce((sum, t) => sum + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
  const globalTotalSale = validTransactions.filter(t => t.type === 'Sale').reduce((sum, t) => sum + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
  const netAmount = globalTotalSale - globalTotalPurchase;

  // Filter transactions for main view
  const visibleTransactions = useMemo(() => {
    const activeDealIds = new Set(deals.map(deal => deal.dealId || deal._id));
    let filtered = transactions.filter(t => activeDealIds.has(t.dealId));
    
    // Summary Card Filters (Global)
    if (activeSummaryFilter === 'ENQUIRIES') {
      const enquiryDealIds = deals.filter(d => d.status === 'Enquiry').map(d => d.dealId);
      filtered = filtered.filter(t => enquiryDealIds.includes(t.dealId));
    } else if (activeSummaryFilter === 'CONFIRMED') {
      const confirmedDealIds = deals.filter(d => d.status === 'Confirmed').map(d => d.dealId);
      filtered = filtered.filter(t => confirmedDealIds.includes(t.dealId));
    } else if (activeSummaryFilter === 'PURCHASE') {
      filtered = filtered.filter(t => t.type === 'Purchase');
    } else if (activeSummaryFilter === 'SALE') {
      filtered = filtered.filter(t => t.type === 'Sale');
    }

    // Dropdown Filters
    if (statusFilter !== 'All') {
      const statusDealIds = deals.filter(d => d.status === statusFilter).map(d => d.dealId);
      filtered = filtered.filter(t => statusDealIds.includes(t.dealId));
    }
    if (typeFilter !== 'All') filtered = filtered.filter(t => t.type === typeFilter);
    if (catFilter !== 'All') {
      filtered = filtered.filter(t => `${t.category} — ${t.materialType || 'Recycling'}` === catFilter);
    }

    // Global Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const cp = counterParties.find(c => c._id === t.counterPartyId || c.name === t.counterPartyId?.name);
        const ca = agents.find(a => a._id === t.counterPartyAgentId || a.name === t.counterPartyAgentId?.name);
        const ma = agents.find(a => a._id === t.myAgentId || a.name === t.myAgentId?.name);
        return (
          t.dealId?.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query) ||
          (cp && cp.name?.toLowerCase().includes(query)) ||
          (ca && ca.name?.toLowerCase().includes(query)) ||
          (ma && ma.name?.toLowerCase().includes(query))
        );
      });
    }

    return filtered;
  }, [transactions, deals, currentDealId, activeSummaryFilter, statusFilter, typeFilter, catFilter, searchQuery, counterParties, agents]);

  const visibleDeals = useMemo(() => {
    let filteredDeals = deals;
    
    if (activeSummaryFilter === 'ENQUIRIES') filteredDeals = filteredDeals.filter(d => d.status === 'Enquiry');
    if (activeSummaryFilter === 'CONFIRMED') filteredDeals = filteredDeals.filter(d => d.status === 'Confirmed');
    
    if (statusFilter !== 'All') filteredDeals = filteredDeals.filter(d => d.status === statusFilter);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredDeals = filteredDeals.filter(deal => {
        const cp = counterParties.find(c => c._id === deal.counterPartyId || c.name === deal.counterPartyId?.name);
        return deal.dealId?.toLowerCase().includes(query) || (cp && cp.name?.toLowerCase().includes(query));
      });
    }
    
    if (typeFilter !== 'All' || catFilter !== 'All' || activeSummaryFilter === 'PURCHASE' || activeSummaryFilter === 'SALE') {
      const matchingDealIds = new Set(visibleTransactions.map(t => t.dealId));
      filteredDeals = filteredDeals.filter(d => matchingDealIds.has(d.dealId));
    }
    
    return filteredDeals;
  }, [deals, activeSummaryFilter, statusFilter, typeFilter, catFilter, searchQuery, counterParties, visibleTransactions]);

  const purchaseTxs = visibleTransactions.filter(t => t.type === 'Purchase');
  const saleTxs = visibleTransactions.filter(t => t.type === 'Sale');

  // Actions
  const toggleCategory = (type, cat) => {
    const key = `${currentDealId}-${type}-${cat}`;
    setExpandedCats(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const openTxModal = (mode, type, category = 'Cat 1', materialType = 'Recycling', tx = null) => {
    setTxModalMode(mode);
    
    setActiveTxData(mode === 'edit' ? tx : { 
      type, 
      category,
      materialType,
      counterPartyId: currentDeal?.counterPartyId?._id || currentDeal?.counterPartyId,
      counterPartyAgentId: currentDeal?.counterPartyAgentId?._id || currentDeal?.counterPartyAgentId,
      myAgentId: currentDeal?.myAgentId?._id || currentDeal?.myAgentId,
      quantity: '',
      ratePerKg: ''
    });
    setIsTxModalOpen(true);
  };

  // Real REST API: Save Transaction (Create or Update)
  const saveTransaction = async (txData) => {
    try {
      const url = txModalMode === 'add' ? '/api/transactions' : `/api/transactions/${txData._id || txData.id}`;
      const method = txModalMode === 'add' ? 'POST' : 'PUT';

      const { response, data } = await authFetch(url, {
        method,
        body: JSON.stringify(txData),
      });

      if (response.ok && data.success) {
        showToast(txModalMode === 'add' ? `Transaction added to ${txData.dealId}` : 'Transaction updated');
        setIsTxModalOpen(false);
        // When adding a new transaction, also register its category on the Deal
        if (txModalMode === 'add' && txData.dealId) {
          const parentDeal = deals.find(d => d.dealId === txData.dealId);
          if (parentDeal) {
            const catName = txData.category;
            const catType = txData.materialType || 'Recycling';
            const existingCats = parentDeal.categories || [];
            const alreadyHas = existingCats.some(c => c.name === catName && c.type === catType);
            if (!alreadyHas && catName) {
              try {
                await authFetch(`/api/deals/${parentDeal._id}/categories`, {
                  method: 'PATCH',
                  body: JSON.stringify({ category: catName, materialType: catType }),
                });
              } catch(e) { /* non-critical, categories still derived from transactions */ }
            }
          }
        }
        loadTradingData();
      } else {
        showToast(data.message || 'Error saving transaction.');
      }
    } catch (err) {
      showToast('Server error while saving transaction.');
    }
  };

  // Real REST API: Delete Transaction
  const deleteTransaction = (tx) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const id = tx._id || tx.id;
          const { response, data } = await authFetch(`/api/transactions/${id}`, {
            method: 'DELETE',
          });

          if (response.ok && data.success) {
            showToast("Transaction deleted");
            if (selectedTx && (selectedTx._id === id || selectedTx.id === id)) setIsTxDrawerOpen(false);
            loadTradingData();
          } else {
            showToast(data.message || 'Failed to delete transaction.');
          }
        } catch (err) {
          showToast('Server error deleting transaction.');
        }
      }
    });
  };

  // Real REST API: Save Deal
  const saveDeal = async (dealData) => {
    try {
      // If a deal is already open, New Deal adds Cat 2/3/EOL on the SAME page (no new DEAL id)
      if (dealModalMode === 'add' && dealData.addToExistingDeal && currentDeal) {
        const initTx = dealData.initialTransaction;
        const catName = initTx?.category || 'Cat 1';
        const catType = initTx?.materialType || 'Recycling';

        const existingCats = currentDeal.categories || [];
        const alreadyHas = existingCats.some(c => c.name === catName && c.type === catType);
        if (!alreadyHas) {
          const { response: catRes, data: catData } = await authFetch(`/api/deals/${currentDeal._id}/categories`, {
            method: 'PATCH',
            body: JSON.stringify({ category: catName, materialType: catType }),
          });
          if (!(catRes.ok && catData.success)) {
            showToast(catData.message || 'Failed to add category.');
            return;
          }
        }

        if (initTx && initTx.quantity && initTx.ratePerKg) {
          const { response: txRes, data: txData } = await authFetch('/api/transactions', {
            method: 'POST',
            body: JSON.stringify({
              ...initTx,
              dealId: currentDeal.dealId,
              counterPartyId: dealData.counterPartyId || currentDeal.counterPartyId?._id || currentDeal.counterPartyId,
              counterPartyAgentId: dealData.counterPartyAgentId || currentDeal.counterPartyAgentId?._id || currentDeal.counterPartyAgentId,
              myAgentId: dealData.myAgentId || currentDeal.myAgentId?._id || currentDeal.myAgentId,
              date: dealData.date || currentDeal.date,
              status: (dealData.status || currentDeal.status) === 'Enquiry' ? 'Enquiry' : 'Completed',
              totalAmount: calculateTransactionTotal(Number(initTx.quantity || 0), initTx.unit || 'MT', Number(initTx.ratePerKg || 0)).totalAmount,
            }),
          });
          if (!(txRes.ok && txData.success)) {
            showToast(txData.message || `${catName} — ${catType} added, but transaction failed.`);
            setIsDealModalOpen(false);
            loadTradingData();
            return;
          }
        }

        showToast(`${catName} — ${catType} added to ${currentDeal.dealId}`);
        setIsDealModalOpen(false);
        loadTradingData();
        return;
      }

      const url = dealModalMode === 'add' ? '/api/deals' : `/api/deals/${dealData._id || dealData.id}`;
      const method = dealModalMode === 'add' ? 'POST' : 'PUT';

      // Enrich dealData.categories with the initial transaction category (if any)
      let enrichedDealData = { ...dealData };
      if (dealModalMode === 'add' && dealData.initialTransaction) {
        const initCat = dealData.initialTransaction.category;
        const initMatType = dealData.initialTransaction.materialType || 'Recycling';
        const existingCats = enrichedDealData.categories || [];
        const alreadyHasCat = existingCats.some(c => c.name === initCat && c.type === initMatType);
        if (!alreadyHasCat && initCat) {
          enrichedDealData.categories = [...existingCats, { name: initCat, type: initMatType }];
        }
      }

      const { response, data } = await authFetch(url, {
        method,
        body: JSON.stringify(enrichedDealData),
      });

      if (response.ok && data.success) {
        showToast(dealModalMode === 'add' ? `Deal created: ${data.deal.dealId}` : 'Deal updated');
        setIsDealModalOpen(false);
        if (dealModalMode === 'add') {
          setCurrentDealId(data.deal.dealId);
          // If deal creation included an initial transaction, create it now!
          if (dealData.initialTransaction) {
            try {
              const createdDeal = data.deal;
              const { response: txRes, data: txData } = await authFetch('/api/transactions', {
                method: 'POST',
                body: JSON.stringify({
                  ...dealData.initialTransaction,
                  dealId: createdDeal.dealId,
                  // Use IDs from the saved deal (handles newly auto-created parties)
                  counterPartyId: createdDeal.counterPartyId?._id || createdDeal.counterPartyId || dealData.counterPartyId,
                  counterPartyAgentId: createdDeal.counterPartyAgentId?._id || createdDeal.counterPartyAgentId || dealData.counterPartyAgentId,
                  myAgentId: createdDeal.myAgentId?._id || createdDeal.myAgentId || dealData.myAgentId,
                  date: dealData.date,
                  status: dealData.status === 'Enquiry' ? 'Enquiry' : 'Completed',
                  totalAmount: calculateTransactionTotal(Number(dealData.initialTransaction.quantity || 0), dealData.initialTransaction.unit || 'MT', Number(dealData.initialTransaction.ratePerKg || 0)).totalAmount
                })
              });
              if (!(txRes.ok && txData.success)) {
                showToast(txData.message || 'Deal created, but initial transaction failed. Please add Purchase/Sale manually.');
              }
            } catch(e) {
              console.error("Failed to create initial transaction", e);
              showToast('Deal created, but initial transaction failed. Please add Purchase/Sale manually.');
            }
          }
        }
        loadTradingData();
      } else {
        showToast(data.message || 'Error saving deal.');
      }
    } catch (err) {
      showToast('Server error saving deal.');
    }
  };

  // Add Cat 2 / Cat 3 / EOL etc. to the CURRENT deal (same page — does not create a new DEAL)
  const addCategoryToCurrentDeal = async () => {
    if (!currentDeal) return;
    const { category, materialType, type } = addCatForm;
    const existingCats = currentDeal.categories || [];
    const alreadyHas = existingCats.some(c => c.name === category && c.type === materialType);
    if (alreadyHas) {
      showToast(`${category} — ${materialType} already exists on this deal`);
      setIsAddCategoryOpen(false);
      openTxModal('add', type, category, materialType);
      return;
    }
    try {
      const { response, data } = await authFetch(`/api/deals/${currentDeal._id}/categories`, {
        method: 'PATCH',
        body: JSON.stringify({ category, materialType }),
      });
      if (response.ok && data.success) {
        showToast(`${category} — ${materialType} added to ${currentDeal.dealId}`);
        setIsAddCategoryOpen(false);
        await loadTradingData();
        openTxModal('add', type, category, materialType);
      } else {
        showToast(data.message || 'Failed to add category.');
      }
    } catch (err) {
      showToast('Server error adding category.');
    }
  };

  // Real REST API: Update Deal Status
  const updateDealStatus = (status, deal = currentDeal) => {
    if (!deal) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Confirm Status Change',
      message: `Are you sure you want to mark this deal as ${status}?`,
      isDestructive: false,
      onConfirm: async () => {
        try {
          const { response, data } = await authFetch(`/api/deals/${deal._id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
          });

          if (response.ok && data.success) {
            showToast(`Deal marked as ${status}`);
            setMoreDropdownOpen(false);
            loadTradingData();
          } else {
            showToast(data.message || 'Error updating status.');
          }
        } catch (err) {
          showToast('Server error updating status.');
        }
      }
    });
  };

  // Real REST API: Delete Deal
  const deleteDeal = (dealToDelete = currentDeal) => {
    if (!dealToDelete) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Deal',
      message: 'Are you sure you want to delete this deal? All related transactions will be permanently deleted.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const { response, data } = await authFetch(`/api/deals/${dealToDelete._id}`, {
            method: 'DELETE',
          });

          if (response.ok && data.success) {
            showToast("Deal and related transactions deleted");
            setMoreDropdownOpen(false);
            setCurrentDealId(null);
            loadTradingData();
          } else {
            showToast(data.message || 'Error deleting deal.');
          }
        } catch (err) {
          showToast('Server error deleting deal.');
        }
      }
    });
  };

  const openProfile = (type, idOrObj, dealCtx = null) => {
    const targetId = typeof idOrObj === 'object' ? (idOrObj._id || idOrObj.id || idOrObj.agentId) : idOrObj;
    setProfileDrawer({ type, id: targetId, dealContext: dealCtx || currentDeal });
  };

  // Filtered deals for panel
  const filteredPanelDeals = useMemo(() => {
    let d = deals;
    if (dealStatusFilter !== 'All') d = d.filter(deal => deal.status === dealStatusFilter);
    if (dealSearchQuery.trim()) {
      const q = dealSearchQuery.toLowerCase();
      d = d.filter(deal => {
        const cp = counterParties.find(c => c._id === deal.counterPartyId || c._id === deal.counterPartyId?._id);
        return deal.dealId?.toLowerCase().includes(q) || cp?.name?.toLowerCase().includes(q);
      });
    }
    return d;
  }, [deals, dealStatusFilter, dealSearchQuery, counterParties]);

  // Authentication State Screen
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', border: '4px solid #dbeafe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#64748b', fontWeight: 600, fontSize: '14px' }}>Authenticating session...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not Logged In -> Render Login or Signup (Requirements 3 & 4)
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return <SignupPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onNavigateToSignup={() => setAuthView('signup')} />;
  }

  return (
    <div className="app-container" onClick={() => { if (moreDropdownOpen) setMoreDropdownOpen(false); }}>

      {/* ── PREMIUM HEADER ── */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #162e4d 100%)',
        padding: '0 28px', height: '64px', position: 'sticky', top: 0, zIndex: 200,
        boxShadow: '0 4px 24px rgba(15,23,42,0.4)', borderBottom: '1px solid rgba(255,255,255,0.07)',
        margin: '0 -24px', gap: '12px', fontFamily: 'Inter, sans-serif',
      }}>
        {/* Left: Brand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}
          onClick={() => setIsDealPanelOpen(true)}
          title="Browse all deals"
        >
          {/* Icon box */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,0.4)', flexShrink: 0,
          }}>
            <Briefcase size={18} color="#fff" strokeWidth={2.3} />
          </div>
          <div>
            <div style={{
              fontSize: '13px', fontWeight: 800, color: '#f1f5f9',
              letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.1,
            }}>
              TRADING PORTAL ERP
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, letterSpacing: '0.04em', marginTop: '1px' }}>
              {role === 'ADMIN' ? '⚙ Administrator Workspace' : role === 'MY_AGENT' ? '👤 My Agent Workspace' : '🤝 Counter Agent Portal'}
            </div>
          </div>
        </div>

        {/* Center: Deal Switcher + Nav Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}>

          {/* Deal Switcher Removed - User now uses the Dashboard */}

          {/* Admin Nav Tabs */}
          {role === 'ADMIN' && (
            <div style={{
              display: 'flex', gap: '4px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '4px',
            }}>
              {[['all-deals', 'Dashboard'], ['admin-users', 'Users']].map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '5px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em',
                    transition: 'all 0.2s',
                    background: activeTab === tab ? '#2563eb' : 'transparent',
                    color: activeTab === tab ? '#fff' : '#94a3b8',
                    boxShadow: activeTab === tab ? '0 2px 8px rgba(37,99,235,0.4)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: User + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

          {/* User Profile */}
          <div
            onClick={() => {
              if (user.agentId) openProfile('Agent', user.agentId);
              else showToast(`Logged in as: ${user.name} (${user.role})`);
            }}
            title="View your profile"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '100px', padding: '5px 14px 5px 5px',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
          >
            {/* Avatar */}
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1 }}>{user?.name}</div>
              <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {role?.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Refresh */}
          <button
            onClick={loadTradingData}
            disabled={dataLoading}
            title="Refresh live data"
            style={{
              width: '36px', height: '36px', borderRadius: '9px', border: 'none',
              background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <RefreshCw size={15} style={{ animation: dataLoading ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Sign out"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '9px', border: '1px solid rgba(239,68,68,0.25)',
              background: 'rgba(239,68,68,0.08)', cursor: 'pointer',
              color: '#f87171', fontSize: '12px', fontWeight: 700,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.16)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>


      {/* Render Admin User Management if tab active */}
      {role === 'ADMIN' && activeTab === 'admin-users' ? (
        <AdminUserManagement 
          onBackToDashboard={() => setActiveTab('all-deals')} 
          onShowToast={showToast} 
        />
      ) : (
        <>

              {/* Top Bar: Search, Filters, New Deal */}
              {/* Top Bar: Search, Filters, New Deal */}
              <div className="search-container" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', padding: '12px 16px', overflowX: 'auto', flexWrap: 'nowrap' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                  
                  {/* Left Side: Search Bar */}
                  <div className="search-input-wrapper" style={{ width: '220px' }}>
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search deals, counterparties..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Right Side: Filters and Button */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="filters-bar">
              <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
                <option value="All">All Statuses</option>
                <option value="Enquiry">Enquiry</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {(role === 'ADMIN' || role === 'MY_AGENT') && (
                <button className="btn btn-primary" onClick={() => { setDealModalMode('add'); setIsDealModalOpen(true); }}>
                  <Plus size={16} /> NEW DEAL
                </button>
              )}
            </div>
            </div>
            </div>

            {/* Summary Row */}
            <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: 'max-content' }}>
            <div className={`card summary-card ${activeSummaryFilter === 'ALL' ? 'active' : ''}`} style={{ padding: '8px 12px', flex: 1, minWidth: '130px' }} onClick={() => { setActiveSummaryFilter('ALL'); setCurrentDealId(deals[0]?.dealId || null); }}>
              <span className="summary-card-title flex items-center gap-2"><Briefcase size={16} /> {role === 'ADMIN' ? 'Total Deals' : 'Assigned Deals'}</span>
              <span className="summary-card-value" style={{ fontSize: '1rem' }}>{deals.length}</span>
            </div>
            <div className={`card summary-card ${activeSummaryFilter === 'ENQUIRIES' ? 'active' : ''}`} style={{ padding: '8px 12px', flex: 1, minWidth: '130px' }} onClick={() => setActiveSummaryFilter('ENQUIRIES')}>
              <span className="summary-card-title flex items-center gap-2"><FileText size={16} /> Enquiries</span>
              <span className="summary-card-value" style={{ fontSize: '1rem' }}>{totalEnquiries}</span>
            </div>
            <div className={`card summary-card ${activeSummaryFilter === 'CONFIRMED' ? 'active' : ''}`} style={{ padding: '8px 12px', flex: 1, minWidth: '130px' }} onClick={() => setActiveSummaryFilter('CONFIRMED')}>
              <span className="summary-card-title flex items-center gap-2"><CheckCircle size={16} /> Confirmed</span>
              <span className="summary-card-value" style={{ fontSize: '1rem' }}>{totalConfirmed}</span>
            </div>
            <div className={`card summary-card ${activeSummaryFilter === 'PURCHASE' ? 'active' : ''}`} style={{ padding: '8px 12px', flex: 1, minWidth: '130px', borderBottom: '3px solid var(--purchase-color)' }} onClick={() => setActiveSummaryFilter('PURCHASE')}>
              <span className="summary-card-title flex items-center gap-2"><IndianRupee size={16} /> Purchase</span>
              <span className="summary-card-value" style={{ fontSize: '1rem' }}>{formatCurrency(globalTotalPurchase)}</span>
            </div>
            <div className={`card summary-card ${activeSummaryFilter === 'SALE' ? 'active' : ''}`} style={{ padding: '8px 12px', flex: 1, minWidth: '130px', borderBottom: '3px solid var(--sale-color)' }} onClick={() => setActiveSummaryFilter('SALE')}>
              <span className="summary-card-title flex items-center gap-2"><IndianRupee size={16} /> Sale</span>
              <span className="summary-card-value" style={{ fontSize: '1rem' }}>{formatCurrency(globalTotalSale)}</span>
            </div>
            <div className="card summary-card" style={{ padding: '8px 12px', flex: 1, minWidth: '130px', borderBottom: '3px solid var(--success)' }}>
              <span className="summary-card-title flex items-center gap-2"><IndianRupee size={16} /> Net</span>
              <span className="summary-card-value" style={{ color: netAmount >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1rem' }}>
                {formatCurrency(netAmount)}
              </span>
            </div>
          </div>
        </div>
              {dashboardMode === 'category' ? (
                <CategoryDashboard 
                   transactions={visibleTransactions}
                   counterParties={counterParties}
                   agents={agents}
                   role={role}
                   deals={visibleDeals}
                   updateDealStatus={updateDealStatus}
                   deleteDeal={deleteDeal}
                   onViewDeal={(id) => {
                      const dealObj = visibleDeals.find(d => d.dealId === id);
                      if (dealObj) {
                        setDealDrawerDeal(dealObj);
                        setDealDrawerOpen(true);
                      }
                   }}
                   onViewTransaction={(tx) => { setSelectedTx(tx); setIsTxDrawerOpen(true); }}
                   onDeleteTransaction={(tx) => deleteTransaction(tx)}
                   onEditTransaction={(tx) => openTxModal('edit', tx.type, tx.category, tx.materialType, tx)}
                   onProfileClick={(type, id, tx) => openProfile(type, id, tx)}
                   onAddTransaction={(dealId, type) => {
                     setCurrentDealId(dealId);
                     openTxModal('add', type, 'Cat 1', 'Recycling');
                   }}
                />
              ) : (
              <AllDealsDashboard 
                deals={visibleDeals} 

                transactions={transactions}
                counterParties={counterParties}
                role={role}
                currentDealId={currentDealId}
                onDeleteDeal={deleteDeal}
                onToggleDeal={(id) => {
                  setCurrentDealId(prev => prev === id ? null : id);
                }}
                renderDealDetails={() => (
                  <>
                    {/* Deal Header */}
                    {currentDeal && (
                      <>
                  <div className="card deal-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2>{currentDeal.dealId}</h2>
                    <span className={`badge ${currentDeal.status === 'Confirmed' ? 'badge-success' : currentDeal.status === 'Enquiry' ? 'badge-warning' : 'badge-primary'}`}>
                      {currentDeal.status}
                    </span>
                    <span className="text-sm text-muted">({deals.length} {deals.length === 1 ? 'deal' : 'deals'} in system)</span>
                  </div>
                  
                  <div className="deal-info-grid">
                    <div className="deal-info-item">
                      <span className="text-sm text-muted">Counter Party</span>
                      <span className="font-semibold clickable-link" onClick={() => openProfile('CounterParty', currentDeal.counterPartyId)}>
                        {currentDeal.counterPartyId?.name || counterParties.find(c => c._id === currentDeal.counterPartyId)?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="deal-info-item">
                      <span className="text-sm text-muted">Counter Agent</span>
                      <span className="font-semibold clickable-link" onClick={() => openProfile('Agent', currentDeal.counterPartyAgentId)}>
                        {currentDeal.counterPartyAgentId?.name || agents.find(a => a._id === currentDeal.counterPartyAgentId)?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="deal-info-item">
                      <span className="text-sm text-muted">My Agent</span>
                      <span className="font-semibold clickable-link" onClick={() => openProfile('Agent', currentDeal.myAgentId)}>
                        {currentDeal.myAgentId?.name || agents.find(a => a._id === currentDeal.myAgentId)?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="deal-info-item">
                      <span className="text-sm text-muted">Deal Date</span>
                      <span className="font-semibold">{new Date(currentDeal.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {currentDeal.status === 'Enquiry' && (role === 'ADMIN' || role === 'MY_AGENT') && (
                    <button className="btn btn-outline" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => updateDealStatus('Confirmed')}>
                      <CheckCircle size={16}/> Confirm Deal
                    </button>
                  )}


                  {(role === 'ADMIN' || role === 'MY_AGENT') && (
                    <>
                      <button className="btn btn-outline" onClick={() => {
                          setAddCatForm({ category: 'Cat 2', materialType: 'Recycling', type: 'Purchase' });
                          setIsAddCategoryOpen(true);
                        }}>
                        <Plus size={16}/> Add Category
                      </button>
                      <button className="btn btn-outline" style={{ color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }} onClick={() => openTxModal('add', 'Purchase', CATEGORIES[0])}>
                        <Plus size={16}/> Add Purchase
                      </button>
                      <button className="btn btn-outline" style={{ color: '#6d28d9', borderColor: '#ddd6fe', background: '#faf5ff' }} onClick={() => openTxModal('add', 'Sale', CATEGORIES[0])}>
                        <Plus size={16}/> Add Sale
                      </button>
                    </>
                  )}
                  
                  {role === 'ADMIN' && (
                    <button className="btn btn-outline" onClick={() => { setDealModalMode('edit'); setIsDealModalOpen(true); }}><Edit size={16}/> Edit Deal</button>
                  )}

                  <div className="dropdown-container">
                    <button className="btn btn-primary" onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}><MoreVertical size={16}/> Options</button>
                    {moreDropdownOpen && (
                      <div className="dropdown-menu">
                        <button className="dropdown-item" onClick={() => { 
                          setMoreDropdownOpen(false); 
                          const tx = transactions.find(t => t.dealId === currentDeal.dealId);
                          if (tx) { setSelectedTx(tx); setIsTxDrawerOpen(true); }
                          else { showToast("No transactions found in this deal"); }
                        }}>
                          <Eye size={14}/> View Relationship & Details
                        </button>
                        <button className="dropdown-item" onClick={() => { 
                          setMoreDropdownOpen(false); 
                          openProfile('Agent', currentDeal.counterPartyAgentId);
                        }}>
                          <Users size={14}/> View Counter Agent Profile
                        </button>
                        <button className="dropdown-item" onClick={() => { 
                          setMoreDropdownOpen(false); 
                          openProfile('Agent', currentDeal.myAgentId);
                        }}>
                          <UserCheck size={14}/> View My Agent Profile
                        </button>

                        {role === 'ADMIN' && (
                          <>
                            <div className="divider" style={{ margin: '4px 0' }}></div>
                            <button className="dropdown-item" onClick={() => updateDealStatus('Confirmed')}><CheckCircle size={14}/> Mark as Confirmed</button>
                            <button className="dropdown-item" onClick={() => updateDealStatus('Completed')}><CheckCircle size={14}/> Mark as Completed</button>
                            <button className="dropdown-item text-danger" onClick={() => updateDealStatus('Cancelled')}><XCircle size={14}/> Cancel Deal</button>
                            <button className="dropdown-item text-danger" onClick={deleteDeal}><Trash2 size={14}/> Delete Deal</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </>
          )}

          {/* Empty State when no deals */}
          {deals.length === 0 && !dataLoading && (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              background: '#fff', borderRadius: '16px',
              border: '2px dashed #e2e8f0', margin: '24px 0',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>No Deals Yet</h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Create your first deal to get started with managing purchases and sales.</p>
              {(role === 'ADMIN' || role === 'MY_AGENT') && (
                <button className="btn btn-primary" onClick={() => { setDealModalMode('add'); setIsDealModalOpen(true); }}>
                  <Plus size={16} /> Create First Deal
                </button>
              )}
            </div>
          )}

          {/* Loading State */}
          {dataLoading && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading trading data...
            </div>
          )}

          {deals.length > 0 && currentDealId && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7.5fr) minmax(280px, 2.5fr)', gap: '20px', alignItems: 'start', marginTop: '16px' }}>
              
              {/* LEFT COLUMN: Main Columns: Purchase & Sale */}
              <div className="columns-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Now render each category as a row with 2 columns */}
                {CATEGORY_COMBOS.filter(combo => {
                    const dealCats = (deals.find(d => d.dealId === currentDealId)?.categories || []);
                    const hasDealCat = dealCats.some(cat => cat.name === combo.category && cat.type === combo.materialType);
                    const hasDealTx = visibleTransactions.some(t =>
                      t.dealId === currentDealId &&
                      t.category === combo.category &&
                      (t.materialType || 'Recycling') === combo.materialType
                    );
                    return hasDealCat || hasDealTx;
                }).map(combo => {
                    const catLabel = combo.label;
                    const pTxs = purchaseTxs.filter(t => t.dealId === currentDealId && t.category === combo.category && (t.materialType || 'Recycling') === combo.materialType);
                    const sTxs = saleTxs.filter(t => t.dealId === currentDealId && t.category === combo.category && (t.materialType || 'Recycling') === combo.materialType);
                    
                    const pAgg = aggregateTransactions(pTxs);
                    const sAgg = aggregateTransactions(sTxs);
                    
                    const pRateSummary = getRateSummaryForTransactions(pTxs);
                    const sRateSummary = getRateSummaryForTransactions(sTxs);
                    
                    const catKey = `${currentDealId}-Combo-${catLabel}`;
                    const isExpanded = expandedCats[catKey] !== false;

                    return (
                      <div key={catLabel} className="category-combined-row" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', boxShadow: 'var(--shadow-sm)' }}>
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleCategory('Combo', catLabel)} style={{ marginBottom: '12px', fontWeight: '600', fontSize: '1rem', color: 'var(--text-dark)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                          {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                          <span>{catLabel}</span>
                          <span className="badge" style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.7rem', marginLeft: '8px', padding: '2px 6px' }}>
                            {pTxs.length + sTxs.length} Transactions
                          </span>
                        </div>

                        {isExpanded && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {/* LEFT: PURCHASE BLOCK */}
                            <div className="category-group purchase-group" style={{ margin: 0, padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
                                <div className="transaction-list">
                                    {pTxs.length > 0 && (
                                      <div className="category-compact-summary" style={{ marginBottom: '12px', padding: '8px 12px' }}>
                                        <div className="cat-summary-col">
                                          <span className="cat-summary-label" style={{ fontSize: '0.7rem' }}>Total Qty:</span>
                                          <span className="cat-summary-val font-semibold" style={{ fontSize: '0.85rem' }}>{pAgg.totalPurchaseQtyMT.toLocaleString()} MT</span>
                                        </div>
                                        <div className="cat-summary-col">
                                          <span className="cat-summary-label" style={{ fontSize: '0.7rem' }}>Rate:</span>
                                          <span className="cat-summary-val font-bold text-primary" style={{ fontSize: '0.85rem' }}>{pRateSummary.primary}</span>
                                        </div>
                                        <div className="cat-summary-col">
                                          <span className="cat-summary-label" style={{ fontSize: '0.7rem' }}>Total:</span>
                                          <span className="cat-summary-val font-bold currency-text" style={{ fontSize: '0.9rem' }}>{formatCurrency(pAgg.totalPurchaseValue)}</span>
                                        </div>
                                      </div>
                                    )}
                                    {pTxs.length === 0 ? (
                                      <div className="empty-state" style={{ minHeight: '60px', padding: '12px 8px', gap: '6px' }}>
                                        <p style={{ fontSize: '0.85rem', margin: 0 }}>No purchase transactions.</p>
                                        {(role === 'ADMIN' || role === 'MY_AGENT') && (
                                          <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', minHeight: '28px', height: '28px' }} onClick={() => openTxModal('add', 'Purchase', combo.category, combo.materialType)}>+ Add Purchase</button>
                                        )}
                                      </div>
                                    ) : (
                                      pTxs.map(tx => (
                                          <TransactionCard 
                                            key={tx._id || tx.id} tx={tx} 
                                            counterParty={tx.counterPartyId?.name ? tx.counterPartyId : counterParties.find(cp => cp._id === tx.counterPartyId)}
                                            counterAgent={tx.counterPartyAgentId?.name ? tx.counterPartyAgentId : agents.find(a => a._id === tx.counterPartyAgentId)}
                                            myAgent={tx.myAgentId?.name ? tx.myAgentId : agents.find(a => a._id === tx.myAgentId)}
                                            currentUserRole={role}
                                            onView={() => { setSelectedTx(tx); setIsTxDrawerOpen(true); }}
                                            onEdit={() => openTxModal('edit', 'Purchase', tx.category, tx.materialType, tx)}
                                            onDelete={() => deleteTransaction(tx)}
                                            onProfileClick={(type, id) => openProfile(type, id, tx)}
                                          />
                                      ))
                                    )}
                                </div>
                            </div>

                            {/* RIGHT: SALE BLOCK */}
                            <div className="category-group sale-group" style={{ margin: 0, padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
                                <div className="transaction-list">
                                    {sTxs.length > 0 && (
                                      <div className="category-compact-summary" style={{ background: '#f5f3ff', borderColor: '#ddd6fe', marginBottom: '12px', padding: '8px 12px' }}>
                                        <div className="cat-summary-col">
                                          <span className="cat-summary-label" style={{ fontSize: '0.7rem' }}>Total Qty:</span>
                                          <span className="cat-summary-val font-semibold" style={{ fontSize: '0.85rem' }}>{sAgg.totalSaleQtyMT.toLocaleString()} MT</span>
                                        </div>
                                        <div className="cat-summary-col">
                                          <span className="cat-summary-label" style={{ fontSize: '0.7rem' }}>Rate:</span>
                                          <span className="cat-summary-val font-bold text-purple-600" style={{ fontSize: '0.85rem' }}>{sRateSummary.primary}</span>
                                        </div>
                                        <div className="cat-summary-col">
                                          <span className="cat-summary-label" style={{ fontSize: '0.7rem' }}>Total:</span>
                                          <span className="cat-summary-val font-bold currency-text text-purple-600" style={{ fontSize: '0.9rem' }}>{formatCurrency(sAgg.totalSaleValue)}</span>
                                        </div>
                                      </div>
                                    )}
                                    {sTxs.length === 0 ? (
                                      <div className="empty-state" style={{ minHeight: '60px', padding: '12px 8px', gap: '6px' }}>
                                        <p style={{ fontSize: '0.85rem', margin: 0 }}>No sale transactions.</p>
                                        {(role === 'ADMIN' || role === 'MY_AGENT') && (
                                          <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', minHeight: '28px', height: '28px' }} onClick={() => openTxModal('add', 'Sale', combo.category, combo.materialType)}>+ Add Sale</button>
                                        )}
                                      </div>
                                    ) : (
                                      sTxs.map(tx => (
                                          <TransactionCard 
                                            key={tx._id || tx.id} tx={tx} 
                                            counterParty={tx.counterPartyId?.name ? tx.counterPartyId : counterParties.find(cp => cp._id === tx.counterPartyId)}
                                            counterAgent={tx.counterPartyAgentId?.name ? tx.counterPartyAgentId : agents.find(a => a._id === tx.counterPartyAgentId)}
                                            myAgent={tx.myAgentId?.name ? tx.myAgentId : agents.find(a => a._id === tx.myAgentId)}
                                            currentUserRole={role}
                                            onView={() => { setSelectedTx(tx); setIsTxDrawerOpen(true); }}
                                            onEdit={() => openTxModal('edit', 'Sale', tx.category, tx.materialType, tx)}
                                            onDelete={() => deleteTransaction(tx)}
                                            onProfileClick={(type, id) => openProfile(type, id, tx)}
                                          />
                                      ))
                                    )}
                                </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                })}
              </div>

              {/* RIGHT COLUMN: Deal Matching & Portfolio */}
              <div className="linked-deals-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Suggested Matches Box */}
                {matchingDeals.length > 0 && (
                  <div style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🤝</span> Suggested Matches
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>Review and accept to link the trades.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {matchingDeals.map(md => {
                         const matchedCats = [...currentCatNames].filter(cat => {
                           const otherCatNames = new Set([
                            ...(md.categories || []).map(c => c.name),
                            ...transactions.filter(t => t.dealId === md.dealId).map(t => t.category)
                          ]);
                          return otherCatNames.has(cat);
                         }).join(', ');
                         
                         const cpName = md.counterPartyId?.name || counterParties.find(c => c._id === md.counterPartyId)?.name || 'N/A';
                         const agentName = md.counterPartyAgentId?.name || agents.find(a => a._id === md.counterPartyAgentId)?.name || 'N/A';

                         return (
                          <div key={md.dealId} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>{md.dealId}</div>
                              <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Match</span>
                            </div>
                            
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div><span style={{ color: '#94a3b8' }}>Party:</span> <span style={{ fontWeight: '500', color: '#334155' }}>{cpName}</span></div>
                              <div><span style={{ color: '#94a3b8' }}>Agent:</span> <span style={{ fontWeight: '500', color: '#334155' }}>{agentName}</span></div>
                              <div style={{ marginTop: '2px' }}><span style={{ color: '#94a3b8' }}>Matched:</span> <span style={{ fontWeight: '600', color: '#3b82f6' }}>{matchedCats}</span></div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <button className="btn btn-outline" style={{ borderColor: '#fca5a5', color: '#ef4444', padding: '4px 12px', fontSize: '0.7rem', flex: 1, minHeight: '26px', height: '26px' }} onClick={(e) => { e.target.closest('div').parentElement.style.display = 'none'; }}>Reject</button>
                              <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.7rem', flex: 1, minHeight: '26px', height: '26px' }} onClick={() => {
                                 setAcceptedLinkedDeals(prev => ({
                                   ...prev,
                                   [currentDealId]: [...(prev[currentDealId] || []), md.dealId]
                                 }));
                              }}>Accept</button>
                            </div>
                          </div>
                         );
                      })}
                    </div>
                  </div>
                )}


                {(() => {
                  const currentLinkedIds = acceptedLinkedDeals[currentDealId] || [];
                  if (currentLinkedIds.length === 0) return null;
                  
                  return (
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#065f46', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.3rem' }}>🔗</span> Linked Deals Portfolio
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#047857', marginBottom: '16px' }}>These deals are linked to the current deal. The Net Margin is calculated from their combined cross-trades.</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {currentLinkedIds.map(ldId => {
                           const ld = deals.find(d => d.dealId === ldId);
                           if (!ld) return null;
                           
                           const ldTxs = visibleTransactions.filter(t => t.dealId === ldId);
                           const pTotal = ldTxs.filter(t=>t.type==='Purchase').reduce((sum,t) => sum + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
                           const sTotal = ldTxs.filter(t=>t.type==='Sale').reduce((sum,t) => sum + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
                           const netMargin = sTotal - pTotal;
                           
                           return (
                             <div key={ldId} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #34d399' }}>
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                 <div style={{ fontWeight: '600', color: '#064e3b', fontSize: '0.95rem' }}>{ldId}</div>
                                 <div style={{ fontSize: '0.8rem', color: '#059669' }}>Status: <span style={{ fontWeight: '500' }}>{ld.status}</span></div>
                               </div>
                               <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                 <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cross-Trade Net Margin</div>
                                 <div style={{ fontWeight: '700', fontSize: '1.1rem', color: netMargin >= 0 ? '#10b981' : '#ef4444' }}>
                                   {netMargin >= 0 ? '+' : ''}{formatCurrency(netMargin)}
                                 </div>
                               </div>
                             </div>
                           );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
                  </>
                )}
              />
              )}
        </>
      )}

      {/* ── DEAL LIST PANEL ── */}
      {isDealPanelOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 900,
            background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'stretch',
          }}
          onClick={() => setIsDealPanelOpen(false)}
        >
          <div
            style={{
              width: '100%', maxWidth: '420px',
              background: '#fff', height: '100%',
              overflowY: 'auto', display: 'flex', flexDirection: 'column',
              boxShadow: '4px 0 32px rgba(15,23,42,0.15)',
              fontFamily: 'Inter, sans-serif',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div style={{
              padding: '20px 20px 16px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(135deg, #1e40af, #3730a3)',
              position: 'sticky', top: 0, zIndex: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Briefcase size={20} color="#fff" />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>All Deals</div>
                    <div style={{ fontSize: '11px', color: '#bfdbfe' }}>{deals.length} deals in system</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(role === 'ADMIN' || role === 'MY_AGENT') && (
                    <button
                      onClick={() => { setIsDealPanelOpen(false); setDealModalMode('add'); setIsDealModalOpen(true); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 700, color: '#fff',
                      }}
                    >
                      <Plus size={13} /> New Deal
                    </button>
                  )}
                  <button onClick={() => setIsDealPanelOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search by Deal ID or Counter Party..."
                  value={dealSearchQuery}
                  onChange={e => setDealSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 32px', borderRadius: '9px',
                    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: '12px', boxSizing: 'border-box',
                    outline: 'none', fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>

              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['All', 'Enquiry', 'Confirmed', 'Completed', 'Cancelled'].map(s => (
                  <button
                    key={s}
                    onClick={() => setDealStatusFilter(s)}
                    style={{
                      fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                      border: 'none', cursor: 'pointer',
                      background: dealStatusFilter === s ? '#fff' : 'rgba(255,255,255,0.12)',
                      color: dealStatusFilter === s ? '#1e40af' : '#bfdbfe',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Deal List */}
            <div style={{ flex: 1, padding: '12px' }}>
              {filteredPanelDeals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>
                  No deals match your search.
                </div>
              ) : (
                filteredPanelDeals.map(deal => {
                  const cp = counterParties.find(c => c._id === deal.counterPartyId || c._id === deal.counterPartyId?._id);
                  const dealTxs = transactions.filter(t => t.dealId === deal.dealId);
                  const totalPurchase = dealTxs.filter(t => t.type === 'Purchase').reduce((s, t) => s + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
                  const totalSale = dealTxs.filter(t => t.type === 'Sale').reduce((s, t) => s + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
                  const isCurrent = deal.dealId === currentDealId;

                  const statusColors = {
                    Confirmed: { bg: '#dcfce7', color: '#166534', dot: '#16a34a' },
                    Enquiry: { bg: '#fef9c3', color: '#854d0e', dot: '#ca8a04' },
                    Completed: { bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6' },
                    Cancelled: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
                  };
                  const sc = statusColors[deal.status] || { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' };

                  return (
                    <div
                      key={deal.dealId}
                      onClick={() => {
                        setCurrentDealId(deal.dealId);
                        setActiveSummaryFilter('ALL');
                        setIsDealPanelOpen(false);
                        showToast(`Switched to ${deal.dealId}`);
                      }}
                      style={{
                        padding: '14px', borderRadius: '12px', marginBottom: '8px',
                        border: isCurrent ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                        background: isCurrent ? '#eff6ff' : '#fff',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!isCurrent) { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.background = '#f8fafc'; } }}
                      onMouseLeave={e => { if (!isCurrent) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; } }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {deal.dealId}
                            {isCurrent && <span style={{ fontSize: '10px', fontWeight: 700, background: '#2563eb', color: '#fff', padding: '1px 7px', borderRadius: '20px' }}>ACTIVE</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{cp?.name || 'Counter Party'}</div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: sc.bg, color: sc.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                          {deal.status}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div style={{ textAlign: 'center', background: '#f8fafc', borderRadius: '8px', padding: '6px' }}>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>TXN</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{dealTxs.length}</div>
                        </div>
                        <div style={{ textAlign: 'center', background: '#eff6ff', borderRadius: '8px', padding: '6px' }}>
                          <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 600 }}>BUY</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af' }}>{totalPurchase > 0 ? `₹${(totalPurchase/100000).toFixed(1)}L` : '—'}</div>
                        </div>
                        <div style={{ textAlign: 'center', background: '#faf5ff', borderRadius: '8px', padding: '6px' }}>
                          <div style={{ fontSize: '10px', color: '#9333ea', fontWeight: 600 }}>SELL</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed' }}>{totalSale > 0 ? `₹${(totalSale/100000).toFixed(1)}L` : '—'}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>
                        {new Date(deal.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      {/* END OF ALL DEALS DASHBOARD OR CATEGORY DASHBOARD */}

      {/* Modals & Drawers */}
      {isTxModalOpen && (
        <TransactionModal 
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          mode={txModalMode}
          initialData={activeTxData}
          counterParties={counterParties}
          agents={agents}
          dealId={currentDeal?.dealId || currentDealId || (deals[0] ? deals[0].dealId : 'DEAL-000124')}
          onSubmit={saveTransaction}
        />
      )}

      {isDealModalOpen && (
        <DealModal 
          isOpen={isDealModalOpen}
          onClose={() => setIsDealModalOpen(false)}
          mode={dealModalMode}
          initialData={dealModalMode === 'edit' ? currentDeal : null}
          currentDeal={null}
          counterParties={counterParties}
          agents={agents}
          onSubmit={saveDeal}
        />
      )}


      {isAddCategoryOpen && currentDeal && (
        <div className="overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Add Category — {currentDeal.dealId}</h3>
              <button className="btn-icon" onClick={() => setIsAddCategoryOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Category will be added on this same deal page. A new deal will not be created.
              </p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={addCatForm.category}
                    onChange={e => setAddCatForm({ ...addCatForm, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Material Type</label>
                  <select
                    className="form-select"
                    value={addCatForm.materialType}
                    onChange={e => setAddCatForm({ ...addCatForm, materialType: e.target.value })}
                  >
                    {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">First Transaction Type</label>
                  <select
                    className="form-select"
                    value={addCatForm.type}
                    onChange={e => setAddCatForm({ ...addCatForm, type: e.target.value })}
                  >
                    <option value="Purchase">Purchase</option>
                    <option value="Sale">Sale</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={addCategoryToCurrentDeal}>
                  Add to This Deal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dealDrawerOpen && dealDrawerDeal && (
        <DealDetailsDrawer
          isOpen={dealDrawerOpen}
          onClose={() => setDealDrawerOpen(false)}
          deal={dealDrawerDeal}
          transactions={transactions}
          counterParties={counterParties}
          agents={agents}
          formatCurrency={formatCurrency}
          calculateTransactionTotal={calculateTransactionTotal}
        />
      )}

      {isTxDrawerOpen && selectedTx && (
        <TransactionDrawer
          isOpen={isTxDrawerOpen}
          onClose={() => setIsTxDrawerOpen(false)}
          tx={selectedTx}
          counterParty={selectedTx.counterPartyId?.name ? selectedTx.counterPartyId : counterParties.find(cp => cp._id === selectedTx.counterPartyId)}
          counterAgent={selectedTx.counterPartyAgentId?.name ? selectedTx.counterPartyAgentId : agents.find(a => a._id === selectedTx.counterPartyAgentId)}
          myAgent={selectedTx.myAgentId?.name ? selectedTx.myAgentId : agents.find(a => a._id === selectedTx.myAgentId)}
          currentUserRole={role}
          onEdit={() => { setIsTxDrawerOpen(false); openTxModal('edit', selectedTx.type, selectedTx.category, selectedTx); }}
          onDelete={() => deleteTransaction(selectedTx)}
          onProfileClick={(type, id) => openProfile(type, id, selectedTx)}
        />
      )}

      {profileDrawer && (
        <ProfileDrawer 
          isOpen={true} 
          onClose={() => setProfileDrawer(null)} 
          type={profileDrawer.type} 
          id={profileDrawer.id} 
          dealContext={profileDrawer.dealContext || currentDeal}
          currentUserRole={role}
          counterParties={counterParties} 
          agents={agents} 
          deals={deals}
          transactions={transactions}
          onSwitchProfile={(type, id) => openProfile(type, id, profileDrawer.dealContext)}
          onSelectDeal={(dealId) => {
            setCurrentDealId(dealId);
            setActiveSummaryFilter('ALL');
            setProfileDrawer(null);
            showToast(`Switched view to deal: ${dealId}`);
          }}
          onActionToast={showToast}
          onSaveProfile={async (type, id, data) => {
            const url = type === 'Agent' ? `/api/agents/${id}` : `/api/counterparties/${id}`;
            try {
              const { response, data: resData } = await authFetch(url, {
                method: 'PUT',
                body: JSON.stringify(data)
              });
              if (response.ok && resData.success) {
                showToast(`${type} profile updated successfully.`);
                loadTradingData();
                return true;
              } else {
                showToast(resData.message || 'Failed to update profile.');
                return false;
              }
            } catch (err) {
              showToast('Error updating profile.');
              return false;
            }
          }}
        />
      )}

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="toast-popup">
          <CheckCircle size={18} className="text-success" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmConfig.isOpen && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDestructive={confirmConfig.isDestructive}
          onConfirm={() => {
            if (confirmConfig.onConfirm) confirmConfig.onConfirm();
            setConfirmConfig({ ...confirmConfig, isOpen: false });
          }}
          onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// CONFIRM MODAL COMPONENT
// ----------------------------------------------------

function ConfirmModal({ title, message, onConfirm, onCancel, isDestructive }) {
  return (
    <div className="overlay" style={{ zIndex: 9999 }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        border: '1px solid #e2e8f0',
        animation: 'slideUp 0.2s ease-out'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          {title || 'Confirm Action'}
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '24px', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
              background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: isDestructive ? '#ef4444' : '#2563eb', color: '#fff',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: isDestructive ? '0 2px 8px rgba(239,68,68,0.3)' : '0 2px 8px rgba(37,99,235,0.3)'
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// DEAL RATE SUMMARY COMPONENT (Requirement 36)
// ----------------------------------------------------

function DealRateSummary({ deal, transactions }) {
  const dealTxs = transactions.filter(t => t.dealId === deal.dealId);
  const purchaseTxs = dealTxs.filter(t => t.type === 'Purchase');
  const saleTxs = dealTxs.filter(t => t.type === 'Sale');

  const totalPurchaseQty = purchaseTxs.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
  const totalPurchaseAmt = purchaseTxs.reduce((sum, t) => sum + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
  const purchaseRateSummary = getRateSummaryForTransactions(purchaseTxs);

  const totalSaleQty = saleTxs.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
  const totalSaleAmt = saleTxs.reduce((sum, t) => sum + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
  const saleRateSummary = getRateSummaryForTransactions(saleTxs);

  const dealNetAmount = totalSaleAmt - totalPurchaseAmt;

  const activeCombos = CATEGORY_COMBOS.filter(combo => {
    const hasTx = dealTxs.some(t => t.category === combo.category && (t.materialType || 'Recycling') === combo.materialType);
    const hasDealCat = (deal.categories || []).some(c => c.name === combo.category && c.type === combo.materialType);
    return hasTx || hasDealCat;
  });

  return (
    <div className="deal-rate-summary-card">
      <div className="deal-rate-summary-header">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-primary" />
          <h3 style={{ fontSize: '1.05rem', letterSpacing: '0.02em' }}>
            DEAL RATE & FINANCIAL SUMMARY — {deal.dealId}
          </h3>
        </div>
        <span className="badge badge-primary">{dealTxs.length} Transactions</span>
      </div>

      <div className="deal-rate-overview-grid">
        {/* PURCHASE BOX */}
        <div className="rate-overview-box purchase">
          <div className="rate-overview-title" style={{ color: '#0369a1' }}>
            <span>PURCHASE</span>
            <TrendingDown size={16} />
          </div>
          <div className="rate-overview-row">
            <span className="text-muted">Total Quantity:</span>
            <span className="font-bold">{totalPurchaseQty.toLocaleString()} MT</span>
          </div>
          <div className="rate-overview-row">
            <span className="text-muted">Purchase Rate:</span>
            <span className="font-bold text-primary">{purchaseRateSummary.primary}</span>
          </div>
          {purchaseRateSummary.detail && (
            <div style={{ fontSize: '0.72rem', color: '#0284c7', marginBottom: '4px' }}>
              {purchaseRateSummary.detail}
            </div>
          )}
          <div className="rate-overview-row" style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #bae6fd' }}>
            <span className="font-semibold">Total Purchase:</span>
            <span className="font-bold currency-text text-primary" style={{ fontSize: '1.1rem' }}>
              {formatCurrency(totalPurchaseAmt)}
            </span>
          </div>
        </div>

        {/* SALE BOX */}
        <div className="rate-overview-box sale">
          <div className="rate-overview-title" style={{ color: '#6d28d9' }}>
            <span>SALE</span>
            <TrendingUp size={16} />
          </div>
          <div className="rate-overview-row">
            <span className="text-muted">Total Quantity:</span>
            <span className="font-bold">{totalSaleQty.toLocaleString()} MT</span>
          </div>
          <div className="rate-overview-row">
            <span className="text-muted">Sale Rate:</span>
            <span className="font-bold text-purple-600">{saleRateSummary.primary}</span>
          </div>
          {saleRateSummary.detail && (
            <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginBottom: '4px' }}>
              {saleRateSummary.detail}
            </div>
          )}
          <div className="rate-overview-row" style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #ddd6fe' }}>
            <span className="font-semibold">Total Sale:</span>
            <span className="font-bold currency-text text-purple-600" style={{ fontSize: '1.1rem' }}>
              {formatCurrency(totalSaleAmt)}
            </span>
          </div>
        </div>

        {/* NET BOX */}
        <div className="rate-overview-box net">
          <div className="rate-overview-title" style={{ color: '#15803d' }}>
            <span>NET MARGIN</span>
            <IndianRupee size={16} />
          </div>
          <div className="rate-overview-row">
            <span className="text-muted">Sale Value:</span>
            <span className="font-semibold">{formatCurrency(totalSaleAmt)}</span>
          </div>
          <div className="rate-overview-row">
            <span className="text-muted">Purchase Cost:</span>
            <span className="font-semibold">{formatCurrency(totalPurchaseAmt)}</span>
          </div>
          <div className="rate-overview-row" style={{ marginTop: '14px', paddingTop: '6px', borderTop: '1px solid #bbf7d0' }}>
            <span className="font-bold">NET:</span>
            <span className={`font-bold currency-text ${dealNetAmount >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.25rem' }}>
              {dealNetAmount >= 0 ? `+${formatCurrency(dealNetAmount)}` : formatCurrency(dealNetAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Category-Wise Breakdown
      </h4>
      <div style={{ overflowX: 'auto' }}>
        <table className="deal-breakdown-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Purchase Qty</th>
              <th>Purchase Rate</th>
              <th>Total Purchase</th>
              <th>Sale Qty</th>
              <th>Sale Rate</th>
              <th>Total Sale</th>
              <th>Net Category</th>
            </tr>
          </thead>
          <tbody>
            {activeCombos.map(combo => {
              const comboLabel = combo.label;
              const pTxs = purchaseTxs.filter(t =>
                t.category === combo.category &&
                (t.materialType || 'Recycling') === combo.materialType
              );
              const sTxs = saleTxs.filter(t =>
                t.category === combo.category &&
                (t.materialType || 'Recycling') === combo.materialType
              );
              const pQty = pTxs.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
              const pAmt = pTxs.reduce((sum, t) => sum + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
              const sQty = sTxs.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
              const sAmt = sTxs.reduce((sum, t) => sum + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
              const netCat = sAmt - pAmt;

              const pRate = getRateSummaryForTransactions(pTxs);
              const sRate = getRateSummaryForTransactions(sTxs);

              return (
                <tr key={comboLabel}>
                  <td><strong>{comboLabel}</strong></td>
                  <td>{pQty > 0 ? `${pQty.toLocaleString()} MT` : '—'}</td>
                  <td className="text-primary font-semibold">{pRate.primary}</td>
                  <td>{pAmt > 0 ? formatCurrency(pAmt) : '—'}</td>
                  <td>{sQty > 0 ? `${sQty.toLocaleString()} MT` : '—'}</td>
                  <td className="text-purple-600 font-semibold">{sRate.primary}</td>
                  <td>{sAmt > 0 ? formatCurrency(sAmt) : '—'}</td>
                  <td>
                    <strong style={{ color: netCat >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {netCat !== 0 ? (netCat > 0 ? `+${formatCurrency(netCat)}` : formatCurrency(netCat)) : '₹0'}
                    </strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TRANSACTION CARD COMPONENT (Requirement 31, 32, 35)
// ----------------------------------------------------

function TransactionCard({ tx, counterParty, counterAgent, myAgent, currentUserRole, onView, onEdit, onDelete, onProfileClick }) {
  const isPurchase = tx.type === 'Purchase';

  return (
    <div className={`transaction-card ${tx.type.toLowerCase()}`} onClick={onView} style={{ padding: '8px 10px', gap: '4px', display: 'flex', flexDirection: 'column' }}>
      <div className="tx-header" style={{ marginBottom: '4px', paddingLeft: 0 }}>
        <span className="tx-company clickable-link" style={{ fontSize: '0.85rem' }} onClick={(e) => { e.stopPropagation(); onProfileClick('CounterParty', counterParty); }}>
          {counterParty?.name || 'Counter Party'}
        </span>
        <span className={`badge ${isPurchase ? 'badge-primary' : 'badge-warning'}`} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>{tx.type}</span>
      </div>
      
      {/* Prominent Rate & Quantity & Total */}
      <div className="tx-details-prominent" style={{ marginBottom: '6px' }}>
        <div className="tx-prominent-item" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
          <span className="prominent-label" style={{ fontSize: '0.7rem' }}>Quantity:</span>
          <span className="prominent-value">{Number(tx.quantity).toLocaleString()} {tx.unit || 'MT'}</span>
        </div>

        <div className={`tx-prominent-item rate-highlight ${isPurchase ? 'purchase' : 'sale'}`} style={{ padding: '4px 8px' }}>
          <span className="prominent-label font-semibold" style={{ fontSize: '0.7rem' }}>
            {isPurchase ? 'Purchase Rate:' : 'Sale Rate:'}
          </span>
          <span className="prominent-rate-value" style={{ fontSize: '0.85rem' }}>
            {formatRate(tx.ratePerKg)}
          </span>
        </div>

        <div className="tx-prominent-item total-highlight" style={{ padding: '4px 8px' }}>
          <span className="prominent-label font-bold" style={{ fontSize: '0.7rem' }}>
            {isPurchase ? 'Total Purchase:' : 'Total Sale:'}
          </span>
          <span className={`prominent-total-value currency-text ${isPurchase ? 'text-primary' : 'text-purple-600'}`} style={{ fontSize: '0.9rem' }}>
            {formatCurrency(tx.totalAmount)}
          </span>
        </div>
      </div>
      
      {/* Quick View Agent Rows */}
      <div className="tx-agents-quickview" style={{ padding: '6px 8px', marginBottom: '6px' }} onClick={(e) => e.stopPropagation()}>
        <div className="tx-agent-row" style={{ padding: 0, fontSize: '0.7rem' }}>
          <span className="text-muted">Counter Agent:</span>
          <div className="tx-agent-name-wrap">
            <span className="font-semibold">{counterAgent?.name || 'N/A'}</span>
            <button className="btn-view-details" style={{ fontSize: '0.65rem' }} onClick={() => onProfileClick('Agent', counterAgent)}>View</button>
          </div>
        </div>
        <div className="tx-agent-row" style={{ padding: 0, fontSize: '0.7rem', marginTop: '2px' }}>
          <span className="text-muted">My Agent:</span>
          <div className="tx-agent-name-wrap">
            <span className="font-semibold">{myAgent?.name || 'N/A'}</span>
            <button className="btn-view-details" style={{ fontSize: '0.65rem' }} onClick={() => onProfileClick('Agent', myAgent)}>View</button>
          </div>
        </div>
      </div>

      <div className="tx-actions" style={{ paddingTop: '6px', marginTop: 0, display: 'flex', gap: '4px', justifyContent: 'center' }}>
        <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={(e) => { e.stopPropagation(); onView(); }}><Eye size={12}/> View</button>
        {(currentUserRole === 'ADMIN' || currentUserRole === 'MY_AGENT') && (
          <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit size={12}/> Edit</button>
        )}
        {currentUserRole === 'ADMIN' && (
          <button className="btn btn-ghost text-danger" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 size={12}/> Delete</button>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TRANSACTION MODAL COMPONENT (Requirements 34, 35, 37)
// ----------------------------------------------------

function TransactionModal({ isOpen, onClose, mode, initialData, counterParties, agents, dealId, onSubmit }) {
  const allDeals = []; // not needed here since dealId is passed
  const [formData, setFormData] = useState({
    dealId: initialData?.dealId || dealId,
    type: initialData?.type || 'Purchase',
    category: initialData?.category || 'Cat 1',
    materialType: initialData?.materialType || 'Recycling',
    counterPartyId: initialData?.counterPartyId?.name || (counterParties.find(cp => cp._id === initialData?.counterPartyId)?.name) || '',
    counterPartyAgentId: initialData?.counterPartyAgentId?.name || (agents.find(a => a._id === initialData?.counterPartyAgentId)?.name) || '',
    myAgentId: initialData?.myAgentId?.name || (agents.find(a => a._id === initialData?.myAgentId)?.name) || '',
    quantity: initialData?.quantity !== undefined ? initialData.quantity : '',
    unit: initialData?.unit || 'MT',
    ratePerKg: initialData?.ratePerKg !== undefined ? initialData.ratePerKg : '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'Confirmed'
  });

  const totalAmount = useMemo(() => {
    const q = Number(formData.quantity);
    const r = parseFloat(formData.ratePerKg);
    if (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) return calculateTransactionTotal(q, formData.unit, r).totalAmount;
    return 0;
  }, [formData.quantity, formData.unit, formData.ratePerKg]);

  if (!isOpen) return null;

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>
            {mode === 'edit' ? 'Edit' : 'Add'} {formData.type} Transaction — {formData.category} ({formData.materialType})
          </h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <form className="form-grid" onSubmit={(e) => {
            e.preventDefault();

            // Map text inputs back to IDs if they match existing entities
            const matchedCp = counterParties.find(cp => cp.name === formData.counterPartyId || cp._id === formData.counterPartyId);
            const matchedCpAgent = agents.find(a => a.name === formData.counterPartyAgentId || a._id === formData.counterPartyAgentId);
            const matchedMyAgent = agents.find(a => a.name === formData.myAgentId || a._id === formData.myAgentId);

            onSubmit({
              ...initialData,
              ...formData,
              counterPartyId: matchedCp ? matchedCp._id : formData.counterPartyId,
              counterPartyAgentId: matchedCpAgent ? matchedCpAgent._id : formData.counterPartyAgentId,
              myAgentId: matchedMyAgent ? matchedMyAgent._id : formData.myAgentId,
              quantity: Number(formData.quantity),
              unit: formData.unit,
              ratePerKg: parseFloat(formData.ratePerKg),
              totalAmount,
            });
          }}>
            <div className="form-group full-width" style={{ display: 'flex', gap: '16px', background: 'var(--background)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div><span className="text-sm text-muted">Type:</span> <strong className={formData.type === 'Purchase' ? 'text-primary' : 'text-purple-600'}>{formData.type}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="text-sm text-muted">Category:</span> 
                {mode === 'add' ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select 
                      value={formData.materialType} 
                      onChange={e => setFormData({...formData, materialType: e.target.value})}
                      style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ) : (
                  <strong>{formData.category} — {formData.materialType}</strong>
                )}
              </div>
              <div><span className="text-sm text-muted">Deal ID:</span> <strong>{formData.dealId}</strong></div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Counter Party</label>
              <input 
                className="form-input" 
                list="tx-counter-parties-list"
                value={formData.counterPartyId} 
                onChange={e => setFormData({...formData, counterPartyId: e.target.value})}
                placeholder="Select or type a new counter party..."
                required
              />
              <datalist id="tx-counter-parties-list">
                {counterParties.map(cp => <option key={cp._id || cp.id} value={cp.name}>{cp.city || 'N/A'}</option>)}
              </datalist>
            </div>
            
            <div className="form-group">
              <label className="form-label">Counter Party Agent</label>
              <input 
                className="form-input" 
                list="tx-counter-agents-list"
                value={formData.counterPartyAgentId} 
                onChange={e => setFormData({...formData, counterPartyAgentId: e.target.value})}
                placeholder="Select or type a new agent..."
                required
              />
              <datalist id="tx-counter-agents-list">
                {agents.filter(a => a.agentType === 'Counter Party Agent').map(a => <option key={a._id || a.id} value={a.name}>{a.city || 'Counter Agent'}</option>)}
                {agents.filter(a => a.agentType !== 'Counter Party Agent').map(a => <option key={a._id || a.id} value={a.name}>{a.agentType}</option>)}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label">My Agent</label>
              <input 
                className="form-input" 
                list="tx-my-agents-list"
                value={formData.myAgentId} 
                onChange={e => setFormData({...formData, myAgentId: e.target.value})}
                placeholder="Select or type a new agent..."
                required
              />
              <datalist id="tx-my-agents-list">
                {agents.filter(a => a.agentType === 'My Agent').map(a => <option key={a._id || a.id} value={a.name}>My Agent</option>)}
                {agents.filter(a => a.agentType !== 'My Agent').map(a => <option key={a._id || a.id} value={a.name}>{a.agentType}</option>)}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label font-semibold">Quantity (MT)</label>
              <input 
                type="number" 
                className="form-input" 
                value={formData.quantity} 
                onChange={e => setFormData({...formData, quantity: e.target.value})} 
                required 
                min="0.001"
                step="0.001"
                placeholder="e.g. 10" 
              />
            </div>

            <div className="form-group">
              <label className="form-label font-semibold">
                {formData.type === 'Purchase' ? 'Purchase Rate (₹/kg)' : 'Sale Rate (₹/kg)'}
              </label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                value={formData.ratePerKg} 
                onChange={e => setFormData({...formData, ratePerKg: e.target.value})} 
                required 
                min="0.01" 
                placeholder="e.g. 42" 
              />
            </div>

            <div className="form-group full-width" style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label font-bold" style={{ margin: 0 }}>
                  {formData.type === 'Purchase' ? 'Total Purchase' : 'Total Sale'}
                </label>
                {formData.quantity && formData.ratePerKg && (
                  <span className="badge badge-primary">
                    {Number(formData.quantity).toLocaleString()} {formData.unit} × {formData.unit === 'MT' ? '1000 × ' : ''}₹{parseFloat(formData.ratePerKg)}/KG
                  </span>
                )}
              </div>
              <input 
                type="text" 
                className="form-input currency-text" 
                value={formatCurrency(totalAmount)} 
                disabled 
                style={{ fontSize: '1.4rem', fontWeight: 'bold', color: formData.type === 'Purchase' ? 'var(--primary)' : '#9333ea', background: 'white' }} 
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Notes (Optional)</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="e.g. High grade material, payment terms 30 days..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                style={{ resize: 'vertical', minHeight: '60px' }}
              />
            </div>

            <div className="form-group full-width" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">{mode === 'edit' ? 'Save Changes' : `Add ${formData.type}`}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// DEAL MODAL COMPONENT
// ----------------------------------------------------

function DealModal({ isOpen, onClose, mode, initialData, currentDeal, counterParties, agents, onSubmit }) {
  // When a deal is already open, New Deal adds category on the SAME page
  const addingToCurrent = mode === 'add' && !!currentDeal;

  const existingCombos = (currentDeal?.categories || []).map(c => `${c.name}|${c.type}`);
  const nextCombo = CATEGORY_COMBOS.find(c => !existingCombos.includes(`${c.category}|${c.materialType}`)) || CATEGORY_COMBOS[0];

  const [formData, setFormData] = useState({
    status: initialData?.status || currentDeal?.status || 'Enquiry',
    date: initialData?.date || currentDeal?.date || new Date().toISOString(),
    counterPartyId: initialData?.counterPartyId?.name
      || currentDeal?.counterPartyId?.name
      || (counterParties.find(cp => cp._id === (initialData?.counterPartyId || currentDeal?.counterPartyId))?.name)
      || '',
    counterPartyAgentId: initialData?.counterPartyAgentId?.name
      || currentDeal?.counterPartyAgentId?.name
      || (agents.find(a => a._id === (initialData?.counterPartyAgentId || currentDeal?.counterPartyAgentId))?.name)
      || '',
    myAgentId: initialData?.myAgentId?.name
      || currentDeal?.myAgentId?.name
      || (agents.find(a => a._id === (initialData?.myAgentId || currentDeal?.myAgentId))?.name)
      || '',
    notes: initialData?.notes || '',
  });

  const [includeInitialTx, setIncludeInitialTx] = useState(mode === 'add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txData, setTxData] = useState({
    type: 'Purchase',
    category: addingToCurrent ? nextCombo.category : CATEGORIES[0],
    materialType: addingToCurrent ? nextCombo.materialType : MATERIAL_TYPES[0],
    quantity: '',
    unit: 'MT',
    ratePerKg: '',
  });

  if (!isOpen) return null;

  return (
    <div className="overlay" style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>
            {mode === 'edit'
              ? `Edit Deal — ${initialData.dealId}`
              : addingToCurrent
                ? `Create New Deal — ${currentDeal.dealId}`
                : 'Create New Deal'}
          </h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <form className="form-grid" onSubmit={async (e) => {
            e.preventDefault();
            if (isSubmitting) return;
            setIsSubmitting(true);
            
            // Map text inputs back to IDs if they match existing entities
            const matchedCp = counterParties.find(cp => cp.name === formData.counterPartyId || cp._id === formData.counterPartyId);
            const matchedCpAgent = agents.find(a => a.name === formData.counterPartyAgentId || a._id === formData.counterPartyAgentId);
            const matchedMyAgent = agents.find(a => a.name === formData.myAgentId || a._id === formData.myAgentId);

            try {
              await onSubmit({ 
                ...initialData, 
                ...formData,
                counterPartyId: matchedCp ? matchedCp._id : formData.counterPartyId,
                counterPartyAgentId: matchedCpAgent ? matchedCpAgent._id : formData.counterPartyAgentId,
                myAgentId: matchedMyAgent ? matchedMyAgent._id : formData.myAgentId,
                addToExistingDeal: addingToCurrent,
                initialTransaction: (mode === 'add' && includeInitialTx) ? txData : (addingToCurrent ? txData : null)
              });
            } finally {
              setIsSubmitting(false);
            }
          }}>
            <div className="form-group full-width">
              <label className="form-label">Deal Status</label>
              <select className="form-select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="Enquiry">Enquiry</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            
            <div className="form-group full-width">
              <label className="form-label">Counter Party</label>
              <input 
                className="form-input" 
                list="counter-parties-list"
                value={formData.counterPartyId} 
                onChange={e => setFormData({...formData, counterPartyId: e.target.value})}
                placeholder="Select or type a new counter party..."
              />
              <datalist id="counter-parties-list">
                {counterParties.map(cp => <option key={cp._id || cp.id} value={cp.name}>{cp.city || 'N/A'}</option>)}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label">Counter Party Agent</label>
              <input 
                className="form-input" 
                list="counter-agents-list"
                value={formData.counterPartyAgentId} 
                onChange={e => setFormData({...formData, counterPartyAgentId: e.target.value})}
                placeholder="Select or type a new agent..."
              />
              <datalist id="counter-agents-list">
                {agents.map(a => <option key={a._id || a.id} value={a.name}>{a.agentType}</option>)}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label">My Agent</label>
              <input 
                className="form-input" 
                list="my-agents-list"
                value={formData.myAgentId} 
                onChange={e => setFormData({...formData, myAgentId: e.target.value})}
                placeholder="Select or type a new agent..."
              />
              <datalist id="my-agents-list">
                {agents.map(a => <option key={a._id || a.id} value={a.name}>{a.agentType}</option>)}
              </datalist>
            </div>
            
            {mode === 'add' && (
              <div className="form-group full-width" style={{ marginTop: '16px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                {!addingToCurrent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <input 
                    type="checkbox" 
                    id="includeTx" 
                    checked={includeInitialTx} 
                    onChange={e => setIncludeInitialTx(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="includeTx" style={{ fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.95rem' }}>
                    Add Initial Transaction Detail
                  </label>
                </div>
                )}
                
                {(includeInitialTx || addingToCurrent) && (
                  <div style={{ 
                    background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', 
                    padding: '20px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid #cbd5e1', 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '16px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div className="form-group">
                      <label className="form-label">Type</label>
                      <select className="form-select" value={txData.type} onChange={e => setTxData({...txData, type: e.target.value})}>
                        <option value="Purchase">Purchase</option>
                        <option value="Sale">Sale</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <select className="form-select" value={txData.category} onChange={e => setTxData({...txData, category: e.target.value})}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="form-select" value={txData.materialType} onChange={e => setTxData({...txData, materialType: e.target.value})}>
                          {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Quantity</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="e.g. 10" 
                          value={txData.quantity} 
                          onChange={e => setTxData({...txData, quantity: e.target.value})}
                          required={includeInitialTx || addingToCurrent}
                          min="0.001"
                          step="0.001"
                          style={{ flex: 1 }}
                        />
                        <select 
                          className="form-select" 
                          value={txData.unit} 
                          onChange={e => setTxData({...txData, unit: e.target.value})}
                          style={{ width: '80px' }}
                        >
                          <option value="MT">MT</option>
                          <option value="KG">KG</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Rate (₹/kg)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="e.g. 150" 
                        value={txData.ratePerKg} 
                        onChange={e => setTxData({...txData, ratePerKg: e.target.value})}
                        required={includeInitialTx || addingToCurrent}
                        min="0.01" step="0.01"
                      />
                    </div>
                    
                    <div className="form-group full-width">
                      <div style={{ 
                        padding: '14px 16px', 
                        background: txData.type === 'Purchase' ? 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' : 'linear-gradient(135deg, #faf5ff, #f3e8ff)', 
                        borderRadius: '8px', 
                        border: txData.type === 'Purchase' ? '1px solid #bae6fd' : '1px solid #e9d5ff', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}>
                        <span style={{ 
                          fontSize: '0.85rem', 
                          color: txData.type === 'Purchase' ? '#0369a1' : '#6d28d9', 
                          fontWeight: 700, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em' 
                        }}>
                          Calculated Total Amount
                        </span>
                        <span style={{ 
                          fontSize: '1.25rem', 
                          color: txData.type === 'Purchase' ? '#0369a1' : '#6d28d9', 
                          fontWeight: 800 
                        }}>
                          {(() => { try { return formatCurrency(calculateTransactionTotal(Number(txData.quantity) || 0, txData.unit || 'MT', Number(txData.ratePerKg) || 0).totalAmount); } catch(e) { return '₹0'; } })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="form-group full-width" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className="animate-spin" />
                    {mode === 'edit' ? 'Saving...' : 'Creating...'}
                  </span>
                ) : (
                  mode === 'edit' ? 'Save Changes' : 'Create Deal'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// DEAL DETAILS DRAWER
// ----------------------------------------------------
function DealDetailsDrawer({ isOpen, onClose, deal, transactions, counterParties, agents, formatCurrency, calculateTransactionTotal }) {
  if (!isOpen || !deal) return null;
  const dealTxs = transactions.filter(t => t.dealId === deal.dealId);
  const totalPurchase = dealTxs.filter(t => t.type === 'Purchase').reduce((s, t) => s + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
  const totalSale = dealTxs.filter(t => t.type === 'Sale').reduce((s, t) => s + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
  const netAmount = totalSale - totalPurchase;
  
  const cp = counterParties.find(c => c._id === deal.counterPartyId || c._id === deal.counterPartyId?._id);
  const ca = agents.find(a => a._id === deal.counterPartyAgentId || a._id === deal.counterPartyAgentId?._id);
  const ma = agents.find(a => a._id === deal.myAgentId || a._id === deal.myAgentId?._id);

  return (
    <div className="overlay" style={{ justifyContent: 'flex-end', zIndex: 2000 }} onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>Deal Relationship & Details</h3>
            <span className="text-sm text-muted">ID: {deal.dealId}</span>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="drawer-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <span className={`badge ${deal.status === 'Confirmed' ? 'badge-success' : deal.status === 'Enquiry' ? 'badge-warning' : 'badge-primary'}`}>
               {deal.status}
             </span>
             <span className="text-sm text-muted">Created: {new Date(deal.date).toLocaleDateString()}</span>
           </div>

           <div className="relationship-container">
             <div className="rel-header"><span>Relationship & Finances</span></div>
             
             <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Counter Party:</span>
                  <span className="font-semibold">{cp?.name || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Counter Agent:</span>
                  <span className="font-semibold">{ca?.name || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">My Agent:</span>
                  <span className="font-semibold">{ma?.name || 'N/A'}</span>
                </div>
                <hr style={{ borderColor: '#e2e8f0', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Total Purchase:</span>
                  <span className="font-semibold" style={{ color: 'var(--purchase-color)' }}>{formatCurrency(totalPurchase)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Total Sale:</span>
                  <span className="font-semibold" style={{ color: 'var(--sale-color)' }}>{formatCurrency(totalSale)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, marginTop: '8px' }}>
                  <span>Net Margin:</span>
                  <span style={{ color: netAmount >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(netAmount)}</span>
                </div>
             </div>
           </div>
           
           <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
             <h4 style={{ margin: '0 0 12px 0', color: '#065f46', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span>🔗</span> Linked Deals Portfolio
             </h4>
             <p style={{ fontSize: '0.85rem', color: '#047857', margin: 0 }}>
               View full deal portfolio and matches in the main Deals dashboard mode. For now, this is a summary of the current deal.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TRANSACTION DRAWER WITH AGENT ↔ AGENT RELATIONSHIP (Req 28)
// ----------------------------------------------------

function TransactionDrawer({ isOpen, onClose, tx, counterParty, counterAgent, myAgent, currentUserRole, onEdit, onDelete, onProfileClick }) {
  if (!isOpen) return null;
  const isPurchase = tx.type === 'Purchase';

  return (
    <div className="overlay" style={{ justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>Transaction Details</h3>
            <span className="text-sm text-muted">ID: {tx.txId || tx._id} | Deal: {tx.dealId}</span>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="drawer-content">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <span className={`badge ${isPurchase ? 'badge-primary' : 'badge-warning'}`}>{tx.type}</span>
            <span className="badge badge-success">{tx.status}</span>
            <span className="badge">{tx.category}</span>
          </div>

          {/* AGENT ↔ AGENT RELATIONSHIP VIEW (Req 28) */}
          <div className="relationship-container">
            <div className="rel-header">
              <span>Agent ↔ Agent Relationship</span>
              <span className="badge badge-primary">{tx.dealId}</span>
            </div>

            {/* MY AGENT BOX */}
            <div className="relationship-agent-card" onClick={() => onProfileClick('Agent', myAgent)}>
              <div className="rel-agent-tag my">My Agent</div>
              <div className="rel-agent-name">
                <span>{myAgent?.name || 'Unassigned'}</span>
                <span className="btn-view-details">View Profile &rarr;</span>
              </div>
              <div className="rel-agent-meta">
                <span>📞 {myAgent?.phone || 'N/A'}</span>
                <span>📍 {myAgent?.city ? `${myAgent.city}, ${myAgent.state || ''}` : 'Location unlisted'}</span>
              </div>
            </div>

            {/* CONNECTOR */}
            <div className="rel-connector">
              <span className="rel-deal-badge">
                <ArrowDownUp size={14} /> ↕ DEAL ({tx.dealId})
              </span>
            </div>

            {/* COUNTER AGENT BOX */}
            <div className="relationship-agent-card" onClick={() => onProfileClick('Agent', counterAgent)}>
              <div className="rel-agent-tag counter">Counter Agent</div>
              <div className="rel-agent-name">
                <span>{counterAgent?.name || 'Unassigned'}</span>
                <span className="btn-view-details">View Profile &rarr;</span>
              </div>
              <div className="rel-agent-meta">
                <span>📞 {counterAgent?.phone || 'N/A'}</span>
                <span>📍 {counterAgent?.city ? `${counterAgent.city}, ${counterAgent.state || ''}` : 'Location unlisted'}</span>
              </div>
            </div>
          </div>

          {/* COUNTER PARTY */}
          <h4 style={{ margin: '20px 0 10px 0' }} className="flex items-center gap-2"><Briefcase size={16}/> Counter Party</h4>
          <div className="card" style={{ marginBottom: '20px', cursor: 'pointer' }} onClick={() => onProfileClick('CounterParty', counterParty)}>
            <div className="font-semibold" style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{counterParty?.name}</div>
            <div className="text-sm text-muted">Contact Person: {counterParty?.contactPerson || 'N/A'}</div>
            <div className="text-sm text-muted">GST: {counterParty?.gstNumber || 'N/A'}</div>
            <div className="text-sm text-primary" style={{ marginTop: '8px', fontWeight: '500' }}>View Counter Party Profile &rarr;</div>
          </div>

          {/* FINANCIALS */}
          <h4 style={{ margin: '20px 0 12px 0' }}>Financials</h4>
          <div className="detail-row">
            <span className="detail-label">Quantity</span>
            <span className="detail-value">{Number(tx.quantity).toLocaleString()} {tx.unit || 'MT'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{isPurchase ? 'Purchase Rate / kg' : 'Sale Rate / kg'}</span>
            <span className={`detail-value font-bold ${isPurchase ? 'text-primary' : 'text-purple-600'}`}>
              {formatRate(tx.ratePerKg)}
            </span>
          </div>
          <div className="detail-row" style={{ backgroundColor: 'var(--background)', padding: '12px', borderRadius: 'var(--radius-sm)', marginTop: '8px' }}>
            <span className="detail-label font-bold">{isPurchase ? 'Total Purchase' : 'Total Sale'}</span>
            <span className={`detail-value font-bold currency-text ${isPurchase ? 'text-primary' : 'text-purple-600'}`} style={{ fontSize: '1.25rem' }}>
              {formatCurrency(tx.totalAmount)}
            </span>
          </div>

          <div className="divider"></div>
          <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
            {(currentUserRole === 'ADMIN' || currentUserRole === 'MY_AGENT') && (
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={onEdit}><Edit size={16}/> Edit Transaction</button>
            )}
            {currentUserRole === 'ADMIN' && (
              <button className="btn btn-outline text-danger" style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--danger-light)' }} onClick={onDelete}><Trash2 size={16}/> Delete Transaction</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// DETAILED AGENT PROFILE DRAWER (Requirements 26, 27, 29, 30)
// ----------------------------------------------------

function ProfileDrawer({ 
  isOpen, onClose, type, id, dealContext, currentUserRole, 
  counterParties, agents, deals, transactions, onSwitchProfile, onSelectDeal, onActionToast, onSaveProfile
}) {
  const [historyFilter, setHistoryFilter] = useState('All');
  const [historySortOrder, setHistorySortOrder] = useState('Newest');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const isAgent = type === 'Agent';
  const profile = isAgent 
    ? agents.find(a => a._id === id || a.agentId === id || a.id === id) 
    : counterParties.find(c => c._id === id || c.id === id);

  useEffect(() => {
    // Only update editForm when profile changes
    if (profile && !isEditing) {
      setEditForm(profile);
    }
  }, [profile, isEditing]);

  if (!isOpen) return null;

  if (!profile) {
    return (
      <div className="overlay" style={{ justifyContent: 'flex-end' }} onClick={onClose}>
        <div className="drawer" onClick={e => e.stopPropagation()}>
          <div className="drawer-header">
            <h3>Profile Not Found</h3>
            <button className="btn-icon" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="drawer-content">
            <p className="text-muted">The requested profile could not be located.</p>
          </div>
        </div>
      </div>
    );
  }

  const isCounterAgent = isAgent && profile.agentType === 'Counter Party Agent';
  const isMyAgent = isAgent && profile.agentType === 'My Agent';

  let permissionNotice = '';
  if (currentUserRole === 'ADMIN') {
    permissionNotice = 'Full Access: As Administrator, you have unrestricted access to all agent records and private financials.';
  } else if (currentUserRole === 'MY_AGENT') {
    permissionNotice = isCounterAgent 
      ? 'Authorized Access: Viewing Counter Agent profile associated with assigned trading deal.'
      : 'Authorized Access: Viewing My Agent profile.';
  } else if (currentUserRole === 'COUNTER_AGENT') {
    permissionNotice = isMyAgent
      ? 'Restricted View: Viewing My Agent coordinator details. Confidential internal broker metrics are masked.'
      : 'Authorized Access: Viewing your own assigned agent details.';
  }

  const allRelatedTxs = transactions.filter(t => {
    if (isAgent) {
      const myId = t.myAgentId?._id || t.myAgentId;
      const counterId = t.counterPartyAgentId?._id || t.counterPartyAgentId;
      return myId === profile._id || myId === profile.id || counterId === profile._id || counterId === profile.id;
    }
    const cpId = t.counterPartyId?._id || t.counterPartyId;
    return cpId === profile._id || cpId === profile.id;
  });

  const filteredHistory = allRelatedTxs.filter(tx => {
    const parentDeal = deals.find(d => d.dealId === tx.dealId);
    const status = parentDeal ? parentDeal.status : tx.status;
    
    if (historyFilter === 'All') return true;
    if (historyFilter === 'Purchase') return tx.type === 'Purchase';
    if (historyFilter === 'Sale') return tx.type === 'Sale';
    if (historyFilter === 'Active') return status === 'Confirmed' || status === 'Enquiry';
    if (historyFilter === 'Completed') return status === 'Completed';
    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return historySortOrder === 'Newest' ? dateB - dateA : dateA - dateB;
  });

  const totalPurchaseValue = profile.totalPurchaseValue || allRelatedTxs.filter(t => t.type === 'Purchase').reduce((sum, t) => sum + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
  const totalSaleValue = profile.totalSaleValue || allRelatedTxs.filter(t => t.type === 'Sale').reduce((sum, t) => sum + calculateTransactionTotal(Number(t.quantity), t.unit, t.ratePerKg).totalAmount, 0);
  const totalDealsCount = profile.dealsManaged || profile.totalDeals || new Set(allRelatedTxs.map(t => t.dealId)).size;
  const activeDealsCount = profile.activeDeals || 4;
  const completedDealsCount = profile.completedDeals || 12;
  const cancelledDealsCount = profile.cancelledDeals || 2;

  const currentDealTx = (dealContext ? transactions.find(t => t.dealId === dealContext.dealId) : null) || allRelatedTxs[0] || transactions[0];
  const currentDealObj = dealContext || (currentDealTx ? deals.find(d => d.dealId === currentDealTx.dealId) : null);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    if (onSaveProfile) {
      const success = await onSaveProfile(type, profile._id || profile.id, editForm);
      if (success) setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleCall = () => {
    if (profile.phone) {
      window.location.href = `tel:${profile.phone.replace(/\s+/g, '')}`;
      onActionToast(`Initiating call to ${profile.name} (${profile.phone})`);
    } else {
      onActionToast('No phone number available');
    }
  };

  const handleWhatsApp = () => {
    if (profile.phone) {
      const cleanPhone = profile.phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
      onActionToast(`Opening WhatsApp chat with ${profile.name}`);
    } else {
      onActionToast('No WhatsApp number available');
    }
  };

  const handleEmail = () => {
    if (profile.email) {
      window.location.href = `mailto:${profile.email}`;
      onActionToast(`Composing email to ${profile.email}`);
    } else {
      onActionToast('No email address available');
    }
  };

  const handleViewAddress = () => {
    const fullAddr = `${profile.address || ''}, ${profile.city || ''}, ${profile.state || ''}`.trim();
    navigator.clipboard?.writeText(fullAddr);
    onActionToast(`Address copied to clipboard: ${fullAddr}`);
  };

  return (
    <div className="overlay" style={{ justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="drawer" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>
              {isCounterAgent ? 'COUNTER AGENT PROFILE' : isMyAgent ? 'MY AGENT PROFILE' : 'COUNTER PARTY PROFILE'}
            </h3>
            <span className="text-sm text-muted">ID: {profile.agentId || profile._id || profile.id}</span>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="drawer-content">
          <div className="permission-banner info">
            <Shield size={16} />
            <span>{permissionNotice}</span>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                {isEditing ? (
                  <input className="form-input" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '4px' }} />
                ) : (
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>{profile.name}</h2>
                )}
                <div className="text-muted" style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Building size={14} /> 
                  {isEditing ? (
                    <input className="form-input" style={{ padding: '2px 8px' }} value={editForm.company || ''} onChange={e => setEditForm({...editForm, company: e.target.value})} />
                  ) : (
                    profile.company || profile.name
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span className="badge badge-success">● {profile.status || 'Active'}</span>
                <span className={`badge ${isMyAgent ? 'badge-primary' : 'badge-warning'}`}>
                  {profile.agentType || (isAgent ? 'Agent' : 'Counter Party')}
                </span>
                {!isEditing && currentUserRole === 'ADMIN' && (
                  <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', marginTop: '4px' }} onClick={() => setIsEditing(true)}>
                    <Edit3 size={14} /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="contact-actions-grid">
              <button className="contact-action-btn call" onClick={handleCall}>
                <Phone size={15} /> <span>[Call]</span>
              </button>
              <button className="contact-action-btn whatsapp" onClick={handleWhatsApp}>
                <MessageSquare size={15} /> <span>[WhatsApp]</span>
              </button>
              <button className="contact-action-btn email" onClick={handleEmail}>
                <Mail size={15} /> <span>[Email]</span>
              </button>
              <button className="contact-action-btn address" onClick={handleViewAddress}>
                <MapPin size={15} /> <span>[View Address]</span>
              </button>
            </div>

            <div className="detail-row">
              <span className="detail-label">Mobile Number</span>
              <span className="detail-value">
                {isEditing ? <input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} /> : profile.phone}
              </span>
            </div>
            {(profile.alternatePhone || isEditing) && (
              <div className="detail-row">
                <span className="detail-label">Alternate Number</span>
                <span className="detail-value">
                  {isEditing ? <input className="form-input" value={editForm.alternatePhone || ''} onChange={e => setEditForm({...editForm, alternatePhone: e.target.value})} /> : profile.alternatePhone}
                </span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">{profile.email || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Address</span>
              <span className="detail-value">
                {isEditing ? <input className="form-input" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} /> : profile.address}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">City</span>
              <span className="detail-value">
                {isEditing ? <input className="form-input" value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} /> : (profile.city || 'Indore')}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">State</span>
              <span className="detail-value">
                {isEditing ? <input className="form-input" value={editForm.state || ''} onChange={e => setEditForm({...editForm, state: e.target.value})} /> : (profile.state || 'Madhya Pradesh')}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">GST / Business Details</span>
              <span className="detail-value font-mono">
                {isEditing ? <input className="form-input" value={editForm.gstNumber || ''} onChange={e => setEditForm({...editForm, gstNumber: e.target.value})} /> : (profile.gstNumber || '23AABCB1234C1Z5')}
              </span>
            </div>
            <div className="detail-row"><span className="detail-label">Agent ID</span><span className="detail-value">{profile.agentId || profile._id || profile.id}</span></div>
            <div className="detail-row">
              <span className="detail-label">Commission</span>
              <span className="detail-value font-semibold text-primary">
                {isEditing ? <input className="form-input" value={editForm.commission || ''} onChange={e => setEditForm({...editForm, commission: e.target.value})} /> : (profile.commission || '₹0.50 / KG')}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value font-semibold">
                {isEditing ? (
                  <select className="form-select" value={editForm.status || 'Active'} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                ) : (
                  <span className={profile.status === 'Inactive' ? 'text-danger' : 'text-success'}>{profile.status || 'Active'}</span>
                )}
              </span>
            </div>
            {isEditing && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}
          </div>

          {currentDealObj && currentDealTx && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '12px' }} className="flex items-center gap-2">
                <Briefcase size={16} /> DEAL INFORMATION
              </h4>
              <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid var(--primary)' }}>
                <div className="detail-row">
                  <span className="detail-label">Current Deal</span>
                  <span className="detail-value font-bold clickable-link" onClick={() => onSelectDeal(currentDealObj.dealId)}>
                    {currentDealObj.dealId} &rarr;
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Deal Status</span>
                  <span className="badge badge-success">{currentDealObj.status ? currentDealObj.status.toUpperCase() : 'CONFIRMED'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Category</span>
                  <span className="detail-value font-semibold">{currentDealTx.category || 'Cat 1'} — {currentDealTx.materialType || 'Recycling'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Transaction</span>
                  <span className={`badge ${currentDealTx.type === 'Purchase' ? 'badge-primary' : 'badge-warning'}`}>
                    {(currentDealTx.type || 'PURCHASE').toUpperCase()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Quantity</span>
                  <span className="detail-value">{currentDealTx.quantity ? currentDealTx.quantity.toLocaleString() : '10'} MT</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{currentDealTx.type === 'Purchase' ? 'Purchase Rate' : 'Sale Rate'}</span>
                  <span className="detail-value font-semibold">{formatRate(currentDealTx.ratePerKg || 42)}</span>
                </div>
                <div className="detail-row" style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px dashed var(--border)' }}>
                  <span className="detail-label font-bold">{currentDealTx.type === 'Purchase' ? 'Total Purchase' : 'Total Sale'}</span>
                  <span className="detail-value font-bold currency-text text-primary" style={{ fontSize: '1.15rem' }}>
                    {formatCurrency(currentDealTx.totalAmount || 420000)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '12px' }} className="flex items-center gap-2">
              <FileText size={16} /> {isCounterAgent ? 'COUNTER AGENT HISTORY' : isMyAgent ? 'MY AGENT PERFORMANCE' : 'BUSINESS HISTORY'}
            </h4>
            <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div className="card summary-card" style={{ padding: '12px' }}>
                <span className="summary-card-title">Total Deals</span>
                <span className="summary-card-value" style={{ fontSize: '1.3rem' }}>{totalDealsCount}</span>
              </div>
              <div className="card summary-card" style={{ padding: '12px' }}>
                <span className="summary-card-title">Active Deals</span>
                <span className="summary-card-value text-primary" style={{ fontSize: '1.3rem' }}>{activeDealsCount}</span>
              </div>
              <div className="card summary-card" style={{ padding: '12px' }}>
                <span className="summary-card-title">Completed Deals</span>
                <span className="summary-card-value" style={{ color: 'var(--success)', fontSize: '1.3rem' }}>{completedDealsCount}</span>
              </div>
              <div className="card summary-card" style={{ padding: '12px' }}>
                <span className="summary-card-title">Cancelled Deals</span>
                <span className="summary-card-value text-muted" style={{ fontSize: '1.3rem' }}>{cancelledDealsCount}</span>
              </div>
              <div className="card summary-card" style={{ padding: '12px' }}>
                <span className="summary-card-title">Total Purchase Value</span>
                <span className="summary-card-value" style={{ fontSize: '1.05rem', color: 'var(--purchase-color)' }}>
                  {formatCurrency(totalPurchaseValue)}
                </span>
              </div>
              <div className="card summary-card" style={{ padding: '12px' }}>
                <span className="summary-card-title">Total Sale Value</span>
                <span className="summary-card-value" style={{ fontSize: '1.05rem', color: 'var(--sale-color)' }}>
                  {formatCurrency(totalSaleValue)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 className="flex items-center gap-2">
                <Briefcase size={16} /> {isCounterAgent ? 'COUNTER AGENT DEAL HISTORY' : 'DEAL HISTORY'} ({filteredHistory.length})
              </h4>
              <button 
                className="btn btn-ghost text-sm" 
                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                onClick={() => setHistorySortOrder(historySortOrder === 'Newest' ? 'Oldest' : 'Newest')}
              >
                Sort: {historySortOrder}
              </button>
            </div>

            <div className="history-filter-bar">
              <button 
                className={`history-filter-pill ${historyFilter === 'All' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('All')}
              >
                All Deals
              </button>
              <button 
                className={`history-filter-pill ${historyFilter === 'Purchase' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('Purchase')}
              >
                Purchase
              </button>
              <button 
                className={`history-filter-pill ${historyFilter === 'Sale' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('Sale')}
              >
                Sale
              </button>
              <button 
                className={`history-filter-pill ${historyFilter === 'Active' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('Active')}
              >
                Active
              </button>
              <button 
                className={`history-filter-pill ${historyFilter === 'Completed' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('Completed')}
              >
                Completed
              </button>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <p>No deals match the filter "{historyFilter}".</p>
              </div>
            ) : (
              <div>
                {filteredHistory.map(tx => {
                  const parentDeal = deals.find(d => d.dealId === tx.dealId);
                  const isCurrent = currentDealObj?.dealId === tx.dealId;

                  return (
                    <div 
                      key={tx._id || tx.id} 
                      className="deal-history-card"
                      style={isCurrent ? { borderColor: 'var(--primary)', background: '#f0f9ff' } : {}}
                    >
                      <div className="deal-history-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong className="clickable-link" onClick={() => onSelectDeal(tx.dealId)}>
                            {tx.dealId}
                          </strong>
                          <span className="badge">{tx.category}</span>
                          {isCurrent && <span className="badge badge-primary">Current</span>}
                        </div>
                        <span className={`badge ${tx.type === 'Purchase' ? 'badge-primary' : 'badge-warning'}`}>
                          {tx.type}
                        </span>
                      </div>

                      <div className="deal-history-grid">
                        <div>
                          <span className="text-muted">Quantity:</span>
                          <div className="font-semibold">{Number(tx.quantity).toLocaleString()} {tx.unit || 'MT'}</div>
                        </div>
                        <div>
                          <span className="text-muted">{tx.type === 'Purchase' ? 'Purchase Rate:' : 'Sale Rate:'}</span>
                          <div className="font-semibold">{formatRate(tx.ratePerKg)}</div>
                        </div>
                        <div>
                          <span className="text-muted">{tx.type === 'Purchase' ? 'Total Purchase:' : 'Total Sale:'}</span>
                          <div className="font-semibold text-primary">{formatCurrency(tx.totalAmount)}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Status: <strong className="text-main">{parentDeal?.status || tx.status || 'Confirmed'}</strong></span>
                        <span>Date: {new Date(tx.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
              Close Profile
            </button>
            {isCounterAgent && (
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={() => {
                  const counterpart = counterParties.find(cp => cp._id === profile.id || cp.agentId === profile.agentId);
                  if (counterpart) onSwitchProfile('CounterParty', counterpart);
                  else onActionToast(`Associated Counter Party: ABC Recycling Pvt Ltd`);
                }}
              >
                View Counter Party
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
