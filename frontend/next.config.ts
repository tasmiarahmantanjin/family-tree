import type { NextConfig } from 'next'
import path from 'path'
import fs from 'fs'

const monorepoRoot = path.resolve(__dirname, '..')
const isMonorepo = fs.existsSync(path.join(monorepoRoot, 'package.json'))

const nextConfig: NextConfig = {
  output: 'standalone',
  ...(isMonorepo && {
    turbopack: {
      root: monorepoRoot,
    },
  }),
}

export default nextConfig
