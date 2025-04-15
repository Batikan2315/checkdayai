import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";
import { Toaster } from "react-hot-toast";
import ClientComponent from './ClientComponent';
import Navbar from "@/components/layout/Navbar";
import PageContainer from "@/components/layout/PageContainer";
import { FaInstagram, FaTwitter, FaLinkedin } from "react-icons/fa";
import Link from "next/link";
import { SocketProvider } from '@/contexts/SocketContext'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CheckDay - Etkinlik Planlama ve Yönetim Platformu",
  description: "Etkinliklerinizi planlayın, yönetin ve arkadaşlarınızla paylaşın.",
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning className="h-full bg-gray-50">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* Meta etiketleri */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </head>
      <body className={`${inter.className} h-full`}>
        <Providers>
          <SocketProvider>
            <Toaster position="top-center" reverseOrder={false} />
            <ClientComponent />
            <Navbar />
            <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-0">
              <PageContainer>
                {children}
              </PageContainer>
            </main>
            
            {/* Footer Bölümü */}
            <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8">
              <PageContainer>
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="mb-4 md:mb-0">
                    <div className="flex items-center">
                      <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-blue-400 text-transparent bg-clip-text">
                        check<span className="font-extrabold">day</span>
                      </span>
                      <span className="ml-1 text-sm text-gray-500 dark:text-gray-400 font-light">ai</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">© {new Date().getFullYear()} CheckDay. Tüm hakları saklıdır.</p>
                  </div>
                  
                  <div className="flex space-x-4">
                    <Link href="https://www.instagram.com/checkday.ai" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition-colors">
                      <FaInstagram size={24} />
                    </Link>
                    <Link href="https://twitter.com/checkdayapp" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition-colors">
                      <FaTwitter size={24} />
                    </Link>
                    <Link href="https://linkedin.com/company/checkday" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition-colors">
                      <FaLinkedin size={24} />
                    </Link>
                  </div>
                </div>
              </PageContainer>
            </footer>
          </SocketProvider>
        </Providers>
      </body>
    </html>
  );
}
