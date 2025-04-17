#!/bin/bash

# authOptions'ın yanlış import edildiği dosyaları düzeltir
# '[...nextauth]/route' yerine '[...nextauth]/auth' kullanımına geçiş yapılacak

# Değiştirilecek dosyaların listesi
FILES=(
  "src/app/api/admin/fix-plans/route.ts"
  "src/lib/auth-helpers.ts"
  "src/app/api/users/notification-preferences/route.ts"
  "src/app/api/auth/check-admin/route.ts"
  "src/app/api/notifications/route.ts"
  "src/app/api/admin/countdown/route.ts"
  "src/app/api/ai-check/route.ts"
  "src/app/api/notifications/create/route.ts"
  "src/app/api/plans/[id]/messages/route.ts"
  "src/app/api/plans/[id]/join/route.ts"
  "src/app/api/user/[id]/route.ts"
)

# Her bir dosyayı düzelt
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Düzeltiliyor: $file"
    sed -i'.bak' 's|import { authOptions } from "@/app/api/auth/\[...nextauth\]/route"|import { authOptions } from "@/app/api/auth/[...nextauth]/auth"|g' "$file"
    sed -i'.bak' 's|import { authOptions } from '"'"'@/app/api/auth/\[...nextauth\]/route'"'"'|import { authOptions } from '"'"'@/app/api/auth/[...nextauth]/auth'"'"'|g' "$file"
    rm -f "$file.bak" # Yedek dosyaları temizle
  else
    echo "Dosya bulunamadı: $file"
  fi
done

echo "İşlem tamamlandı!" 