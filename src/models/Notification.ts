import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export type NotificationType = 'system' | 'invitation' | 'message' | 'like' | 'join' | 'reminder';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId | IUser | string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.Mixed, // String veya ObjectId olabilir
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['system', 'invitation', 'message', 'like', 'join', 'reminder'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Okunmamış bildirimleri getiren statik metod
NotificationSchema.statics.getUnreadCount = async function(userId: string) {
  return this.countDocuments({ userId, isRead: false });
};

// Mongoose modelinin tekrar derlenme hatasını önlemek için
const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification; 