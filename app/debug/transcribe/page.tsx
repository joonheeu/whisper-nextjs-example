"use client";

import dynamic from "next/dynamic";

// @huggingface/transformers는 클라이언트 전용이므로 SSR 비활성화
// Next.js 16 (Turbopack)에서 동적 import를 사용하여 서버 사이드 렌더링 방지
const TranscribeContent = dynamic(
  () => import("./transcribe-content").then((mod) => mod.TranscribeContent),
  {
    ssr: false,
  }
);

/**
 * Whisper 모델 디버그 페이지
 * 클라이언트 사이드에서만 렌더링되도록 설정
 */
export default function TranscribeDebugPage() {
  return <TranscribeContent />;
}
