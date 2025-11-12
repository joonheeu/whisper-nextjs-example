# Whisper Next.js Example

Next.js 16 (Turbopack)에서 Hugging Face Transformers를 사용한 Whisper 모델 클라이언트 사이드 음성 인식 예시 프로젝트입니다.

## 🎯 소개

이 프로젝트는 **Next.js 16 (Turbopack)** 환경에서 **@huggingface/transformers**를 사용하여 클라이언트 사이드에서 OpenAI의 Whisper 모델을 실행하는 예시입니다.

### 스크린샷

![디버그 페이지 스크린샷](./docs/images/screenshot.jpeg)

### 주요 특징

- ✅ **완전한 클라이언트 사이드 실행**: 서버 없이 브라우저에서 직접 음성 인식
- ✅ **Next.js 16 (Turbopack) 지원**: 최신 Next.js 버전과 Turbopack 번들러 사용
- ✅ **실시간 녹음 및 파일 업로드**: 마이크 녹음 또는 오디오 파일 업로드 지원
- ✅ **다양한 전사 옵션**: 언어 지정, 번역, 타임스탬프 등
- ✅ **성능 메트릭**: 처리 시간, 실시간 배수 등 성능 정보 표시
- ✅ **실시간 로그**: 모델 로드 및 전사 과정의 상세한 로그
- ✅ **WebGPU 자동 감지**: GPU 가속 지원 시 자동으로 WebGPU 사용

## 🚀 기능

### 기본 기능

- **음성 전사**: 오디오를 텍스트로 변환
- **음성 번역**: 오디오를 영어로 번역
- **실시간 녹음**: 브라우저 마이크를 통한 실시간 녹음
- **파일 업로드**: 오디오 파일 업로드 및 전사

### 고급 기능

- **언어 지정**: 18개 언어 지원 (한국어, 영어, 일본어 등)
- **타임스탬프**: 문장 단위 또는 단어 단위 타임스탬프
- **Long-form 처리**: 긴 오디오를 위한 청크 처리
- **성능 최적화 옵션**: numBeams, temperature 등 세부 설정
- **성능 메트릭**: 처리 시간, 실시간 배수 등 표시
- **실시간 로그**: 모델 로드 및 전사 과정 로깅

## 🛠 기술 스택

- **Next.js 16**: React 프레임워크 (Turbopack 번들러)
- **@huggingface/transformers**: 브라우저에서 실행 가능한 ML 모델 라이브러리
- **TypeScript**: 타입 안전성
- **Tailwind CSS**: 유틸리티 기반 CSS
- **shadcn/ui**: 고품질 UI 컴포넌트
- **React 19**: 최신 React 버전

## 📦 설치 방법

### 사전 요구사항

- Node.js 18 이상
- pnpm (권장) 또는 npm, yarn

### 설치 단계

1. **저장소 클론**

```bash
git clone https://github.com/joonheeu/whisper-nextjs-example.git
cd whisper-nextjs-example
```

2. **의존성 설치**

```bash
pnpm install
```

3. **개발 서버 실행**

```bash
pnpm dev
```

4. **브라우저에서 열기**

```
http://localhost:3000
```

### 빌드

```bash
pnpm build
pnpm start
```

## 💻 사용 방법

### 기본 사용

1. **디버그 페이지 접속**

   - 홈 페이지에서 "디버그 페이지로 이동" 버튼 클릭
   - 또는 직접 `/debug/transcribe` 경로로 이동

2. **모델 로드 대기**

   - 페이지 로드 시 자동으로 Whisper 모델이 로드됩니다
   - 모델 상태가 "준비 완료"가 될 때까지 대기

3. **음성 전사**

   - **녹음**: "녹음 시작" 버튼 클릭 → 말하기 → "녹음 중지" 클릭
   - **파일 업로드**: "파일 선택" 버튼 클릭 → 오디오 파일 선택

4. **결과 확인**

   - 전사 결과가 텍스트 영역에 표시됩니다
   - 타임스탬프가 활성화된 경우 청크별로 표시됩니다

### 전사 옵션 설정

#### 기본 옵션

- **타임스탬프**: 없음 / 문장 단위 / 단어 단위
- **태스크**: 전사 (Transcribe) / 번역 (Translate)
- **언어**: 자동 감지 또는 특정 언어 지정

#### Long-form 처리

- **청크 길이**: 30초 권장 (30초 이상 오디오에 사용)
- **겹침 길이**: 5초 권장

#### 고급 옵션

- **Beam Search 빔 수**: 1 (greedy, 빠름) ~ 10 (정확함, 느림)
- **온도**: 0.0 (결정적) ~ 1.0 (다양함)
- **이전 토큰 조건부 생성**: 활성화/비활성화
- **압축 비율 임계값**: 기본값 2.4
- **로그 확률 임계값**: 기본값 -1.0
- **무음 임계값**: 기본값 0.6

### 성능 메트릭 확인

전사 완료 후 다음 정보가 표시됩니다:

- **처리 시간**: 전사에 소요된 시간 (초)
- **실시간 배수**: 오디오 길이 / 처리 시간
  - 1.0 이상: 실시간보다 빠름 (녹색)
  - 1.0 미만: 실시간보다 느림 (노란색)
- **오디오 길이**: 처리된 오디오의 길이 (초, 추정)
- **디바이스**: 사용된 디바이스 (wasm / webgpu)

### 실시간 로그 확인

페이지 하단의 "실시간 로그" 섹션에서 다음 정보를 확인할 수 있습니다:

- 모델 로드 과정
- 디바이스 정보 (WASM / WebGPU)
- 전사 옵션
- 전사 진행 상황
- 성능 메트릭
- 에러 메시지

## ⚡ 성능 최적화

### 자동 최적화

- **WebGPU 자동 감지**: GPU가 있는 경우 자동으로 WebGPU 사용
- **양자화 모델**: q4 양자화 모델 사용 (메모리 절약 및 속도 향상)

### 수동 최적화

#### 1. 모델 크기 변경

`hooks/use-whisper.ts`에서 모델 ID 변경:

```typescript
// 더 빠른 모델 (정확도 약간 낮음)
const MODEL_ID = 'Xenova/whisper-tiny' // ~39MB

// 기본 모델 (균형)
const MODEL_ID = 'Xenova/whisper-small' // ~244MB

// 더 정확한 모델 (느림)
const MODEL_ID = 'Xenova/whisper-base' // ~290MB
```

#### 2. numBeams 조정

- **속도 우선**: `numBeams: 1` (greedy search)
- **정확도 우선**: `numBeams: 5` 이상

#### 3. 언어 명시

언어를 명시적으로 지정하면 자동 감지 비용이 제거되어 약 10-20% 빠릅니다.

#### 4. 타임스탬프 비활성화

타임스탬프가 필요 없는 경우 비활성화하면 약 5-10% 빠릅니다.

### 성능 비교

| 모델 | 크기 | 속도 | 정확도 |
|------|------|------|--------|
| whisper-tiny | ~39MB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| whisper-small | ~244MB | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| whisper-base | ~290MB | ⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🔧 문제 해결

### 모델 로드 실패

**증상**: "모델을 로드하는 중 오류가 발생했습니다."

**해결 방법**:

1. **Turbopack 이슈**: Next.js 16에서 Turbopack을 사용하는 경우, webpack으로 전환:

```bash
pnpm dev --webpack
```

2. **네트워크 확인**: 모델 파일 다운로드를 위해 인터넷 연결 확인

3. **브라우저 콘솔 확인**: 개발자 도구에서 상세한 에러 메시지 확인

### ONNX Runtime 경고

**증상**: 콘솔에 "Some nodes were not assigned to the preferred execution providers" 경고

**해결 방법**: 이 경고는 정상적인 동작입니다. ONNX Runtime이 성능 향상을 위해 일부 노드를 CPU에 할당하는 것입니다. 무시해도 됩니다.

### WebGPU 사용 불가

**증상**: WebGPU가 감지되지 않음

**해결 방법**:

- WebGPU는 Chrome 113+, Edge 113+에서만 지원됩니다
- 자동으로 WASM으로 폴백되므로 문제없이 동작합니다
- GPU가 없는 디바이스에서는 WASM을 사용합니다

### 메모리 부족

**증상**: "파일 크기가 너무 큽니다" 또는 브라우저 메모리 부족

**해결 방법**:

1. **파일 크기 제한 조정**: 메모리 제한 설정에서 최대 파일 크기 감소
2. **더 작은 모델 사용**: `whisper-tiny` 모델로 변경
3. **청크 처리 사용**: 긴 오디오의 경우 청크 처리 활성화

## 📚 프로젝트 구조

```
whisper-nextjs-example/
├── app/
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 홈 페이지
│   ├── globals.css             # 전역 스타일
│   └── debug/
│       └── transcribe/
│           ├── page.tsx        # 디버그 페이지 (SSR 비활성화)
│           └── transcribe-content.tsx  # 전사 UI 컴포넌트
├── components/
│   └── ui/                     # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── textarea.tsx
│       └── select.tsx
├── hooks/
│   └── use-whisper.ts         # Whisper 모델 훅
├── utils/
│   ├── audio-processor.ts      # 오디오 전처리 유틸리티
│   └── ui.ts                  # UI 유틸리티 (cn 함수)
├── next.config.ts             # Next.js 설정
├── components.json            # shadcn/ui 설정
├── package.json
├── tsconfig.json
└── README.md
```

## 🔍 주요 파일 설명

### `hooks/use-whisper.ts`

Whisper 모델을 사용하는 커스텀 훅입니다.

**주요 기능**:

- 모델 자동 로드
- WebGPU/WASM 자동 선택
- 전사 옵션 처리
- 성능 메트릭 수집
- 실시간 로그 관리

### `utils/audio-processor.ts`

오디오 전처리 유틸리티 함수들입니다.

**주요 기능**:

- 오디오 파일 검증
- 오디오 길이 확인
- 샘플링 레이트 조정
- 모노 변환

### `app/debug/transcribe/transcribe-content.tsx`

전사 디버그 페이지의 메인 컴포넌트입니다.

**주요 기능**:

- 실시간 녹음
- 파일 업로드
- 전사 옵션 설정
- 결과 표시
- 성능 메트릭 표시
- 실시간 로그 표시

## 🌐 지원 언어

다음 언어를 지원합니다:

- 한국어 (ko)
- 영어 (en)
- 일본어 (ja)
- 중국어 (zh)
- 스페인어 (es)
- 프랑스어 (fr)
- 독일어 (de)
- 러시아어 (ru)
- 포르투갈어 (pt)
- 이탈리아어 (it)
- 네덜란드어 (nl)
- 폴란드어 (pl)
- 터키어 (tr)
- 아랍어 (ar)
- 힌디어 (hi)
- 태국어 (th)
- 베트남어 (vi)
- 인도네시아어 (id)

또는 자동 감지 (언어 지정 안 함)

## 📝 라이선스

MIT License

## 🙏 감사의 말

- [Hugging Face](https://huggingface.co/) - Transformers.js 라이브러리
- [OpenAI](https://openai.com/) - Whisper 모델
- [Next.js](https://nextjs.org/) - React 프레임워크
- [shadcn/ui](https://ui.shadcn.com/) - UI 컴포넌트

## 📞 문의

이슈나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.

---

**English**

# Whisper Next.js Example

A client-side speech recognition example project using Hugging Face Transformers with Whisper model in Next.js 16 (Turbopack).

## Features

- ✅ **Fully client-side**: Speech recognition runs directly in the browser without a server
- ✅ **Next.js 16 (Turbopack) support**: Uses the latest Next.js version with Turbopack bundler
- ✅ **Real-time recording & file upload**: Support for microphone recording or audio file upload
- ✅ **Various transcription options**: Language specification, translation, timestamps, etc.
- ✅ **Performance metrics**: Display processing time, real-time factor, etc.
- ✅ **Real-time logs**: Detailed logs of model loading and transcription process
- ✅ **WebGPU auto-detection**: Automatically uses WebGPU when GPU acceleration is available

## Tech Stack

- **Next.js 16**: React framework (Turbopack bundler)
- **@huggingface/transformers**: ML model library that runs in the browser
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-based CSS
- **shadcn/ui**: High-quality UI components
- **React 19**: Latest React version

## Installation

```bash
git clone https://github.com/joonheeu/whisper-nextjs-example.git
cd whisper-nextjs-example
pnpm install
pnpm dev
```

## Usage

1. Navigate to `/debug/transcribe`
2. Wait for the model to load
3. Record audio or upload a file
4. View transcription results

## License

MIT License
