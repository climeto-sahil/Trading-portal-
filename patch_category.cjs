const fs = require('fs');
let app = fs.readFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', 'utf8');

// ============================================================
// FIX 1: Line 302 — parenthesis bug in saveDeal initial tx
// BEFORE: calculateTransactionTotal(qty, unit, Number(rate || 0).totalAmount)
// AFTER:  calculateTransactionTotal(qty, unit, rate).totalAmount
// ============================================================
app = app.replace(
  `totalAmount: calculateTransactionTotal(Number(dealData.initialTransaction.quantity || 0), dealData.initialTransaction.unit, Number(dealData.initialTransaction.ratePerKg || 0).totalAmount)`,
  `totalAmount: calculateTransactionTotal(Number(dealData.initialTransaction.quantity || 0), dealData.initialTransaction.unit || 'MT', Number(dealData.initialTransaction.ratePerKg || 0)).totalAmount`
);

// ============================================================
// FIX 2: Line 2005 — New Deal modal preview still uses * 1000 hardcode
// Replace with shared helper
// ============================================================
app = app.replace(
  `{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((Number(txData.quantity) || 0) * 1000 * (Number(txData.ratePerKg) || 0))}`,
  `{(() => { try { return formatCurrency(calculateTransactionTotal(Number(txData.quantity) || 0, txData.unit || 'MT', Number(txData.ratePerKg) || 0).totalAmount); } catch(e) { return '₹0'; } })()}`
);

// ============================================================
// FIX 3: Category column filter — BOTH columns currently use
// visibleTransactions.some(t => ...) which covers both Purchase
// and Sale types. This means:
//   - A PURCHASE in Cat 1 shows Cat 1 in BOTH columns ✅ (desired)
//   - A SALE in Cat 1 also shows Cat 1 in BOTH columns ✅ (desired)
// So the filter is actually CORRECT. No change needed here.
// 
// The real issue was the totalAmount parenthesis bug above causing
// the initial transaction creation to fail silently (line 302).
// That's why categories sometimes didn't show up at all.
// ============================================================

// ============================================================
// FIX 4: saveDeal — also save category to deal.categories array
// so the category survives even if all transactions are deleted.
// We inject the category from the initial transaction into dealData.
// ============================================================
app = app.replace(
  `      const { response, data } = await authFetch(url, {\n        method,\n        body: JSON.stringify(dealData),\n      });`,
  `      // Enrich dealData.categories with the initial transaction category (if any)
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
      });`
);

// ============================================================
// FIX 5: When adding a standalone transaction (openTxModal),
// also update the deal's categories array via a separate PATCH.
// We do this inside saveTransaction after a successful 'add'.
// ============================================================
app = app.replace(
  `      if (response.ok && data.success) {
        showToast(txModalMode === 'add' ? \`Transaction added to \${txData.dealId}\` : 'Transaction updated');
        setIsTxModalOpen(false);
        loadTradingData();`,
  `      if (response.ok && data.success) {
        showToast(txModalMode === 'add' ? \`Transaction added to \${txData.dealId}\` : 'Transaction updated');
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
                await authFetch(\`/api/deals/\${parentDeal._id}/categories\`, {
                  method: 'PATCH',
                  body: JSON.stringify({ category: catName, materialType: catType }),
                });
              } catch(e) { /* non-critical, categories still derived from transactions */ }
            }
          }
        }
        loadTradingData();`
);

fs.writeFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', app, 'utf8');
console.log('Applied all category/transaction fixes to App.jsx');
