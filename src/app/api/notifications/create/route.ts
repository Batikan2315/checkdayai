import { NextRequest, NextResponse } from "next/server";
import { createServer } from "http";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { sendNotificationToUser } from "@/lib/socket";
import { Socket } from "net";
import { Server as SocketIOServer } from "socket.io";

interface SocketServerIO extends Socket {
  server: {
    io?: SocketIOServer;
  };
}

interface NextApiResponseWithSocket extends Response {
  socket: SocketServerIO;
}

// Bildirim oluşturan API
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // Oturum kontrolü - Admin veya sistem bildirimleri için gerekli
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Bu işlem için oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }
    
    const { userId, type, title, message, link, isAdmin = false } = await req.json();
    
    // Admin yetkisi kontrolü
    if (isAdmin && session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Bu işlem için admin yetkisi gerekiyor" },
        { status: 403 }
      );
    }
    
    // Gerekli alanları kontrol et
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { message: "Eksik bilgi: userId, type, title ve message zorunludur" },
        { status: 400 }
      );
    }
    
    // Kullanıcı kontrolü
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }
    
    // Geçerli bildirim türü kontrolü
    const validTypes = ["system", "invitation", "message", "like", "join", "reminder"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { message: "Geçersiz bildirim türü" },
        { status: 400 }
      );
    }
    
    // Kullanıcının bildirim tercihlerini kontrol et
    if (!user.notificationPreferences[type]) {
      return NextResponse.json({
        message: "Kullanıcı bu tür bildirimleri almayı devre dışı bırakmış",
        skipped: true
      });
    }
    
    // Yeni bildirimi oluştur
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      link,
      isRead: false,
    });
    
    await notification.save();
    
    // WebSocket üzerinden bildirimi gönder
    try {
      const socketResponse = await fetch('/api/socketio');
      
      if (socketResponse.ok) {
        console.log("WebSocket bağlantısı mevcut, anlık bildirim gönderiliyor");
        // Socket.io global değişkenini doğrudan burada kullanamayız,
        // ancak bu API çağrısı socket bağlantısının başlatılmasını sağlar
        // Ardından bir sonraki adımda oluşturulan bildirime kullanıcı tarafında abone olunacak
      } else {
        console.log("WebSocket bağlantısı bulunamadı, bildirimlerin manuel yenilenmesi gerekecek");
      }
    } catch (socketError) {
      // WebSocket hatası bildirimi engellemeyecek
      console.error("WebSocket bildirimi gönderme hatası:", socketError);
    }
    
    return NextResponse.json({
      message: "Bildirim başarıyla oluşturuldu",
      notification,
    });
  } catch (error: any) {
    console.error("Bildirim oluşturma hatası:", error);
    return NextResponse.json(
      { message: "Bildirim oluşturulamadı", error: error.message },
      { status: 500 }
    );
  }
} 