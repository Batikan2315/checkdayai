import mongoose, { Schema, Document, ObjectId } from 'mongoose';
import { IUser } from './User';

export interface IPlan extends Document {
  _id?: ObjectId;
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
  oauth_creator_id?: string;  // Google OAuth ID'si için
  isPrivate: boolean;         // Özel/davetli etkinlik mi?
  allowInvites: boolean;      // Katılımcılar da davet gönderebilir mi?
  leaders?: ObjectId[] | IUser[];
  participants?: ObjectId[] | IUser[];
  likes?: ObjectId[] | IUser[];
  saves?: ObjectId[] | IUser[];
  maxParticipants: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  // Sanal alanlar
  likeCount?: number;
  saveCount?: number;
  participantCount?: number;
  leaderCount?: number;
}

const PlanSchema = new Schema<IPlan>(
  {
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
      type: [Schema.Types.Mixed],  // ObjectId veya string dizisi olabilir
      default: [],
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    likes: [String], // String değerleri kabul edecek şekilde basitleştirildi
    saves: [String], // String değerleri kabul edecek şekilde basitleştirildi
    maxParticipants: {
      type: Number,
      default: 0, // 0 = sınırsız katılımcı
      min: [0, 'Maksimum katılımcı sayısı negatif olamaz'],
      validate: {
        validator: function(v: number) {
          // 0 değeri sınırsız katılımcı anlamına geliyor, bu yüzden geçerli
          return v === 0 || v >= 1;
        },
        message: props => `${props.value} geçerli bir katılımcı sayısı değil. 0 (sınırsız) veya 1 ve üstü olmalı.`
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Taşma kontrolü
PlanSchema.pre('save', function(next) {
  // maxParticipants 0 ise sınırsız katılımcı anlamına gelir
  if (this.maxParticipants > 0 && this.participants.length > this.maxParticipants) {
    const error = new Error('Maksimum katılımcı sayısı aşıldı');
    return next(error);
  }
  next();
});

// Sanal alan - beğeni sayısı
PlanSchema.virtual("likeCount").get(function (this: IPlan) {
  return this.likes?.length || 0;
});

// Sanal alan - kaydetme sayısı
PlanSchema.virtual("saveCount").get(function (this: IPlan) {
  return this.saves?.length || 0;
});

// Sanal alan - katılımcı sayısı
PlanSchema.virtual("participantCount").get(function (this: IPlan) {
  return this.participants?.length || 0;
});

// Sanal alan - lider sayısı
PlanSchema.virtual("leaderCount").get(function (this: IPlan) {
  return this.leaders?.length || 0;
});

// JSON dönüşümünde sanal alanları dahil et
PlanSchema.set("toJSON", { virtuals: true });
PlanSchema.set("toObject", { virtuals: true });

// Mongoose modelinin tekrar derlenme hatasını önlemek için
const Plan = mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);

export default Plan; 