import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  output: "export",
  basePath: process.env.GITHUB_ACTIONS ? "/ielts" : "",
  assetPrefix: process.env.GITHUB_ACTIONS ? "/ielts/" : "",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
