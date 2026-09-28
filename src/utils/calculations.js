/**
 * CORE BUSINESS LOGIC CALCULATION UTILITIES
 * 1 MT = 1000 KG. Rate is ALWAYS entered as ₹/KG.
 */

export const calculateTransactionTotal = (quantity, unit, ratePerKg) => {
  const safeUnit = unit || 'MT'; // Fallback just in case
  if (safeUnit !== 'MT' && safeUnit !== 'KG') throw new Error('Unknown unit: ' + safeUnit);
  
  const qty = Number(quantity);
  const rate = parseFloat(ratePerKg);
  
  const quantityInKg = safeUnit === 'MT' ? qty * 1000 : qty;
  
  // Use Math.round to fix floating point errors at the paise level (e.g. 11099999.999999998)
  const totalAmount = Math.round(quantityInKg * rate * 100) / 100;
  
  return {
    quantity: qty,
    unit: safeUnit,
    quantityInKg,
    ratePerKg: rate,
    totalAmount
  };
};

export const aggregateTransactions = (transactions) => {
  let totalPurchaseValue = 0;
  let totalSaleValue = 0;
  let totalPurchaseQtyMT = 0;
  let totalSaleQtyMT = 0;
  let totalPurchaseQtyKG = 0;
  let totalSaleQtyKG = 0;

  for (const tx of transactions) {
    const { quantityInKg, totalAmount } = calculateTransactionTotal(tx.quantity, tx.unit, tx.ratePerKg);
    
    if (tx.type === 'Purchase') {
      totalPurchaseValue += totalAmount;
      totalPurchaseQtyKG += quantityInKg;
    } else if (tx.type === 'Sale') {
      totalSaleValue += totalAmount;
      totalSaleQtyKG += quantityInKg;
    }
  }

  // Convert kg back to MT for display purposes if needed
  totalPurchaseQtyMT = totalPurchaseQtyKG / 1000;
  totalSaleQtyMT = totalSaleQtyKG / 1000;

  const netAmount = totalSaleValue - totalPurchaseValue;

  return {
    totalPurchaseValue,
    totalSaleValue,
    netAmount,
    totalPurchaseQtyMT,
    totalSaleQtyMT,
    totalPurchaseQtyKG,
    totalSaleQtyKG
  };
};

export const getRateSummaryForTransactions = (transactions) => {
  if (!transactions || transactions.length === 0) return { primary: '—', detail: '' };

  const { totalPurchaseValue, totalSaleValue, totalPurchaseQtyKG, totalSaleQtyKG } = aggregateTransactions(transactions);
  
  // All transactions should ideally be of the same type (Purchase or Sale) if we are calculating a rate summary
  // If it's mixed, this will be weird, so let's assume the caller filters by type first.
  const isPurchase = transactions.some(t => t.type === 'Purchase');
  
  let totalValue = isPurchase ? totalPurchaseValue : totalSaleValue;
  let totalQtyKG = isPurchase ? totalPurchaseQtyKG : totalSaleQtyKG;
  
  if (totalQtyKG === 0) return { primary: '—', detail: '' };
  
  const avgRate = totalValue / totalQtyKG;
  
  if (transactions.length === 1) {
    return {
      primary: `₹${avgRate.toFixed(1)} / KG`,
      detail: ''
    };
  }

  return {
    primary: `₹${avgRate.toFixed(2)} / KG (Avg)`,
    detail: `${transactions.length} rates`
  };
};
