import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";
import { Toaster } from "react-hot-toast";
import ClientComponent from './ClientComponent';
import Navbar from "@/components/layout/Navbar";
import PageContainer from "@/components/layout/PageContainer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CheckDay - Planlarınızı Yönetin",
  description: "Planlarınızı oluşturun, paylaşın ve keşfedin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={inter.className}>
        <Providers>
          <Toaster position="top-center" />
          <ClientComponent />
          <Navbar />
          <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-0">
            <PageContainer>
              {children}
            </PageContainer>
          </main>
        </Providers>
      </body>
    </html>
  );
}
