/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
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
  devServer: process.env.NODE_ENV === 'development' ? {
    https: {
      key: process.env.SSL_KEY_PATH || './certificates/localhost-key.pem',
      cert: process.env.SSL_CERT_PATH || './certificates/localhost.pem',
    }
  } : undefined,
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