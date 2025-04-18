/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['res.cloudinary.com', 'checkday.ai'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    minimumCacheTTL: 3600, // 1 saat
  },
  experimental: {
    scrollRestoration: true,
    optimizeCss: true,
    optimizeServerReact: true,
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
    // Kod bölme ve yükleme optimizasyonları
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            return `npm.${packageName.replace('@', '')}`;
          },
          priority: 10,
          reuseExistingChunk: true,
        },
        common: {
          test: /[\\/]src[\\/]components[\\/]/,
          name: 'common-components',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
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