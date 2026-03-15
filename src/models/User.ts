import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'kitchen' | 'staff';
  status: 'active' | 'blocked';
  isActive: boolean;
  pin?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'kitchen', 'staff'], default: 'staff' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    isActive: { type: Boolean, default: true },
    pin: { type: String },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
