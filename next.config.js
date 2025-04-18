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
      
      // Boş shim modüllerini kullanacak özel çözüm
      const shimContent = 
        `module.exports = {}`;
      
      // Webpack'in node değerlendirmesini devre dışı bırakalım
      config.resolve.alias = {
        ...config.resolve.alias,
      };
      
      // Yeni bir yaklaşımla externals tanımlayalım
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        function({ context, request }, callback) {
          // İstek içeren modül adını kontrol et
          if (browserModules.some(mod => request === mod || request.startsWith(`${mod}/`))) {
            console.log(`📋 Server bundle'dan çıkarılan modül: ${request}`);
            return callback(null, `commonjs {}`);
          }
          callback();
        }
      ];
    }
    
    // Ek olarak, bölünmüş paketleme stratejisini basitleştirelim
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          name: 'vendor',
          test: /[\\/]node_modules[\\/]/,
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    };
    
    // İstemci ve sunucu için aynı - boş shim modülleri ekle
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
      
      // 'self' içeren modüller için özel bir çözüm
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