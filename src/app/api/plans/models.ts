import mongoose, { Schema } from 'mongoose';

const PlanSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  maxParticipants: { type: Number },
  price: { type: Number, default: 0 },
  isFree: { type: Boolean, default: true },
  location: { type: String },
  isOnline: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  image: { type: String },
  imageUrl: { type: String },
  creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  creatorInfo: {
    _id: { type: Schema.Types.ObjectId },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    profilePicture: { type: String },
    email: { type: String },
  },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  leaders: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  tags: [{ type: String }],
  calendarUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// indexes
PlanSchema.index({ creator: 1 });
PlanSchema.index({ participants: 1 });
PlanSchema.index({ startDate: 1 });
PlanSchema.index({ createdAt: -1 });
PlanSchema.index({ isFree: 1 });
PlanSchema.index({ isPrivate: 1 });
PlanSchema.index({ isOnline: 1 });
PlanSchema.index({ category: 1 });
PlanSchema.index({ title: 'text', description: 'text' });

// Model oluştur veya al
const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

export default Plan; 