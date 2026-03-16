import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  image: string; // Added image for order history
  quantity: number;
  price: number;
  notes?: string;
  selectedOptions?: Array<{
    optionId: string;
    choiceId: string;
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
  customerName?: string;
  customerPhone?: string;
  customerSessionId?: string;
  waiterId?: mongoose.Types.ObjectId;
  waiterName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  image: { type: String }, // Store image dynamically fetched
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  notes: { type: String },
  selectedOptions: [{
    optionId: String,
    choiceId: String,
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
    customerName: { type: String },
    customerPhone: { type: String },
    customerSessionId: { type: String },
    waiterId: { type: Schema.Types.ObjectId, ref: 'User' },
    waiterName: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model<IOrder>('Order', orderSchema);
