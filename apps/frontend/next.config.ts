import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Bundle analyzer (optional)
const withBundleAnalyzer = (() => {
  try {
    return require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' })
  } catch {
    return (config: any) => config
  }
})()

const nextConfig: NextConfig = {
  // Performance optimizations
  productionBrowserSourceMaps: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https:;
              font-src 'self';
              connect-src 'self' ${process.env.NEXT_PUBLIC_API_BASE_URL || ''} wss:;
              frame-ancestors 'none';
            `.replace(/\s{2,}/g, ' ').trim()
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  
  // Organization and project for Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Only upload source maps in production
  dryRun: process.env.NODE_ENV !== 'production',
  
  // Disable source map upload if no auth token
  disableSourceMapUpload: !process.env.SENTRY_AUTH_TOKEN,
};

export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
