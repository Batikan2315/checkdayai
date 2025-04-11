import mongoose, { Schema, model, models } from "mongoose";
import { IPlan } from "@/lib/types";

const planSchema = new Schema<IPlan>(
  {
    title: {
      type: String,
      required: [true, "Başlık gereklidir"],
      trim: true,
      minlength: [3, "Başlık en az 3 karakter olmalıdır"],
    },
    description: {
      type: String,
      required: [true, "Açıklama gereklidir"],
      trim: true,
      minlength: [10, "Açıklama en az 10 karakter olmalıdır"],
    },
    imageUrl: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      required: [true, "Başlangıç tarihi gereklidir"],
    },
    endDate: {
      type: Date,
      required: [true, "Bitiş tarihi gereklidir"],
    },
    location: {
      type: String,
      trim: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: true,
    },
    cancelationPolicy: {
      type: String,
      trim: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leaders: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    saves: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Sanal alan - beğeni sayısı
planSchema.virtual("likeCount").get(function (this: IPlan) {
  return this.likes?.length || 0;
});

// Sanal alan - kaydetme sayısı
planSchema.virtual("saveCount").get(function (this: IPlan) {
  return this.saves?.length || 0;
});

// Sanal alan - katılımcı sayısı
planSchema.virtual("participantCount").get(function (this: IPlan) {
  return this.participants?.length || 0;
});

// Sanal alan - lider sayısı
planSchema.virtual("leaderCount").get(function (this: IPlan) {
  return this.leaders?.length || 0;
});

// JSON dönüşümünde sanal alanları dahil et
planSchema.set("toJSON", { virtuals: true });
planSchema.set("toObject", { virtuals: true });

export default models.Plan || model<IPlan>("Plan", planSchema); 