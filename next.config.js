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
  webpack: (config, { dir, isServer }) => {
    // Hata ayıklama için modu kontrol edelim
    console.log(`Webpack derleniyor: isServer=${isServer}`);

    if (isServer) {
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
      
      // Boş bir dummy module kullanarak sunucu tarafında hariç tutalım
      // Yeni yaklaşım: path.resolve ile gerçek bir dosya yoluna işaret edelim
      const path = require('path');
      const dummyModulePath = path.resolve(dir, './node_modules/next/dist/server/future/route-modules/app-page/module.compiled.js');

      // Tarayıcı modüllerini externals olarak tanımla
      const prevExternals = config.externals || [];
      config.externals = [
        ...prevExternals,
        (opts) => {
          const { context, request } = opts;
          
          // Doğrudan socket.io ve ilgili paketleri kontrol et
          if (browserModules.some(mod => request === mod || request.startsWith(`${mod}/`))) {
            console.log(`🔒 Server bundle dışında tutulan modül: ${request}`);
            return "commonjs next/dist/server/future/route-modules/app-page/module.compiled.js";
          }
          
          // Tarayıcı API'lerine bağımlı paketleri kontrol et
          if (request.includes('socket.io') || 
              request.includes('engine.io') || 
              request.includes('websocket') ||
              request.includes('ws') ||
              request.includes('browser')) {
            console.log(`🔒 Server bundle dışında tutulan içerik: ${request}`);
            return "commonjs next/dist/server/future/route-modules/app-page/module.compiled.js";
          }
          
          // Normale devam et
          return undefined;
        }
      ];
            
      // Sunucu tarafında tarayıcı kodlarını kaldırmak için ek önlem
      config.plugins.push(
        new (require('webpack').DefinePlugin)({
          'self': '({})',
          'window': '({})',
          'document': '({})',
          'location': '({})',
          'navigator': '({})'
        })
      );
    } else {
      // İstemci tarafı ayarları
      console.log("İstemci tarafı webpack yapılandırması uygulanıyor");
    }
    
    // İki taraf için de chunk oluşturmayı kaldıralım
    config.optimization.splitChunks = false;
    config.optimization.runtimeChunk = false;
    
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