import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant-pos';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    const adminEmail = 'admin@nexcrow.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      const salt = await bcrypt.genSalt(10);
      existingAdmin.passwordHash = await bcrypt.hash('admin', salt);
      existingAdmin.role = 'admin';
      await existingAdmin.save();
    } else {
      console.log('Creating default admin user...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin', salt);

      await User.create({
        name: 'System Admin',
        email: adminEmail,
        passwordHash,
        role: 'admin',
      });
    }

    console.log('Admin seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
