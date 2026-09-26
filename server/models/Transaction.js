import mongoose from 'mongoose';
import { getIsMongooseConnected, inMemoryDB } from '../config/db.js';

const transactionSchema = new mongoose.Schema(
  {
    txId: { type: String, required: true, unique: true, trim: true },
    dealId: { type: String, required: true, trim: true },
    dealObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null },
    type: { type: String, enum: ['Purchase', 'Sale'], required: true },
    category: { type: String, required: true, trim: true },
    counterPartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CounterParty', required: true },
    counterPartyAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
    myAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: 'KG' },
    ratePerKg: { type: Number, required: true, min: 0.01 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['Enquiry', 'Confirmed', 'Completed', 'Cancelled'], default: 'Confirmed' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const MongooseTransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export const Transaction = new Proxy(MongooseTransactionModel, {
  get(target, prop) {
    if (getIsMongooseConnected()) {
      return target[prop];
    }
    return inMemoryDB.transactions[prop];
  },
});
