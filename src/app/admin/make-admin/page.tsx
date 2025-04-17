"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

export default function MakeAdminPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Lütfen bir email adresi girin");
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/admin/make-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({ success: true, message: data.message });
        toast.success(data.message);
        setEmail("");
      } else {
        setResult({ success: false, message: data.message });
        toast.error(data.message);
      }
    } catch (error) {
      console.error("İşlem hatası:", error);
      setResult({ success: false, message: "İstek işlenirken hata oluştu" });
      toast.error("İşlem başarısız oldu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Admin Yetkisi Ver</h1>
      
      <p className="mb-6">
        Bu sayfada kullanıcıları admin yapabilirsiniz. Lütfen kullanıcının email adresini girin.
      </p>
      
      {result && (
        <div className={`p-4 mb-4 rounded-md border ${result.success ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-500 bg-red-50 text-red-800'}`}>
          {result.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email Adresi
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@mail.com"
            disabled={loading}
            required
          />
        </div>
        
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={loading}
        >
          {loading ? "İşleniyor..." : "Admin Yap"}
        </Button>
      </form>
    </div>
  );
} 