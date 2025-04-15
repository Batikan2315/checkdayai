"use client";

import React, { Suspense } from "react";
import PageContainer from "@/components/layout/PageContainer";
import PlansClient from "./PlansClient";

export default function PlansPage() {
  return (
    <PageContainer className="pt-0 sm:pt-2 md:pt-4">
      <Suspense fallback={<div className="w-full p-10 text-center">Yükleniyor...</div>}>
        <PlansClient />
      </Suspense>
    </PageContainer>
  );
}