const fs = require('fs');
let content = fs.readFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/server/controllers/transactionController.js', 'utf8');

content = content.replace(
  `    const q = Number(quantity);\n    const r = parseFloat(ratePerKg);\n    const totalAmount = calculateTotal(q, req.body.unit || req.body.quantityUnit || 'MT', r);`,
  `    const q = Number(quantity);\n    const r = parseFloat(ratePerKg);\n    const calculated = calculateTransactionTotal(q, req.body.unit || req.body.quantityUnit || 'MT', r);\n    const totalAmount = calculated.totalAmount;\n    const finalUnit = calculated.unit;`
);

content = content.replace(
  `      myAgentId,\n      quantity: q,\n      ratePerKg: r,\n      totalAmount,`,
  `      myAgentId,\n      quantity: q,\n      unit: finalUnit,\n      ratePerKg: r,\n      totalAmount,`
);

content = content.replace(
  `    const q = req.body.quantity !== undefined ? Number(req.body.quantity) : tx.quantity;\n    const r = req.body.ratePerKg !== undefined ? Number(req.body.ratePerKg) : tx.ratePerKg;\n    const totalAmount = calculateTotal(q, req.body.unit || req.body.quantityUnit || tx.unit || 'MT', r);`,
  `    const q = req.body.quantity !== undefined ? Number(req.body.quantity) : tx.quantity;\n    const r = req.body.ratePerKg !== undefined ? Number(req.body.ratePerKg) : tx.ratePerKg;\n    const calculated = calculateTransactionTotal(q, req.body.unit || req.body.quantityUnit || tx.unit || 'MT', r);\n    const totalAmount = calculated.totalAmount;\n    const finalUnit = calculated.unit;`
);

content = content.replace(
  `    const updateData = {\n      ...req.body,\n      quantity: q,\n      ratePerKg: r,\n      totalAmount,\n    };`,
  `    const updateData = {\n      ...req.body,\n      quantity: q,\n      unit: finalUnit,\n      ratePerKg: r,\n      totalAmount,\n    };`
);

fs.writeFileSync('c:/Users/Anupriya/Desktop/All Projects/Tranding portal/server/controllers/transactionController.js', content, 'utf8');
console.log('Patched transactionController.js');
