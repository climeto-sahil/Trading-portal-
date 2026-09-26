import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getIsMongooseConnected, inMemoryDB } from '../config/db.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    company: { type: String, default: '', trim: true },
    role: { type: String, enum: ['ADMIN', 'MY_AGENT', 'COUNTER_AGENT'], default: 'MY_AGENT' },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'], default: 'PENDING' },
    agentId: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const MongooseUserModel = mongoose.models.User || mongoose.model('User', userSchema);

export const User = new Proxy(MongooseUserModel, {
  get(target, prop) {
    if (getIsMongooseConnected()) {
      return target[prop];
    }
    return inMemoryDB.users[prop];
  },
});
