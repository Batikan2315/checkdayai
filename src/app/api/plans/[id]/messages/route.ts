import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Plan from "@/models/Plan";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface RouteContext {
  params: {
    id: string;
  }
}

// GET isteği - Tüm mesajları getir
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await connectDB();
    
    // Plan ID'sini al
    const planId = params.id;
    
    if (!planId) {
      return NextResponse.json({ error: "Plan ID belirtilmedi" }, { status: 400 });
    }
    
    // Mesajları getir
    const messages = await Message.find({ planId })
      .populate('sender', 'username firstName lastName profilePicture')
      .sort({ createdAt: 1 });
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Mesajları getirirken hata:", error);
    return NextResponse.json(
      { error: "Mesajları getirirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// POST isteği - Yeni mesaj ekle
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await connectDB();
    
    // Kullanıcı kimliğini kontrol et
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Bu işlem için giriş yapmalısınız" },
        { status: 401 }
      );
    }
    
    // Plan ID'sini al
    const planId = params.id;
    
    if (!planId) {
      return NextResponse.json({ error: "Plan ID belirtilmedi" }, { status: 400 });
    }
    
    // İstek body'sini al
    const body = await request.json();
    const { content } = body;
    
    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Mesaj içeriği boş olamaz" },
        { status: 400 }
      );
    }
    
    // Planın varlığını kontrol et
    const plan = await Plan.findById(planId);
    
    if (!plan) {
      return NextResponse.json(
        { error: "Plan bulunamadı" },
        { status: 404 }
      );
    }
    
    // Yeni mesaj oluştur
    const newMessage = new Message({
      planId,
      sender: session.user.id,
      content, // text yerine content kullanıyoruz
      createdAt: new Date(),
    });
    
    await newMessage.save();
    
    // Mesajları getir
    const messages = await Message.find({ planId })
      .populate('sender', 'username firstName lastName profilePicture')
      .sort({ createdAt: 1 });
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Mesaj gönderirken hata:", error);
    return NextResponse.json(
      { error: "Mesaj gönderirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 