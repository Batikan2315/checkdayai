import mongoose from "mongoose";

// MongoDB bağlantı URL'i
const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI env değişkeni tanımlanmamış. Lütfen .env dosyasını kontrol edin.");
}

/**
 * Global değişkenler
 */
declare global {
  var mongoose: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
}

// globalThis, uygulama yeniden başlatıldığında bağlantıyı sıfırlar
// bu sayede development sırasında hot-reloading çalışırken bağlantı korunur
let cached = globalThis.mongoose;

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("MongoDB'ye bağlantı başarılı!");
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Bağlantıyı kapat
export async function disconnectDB() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log("MongoDB bağlantısı kapatıldı.");
  }
}

// Veritabanını temizle (test için)
export async function clearDB() {
  if (cached.conn) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log("Veritabanı temizlendi.");
  }
} 