import { calculateTransactionTotal } from '../utils/calculations.js';
import { remarkForMessage } from '../utils/remark.js';

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  return inr.format(Math.round(n));
}

export function formatKolkata(date) {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function line(label, value) {
  const text = value == null ? '' : String(value).trim();
  if (!text || text === 'undefined' || text === 'null' || text === 'NaN') return '';
  return `• ${label}: ${text}`;
}

function nameOf(ref) {
  if (!ref) return '';
  if (typeof ref === 'string') return '';
  return ref.name || '';
}

export function pricingFromTransactions(transactions = []) {
  const rows = [];
  for (const tx of transactions) {
    try {
      const calc = calculateTransactionTotal(Number(tx.quantity), tx.unit || 'MT', tx.ratePerKg);
      const qtyMt = (tx.unit || 'MT') === 'KG' ? calc.quantity / 1000 : calc.quantity;
      rows.push({
        type: tx.type,
        category: tx.category,
        materialType: tx.materialType || 'Recycling',
        ratePerKg: calc.ratePerKg,
        quantityMT: qtyMt,
        totalAmount: calc.totalAmount,
      });
    } catch {
      // skip rows that cannot be priced with the existing rules
    }
  }
  return rows;
}

export function renderDealMessage({ eventType, deal, actorName, transactions = [] }) {
  const prices = pricingFromTransactions(transactions);
  const purchase = prices.filter((p) => p.type === 'Purchase');
  const sale = prices.filter((p) => p.type === 'Sale');
  const primary = purchase[0] || sale[0] || prices[0];
  const dealType = purchase.length && sale.length ? 'Purchase & Sale' : primary?.type || '';
  const category = [...new Set(prices.map((p) => p.category).filter(Boolean))].join(', ')
    || (deal?.categories || []).map((c) => c.name).filter(Boolean).join(', ');
  const materialType = [...new Set(prices.map((p) => p.materialType).filter(Boolean))].join(', ')
    || (deal?.categories || []).map((c) => c.type).filter(Boolean).join(', ');

  const qty = prices.reduce((s, p) => s + (Number(p.quantityMT) || 0), 0);
  const total = prices.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
  const rates = [...new Set(prices.map((p) => p.ratePerKg).filter((n) => Number.isFinite(n)))];

  const cp = deal?.counterPartyId;
  const agent = deal?.myAgentId;
  const contact = cp?.phone || agent?.phone || '';
  const address = [cp?.address, cp?.city, cp?.state].filter(Boolean).join(', ');

  const title = eventType === 'DEAL_CONFIRMED'
    ? 'DEAL CONFIRMED — TRADING PORTAL'
    : eventType === 'DEAL_UPDATED'
      ? 'DEAL UPDATED — TRADING PORTAL'
      : eventType === 'ENQUIRY_CREATED'
        ? 'ENQUIRY CREATED — TRADING PORTAL'
        : eventType === 'TEST'
          ? 'TEST NOTIFICATION — TRADING PORTAL'
          : 'NEW DEAL CREATED — TRADING PORTAL';

  const blocks = [
    `🔔 *${title}*`,
    '━━━━━━━━━━━━━━━━━━',
    deal?.dealId ? `🆔 *Deal ID:* ${deal.dealId}` : '',
    formatKolkata(deal?.createdAt || deal?.date) ? `📅 *Date:* ${formatKolkata(deal?.createdAt || deal?.date)}` : '',
    actorName ? `👤 *Created By:* ${actorName}` : '',
    '',
    '*Deal Details*',
    line('Deal Type', dealType),
    line('Deal Status', deal?.status),
    line('Category', category),
    line('Material Type', materialType),
    '',
    '*Business Details*',
    line('Counterparty', nameOf(cp)),
    line('Own Agent', nameOf(agent)),
    line('Contact', contact),
    line('Address', address),
    '',
    '*Pricing & Quantity*',
    rates.length ? `• Rate: ₹${rates.map((r) => formatInr(r)).join(', ')} / kg` : '',
    qty > 0 ? `• Quantity: ${qty.toLocaleString('en-IN')} MT` : '',
    total > 0 ? `• Total Amount: ₹${formatInr(total)}` : '',
    remarkForMessage(deal?.remark),
    '━━━━━━━━━━━━━━━━━━',
    '📌 *Source:* Trading Portal',
    `🔔 *Event:* ${eventType || 'DEAL_CREATED'}`,
    '',
    'This is an automated notification.',
  ];

  const renderedMessage = blocks.filter((row, i, arr) => {
    if (row !== '') return true;
    return arr[i - 1] !== '';
  }).join('\n').trim();

  return { renderedMessage, dealType, counterpartyName: nameOf(cp) };
}
