const fs = require('fs');
const DB_FILE = 'c:/Users/Anupriya/Desktop/All Projects/Tranding portal/local_database.json';

const calculateTransactionTotal = (quantity, unit, ratePerKg) => {
  // Safe fallback if unit is missing for some reason
  const safeUnit = unit || 'MT'; 
  const qty = Number(quantity);
  const rate = parseFloat(ratePerKg);
  const quantityInKg = safeUnit === 'MT' ? qty * 1000 : qty;
  
  // Use Math.round to fix floating point errors at the paise level (e.g. 11099999.999999998)
  const totalAmount = Math.round(quantityInKg * rate * 100) / 100;
  
  return totalAmount;
};

try {
  const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  let updatedCount = 0;
  
  if (dbData.Transaction && Array.isArray(dbData.Transaction)) {
    dbData.Transaction.forEach(tx => {
      const correctTotal = calculateTransactionTotal(tx.quantity, tx.unit, tx.ratePerKg);
      if (tx.totalAmount !== correctTotal) {
        console.log(`Updating tx ${tx.txId} | Old: ${tx.totalAmount} | New: ${correctTotal}`);
        tx.totalAmount = correctTotal;
        // Make sure unit is strictly MT or KG
        if (!tx.unit) tx.unit = 'MT';
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
      console.log(`Successfully migrated ${updatedCount} transactions in local_database.json!`);
    } else {
      console.log('No transactions needed migration.');
    }
  } else {
    console.log('No Transaction array found in local_database.json');
  }
} catch(e) {
  console.error('Error migrating DB:', e);
}
