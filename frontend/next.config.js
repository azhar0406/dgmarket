/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure allowed image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      // Add any other image hosts you use
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Alternative: Use domains (legacy but simpler)
    domains: [
      'images.pexels.com',
      'images.unsplash.com', 
      'via.placeholder.com',
      'picsum.photos',
    ],
  },

  // Fix for encoding module issue with wagmi/node-fetch
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false,
      };
    }
    return config;
  },
  
  // Experimental features for better Web3 support
  experimental: {
    esmExternals: true,
  },
  
  // Transpile wagmi and related packages
  transpilePackages: ['@wagmi/core', '@wagmi/connectors'],
};

module.exports = nextConfig;