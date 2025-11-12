import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @huggingface/transformers는 클라이언트 사이드 전용이므로 서버에서 제외
  serverExternalPackages: ["@huggingface/transformers"],
};

export default nextConfig;
