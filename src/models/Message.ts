import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  planId: mongoose.Types.ObjectId | string;
  sender: mongoose.Types.ObjectId | string;
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
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Mesaj içeriği zorunludur'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose modelinin tekrar derlenme hatasını önlemek için
const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message; 