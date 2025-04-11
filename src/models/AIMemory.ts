import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IAIMemory extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  preferences: Record<string, any>;
  lastInteraction: Date;
  createdAt: Date;
}

const AIMemorySchema = new Schema<IAIMemory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    preferences: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastInteraction: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose modelinin tekrar derlenme hatasını önlemek için
const AIMemory = mongoose.models.AIMemory || mongoose.model<IAIMemory>('AIMemory', AIMemorySchema);

export default AIMemory; 