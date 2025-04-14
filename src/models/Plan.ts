import mongoose, { Schema, Document, ObjectId, Model } from 'mongoose';
import { IUser } from './User';

// Temel arayüz - veritabanı alanları
export interface IPlan {
  title: string;
  description: string;
  imageUrl?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  isOnline: boolean;
  price: number;
  isFree: boolean;
  cancelationPolicy?: string;
  creator: ObjectId | IUser | string;
  oauth_creator_id?: string;
  isPrivate: boolean;
  allowInvites: boolean;
  leaders?: ObjectId[] | IUser[];
  participants?: ObjectId[] | IUser[];
  likes?: ObjectId[] | IUser[];
  saves?: ObjectId[] | IUser[];
  maxParticipants: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Document tipini içeren arayüz
export interface IPlanDocument extends Document, IPlan {
  // Sanal alanlar
  likeCount?: number;
  saveCount?: number;
  participantCount?: number;
  leaderCount?: number;
}

// Model tipi
export interface IPlanModel extends Model<IPlanDocument> {}

const PlanSchema = new Schema<IPlanDocument>({
  title: {
    type: String,
    required: [true, 'Başlık zorunludur'],
    trim: true,
    minlength: [3, 'Başlık en az 3 karakter olmalıdır'],
    maxlength: [100, 'Başlık en fazla 100 karakter olabilir'],
  },
  description: {
    type: String,
    required: [true, 'Açıklama zorunludur'],
    trim: true,
    minlength: [10, 'Açıklama en az 10 karakter olmalıdır'],
  },
  imageUrl: {
    type: String,
    default: '/images/plans/default.jpg',
  },
  startDate: {
    type: Date,
    required: [true, 'Başlangıç tarihi zorunludur'],
  },
  endDate: {
    type: Date,
    required: [true, 'Bitiş tarihi zorunludur'],
  },
  location: {
    type: String,
    required: function() {
      // Sadece online olmayan etkinlikler için konum zorunlu
      return !this.isOnline;
    },
    trim: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Fiyat negatif olamaz'],
  },
  isFree: {
    type: Boolean,
    default: true,
  },
  cancelationPolicy: {
    type: String,
    trim: true,
    default: 'Etkinlik başlangıcından 24 saat öncesine kadar ücretsiz iptal.',
  },
  creator: {
    type: Schema.Types.Mixed,  // ObjectId veya String olabilir
    required: [true, 'Oluşturucu bilgisi zorunludur'],
    index: true,
  },
  oauth_creator_id: {
    type: String,
    index: true,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  allowInvites: {
    type: Boolean,
    default: true,
  },
  leaders: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  likes: [String],
  saves: [String],
  maxParticipants: {
    type: Number,
    default: 0,
    min: [0, 'Maksimum katılımcı sayısı negatif olamaz'],
    validate: {
      validator: function(v: number) {
        return v === 0 || v >= 1;
      },
      message: props => `${props.value} geçerli bir katılımcı sayısı değil. 0 (sınırsız) veya 1 ve üstü olmalı.`
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Taşma kontrolü
PlanSchema.pre('save', function(next) {
  if (this.maxParticipants > 0 && this.participants && this.participants.length > this.maxParticipants) {
    const error = new Error('Maksimum katılımcı sayısı aşıldı');
    return next(error);
  }
  next();
});

// Sanal alanlar
PlanSchema.virtual("likeCount").get(function(this: IPlanDocument) {
  return this.likes ? this.likes.length : 0;
});

PlanSchema.virtual("saveCount").get(function(this: IPlanDocument) {
  return this.saves ? this.saves.length : 0;
});

PlanSchema.virtual("participantCount").get(function(this: IPlanDocument) {
  return this.participants ? this.participants.length : 0;
});

PlanSchema.virtual("leaderCount").get(function(this: IPlanDocument) {
  return this.leaders ? this.leaders.length : 0;
});

// JSON dönüşümünde sanal alanları dahil et
PlanSchema.set("toJSON", { virtuals: true });
PlanSchema.set("toObject", { virtuals: true });

// Model oluştur
const Plan = (mongoose.models.Plan || mongoose.model<IPlanDocument, IPlanModel>('Plan', PlanSchema)) as IPlanModel;

export default Plan; 