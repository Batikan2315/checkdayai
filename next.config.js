/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'checkday.ai', 'www.checkday.ai', '*.vercel.app']
    }
  },
  images: {
    domains: [
      'res.cloudinary.com',
      'ui-avatars.com',
      'lh3.googleusercontent.com',
      'checkday.ai'
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: process.env.NODE_ENV !== 'production',
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  }
}

module.exports = nextConfig 