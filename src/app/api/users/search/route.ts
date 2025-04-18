import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";

export async function GET(request: NextRequest) {
  try {
    // Oturumu al ve giriş kontrolü yap
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Giriş yapmalısınız." },
        { status: 401 }
      );
    }
    
    // URL parametrelerini al
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const query = searchParams.get('query') || '';
    
    if (!query || query.length < 2) {
      return NextResponse.json(
        { message: "Arama sorgusu en az 2 karakter olmalıdır." },
        { status: 400 }
      );
    }
    
    // Veritabanına bağlan
    await connectDB();
    
    // Kullanıcıları ara - isim, soyisim veya kullanıcı adı ile
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .limit(10)
    .select('_id firstName lastName username profilePicture image')
    .lean();
    
    // Kullanıcı verilerini düzenle
    const formattedUsers = users.map(user => ({
      _id: user._id,
      name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
      username: user.username,
      profilePicture: user.profilePicture || user.image || '/images/avatars/default.png'
    }));
    
    return NextResponse.json({ users: formattedUsers });
  } catch (error: any) {
    console.error("Kullanıcı arama hatası:", error);
    return NextResponse.json(
      { message: "Kullanıcılar aranamadı", error: error.message },
      { status: 500 }
    );
  }
} 