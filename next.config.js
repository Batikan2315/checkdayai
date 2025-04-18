/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['res.cloudinary.com', 'checkday.ai'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    minimumCacheTTL: 3600, // 1 saat
  },
  experimental: {
    scrollRestoration: true,
    optimizeCss: true,
    optimizeServerReact: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: process.env.NODE_ENV !== 'production',
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  webpack: (config, { dev, isServer }) => {
    // Hata ayıklama için modu kontrol edelim
    console.log(`Webpack derleniyor: isServer=${isServer}, isDev=${dev}`);
    
    // Chunk oluşturmayı kontrol edelim. Vendor için en güvenli ayarları kullanalım.
    // Problemi çözmek için tüm webpack paket bölme yapılandırmasını basitleştirelim
    config.optimization.splitChunks = false;
    config.optimization.runtimeChunk = false;

    if (!isServer) {
      // İstemci tarafı ayarları
      console.log("İstemci tarafı webpack yapılandırması uygulanıyor");
    } else {
      console.log("Sunucu tarafı webpack yapılandırması uygulanıyor");
      
      // Sunucu tarafı için tüm client-side modülleri hariç tutalım
      const browserModules = [
        'socket.io-client', 
        'socket.io-parser',
        'engine.io-client',
        'engine.io-parser',
        'debug',
        'sockjs-client',
        'ws',
        'xmlhttprequest-ssl',
        'component-emitter',
        'backo2',
        'parseqs',
        'isomorphic-ws',
        'base64-arraybuffer',
        'yeast',
        'has-cors',
        'blob',
        '@socket.io',
        'bufferutil',
        'utf-8-validate'
      ];
      
      // Webpack'in node değerlendirmesini devre dışı bırakalım
      config.resolve.alias = {
        ...config.resolve.alias,
      };
      
      // Çok daha agresif bir approach - externals'ı tamamen boş modüllerle değiştirelim
      const originalExternals = Array.isArray(config.externals) ? config.externals : [];
      
      config.externals = [
        ...originalExternals,
        function({ context, request }, callback) {
          // Doğrudan socket.io ve ilgili paketleri kontrol et
          if (browserModules.some(mod => request === mod || request.startsWith(`${mod}/`))) {
            console.log(`📋 Server bundle'dan çıkarılan modül: ${request}`);
            return callback(null, `commonjs {}`);
          }
          
          // Tarayıcı API'lerine bağımlı paketleri kontrol et
          if (request.includes('socket.io') || 
              request.includes('engine.io') || 
              request.includes('websocket') ||
              request.includes('ws') ||
              request.includes('browser')) {
            console.log(`📋 Server bundle'dan içerik içeren modül çıkarıldı: ${request}`);
            return callback(null, `commonjs {}`);
          }
          
          callback();
        }
      ];
      
      // Sunucu tarafında tarayıcı kodlarını kaldırmak için ek önlem
      config.plugins.push(
        new (require('webpack').DefinePlugin)({
          'self': 'undefined',
          'window': 'undefined',
          'document': 'undefined',
          'location': 'undefined',
          'navigator': 'undefined'
        })
      );
    }
    
    // Tüm platformlar için temel modül şablonları ekleyelim
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
      dns: false,
      'perf_hooks': false,
      child_process: false,
      'stream': false,
      'crypto': false,
      
      // Tarayıcı özel nesneler için boş modül kullan
      'self': false,
      'window': false,
      'document': false,
      'location': false,
      'navigator': false,
    };
    
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000',
          },
        ],
      },
    ];
  },
  // Next.js kullanıcı taraflı gezinme sırasında sayfa ön yükleme
  onDemandEntries: {
    // sayfaların sunucu bellekte tutulduğu süre (ms)
    maxInactiveAge: 60 * 1000,
    // eşzamanlı olarak kaç sayfa yükleme ve hazırda tutma
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig 