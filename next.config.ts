import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/geo-devrel-public-buckets/**' }],
  },
}

export default nextConfig
