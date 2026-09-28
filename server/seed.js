import bcrypt from 'bcryptjs';
import { User } from './models/User.js';
import { getIsMongooseConnected } from './config/db.js';

const ADMIN_EMAIL = 'admin@tradingportal.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

/**
 * Always ensure a working ADMIN login exists on deploy / restart.
 * Fixes "Invalid email or password" when Mongo has stale users or seed was skipped.
 */
export const seedDatabase = async () => {
  try {
    let admin = await User.findOne({ email: ADMIN_EMAIL }).select('+password');

    if (!admin) {
      await User.create({
        name: 'System Administrator',
        email: ADMIN_EMAIL,
        phone: '+91 90000 00001',
        password: ADMIN_PASSWORD,
        company: 'Trading Portal Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      });
      console.log('----------------------------------------------------');
      console.log('ADMIN CREATED');
      console.log(`Email:    ${ADMIN_EMAIL}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
      console.log('----------------------------------------------------');
      return;
    }

    let passwordOk = false;
    try {
      if (admin.password && typeof admin.comparePassword === 'function') {
        passwordOk = await admin.comparePassword(ADMIN_PASSWORD);
      } else if (admin.password) {
        passwordOk = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
      }
    } catch {
      passwordOk = false;
    }

    if (!passwordOk) {
      if (getIsMongooseConnected()) {
        admin.password = ADMIN_PASSWORD;
        admin.role = 'ADMIN';
        admin.status = 'ACTIVE';
        await admin.save();
      } else {
        await User.findByIdAndUpdate(admin._id, {
          password: ADMIN_PASSWORD,
          role: 'ADMIN',
          status: 'ACTIVE',
        });
      }
      console.log('----------------------------------------------------');
      console.log('ADMIN PASSWORD RESET');
      console.log(`Email:    ${ADMIN_EMAIL}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
      console.log('----------------------------------------------------');
      return;
    }

    // Keep admin usable even if status/role drifted
    if (admin.status !== 'ACTIVE' || admin.role !== 'ADMIN') {
      if (getIsMongooseConnected()) {
        admin.status = 'ACTIVE';
        admin.role = 'ADMIN';
        await admin.save();
      } else {
        await User.findByIdAndUpdate(admin._id, { status: 'ACTIVE', role: 'ADMIN' });
      }
    }

    console.log(`Admin ready: ${ADMIN_EMAIL}`);
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
