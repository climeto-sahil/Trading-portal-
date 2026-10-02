import mongoose from 'mongoose';
import { getIsMongooseConnected, inMemoryDB } from '../config/db.js';

const agentSchema = new mongoose.Schema(
  {
    agentId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true },
    company: { type: String, default: '' },
    phone: { type: String, default: '' },
    alternatePhone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    agentType: { type: String, enum: ['My Agent', 'Counter Party Agent', 'Admin'], default: 'My Agent', required: true },
    commission: { type: String, default: '₹0.50 / KG' },
    status: { type: String, default: 'Active' },
    dealsManaged: { type: Number, default: 0 },
    activeDeals: { type: Number, default: 0 },
    completedDeals: { type: Number, default: 0 },
    cancelledDeals: { type: Number, default: 0 },
    totalPurchaseValue: { type: Number, default: 0 },
    totalSaleValue: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const MongooseAgentModel = mongoose.models.Agent || mongoose.model('Agent', agentSchema);

export const Agent = new Proxy(MongooseAgentModel, {
  get(target, prop) {
    if (getIsMongooseConnected()) {
      return target[prop];
    }
    return inMemoryDB.agents[prop];
  },
});
