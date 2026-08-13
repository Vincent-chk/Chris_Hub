/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["ali-oss", "sharp"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
