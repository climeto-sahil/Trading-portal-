const fs = require('fs');
let app = fs.readFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', 'utf8');

app = app.replace(/getRateSummary\(purchaseTxs, 'Purchase'\)/g, "getRateSummaryForTransactions(purchaseTxs)");
app = app.replace(/getRateSummary\(saleTxs, 'Sale'\)/g, "getRateSummaryForTransactions(saleTxs)");
app = app.replace(/getRateSummary\(pTxs, 'Purchase'\)/g, "getRateSummaryForTransactions(pTxs)");
app = app.replace(/getRateSummary\(sTxs, 'Sale'\)/g, "getRateSummaryForTransactions(sTxs)");

// Also delete the getRateSummary definition
app = app.replace(/\/\/ Helper to compute formatted rate summary for a group of transactions\nconst getRateSummary = \(txs, type\) => {[\s\S]*?};\n/g, '');

fs.writeFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', app, 'utf8');
console.log('Fixed getRateSummary');
