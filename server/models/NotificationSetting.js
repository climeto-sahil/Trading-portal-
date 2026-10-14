import mongoose from 'mongoose';
import { getIsMongooseConnected, inMemoryDB } from '../config/db.js';

const notificationSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    enabled: { type: Boolean, default: false },
    provider: { type: String, default: 'meta_cloud' },
    destinationMode: { type: String, enum: ['individual', 'group', 'both'], default: 'individual' },
    groupFallbackToIndividual: { type: Boolean, default: false },
    events: {
      dealCreated: { type: Boolean, default: true },
      dealUpdated: { type: Boolean, default: false },
      enquiryCreated: { type: Boolean, default: false },
      dealConfirmed: { type: Boolean, default: false },
    },
    recipients: {
      type: [
        {
          name: { type: String, default: '' },
          phone: { type: String, required: true },
          consented: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    groupInviteUrl: { type: String, default: '' },
    apiGroupId: { type: String, default: '' },
    templateName: { type: String, default: '' },
    lastSuccessfulSendAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

const MongooseSettingModel = mongoose.models.NotificationSetting || mongoose.model('NotificationSetting', notificationSettingSchema);

export const NotificationSetting = new Proxy(MongooseSettingModel, {
  get(target, prop) {
    if (getIsMongooseConnected()) return target[prop];
    return inMemoryDB.notificationSettings[prop];
  },
});
