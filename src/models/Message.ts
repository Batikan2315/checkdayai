import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IPlan } from './Plan';

export interface IMessage extends Document {
  planId: mongoose.Types.ObjectId | IPlan;
  userId: mongoose.Types.ObjectId | IUser;
  content: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Mesaj içeriği zorunludur'],
      trim: true,
      minlength: [1, 'Mesaj içeriği boş olamaz'],
      maxlength: [1000, 'Mesaj içeriği en fazla 1000 karakter olabilir'],
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose modelinin tekrar derlenme hatasını önlemek için
const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message; 