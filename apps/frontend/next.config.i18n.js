/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  
  // Internationalization
  i18n: {
    locales: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
    defaultLocale: 'en',
    domains: [
      {
        domain: 'smm-architect.com',
        defaultLocale: 'en',
      },
      {
        domain: 'smm-architect.es',
        defaultLocale: 'es',
      },
      {
        domain: 'smm-architect.fr',
        defaultLocale: 'fr',
      },
      {
        domain: 'smm-architect.de',
        defaultLocale: 'de',
      },
      {
        domain: 'smm-architect.jp',
        defaultLocale: 'ja',
      },
      {
        domain: 'smm-architect.cn',
        defaultLocale: 'zh',
      },
    ],
  },

  // Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Use nonces or hashes instead of unsafe directives
              "script-src 'self' 'nonce-__CSP_NONCE__'",
              "style-src 'self' 'nonce-__CSP_NONCE__'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // Bundle analysis
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack, nextRuntime }) => {
    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: isServer ? 8888 : 8889,
          openAnalyzer: true,
        })
      )
    }

    return config
  },

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },

  // Output configuration
  output: 'standalone',
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },

  // Redirects for locale handling
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/en/dashboard',
        permanent: false,
      },
      {
        source: '/login',
        destination: '/en/login',
        permanent: false,
      },
      {
        source: '/settings',
        destination: '/en/settings',
        permanent: false,
      },
    ]
  },

  // Rewrites for API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
}
module.exports = nextConfig
