import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are shipped as TS source; let Next transpile them.
  transpilePackages: [
    '@khodkar/shared',
    '@khodkar/db',
    '@khodkar/channels',
    '@khodkar/agent',
    '@khodkar/presets',
  ],
  output: 'standalone',
  experimental: {
    // Trace files from the monorepo root so standalone bundles workspace deps.
    outputFileTracingRoot: resolve(__dirname, '../../'),
    // db/crypto packages use node built-ins; keep them server-external.
    serverComponentsExternalPackages: ['postgres'],
  },
  webpack: (config) => {
    // Workspace packages are TS source that use `.js` import specifiers
    // (NodeNext style). Teach webpack to resolve `.js` → `.ts`/`.tsx`.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
