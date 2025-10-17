/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable linting and TypeScript checking during builds for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Enable image optimization for production
  images: {
    unoptimized: false,
  },
  
  // Security headers for production
  async headers() {
    // Disable CSP in development for debugging
    const isDev = process.env.NODE_ENV === 'development';

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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          ...(!isDev ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          }] : []),
          ...(!isDev ? [{
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://127.0.0.1:8001 ws://127.0.0.1:8001 wss://dealer.1769.fi https://dealer.1769.fi https://drive.google.com https://*.s3.amazonaws.com https://1769-flash-bucket.s3.eu-north-1.amazonaws.com; frame-ancestors 'none';",
          }] : []),
        ],
      },
    ]
  },
}

export default nextConfig
