import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";
import { Toaster } from "react-hot-toast";
import ClientComponent from './ClientComponent';
import Script from "next/script";
import Navbar from "../components/layout/Navbar";
import { FaInstagram, FaTwitter, FaLinkedin } from "react-icons/fa";
import Link from "next/link";
import { SocketProvider } from '@/contexts/SocketContext'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CheckDay",
  description: "Planlarınızı ve takvimlerinizi yönetin.",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning className="h-full bg-gray-50">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* Meta etiketleri */}
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </head>
      <body className={`${inter.className} h-full`}>
        <Providers>
          <SocketProvider>
            <Toaster position="top-center" reverseOrder={false} />
            <ClientComponent />
            <Navbar />
            <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-0">
              {children}
            </main>
            
            {/* Footer Bölümü */}
            <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8">
              <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="mb-4 md:mb-0">
                    <Link href="/" className="text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">
                      Checkday
                    </Link>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      © {new Date().getFullYear()} Checkday. Tüm hakları saklıdır.
                    </p>
                  </div>
                  
                  <div className="flex space-x-4">
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300">
                      <FaInstagram size={20} />
                    </a>
                    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300">
                      <FaTwitter size={20} />
                    </a>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300">
                      <FaLinkedin size={20} />
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </SocketProvider>
        </Providers>
        <Script id="countdown-js" strategy="afterInteractive">
          {`
            document.addEventListener('DOMContentLoaded', function() {
              // Countdown saati
              function startCountdown() {
                // İlk değerler
                let countdownValues = {
                  title: '',
                  date: '',
                  active: false
                };
                
                // Her 1 saniyede bir güncelle
                setInterval(function() {
                  fetch('/api/admin/countdown')
                    .then(response => response.json())
                    .then(data => {
                      // Konsola yazdır
                      console.log('Geri sayım verileri:', data);
                      
                      // Değerleri güncelle
                      countdownValues = data;
                      
                      // Geri sayım aktif değilse çık
                      if (!data.active) return;
                      
                      // Geri sayımı hesapla
                      const endDate = new Date(data.date).getTime();
                      const now = new Date().getTime();
                      const distance = endDate - now;
                      
                      // Süre bittiyse
                      if (distance < 0) {
                        return;
                      }
                      
                      // Geri sayım değerlerini hesapla
                      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                      
                      // Değerleri göster
                      // console.log(\`\${days}g \${hours}s \${minutes}d \${seconds}sn\`);
                    })
                    .catch(error => {
                      console.error('Geri sayım verisi alınamadı:', error);
                    });
                }, 5000);
              }
              
              // Sayacı başlat
              startCountdown();
            });
          `}
        </Script>
      </body>
    </html>
  );
}
