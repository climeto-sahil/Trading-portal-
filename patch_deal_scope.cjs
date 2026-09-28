const fs = require('fs');
let app = fs.readFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', 'utf8');

// FIX: PURCHASE column — scope combo filter AND txs to currentDealId only
app = app.replace(
  // Purchase combo filter (line 847)
  `              {CATEGORY_COMBOS.filter(combo => deals.some(d => (d.categories || []).some(cat => cat.name === combo.category && cat.type === combo.materialType)) || visibleTransactions.some(t => t.category === combo.category || t.category === combo.label)).map(combo => {
                const catLabel = combo.label;
                const catKey = \`\${currentDealId}-Purchase-\${catLabel}\`;
                const isExpanded = !!expandedCats[catKey];
                const txs = purchaseTxs.filter(t => t.category === combo.category || t.category === combo.label);`,
  `              {CATEGORY_COMBOS.filter(combo => {
                  const dealCats = (deals.find(d => d.dealId === currentDealId)?.categories || []);
                  const hasDealCat = dealCats.some(cat => cat.name === combo.category && cat.type === combo.materialType);
                  const hasDealTx = visibleTransactions.some(t => t.dealId === currentDealId && (t.category === combo.category || t.category === combo.label));
                  return hasDealCat || hasDealTx;
                }).map(combo => {
                const catLabel = combo.label;
                const catKey = \`\${currentDealId}-Purchase-\${catLabel}\`;
                const isExpanded = !!expandedCats[catKey];
                const txs = purchaseTxs.filter(t => t.dealId === currentDealId && (t.category === combo.category || t.category === combo.label));`
);

// FIX: SALE column — scope combo filter AND txs to currentDealId only
app = app.replace(
  // Sale combo filter (line 943)
  `              {CATEGORY_COMBOS.filter(combo => deals.some(d => (d.categories || []).some(cat => cat.name === combo.category && cat.type === combo.materialType)) || visibleTransactions.some(t => t.category === combo.category || t.category === combo.label)).map(combo => {
                const catLabel = combo.label;
                const catKey = \`\${currentDealId}-Sale-\${catLabel}\`;
                const isExpanded = !!expandedCats[catKey];
                const txs = saleTxs.filter(t => t.category === combo.category || t.category === combo.label);`,
  `              {CATEGORY_COMBOS.filter(combo => {
                  const dealCats = (deals.find(d => d.dealId === currentDealId)?.categories || []);
                  const hasDealCat = dealCats.some(cat => cat.name === combo.category && cat.type === combo.materialType);
                  const hasDealTx = visibleTransactions.some(t => t.dealId === currentDealId && (t.category === combo.category || t.category === combo.label));
                  return hasDealCat || hasDealTx;
                }).map(combo => {
                const catLabel = combo.label;
                const catKey = \`\${currentDealId}-Sale-\${catLabel}\`;
                const isExpanded = !!expandedCats[catKey];
                const txs = saleTxs.filter(t => t.dealId === currentDealId && (t.category === combo.category || t.category === combo.label));`
);

fs.writeFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', app, 'utf8');
console.log('Done: columns now scoped to currentDealId');
