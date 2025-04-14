import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // CORS ve güvenlik için header'lar ekle
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    // Oturumu al
    const session = await getServerSession();
    
    // JWT token kontrolü
    const authHeader = req.headers.get('authorization');
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Token doğrulama işlemi
        const decoded = verifyToken(token);
        if (decoded && decoded.id) {
          userId = decoded.id;
          console.log("Token doğrulandı, userId:", userId);
        }
      } catch (error) {
        console.error("Token doğrulama hatası:", error);
      }
    }
    
    // Veritabanına bağlan
    await connectDB();
    
    // Cache-busting için timestamp
    const timestamp = new Date().getTime();
    
    // Oturum varsa oturum bilgisini kullan, yoksa token kullan
    if (session && session.user && session.user.email) {
      // Kullanıcıyı email ile bul
      const userEmail = session.user.email;
      const user = await User.findOne({ email: userEmail });
      
      if (!user) {
        console.log("Kullanıcı bulunamadı, email:", userEmail);
        return NextResponse.json({ 
          message: "Kullanıcı bulunamadı",
          authenticated: false,
          timestamp
        }, { status: 200, headers });
      }
      
      console.log("Kullanıcı bulundu:", {
        id: user._id,
        email: user.email,
        role: user.role,
        roleType: typeof user.role
      });
      
      // Profil resmi için cache-busting
      const profilePicture = user.profilePicture ? `${user.profilePicture}?t=${timestamp}` : null;
      
      // Kullanıcı verilerini döndür
      return NextResponse.json({
        id: user._id,
        name: user.username || user.firstName,
        email: user.email,
        image: profilePicture,
        profilePicture: profilePicture,
        role: user.role,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        oauth_id: user.oauth_id,
        provider: user.provider,
        _id: user._id,
        authenticated: true,
        timestamp
      }, { headers });
    } 
    // Token ile kullanıcı kontrolü
    else if (userId) {
      const user = await User.findById(userId);
      
      if (!user) {
        return NextResponse.json({ 
          message: "Token mevcut ama kullanıcı bulunamadı",
          authenticated: false,
          timestamp
        }, { status: 200, headers });
      }
      
      // Profil resmi için cache-busting
      const profilePicture = user.profilePicture ? `${user.profilePicture}?t=${timestamp}` : null;
      
      // Kullanıcı verilerini döndür
      return NextResponse.json({
        id: user._id,
        name: user.username || user.firstName,
        email: user.email,
        image: profilePicture,
        profilePicture: profilePicture,
        role: user.role,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        oauth_id: user.oauth_id,
        provider: user.provider,
        _id: user._id,
        authenticated: true,
        timestamp
      }, { headers });
    }
    
    // Kimlik doğrulama yapılamadı
    return NextResponse.json({ 
      message: "Giriş yapılmamış", 
      authenticated: false,
      timestamp
    }, { status: 200, headers });
  } catch (error: any) {
    console.error("Kullanıcı bilgisi alma hatası:", error);
    return NextResponse.json(
      { 
        message: "Kullanıcı bilgisi alınamadı", 
        error: error.message, 
        authenticated: false,
        timestamp: new Date().getTime()
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, private',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
} 