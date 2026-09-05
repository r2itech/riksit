/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // A stray lockfile in a parent directory makes Turbopack mis-detect the workspace root.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
