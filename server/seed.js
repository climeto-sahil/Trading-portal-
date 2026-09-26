import { User } from './models/User.js';
import { Agent } from './models/Agent.js';
import { CounterParty } from './models/CounterParty.js';
import { Deal } from './models/Deal.js';
import { Transaction } from './models/Transaction.js';

export const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already contains records. Skipping seed.');
      return;
    }

    console.log('Seeding initial Trading Portal database with Admin only...');

    // 1. Seed Core Admin User
    await User.create({
      name: 'System Administrator',
      email: 'admin@tradingportal.com',
      phone: '+91 90000 00001',
      password: 'Admin@123',
      company: 'Trading Portal Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    console.log('Seed completed successfully! Clean state achieved.');
    console.log('----------------------------------------------------');
    console.log('CORE ADMIN ACCOUNT READY:');
    console.log('Email:    admin@tradingportal.com');
    console.log('Password: Admin@123');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
