const fs = require('fs');
let app = fs.readFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', 'utf8');

// Replace ALL remaining calculateTotal(qty, unit, rate) calls with the new helper
app = app.replace(
  /calculateTotal\(Number\(([^,]+)\), ([^,]+), ([^)]+)\)/g,
  (match, qty, unit, rate) => `calculateTransactionTotal(Number(${qty}), ${unit}, ${rate}).totalAmount`
);

// Handle calculateTotal(q, formData.unit, r) style
app = app.replace(
  /calculateTotal\(([^,]+), ([^,]+), ([^)]+)\)/g,
  (match, qty, unit, rate) => `calculateTransactionTotal(${qty}, ${unit}, ${rate}).totalAmount`
);

fs.writeFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', app, 'utf8');
console.log('Done replacing all calculateTotal calls');
