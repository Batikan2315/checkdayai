import mongoose, { Schema, model, models } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser } from "@/lib/types";

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Kullanıcı adı gereklidir"],
      unique: true,
      trim: true,
      minlength: [3, "Kullanıcı adı en az 3 karakter olmalıdır"],
    },
    email: {
      type: String,
      required: [true, "E-posta gereklidir"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Geçerli bir e-posta adresi giriniz"],
    },
    password: {
      type: String,
      required: [true, "Şifre gereklidir"],
      minlength: [6, "Şifre en az 6 karakter olmalıdır"],
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    balance: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateUsername = async function () {
  if (this.username) return;
  
  const baseUsername = this.email.split("@")[0];
  let username = baseUsername;
  let counter = 1;
  
  // Kullanıcı adı benzersiz olana kadar sayı ekle
  while (await mongoose.models.User.findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  this.username = username;
};

export default models.User || model<IUser>("User", userSchema); 