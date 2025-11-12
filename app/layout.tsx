import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Whisper Next.js Example',
  description:
    'Next.js 16 (Turbopack)에서 Hugging Face Transformers를 사용한 Whisper 모델 클라이언트 사이드 음성 인식 예시 프로젝트',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  )
}
