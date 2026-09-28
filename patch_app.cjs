const fs = require('fs');
let content = fs.readFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', 'utf8');

// 1. Import helpers at the top
content = content.replace(
  `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';`,
  `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';\nimport { calculateTransactionTotal, aggregateTransactions, getRateSummaryForTransactions } from './utils/calculations.js';`
);

// 2. Remove legacy helpers
content = content.replace(
  `const convertToKg = (quantity, unit) => {\n  if (unit === 'MT') return Number(quantity) * 1000;\n  return Number(quantity);\n};\n\nconst calculateTotal = (quantity, unit, ratePerKg) => {\n  return convertToKg(quantity, unit) * parseFloat(ratePerKg);\n};\n\nconst formatCurrency = (amount) => {\n  if (amount === undefined || amount === null) return '₹0';\n  return '₹' + amount.toLocaleString('en-IN');\n};`,
  `const formatCurrency = (amount) => {\n  if (amount === undefined || amount === null) return '₹0';\n  return '₹' + amount.toLocaleString('en-IN');\n};`
);

// 3. Update global dashboard aggregation
content = content.replace(
  `  const totalPurchaseValue = validTransactions.filter(t => t.type === 'Purchase').reduce((sum, t) => sum + calculateTotal(Number(t.quantity), t.unit, t.ratePerKg), 0);\n  const totalSaleValue = validTransactions.filter(t => t.type === 'Sale').reduce((sum, t) => sum + calculateTotal(Number(t.quantity), t.unit, t.ratePerKg), 0);\n  const netAmount = totalSaleValue - totalPurchaseValue;`,
  `  const aggregatedGlobal = aggregateTransactions(validTransactions);\n  const totalPurchaseValue = aggregatedGlobal.totalPurchaseValue;\n  const totalSaleValue = aggregatedGlobal.totalSaleValue;\n  const netAmount = aggregatedGlobal.netAmount;`
);

// 4. Update deal rate summary aggregation (around line 1370)
content = content.replace(
  `  const purchaseTxs = dealTxs.filter(t => t.type === 'Purchase');\n  const totalPurchaseQty = purchaseTxs.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);\n  const totalPurchaseAmt = purchaseTxs.reduce((sum, t) => sum + calculateTotal(Number(t.quantity), t.unit, t.ratePerKg), 0);\n  const purchaseRateSummary = getRateSummary(purchaseTxs, 'Purchase');\n\n  const saleTxs = dealTxs.filter(t => t.type === 'Sale');\n  const totalSaleQty = saleTxs.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);\n  const totalSaleAmt = saleTxs.reduce((sum, t) => sum + calculateTotal(Number(t.quantity), t.unit, t.ratePerKg), 0);\n  const saleRateSummary = getRateSummary(saleTxs, 'Sale');\n\n  const netAmount = totalSaleAmt - totalPurchaseAmt;`,
  `  const purchaseTxs = dealTxs.filter(t => t.type === 'Purchase');\n  const saleTxs = dealTxs.filter(t => t.type === 'Sale');\n\n  const aggDeal = aggregateTransactions(dealTxs);\n  const totalPurchaseQty = aggDeal.totalPurchaseQtyMT;\n  const totalPurchaseAmt = aggDeal.totalPurchaseValue;\n  const purchaseRateSummary = getRateSummaryForTransactions(purchaseTxs);\n\n  const totalSaleQty = aggDeal.totalSaleQtyMT;\n  const totalSaleAmt = aggDeal.totalSaleValue;\n  const saleRateSummary = getRateSummaryForTransactions(saleTxs);\n\n  const netAmount = aggDeal.netAmount;`
);

// 5. Replace Category Purchase / Sale aggregation in tables
content = content.replace(
  `                const totalQty = txs.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);\n                const totalAmt = txs.reduce((sum, t) => sum + calculateTotal(Number(t.quantity), t.unit, t.ratePerKg), 0);\n                const rateSummary = getRateSummary(txs, 'Purchase');`,
  `                const aggCat = aggregateTransactions(txs);\n                const totalQty = aggCat.totalPurchaseQtyMT;\n                const totalAmt = aggCat.totalPurchaseValue;\n                const rateSummary = getRateSummaryForTransactions(txs);`
);

content = content.replace(
  `                const totalQty = txs.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);\n                const totalAmt = txs.reduce((sum, t) => sum + calculateTotal(Number(t.quantity), t.unit, t.ratePerKg), 0);\n                const rateSummary = getRateSummary(txs, 'Sale');`,
  `                const aggCat = aggregateTransactions(txs);\n                const totalQty = aggCat.totalSaleQtyMT;\n                const totalAmt = aggCat.totalSaleValue;\n                const rateSummary = getRateSummaryForTransactions(txs);`
);

// 6. Update getRateSummary definition to simply point to the helper, or remove it entirely if no longer used. Let's just remove the old getRateSummary since we use the new helper everywhere.
content = content.replace(
  `const getRateSummary = (transactions, type) => {\n    if (transactions.length === 0) return { primary: '—', detail: '' };\n    \n    const totalValue = transactions.reduce((sum, t) => sum + calculateTotal(Number(t.quantity), t.unit, t.ratePerKg), 0);\n    const totalKg = transactions.reduce((sum, t) => sum + convertToKg(t.quantity, t.unit), 0);\n    \n    if (totalKg === 0) return { primary: '—', detail: '' };\n    \n    const avgRate = totalValue / totalKg;\n    \n    if (transactions.length === 1) {\n      return {\n        primary: \`₹\${avgRate.toFixed(1)} / KG\`,\n        detail: ''\n      };\n    }\n\n    return {\n      primary: \`₹\${avgRate.toFixed(2)} / KG (Avg)\`,\n      detail: \`\${transactions.length} rates\`\n    };\n  };`,
  ``
);

// 7. TxModal calculateTotal replacement
content = content.replace(
  `                            const val = calculateTotal(Number(txData.quantity), txData.unit, txData.ratePerKg);\n                            return isNaN(val) ? '₹0' : formatCurrency(val);`,
  `                            const val = calculateTransactionTotal(Number(txData.quantity), txData.unit || 'MT', txData.ratePerKg).totalAmount;\n                            return isNaN(val) ? '₹0' : formatCurrency(val);`
);

// 8. Fix "1 Deals" grammar issue
content = content.replace(
  `<span className="text-sm text-muted">({deals.length} deals in system)</span>`,
  `<span className="text-sm text-muted">({deals.length} {deals.length === 1 ? 'deal' : 'deals'} in system)</span>`
);

fs.writeFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', content, 'utf8');
console.log('Patched App.jsx');
