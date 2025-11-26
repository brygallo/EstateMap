const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  images: {
    domains: [],
  },
  // Disable static page generation for dynamic routes
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config, { isServer }) => {
    // Exclude old src directory from build
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: /src\/(pages|components)/,
    });
    return config;
  },
};

module.exports = withPWA(nextConfig);
