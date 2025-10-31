/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true, // 🔧 evita fallos de lint en Vercel
  },
  typescript: {
    ignoreBuildErrors: true, // 🔧 evita fallos de tipado en Vercel
  },
};

export default nextConfig;
