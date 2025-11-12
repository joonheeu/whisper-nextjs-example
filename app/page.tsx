import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50">
            Whisper Next.js Example
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Next.js 16 (Turbopack)에서 Hugging Face Transformers를 사용한
            Whisper 모델 클라이언트 사이드 음성 인식 예시 프로젝트입니다.
          </p>
          <Link
            href="/debug/transcribe"
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-8 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            디버그 페이지로 이동
          </Link>
        </div>
      </main>
    </div>
  )
}
