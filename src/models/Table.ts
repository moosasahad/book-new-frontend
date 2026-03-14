import mongoose, { Document, Schema } from 'mongoose';

export interface ITable extends Document {
  tableNumber: number;
  status: 'available' | 'occupied' | 'reserved';
  capacity: number;
  qrCodeUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tableSchema = new Schema<ITable>(
  {
    tableNumber: { type: Number, required: true, unique: true },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved'],
      default: 'available',
    },
    capacity: { type: Number, required: true, default: 4 },
    qrCodeUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Table = mongoose.model<ITable>('Table', tableSchema);
