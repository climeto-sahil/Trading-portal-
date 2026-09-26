import mongoose from 'mongoose';
import { getIsMongooseConnected, inMemoryDB } from '../config/db.js';

const counterPartySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '' },
    phone: { type: String, default: '' },
    alternatePhone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    agentId: { type: String, default: '' },
    totalDeals: { type: Number, default: 0 },
    totalPurchase: { type: Number, default: 0 },
    totalSale: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const MongooseCounterPartyModel = mongoose.models.CounterParty || mongoose.model('CounterParty', counterPartySchema);

export const CounterParty = new Proxy(MongooseCounterPartyModel, {
  get(target, prop) {
    if (getIsMongooseConnected()) {
      return target[prop];
    }
    return inMemoryDB.counterParties[prop];
  },
});
