/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: [
      'res.cloudinary.com', 
      'checkday.ai', 
      'localhost', 
      'img.checkday.ai',
      'lh3.googleusercontent.com' // Google profil resimleri için
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    minimumCacheTTL: 3600, // 1 saat
  },
  experimental: {
    scrollRestoration: true,
    optimizeCss: false,
    optimizeServerReact: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  // Basitleştirilmiş webpack yapılandırması
  webpack: (config, { isServer }) => {
    if (isServer) {
      console.log("Sunucu taraflı webpack yapılandırması uygulanıyor");
      
      // Tarayıcı modüllerini sunucu tarafında dışarda bırak
      const originalExternals = config.externals;
      
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals].filter(Boolean)),
        {
          'socket.io-client': 'commonjs socket.io-client',
          'engine.io-client': 'commonjs engine.io-client',
        }
      ];
    }
    
    // Temel fallback ayarları
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
      aws4: false,
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
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
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