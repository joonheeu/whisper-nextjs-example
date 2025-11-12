'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { validateAudioFile } from '@/utils/audio-processor'

export interface TranscribeOptions {
  /**
   * 타임스탬프 반환 여부
   * - false: 타임스탬프 없음
   * - true: 문장 단위 타임스탬프
   * - "word": 단어 단위 타임스탬프
   */
  returnTimestamps?: boolean | 'word'
  /**
   * 언어 코드 (ISO 639-1 형식, 예: "ko", "en", "ja")
   * 또는 언어 이름 (예: "korean", "english", "japanese") - 자동 변환됨
   * 지정하지 않으면 자동 감지
   * 
   * task가 "translate"인 경우, 이 값은 원본 언어를 지정합니다 (출력은 항상 영어)
   */
  language?: string
  /**
   * 태스크 타입
   * - "transcribe": 음성을 같은 언어로 전사 (language로 원본 언어 지정)
   * - "translate": 음성을 영어로 번역 (language로 원본 언어 지정, 출력은 항상 영어)
   */
  task?: 'transcribe' | 'translate'
  /**
   * Long-form 오디오 처리를 위한 청크 길이 (초)
   * 30초 이상 오디오에 권장
   * 기본값: undefined (sequential 알고리즘 사용)
   */
  chunkLengthS?: number
  /**
   * 청크 간 겹침 길이 (초)
   * chunkLengthS가 설정된 경우에만 사용
   */
  strideLengthS?: number
  /**
   * 생성 옵션
   */
  generateKwargs?: {
    /**
     * 최대 생성 토큰 수
     */
    maxNewTokens?: number
    /**
     * Beam search 빔 수
     * - 1: greedy search (가장 빠름, 정확도 약간 낮음)
     * - 5: 기본값 (균형)
     * - 더 높은 값: 더 정확하지만 느림
     */
    numBeams?: number
    /**
     * 이전 토큰에 조건부 생성 여부
     */
    conditionOnPrevTokens?: boolean
    /**
     * 압축 비율 임계값
     */
    compressionRatioThreshold?: number
    /**
     * 온도 값 또는 온도 배열 (fallback)
     */
    temperature?: number | number[]
    /**
     * 로그 확률 임계값
     */
    logprobThreshold?: number
    /**
     * 무음 임계값
     */
    noSpeechThreshold?: number
  }
}

export interface TimestampChunk {
  /**
   * 타임스탬프 [시작, 끝] (초)
   */
  timestamp: [number, number]
  /**
   * 텍스트
   */
  text: string
}

export interface TranscribeResult {
  /**
   * 전사된 텍스트
   */
  text: string
  /**
   * 타임스탬프 청크 (returnTimestamps가 true 또는 "word"인 경우)
   */
  chunks?: TimestampChunk[]
}

export interface UseWhisperOptions {
  /**
   * 최대 파일 크기 (MB)
   * 기본값: 50MB
   */
  maxFileSizeMB?: number
  /**
   * 최대 오디오 길이 (초)
   * 기본값: 300초 (5분)
   */
  maxDurationSeconds?: number
  /**
   * 메모리 체크 활성화
   * 기본값: true
   */
  enableMemoryCheck?: boolean
}

export interface PerformanceMetrics {
  /**
   * 전사 처리 시간 (초)
   */
  processingTime?: number
  /**
   * 오디오 길이 (초, 추정)
   */
  audioDuration?: number
  /**
   * 실시간 배수 (오디오 길이 / 처리 시간)
   */
  realtimeFactor?: number
  /**
   * 사용된 디바이스 (wasm, webgpu)
   */
  device?: string
  /**
   * 모델 ID
   */
  modelId?: string
}

export interface UseWhisperReturn {
  /**
   * 오디오를 텍스트로 변환
   * @param audio 오디오 Blob 또는 File
   * @param options 전사 옵션
   * @returns 전사 결과 (타임스탬프 포함 가능)
   */
  transcribe: (
    audio: Blob | File,
    options?: TranscribeOptions
  ) => Promise<TranscribeResult>
  /**
   * 모델 로딩 중 여부
   */
  isModelLoading: boolean
  /**
   * 전사 중 여부
   */
  isTranscribing: boolean
  /**
   * 에러 메시지
   */
  error: string | null
  /**
   * 모델 준비 완료 여부
   */
  isModelReady: boolean
  /**
   * 성능 메트릭
   */
  performanceMetrics: PerformanceMetrics | null
  /**
   * 실시간 로그
   */
  logs: Array<{ timestamp: number; level: 'info' | 'warn' | 'error'; message: string }>
  /**
   * 로그 초기화
   */
  clearLogs: () => void
}

// @huggingface/transformers는 브라우저에서 사용 가능한 ONNX 모델을 지원합니다
// 사용 가능한 모델: Xenova/whisper-tiny, Xenova/whisper-small, Xenova/whisper-base, 
//                  Xenova/whisper-medium, Xenova/whisper-large-v3,
//                  onnx-community/whisper-base 등
// 참고: openai/ 접두사 모델은 ONNX로 변환되지 않았으므로 사용할 수 없습니다
const MODEL_ID = 'Xenova/whisper-small'
const DEFAULT_MAX_FILE_SIZE_MB = 50
const DEFAULT_MAX_DURATION_SECONDS = 300

/**
 * Whisper 모델을 사용한 음성 인식 훅
 * 
 * Next.js 16 (Turbopack) 환경에서 @huggingface/transformers를 사용하여
 * 클라이언트 사이드에서 Whisper 모델을 실행합니다.
 * 
 * @param options 훅 옵션
 * @returns Whisper 훅 반환값
 */
export function useWhisper(
  options: UseWhisperOptions = {}
): UseWhisperReturn {
  const {
    maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB,
    maxDurationSeconds = DEFAULT_MAX_DURATION_SECONDS,
    enableMemoryCheck = true,
  } = options

  const [isModelLoading, setIsModelLoading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModelReady, setIsModelReady] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [logs, setLogs] = useState<Array<{ timestamp: number; level: 'info' | 'warn' | 'error'; message: string }>>([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transcriberRef = useRef<any>(null)
  const deviceRef = useRef<string>('wasm')

  // 로그 추가 함수
  const addLog = useCallback((level: 'info' | 'warn' | 'error', message: string) => {
    const timestamp = Date.now()
    setLogs((prev) => [...prev, { timestamp, level, message }])
    
    // 개발 환경에서도 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      if (level === 'error') {
        console.error(`[Whisper] ${message}`)
      } else if (level === 'warn') {
        console.warn(`[Whisper] ${message}`)
      } else {
        console.log(`[Whisper] ${message}`)
      }
    }
  }, [])

  // 로그 초기화
  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  // 모델 로드
  useEffect(() => {
    // 서버 사이드에서는 실행하지 않음
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !window.fetch
    ) {
      return
    }

    let isMounted = true

    // ONNX Runtime 경고를 로그에 통합하기 위한 콘솔 가로채기
    const originalConsoleWarn = console.warn
    const onnxWarningPattern = /onnxruntime.*VerifyEachNodeIsAssignedToAnEp/i
    
    console.warn = (...args: unknown[]) => {
      const message = args.join(' ')
      
      // ONNX Runtime의 노드 할당 경고는 정상적인 동작이므로 정보성 로그로 처리
      if (onnxWarningPattern.test(message)) {
        // 이 경고는 정상적인 동작입니다:
        // ONNX Runtime이 성능 향상을 위해 shape 관련 연산을 CPU에 명시적으로 할당합니다
        addLog('info', 'ONNX Runtime: 일부 노드가 CPU에 할당되었습니다 (정상 동작)')
        // 개발 환경에서만 원본 경고 출력 (디버깅용)
        if (process.env.NODE_ENV === 'development') {
          originalConsoleWarn(...args)
        }
        return
      }
      
      // 다른 경고는 그대로 출력
      originalConsoleWarn(...args)
    }

    const loadModel = async () => {
      if (transcriberRef.current) {
        return
      }

      setIsModelLoading(true)
      setError(null)

      try {
        // @huggingface/transformers를 동적으로 import
        // 모듈이 완전히 로드될 때까지 약간의 지연 추가
        await new Promise((resolve) => setTimeout(resolve, 100))
        
        // 동적 import 시도
        let transformersModule
        try {
          // @huggingface/transformers는 내부적으로 환경을 설정할 수 있으므로
          // 안전하게 import
          // 동적 import 실행
          // @huggingface/transformers는 브라우저 환경에서 사용 가능합니다
          // @huggingface/transformers와 @xenova/transformers는 동일한 패키지입니다
          transformersModule = await import('@huggingface/transformers')
          
          // 환경 설정 (브라우저 환경에서 로컬 모델 체크 비활성화)
          if (transformersModule.env) {
            transformersModule.env.allowLocalModels = false
            
            // ONNX Runtime WebAssembly 로딩을 위한 설정
            // Turbopack 환경에서 WebAssembly 파일이 제대로 로드되도록 설정
            if (typeof transformersModule.env.useBrowserCache !== 'undefined') {
              transformersModule.env.useBrowserCache = true
            }
            
            // ONNX Runtime 백엔드 설정
            // SIMD/Threaded 버전은 SharedArrayBuffer와 CSP 헤더가 필요하므로
            // 일반 WASM 버전을 사용하도록 설정
            if (typeof transformersModule.env.backends !== 'undefined') {
              // @ts-ignore - @huggingface/transformers의 내부 타입 정의가 불완전함
              if (transformersModule.env.backends.onnxruntime) {
                // 일반 WASM 백엔드 사용 (SIMD/Threaded 비활성화)
                // SIMD/Threaded 버전은 "Aborted()" 에러를 발생시킬 수 있음
                // @ts-ignore
                transformersModule.env.backends.onnxruntime.wasm = {
                  // SIMD 및 Threaded 비활성화
                  simd: false,
                  threads: false,
                }
              }
            }
          }
          
          // 모듈이 로드된 후 약간의 지연 (내부 초기화 완료 대기)
          // ONNX Runtime WebAssembly 초기화를 위한 추가 시간
          await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (importError) {
          const errorMsg =
            importError instanceof Error
              ? importError.message
              : '알 수 없는 오류'
          
          // 더 자세한 에러 정보 제공
          if (process.env.NODE_ENV === 'development') {
            console.error('@huggingface/transformers import 상세 오류:', importError)
          }
          
          throw new Error(
            `모듈 import 실패: ${errorMsg}. ` +
              `Next.js 16에서 Turbopack을 사용하는 경우, ` +
              `'pnpm dev --webpack' 명령으로 webpack을 사용하세요.`
          )
        }
        
        // 모듈이 제대로 로드되었는지 확인
        if (!transformersModule || typeof transformersModule !== 'object') {
          throw new Error('@huggingface/transformers 모듈을 로드할 수 없습니다.')
        }
        
        // pipeline 함수 확인 (안전하게)
        let pipeline
        try {
          if (!transformersModule.pipeline) {
            // 모듈의 export된 키 확인 (안전하게)
            let moduleKeys: string[] = []
            try {
              if (transformersModule && typeof transformersModule === 'object') {
                moduleKeys = Object.keys(transformersModule)
              }
            } catch {
              moduleKeys = ['키를 확인할 수 없음']
            }
            throw new Error(
              `pipeline 함수를 찾을 수 없습니다. 모듈 구조: ${moduleKeys.join(', ')}`
            )
          }
          
          if (typeof transformersModule.pipeline !== 'function') {
            throw new Error('pipeline이 함수가 아닙니다.')
          }
          
          pipeline = transformersModule.pipeline
        } catch (pipelineError) {
          throw new Error(
            `pipeline 함수 확인 실패: ${
              pipelineError instanceof Error
                ? pipelineError.message
                : '알 수 없는 오류'
            }`
          )
        }
        
        // 모델 로드
        // @huggingface/transformers의 pipeline 함수는 task와 model을 인자로 받습니다
        let transcriber
        try {
          // WebGPU 지원 여부 확인 (속도 향상)
          const supportsWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator
          const device = supportsWebGPU ? 'webgpu' : 'wasm'
          deviceRef.current = device
          
          addLog('info', `모델 로드 시작: ${MODEL_ID}`)
          addLog('info', `디바이스: ${device}${supportsWebGPU ? ' (GPU 가속)' : ' (CPU)'}`)
          
          // pipeline 함수 시그니처: pipeline(task, model, options?)
          // device를 자동으로 선택: WebGPU 지원 시 WebGPU, 아니면 WASM
          // SIMD/Threaded 버전은 SharedArrayBuffer와 CSP 헤더가 필요하여 에러 발생 가능
          transcriber = await pipeline(
            'automatic-speech-recognition',
            MODEL_ID,
            {
              device, // WebGPU 우선, 없으면 WASM
              dtype: 'q4', // 양자화된 모델 사용 (메모리 절약 및 속도 향상)
            }
          )
          
          addLog('info', `모델 로드 완료: ${MODEL_ID}`)
          addLog('info', `사용 디바이스: ${device}`)
        } catch (pipelineError) {
          // 더 자세한 에러 정보 로깅
          if (process.env.NODE_ENV === 'development') {
            console.error('Pipeline 생성 오류:', pipelineError)
            console.error('모델 ID:', MODEL_ID)
            console.error('Pipeline 함수 타입:', typeof pipeline)
            if (pipelineError instanceof Error) {
              console.error('에러 스택:', pipelineError.stack)
            }
          }
          
          // 모델 ID가 잘못되었을 가능성
          throw new Error(
            `모델 로드 실패: ${
              pipelineError instanceof Error
                ? pipelineError.message
                : '알 수 없는 오류'
            }. 모델 ID: ${MODEL_ID}`
          )
        }

        if (isMounted) {
          transcriberRef.current = transcriber
          setIsModelReady(true)
          setIsModelLoading(false)
          addLog('info', '모델 준비 완료')
        }
      } catch (err) {
        if (isMounted) {
          let errorMessage = '모델을 로드하는 중 오류가 발생했습니다.'
          
          if (err instanceof Error) {
            errorMessage = err.message
            addLog('error', `모델 로드 실패: ${err.message}`)
            if (process.env.NODE_ENV === 'development') {
              console.error('Whisper 모델 로드 오류:', err)
              console.error('에러 스택:', err.stack)
            }
          }
          
          setError(errorMessage)
          setIsModelLoading(false)
        }
      }
    }

    loadModel()

    return () => {
      isMounted = false
      // 콘솔 원래대로 복원
      console.warn = originalConsoleWarn
    }
  }, [addLog])

  const transcribe = useCallback(
    async (
      audio: Blob | File,
      options: TranscribeOptions = {}
    ): Promise<TranscribeResult> => {
      setError(null)
      setIsTranscribing(true)
      addLog('info', '전사 시작')

      try {
        // 모델이 준비되지 않은 경우 대기
        if (!transcriberRef.current) {
          // 모델 로딩 중이면 대기
          if (isModelLoading) {
            // 모델 로딩 완료까지 대기 (최대 60초)
            const maxWaitTime = 60000
            const startTime = Date.now()
            while (!transcriberRef.current && Date.now() - startTime < maxWaitTime) {
              await new Promise((resolve) => setTimeout(resolve, 100))
            }

            if (!transcriberRef.current) {
              throw new Error('모델 로딩 시간이 초과되었습니다.')
            }
          } else {
            throw new Error('모델이 준비되지 않았습니다.')
          }
        }

        // 메모리 체크 활성화 시 파일 검증
        if (enableMemoryCheck) {
          const validation = await validateAudioFile(
            audio,
            maxFileSizeMB,
            maxDurationSeconds
          )

          if (!validation.valid) {
            throw new Error(validation.error || '파일 검증에 실패했습니다.')
          }
        }

        // Blob을 URL로 변환하여 전달
        const audioUrl = URL.createObjectURL(audio)

        try {
          // 옵션 구성
          const {
            returnTimestamps = false,
            language,
            task,
            chunkLengthS,
            strideLengthS,
            generateKwargs,
          } = options

          // 파이프라인 옵션 구성
          const pipelineOptions: Record<string, unknown> = {}

          // 타임스탬프 옵션
          if (returnTimestamps) {
            pipelineOptions.return_timestamps =
              returnTimestamps === 'word' ? 'word' : true
          }

          // 언어 설정 (최상위 레벨)
          if (language) {
            // 언어 이름을 ISO 639-1 코드로 변환
            const languageMap: Record<string, string> = {
              korean: 'ko',
              english: 'en',
              japanese: 'ja',
              chinese: 'zh',
              spanish: 'es',
              french: 'fr',
              german: 'de',
              russian: 'ru',
              portuguese: 'pt',
              italian: 'it',
              dutch: 'nl',
              polish: 'pl',
              turkish: 'tr',
              arabic: 'ar',
              hindi: 'hi',
              thai: 'th',
              vietnamese: 'vi',
              indonesian: 'id',
            }
            
            const normalizedLang = language.toLowerCase().trim()
            const langCode = languageMap[normalizedLang] || normalizedLang
            pipelineOptions.language = langCode
          }

          // 태스크 설정 (최상위 레벨)
          if (task) {
            pipelineOptions.task = task
          }

          // 청크 길이 옵션 (Long-form 처리)
          if (chunkLengthS !== undefined) {
            pipelineOptions.chunk_length_s = chunkLengthS
            if (strideLengthS !== undefined) {
              pipelineOptions.stride_length_s = strideLengthS
            }
          }

          // generate_kwargs 구성
          const genKwargs: Record<string, unknown> = {}

          if (generateKwargs) {
            if (generateKwargs.maxNewTokens !== undefined) {
              genKwargs.max_new_tokens = generateKwargs.maxNewTokens
            }
            if (generateKwargs.numBeams !== undefined) {
              genKwargs.num_beams = generateKwargs.numBeams
            }
            if (generateKwargs.conditionOnPrevTokens !== undefined) {
              genKwargs.condition_on_prev_tokens =
                generateKwargs.conditionOnPrevTokens
            }
            if (generateKwargs.compressionRatioThreshold !== undefined) {
              genKwargs.compression_ratio_threshold =
                generateKwargs.compressionRatioThreshold
            }
            if (generateKwargs.temperature !== undefined) {
              genKwargs.temperature = generateKwargs.temperature
            }
            if (generateKwargs.logprobThreshold !== undefined) {
              genKwargs.logprob_threshold = generateKwargs.logprobThreshold
            }
            if (generateKwargs.noSpeechThreshold !== undefined) {
              genKwargs.no_speech_threshold = generateKwargs.noSpeechThreshold
            }
          }

          if (Object.keys(genKwargs).length > 0) {
            pipelineOptions.generate_kwargs = genKwargs
          }

          // 옵션 로깅
          addLog('info', `전사 옵션: language=${pipelineOptions.language || 'auto'}, task=${pipelineOptions.task || 'transcribe'}`)
          if (pipelineOptions.chunk_length_s) {
            addLog('info', `청크 처리: chunkLength=${pipelineOptions.chunk_length_s}s, stride=${pipelineOptions.stride_length_s || 0}s`)
          }

          // 전사 수행 (성능 측정)
          const startTime = performance.now()
          addLog('info', '모델 추론 시작...')
          
          // @ts-ignore - @huggingface/transformers의 타입 정의가 복잡하여 타입 단언 필요
          const result = (await transcriberRef.current(audioUrl, pipelineOptions)) as
            | string
            | { text?: string; chunks?: Array<{ timestamp: [number, number]; text: string }> }
          const endTime = performance.now()
          
          const processingTime = (endTime - startTime) / 1000
          // 오디오 길이 추정 (정확하지 않지만 참고용)
          let estimatedDuration = 0
          if (audio instanceof File) {
            // 파일 크기로부터 대략적인 길이 추정 (16kHz, 16-bit mono 기준)
            estimatedDuration = audio.size / (16000 * 2)
          } else if (audio instanceof Blob) {
            estimatedDuration = audio.size / (16000 * 2)
          }
          
          const realtimeFactor = estimatedDuration > 0 ? estimatedDuration / processingTime : 0
          
          // 성능 메트릭 저장
          setPerformanceMetrics({
            processingTime,
            audioDuration: estimatedDuration,
            realtimeFactor,
            device: deviceRef.current,
            modelId: MODEL_ID,
          })
          
          addLog('info', `전사 완료: ${processingTime.toFixed(2)}초`)
          if (estimatedDuration > 0) {
            addLog('info', `실시간 배수: ${realtimeFactor.toFixed(2)}x (오디오: ${estimatedDuration.toFixed(2)}초)`)
          }
          
          const resultText = typeof result === 'string' ? result : result?.text || ''
          if (resultText) {
            addLog('info', `전사 결과: ${resultText.length}자`)
          }

          // 결과 처리
          let text = ''
          let chunks: TimestampChunk[] | undefined

          if (typeof result === 'string') {
            text = result
          } else {
            text = result?.text || ''
            if (result?.chunks && Array.isArray(result.chunks)) {
              chunks = result.chunks.map((chunk) => ({
                timestamp: chunk.timestamp,
                text: chunk.text,
              }))
            }
          }

          return {
            text: text.trim(),
            chunks,
          }
        } finally {
          // URL 정리
          URL.revokeObjectURL(audioUrl)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : '음성 인식 중 오류가 발생했습니다.'

        setError(errorMessage)
        throw err
      } finally {
        setIsTranscribing(false)
      }
    },
    [enableMemoryCheck, maxFileSizeMB, maxDurationSeconds, addLog]
  )

  return {
    transcribe,
    isModelLoading,
    isTranscribing,
    error,
    isModelReady,
    performanceMetrics,
    logs,
    clearLogs,
  }
}

