import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
