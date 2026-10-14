import mongoose from 'mongoose';
import { getIsMongooseConnected, inMemoryDB } from '../config/db.js';

const notificationSchema = new mongoose.Schema(
  {
    dealId: { type: String, default: '', index: true },
    eventType: { type: String, required: true },
    title: { type: String, default: '' },
    dealType: { type: String, default: '' },
    counterpartyName: { type: String, default: '' },
    renderedMessage: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdByName: { type: String, default: '' },
    readBy: { type: [String], default: [] },
    zohoStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    zohoError: { type: String, default: '' },
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

const MongooseNotificationModel = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export const Notification = new Proxy(MongooseNotificationModel, {
  get(target, prop) {
    if (getIsMongooseConnected()) return target[prop];
    return inMemoryDB.notifications[prop];
  },
});
