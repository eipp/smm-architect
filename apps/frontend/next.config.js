const { withSentryConfig } = require('@sentry/nextjs');

const withBundleAnalyzer = (() => {
  try {
    return require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
  } catch {
    return config => config;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
};

module.exports = withBundleAnalyzer(withSentryConfig(nextConfig));
