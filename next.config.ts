import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      {
        source: "/how-it-works",
        destination: "/#how-it-works",
        permanent: false,
      },
      {
        source: "/differentiators",
        destination: "/#differentiators",
        permanent: false,
      },
      {
        source: "/pricing",
        destination: "/#pricing",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
