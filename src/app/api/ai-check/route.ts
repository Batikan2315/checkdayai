import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export async function POST(req: NextRequest) {
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Bu özelliği kullanmak için giriş yapmalısınız" },
        { status: 401 }
      );
    }

    // İstek gövdesini al
    const { prompt, username } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt gereklidir" },
        { status: 400 }
      );
    }

    try {
      // Hugging Face API'ye istek gönder
      const response = await fetch(
        "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Hugging Face'in ücretsiz API anahtarları için hf_... formatında anahtarlar kullanılır
            // Bu demo için geçici anahtar kullanıyoruz
            Authorization: "Bearer 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",
          },
          body: JSON.stringify({
            inputs: `<s>[INST] Sen bir kişisel asistansın. Kullanıcın adı: ${username || session.user.name || "Kullanıcı"}. 
            Kısa ve öz cevaplar ver, Türkçe konuş. CheckDay uygulamasında kullanıcının planlama, takvim ve organizasyon ihtiyaçlarına yardım et.
            Kullanıcının sorularına doğrudan yanıt ver. Her zaman kullanıcıya ismiyle hitap et.
            
            ${prompt} [/INST]</s>`,
            parameters: {
              max_new_tokens: 500,
              temperature: 0.7,
              top_p: 0.95,
              do_sample: true,
            },
            options: {
              use_cache: true,
              wait_for_model: true,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Hugging Face API hatası:", errorData);
        
        // Model yükleniyor hatası
        if (response.status === 503) {
          return NextResponse.json({ 
            response: `Model yükleniyor, lütfen biraz bekleyin ve tekrar deneyin. Bu arada merhaba ${username || session.user.name || "Kullanıcı"}! Nasıl yardımcı olabilirim?` 
          });
        }
        
        throw new Error(`API hatası: ${response.status}`);
      }

      const result = await response.json();
      let aiResponse = "";
      
      // Hugging Face API'nin cevap formatına göre yanıtı al
      if (Array.isArray(result)) {
        aiResponse = result[0]?.generated_text || "";
        
        // Cevabı temizle - [INST] ve [/INST] etiketlerini kaldır
        aiResponse = aiResponse.replace(/<s>\[INST\][\s\S]*?\[\/INST\]<\/s>/, "").trim();
      } else if (typeof result === "object" && result.generated_text) {
        aiResponse = result.generated_text;
        
        // Cevabı temizle - [INST] ve [/INST] etiketlerini kaldır
        aiResponse = aiResponse.replace(/<s>\[INST\][\s\S]*?\[\/INST\]<\/s>/, "").trim();
      } else {
        aiResponse = "Üzgünüm, yanıt üretirken bir sorun oluştu.";
      }
      
      // Boş yanıt kontrolü
      if (!aiResponse || aiResponse.trim() === "") {
        aiResponse = `Merhaba ${username || session.user.name || "Kullanıcı"}! Üzgünüm, şu anda net bir yanıt oluşturamadım. Lütfen sorunuzu tekrar sorar mısınız?`;
      }

      return NextResponse.json({ response: aiResponse });
    } catch (apiError: any) {
      console.error("API hatası:", apiError);
      
      // Daha anlamlı hata mesajı döndür
      let errorMessage = "API ile iletişim kurarken bir sorun oluştu.";
      
      // Hata durumunda demo yanıt döndür
      return NextResponse.json({ 
        response: `${errorMessage} Ancak yine de yardımcı olmaya çalışacağım. Merhaba ${username || session.user.name || "Kullanıcı"}! Soruna yanıt: "${prompt}" - CheckDay uygulamasında planlamana nasıl yardımcı olabilirim?` 
      });
    }
    
  } catch (error: any) {
    console.error("AI check hatası:", error);
    
    return NextResponse.json(
      { response: "Bir hata oluştu, ancak yine de size yardımcı olmaya çalışacağım. Nasıl yardımcı olabilirim?" }
    );
  }
} 