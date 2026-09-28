const calculateTransactionTotal = (quantity, unit, ratePerKg) => {
  if (unit !== 'MT' && unit !== 'KG') throw new Error('Unknown unit: ' + unit);
  const qty = Number(quantity);
  const rate = parseFloat(ratePerKg);
  const quantityInKg = unit === 'MT' ? qty * 1000 : qty;
  
  // Use Math.round to fix floating point errors at the paise level (e.g. 11099999.999999998)
  const totalAmount = Math.round(quantityInKg * rate * 100) / 100;
  
  return { quantity: qty, unit, quantityInKg, ratePerKg: rate, totalAmount };
};

const tests = [
  { q: 3000, u: 'MT', r: 3.7 },
  { q: 4000, u: 'MT', r: 4.5 },
  { q: 1, u: 'MT', r: 5 },
  { q: 1, u: 'KG', r: 5 },
  { q: 4.5, u: 'KG', r: 4 },
  { q: 4.5, u: 'MT', r: 4 },
  { q: 5000, u: 'MT', r: 4.5 }
];

tests.forEach((t, i) => {
  const res = calculateTransactionTotal(t.q, t.u, t.r);
  console.log(`T${i+1}: ${t.q} ${t.u} @ ${t.r} = ${res.totalAmount}`);
});
