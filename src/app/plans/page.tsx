"use client";

import React, { Suspense } from "react";
import PageContainer from "@/components/layout/PageContainer";
import PlansClient from "./PlansClient";

export default function PlansPage() {
  return (
    <PageContainer title="Planlar">
      <Suspense fallback={<div className="w-full p-10 text-center">Yükleniyor...</div>}>
        <PlansClient />
      </Suspense>
    </PageContainer>
  );
}