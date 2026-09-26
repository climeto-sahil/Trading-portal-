import mongoose from 'mongoose';
import { getIsMongooseConnected, inMemoryDB } from '../config/db.js';

const dealSchema = new mongoose.Schema(
  {
    dealId: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: ['Enquiry', 'Confirmed', 'Completed', 'Cancelled'], default: 'Enquiry' },
    date: { type: Date, default: Date.now },
    confirmationDate: { type: Date, default: null },
    counterPartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CounterParty', required: true },
    counterPartyAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
    myAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const MongooseDealModel = mongoose.models.Deal || mongoose.model('Deal', dealSchema);

export const Deal = new Proxy(MongooseDealModel, {
  get(target, prop) {
    if (getIsMongooseConnected()) {
      return target[prop];
    }
    return inMemoryDB.deals[prop];
  },
});
