import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Sistem tarafından rezerve edilmiş kullanıcı adları
const RESERVED_USERNAMES = [
  'admin', 'planlar', 'takvim', 'profil', 'api', 'giris', 'kayit', 'plan', 'ai-check',
  'about', 'login', 'register', 'help', 'support', 'contact', 'terms', 'privacy',
  'settings', 'notifications', 'messages', 'search', 'explore', 'home', 'trending',
  'checkday', 'app', 'dashboard', 'user', 'users', 'account', 'accounts', 'auth',
  'static', 'assets', 'public', 'images', 'js', 'css', 'sifremi-sifirla'
];

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
  profilePicture?: string;
  balance: number;
  role: 'user' | 'admin';
  notificationPreferences: {
    system: boolean;
    invitation: boolean;
    message: boolean;
    like: boolean;
    join: boolean;
    reminder: boolean;
    email: boolean;
    push: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  oauth_id?: string; // OAuth sağlayıcısından gelen ID
  comparePassword: (password: string) => Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Kullanıcı adı zorunludur'],
      unique: true,
      trim: true,
      lowercase: true, // Tüm kullanıcı adları küçük harfe çevrilir
      minlength: [3, 'Kullanıcı adı en az 3 karakter olmalıdır'],
      maxlength: [20, 'Kullanıcı adı en fazla 20 karakter olabilir'],
      match: [/^[a-z0-9_.]+$/, 'Kullanıcı adı sadece küçük harf, rakam, nokta ve alt çizgi içerebilir'],
      validate: {
        validator: function(username: string) {
          // Rezerve edilmiş kullanıcı adlarını kontrol et
          return !RESERVED_USERNAMES.includes(username.toLowerCase());
        },
        message: props => `${props.value} kullanıcı adı sistem tarafından rezerve edilmiştir ve kullanılamaz`
      }
    },
    email: {
      type: String,
      required: [true, 'E-posta adresi zorunludur'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Lütfen geçerli bir e-posta adresi giriniz'],
    },
    password: {
      type: String,
      required: [true, 'Şifre zorunludur'],
      minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
      select: false, // Sorgularda şifreyi dönme
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
      default: '/images/avatars/default.png',
    },
    balance: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    notificationPreferences: {
      system: { type: Boolean, default: true },
      invitation: { type: Boolean, default: true },
      message: { type: Boolean, default: true },
      like: { type: Boolean, default: true },
      join: { type: Boolean, default: true },
      reminder: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    oauth_id: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Şifre hashleme middleware'i
UserSchema.pre('save', async function (next) {
  // Şifre değişmediyse hash işlemini yapma
  if (!this.isModified('password')) {
    return next();
  }

  try {
    console.log('Şifre değişti, yeni hash oluşturuluyor...');
    // Şifreyi hash'le - salt değerini 10 olarak kullan
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Şifre hash\'lendi:', this.password.substring(0, 20) + '...');
    next();
  } catch (error: any) {
    console.error('Şifre hash\'leme hatası:', error);
    next(error);
  }
});

// Şifre karşılaştırma metodu
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  try {
    console.log("Şifre karşılaştırılıyor...");
    console.log("Veritabanı şifresi (hash):", this.password.substring(0, 20) + "...");
    const isMatch = await bcrypt.compare(password, this.password);
    console.log("Şifre eşleşme sonucu:", isMatch);
    return isMatch;
  } catch (error) {
    console.error("Şifre karşılaştırma hatası:", error);
    throw error;
  }
};

// Mongoose modelinin tekrar derlenme hatasını önlemek için
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 