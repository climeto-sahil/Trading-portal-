const fs = require('fs');
let content = fs.readFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', 'utf8');

content = content.replace(
  /visibleTransactions\.some\(t => t\.category === combo\.category && \(t\.materialType \|\| 'Recycling'\) === combo\.materialType\)/g,
  `visibleTransactions.some(t => t.category === combo.category || t.category === combo.label)`
);

content = content.replace(
  /purchaseTxs\.filter\(t => t\.category === combo\.category && \(t\.materialType \|\| 'Recycling'\) === combo\.materialType\)/g,
  `purchaseTxs.filter(t => t.category === combo.category || t.category === combo.label)`
);

content = content.replace(
  /saleTxs\.filter\(t => t\.category === combo\.category && \(t\.materialType \|\| 'Recycling'\) === combo\.materialType\)/g,
  `saleTxs.filter(t => t.category === combo.category || t.category === combo.label)`
);

fs.writeFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/src/App.jsx', content, 'utf8');
console.log('Patched Category Filtering logic!');
