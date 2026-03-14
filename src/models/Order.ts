import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  selectedOptions?: Array<{
    optionLabel: string;
    choiceLabel: string;
    priceModifier: number;
  }>;
}

export interface IOrder extends Document {
  tableNumber: number;
  items: IOrderItem[];
  totalAmount: number;
  status: 'new' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  notes: { type: String },
  selectedOptions: [{
    optionLabel: String,
    choiceLabel: String,
    priceModifier: Number,
  }],
});

const orderSchema = new Schema<IOrder>(
  {
    tableNumber: { type: Number, required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['new', 'cooking', 'ready', 'completed', 'cancelled'],
      default: 'new',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model<IOrder>('Order', orderSchema);
