import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IPlan } from './Plan';

export type TransactionType = 'deposit' | 'withdrawal' | 'refund';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  amount: number;
  type: TransactionType;
  description: string;
  planId?: mongoose.Types.ObjectId | IPlan;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Tutar zorunludur'],
      min: [0, 'Tutar 0\'dan küçük olamaz'],
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'refund'],
      required: [true, 'İşlem tipi zorunludur'],
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'Açıklama zorunludur'],
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose modelinin tekrar derlenme hatasını önlemek için
const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction; 