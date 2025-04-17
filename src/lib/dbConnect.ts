import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

/**
 * MongoDB'ye bağlantı için global değişken
 */
declare global {
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

// Global değişkeni başlat
global.mongoose = global.mongoose || { conn: null, promise: null };

/**
 * MongoDB'ye bağlanmak için yardımcı fonksiyon
 * Bağlantıyı yeniden kullanmak için global bir değişkende saklıyoruz
 */
export async function connect() {
  if (global.mongoose.conn) {
    return global.mongoose.conn;
  }

  if (!global.mongoose.promise) {
    const opts = {
      bufferCommands: false,
    };

    global.mongoose.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose.connection;
    });
  }
  
  try {
    const connection = await global.mongoose.promise;
    global.mongoose.conn = connection;
  } catch (e) {
    global.mongoose.promise = null;
    throw e;
  }

  return global.mongoose.conn;
}

export default { connect }; 