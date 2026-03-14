import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  description: string;
  price: number;
  category: mongoose.Types.ObjectId;
  image?: string;
  options: any[];
  isAvailable: boolean;
  isPopular?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    image: { type: String },
    options: { type: [], default: [] },
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
