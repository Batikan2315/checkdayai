import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

/**
 * Kullanıcı profilini kullanıcı adına göre getir
 */
export async function GET(req: NextRequest) {
  try {
    // Bağlantıyı kur
    connectDB();
    
    // URL'den kullanıcı adını al
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json({ error: 'Kullanıcı adı belirtilmedi' }, { status: 400 });
    }
    
    // @ işaretini kaldır (eğer varsa)
    const cleanUsername = username.replace('@', '');
    console.log(`Kullanıcı adı API'ye geldi: "${username}", temizlendi: "${cleanUsername}"`);
    
    // Kullanıcıyı bul
    const user = await User.findOne({ username: cleanUsername }).select('-password');
    
    if (!user) {
      console.log(`Kullanıcı bulunamadı: ${cleanUsername}`);
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    
    console.log(`Kullanıcı bulundu: ${user.username} (${user._id})`);
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Kullanıcı profili getirme hatası:', error);
    return NextResponse.json({ error: error.message || 'Beklenmeyen bir hata oluştu' }, { status: 500 });
  }
} 