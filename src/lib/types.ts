import { ObjectId } from "mongoose";

export interface IUser {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
  profilePicture?: string;
  balance: number;
  createdAt?: Date;
  updatedAt?: Date;
  role: "user" | "admin";

  // Metotlar
  matchPassword(enteredPassword: string): Promise<boolean>;
  generateUsername(): Promise<void>;
}

export interface IPlan {
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
  creator: ObjectId | IUser;
  leaders?: ObjectId[] | IUser[];
  participants?: ObjectId[] | IUser[];
  likes?: ObjectId[] | IUser[];
  saves?: ObjectId[] | IUser[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  // Sanal alanlar
  likeCount?: number;
  saveCount?: number;
  participantCount?: number;
  leaderCount?: number;
}

export interface IMessage {
  _id?: ObjectId;
  planId: ObjectId | IPlan;
  userId: ObjectId | IUser;
  content: string;
  createdAt?: Date;
}

export interface ITransaction {
  _id?: ObjectId;
  userId: ObjectId | IUser;
  amount: number;
  type: "deposit" | "withdrawal" | "refund";
  description?: string;
  planId?: ObjectId | IPlan;
  createdAt?: Date;
}

export interface IAIMemory {
  _id?: ObjectId;
  userId: ObjectId | IUser;
  preferences: Record<string, any>;
  lastInteraction: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICalendarEntry {
  planId: ObjectId | IPlan;
  userId: ObjectId | IUser;
}

export interface UserSession {
  id: string;
  role: string;
  email: string;
} 