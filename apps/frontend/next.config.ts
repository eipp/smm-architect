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
  // React 18 features
  experimental: {
    // Server Components
    serverComponentsExternalPackages: ['@prisma/client'],
    
    // Edge Runtime
    runtime: 'experimental-edge',
    
    // Optimized package imports
    optimizePackageImports: [
      'framer-motion',
      'class-variance-authority',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-progress',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-slot'
    ],
    
    // Font optimization
    fontLoaders: [
      {
        loader: '@next/font/google',
        options: {
          subsets: ['latin'],
          variable: '--font-inter',
          display: 'swap',
          preload: true
        }
      }
    ],
    
    // Incremental Static Regeneration optimization
    isrMemoryCacheSize: 100 * 1024 * 1024, // 100MB
    
    // Turbo mode for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js'
        }
      }
    }
  },
  
  // Performance optimizations
  productionBrowserSourceMaps: false, // Disable in production for better performance
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false,
    loader: 'default',
    domains: [],
    remotePatterns: []
  },
  
  // Compression
  compress: true,
  
  // Output configuration for optimal loading
  output: 'standalone',
  
  // Powerd by header removal
  poweredByHeader: false,
  
  // React strict mode
  reactStrictMode: true,
  
  // SWC minification
  swcMinify: true,

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
  
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fallback configuration for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // Bundle optimization
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Design system chunks
          designSystem: {
            test: /[\/]src[\/]design-system[\/]/,
            name: 'design-system',
            chunks: 'all',
            priority: 10,
            enforce: true
          },
          // UI components chunk
          ui: {
            test: /[\/]packages[\/]ui[\/]/,
            name: 'ui-components',
            chunks: 'all',
            priority: 9,
            enforce: true
          },
          // Vendor chunks
          vendor: {
            test: /[\/]node_modules[\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 8
          },
          // Framer Motion chunk (heavy animation library)
          framerMotion: {
            test: /[\/]node_modules[\/]framer-motion[\/]/,
            name: 'framer-motion',
            chunks: 'all',
            priority: 15,
            enforce: true
          },
          // Radix UI chunk
          radix: {
            test: /[\/]node_modules[\/]@radix-ui[\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 12,
            enforce: true
          }
        }
      },
      // Module concatenation for better tree shaking
      concatenateModules: true,
      // Side effects optimization
      sideEffects: false
    };
    
    // Development optimizations
    if (dev) {
      config.optimization.removeAvailableModules = false;
      config.optimization.removeEmptyChunks = false;
      config.optimization.splitChunks = false;
    }
    
    // Production optimizations
    if (!dev) {
      // Tree shaking for design tokens
      config.module.rules.push({
        test: /[\/]src[\/]design-system[\/]tokens\.(js|ts)$/,
        sideEffects: false
      });
      
      // Bundle analyzer webpack plugin
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: '../bundle-analyzer-report.html'
          })
        );
      }
    }
    
    // Module resolution optimizations
    config.resolve.modules = ['node_modules', '.'];
    config.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
    
    // Performance hints
    config.performance = {
      maxAssetSize: 250000, // 250kb
      maxEntrypointSize: 250000, // 250kb
      hints: dev ? false : 'warning'
    };
    
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
