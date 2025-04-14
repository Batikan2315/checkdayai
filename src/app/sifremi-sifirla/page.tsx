"use client";

import React, { Suspense } from "react";
import PageContainer from "@/components/layout/PageContainer";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <PageContainer title="Şifre Sıfırlama">
      <Suspense fallback={<div className="w-full p-10 text-center">Yükleniyor...</div>}>
        <ResetPasswordClient />
      </Suspense>
    </PageContainer>
  );
} 