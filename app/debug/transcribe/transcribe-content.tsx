'use client'

import { useRef, useState } from 'react'
import {
  Mic,
  Upload,
  Settings,
  Loader2,
  Trash2,
  Info,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWhisper, type TranscribeOptions } from '@/hooks/use-whisper'

/**
 * Whisper 모델 전사 디버그 컴포넌트
 * 
 * 기능:
 * - 실시간 녹음 및 파일 업로드
 * - 전사 옵션 설정 (언어, 태스크, 타임스탬프 등)
 * - 고급 옵션 설정 (numBeams, temperature 등)
 * - 성능 메트릭 표시
 * - 실시간 로그 표시
 */
export function TranscribeContent() {
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(50)
  const [maxDurationSeconds, setMaxDurationSeconds] = useState(300)
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [transcriptionChunks, setTranscriptionChunks] = useState<
    Array<{ timestamp: [number, number]; text: string }>
  >([])
  const [recordingTime, setRecordingTime] = useState(0)

  // 전사 옵션
  const [returnTimestamps, setReturnTimestamps] = useState<
    boolean | 'word'
  >(false)
  const [language, setLanguage] = useState<string>('')
  const [task, setTask] = useState<'transcribe' | 'translate'>('transcribe')
  const [chunkLengthS, setChunkLengthS] = useState<number | undefined>(undefined)
  const [strideLengthS, setStrideLengthS] = useState<number | undefined>(undefined)
  
  // 고급 옵션
  const [numBeams, setNumBeams] = useState<number | undefined>(undefined)
  const [temperature, setTemperature] = useState<number | undefined>(undefined)
  const [conditionOnPrevTokens, setConditionOnPrevTokens] = useState<boolean | undefined>(undefined)
  const [compressionRatioThreshold, setCompressionRatioThreshold] = useState<number | undefined>(undefined)
  const [logprobThreshold, setLogprobThreshold] = useState<number | undefined>(undefined)
  const [noSpeechThreshold, setNoSpeechThreshold] = useState<number | undefined>(undefined)
  const [maxNewTokens, setMaxNewTokens] = useState<number | undefined>(undefined)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    transcribe,
    isModelLoading,
    isTranscribing,
    error,
    isModelReady,
    performanceMetrics,
    logs,
    clearLogs,
  } = useWhisper({
    maxFileSizeMB,
    maxDurationSeconds,
    enableMemoryCheck: true,
  })

  // 녹음 시작
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/wav'

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        await handleTranscribe(blob)
        cleanupRecording()
      }

      mediaRecorder.start(1000) // 1초마다 데이터 수집
      setIsRecording(true)
      setRecordingTime(0)

      // 녹음 시간 카운터
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('녹음 시작 오류:', err)
      }
      alert('마이크 권한을 허용해주세요.')
    }
  }

  // 녹음 중지
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  // 녹음 정리
  const cleanupRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }

  // 전사 수행
  const handleTranscribe = async (audio: Blob | File) => {
    try {
      setTranscription('')
      setTranscriptionChunks([])

      const options: TranscribeOptions = {
        returnTimestamps: returnTimestamps || undefined,
        language: language || undefined,
        task,
        chunkLengthS: chunkLengthS || undefined,
        strideLengthS: strideLengthS || undefined,
        generateKwargs: {
          ...(numBeams !== undefined && { numBeams }),
          ...(temperature !== undefined && { temperature }),
          ...(conditionOnPrevTokens !== undefined && { conditionOnPrevTokens }),
          ...(compressionRatioThreshold !== undefined && { compressionRatioThreshold }),
          ...(logprobThreshold !== undefined && { logprobThreshold }),
          ...(noSpeechThreshold !== undefined && { noSpeechThreshold }),
          ...(maxNewTokens !== undefined && { maxNewTokens }),
        },
      }

      const result = await transcribe(audio, options)
      setTranscription(result.text)
      if (result.chunks) {
        setTranscriptionChunks(result.chunks)
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('전사 오류:', err)
      }
      // 에러는 useWhisper 훅에서 관리됨
    }
  }

  // 파일 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleTranscribe(file)
    }
    // 같은 파일을 다시 선택할 수 있도록 초기화
    e.target.value = ''
  }

  // 녹음 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="mx-auto p-6 max-w-5xl container">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Mic className="w-6 h-6" />
            음성 인식 테스트
          </CardTitle>
          <CardDescription>
            클라이언트 사이드 Whisper 모델을 테스트하는 디버그 페이지입니다.
            Next.js 16 (Turbopack) 환경에서 @huggingface/transformers를 사용합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 모델 상태 및 정보 */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <Label className="font-semibold text-base">모델 정보</Label>
              </div>
            </div>
            <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">모델 상태:</span>
                  {isModelLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      로딩 중...
                    </span>
                  ) : isModelReady ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      준비 완료
                    </span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      초기화 중...
                    </span>
                  )}
                </div>
                {performanceMetrics && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">모델 ID:</span>
                      <span className="font-mono text-xs">{performanceMetrics.modelId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">디바이스:</span>
                      <span className="font-mono text-xs">
                        {performanceMetrics.device}
                        {performanceMetrics.device === 'webgpu' && ' (GPU 가속)'}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {performanceMetrics && performanceMetrics.processingTime && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">처리 시간:</span>
                    <span>{performanceMetrics.processingTime.toFixed(2)}초</span>
                  </div>
                  {performanceMetrics.realtimeFactor && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">실시간 배수:</span>
                      <span className={performanceMetrics.realtimeFactor >= 1 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                        {performanceMetrics.realtimeFactor.toFixed(2)}x
                      </span>
                    </div>
                  )}
                  {performanceMetrics.audioDuration && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">오디오 길이:</span>
                      <span>{performanceMetrics.audioDuration.toFixed(2)}초</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 dark:bg-destructive/20 mt-2 p-3 rounded-md text-destructive text-sm">
                <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* 메모리 제한 설정 */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <Label className="font-semibold text-base">메모리 제한 설정</Label>
            </div>
            <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxFileSize">
                  최대 파일 크기 (MB)
                </Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  min="1"
                  max="500"
                  value={maxFileSizeMB}
                  onChange={(e) =>
                    setMaxFileSizeMB(Number.parseInt(e.target.value, 10) || 50)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDuration">
                  최대 오디오 길이 (초)
                </Label>
                <Input
                  id="maxDuration"
                  type="number"
                  min="1"
                  max="3600"
                  value={maxDurationSeconds}
                  onChange={(e) =>
                    setMaxDurationSeconds(
                      Number.parseInt(e.target.value, 10) || 300
                    )
                  }
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              현재 설정: 최대 {maxFileSizeMB}MB, 최대{' '}
              {Math.floor(maxDurationSeconds / 60)}분{' '}
              {maxDurationSeconds % 60}초
            </p>
          </div>

          {/* 전사 옵션 설정 */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <Label className="font-semibold text-base">전사 옵션</Label>
            </div>
            <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="returnTimestamps">타임스탬프</Label>
                <Select
                  value={
                    returnTimestamps === false
                      ? 'false'
                      : returnTimestamps === true
                        ? 'true'
                        : 'word'
                  }
                  onValueChange={(value) => {
                    if (value === 'false') setReturnTimestamps(false)
                    else if (value === 'true') setReturnTimestamps(true)
                    else setReturnTimestamps('word')
                  }}
                >
                  <SelectTrigger id="returnTimestamps">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">없음</SelectItem>
                    <SelectItem value="true">문장 단위</SelectItem>
                    <SelectItem value="word">단어 단위</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task">태스크</Label>
                <Select
                  value={task}
                  onValueChange={(value) =>
                    setTask(value as 'transcribe' | 'translate')
                  }
                >
                  <SelectTrigger id="task">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transcribe">전사 (Transcribe)</SelectItem>
                    <SelectItem value="translate">번역 (Translate)</SelectItem>
                  </SelectContent>
                </Select>
                {task === 'translate' && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    번역 모드: 원본 언어를 지정하면 더 정확하게 영어로 번역됩니다.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">
                  언어 (선택사항)
                  {task === 'translate' && (
                    <span className="ml-1 text-muted-foreground text-xs">
                      (원본 언어)
                    </span>
                  )}
                </Label>
                <Select
                  value={language || 'auto'}
                  onValueChange={(value) => setLanguage(value === 'auto' ? '' : value)}
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder="자동 감지" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">자동 감지</SelectItem>
                    <SelectItem value="ko">한국어 (ko)</SelectItem>
                    <SelectItem value="en">영어 (en)</SelectItem>
                    <SelectItem value="ja">일본어 (ja)</SelectItem>
                    <SelectItem value="zh">중국어 (zh)</SelectItem>
                    <SelectItem value="es">스페인어 (es)</SelectItem>
                    <SelectItem value="fr">프랑스어 (fr)</SelectItem>
                    <SelectItem value="de">독일어 (de)</SelectItem>
                    <SelectItem value="ru">러시아어 (ru)</SelectItem>
                    <SelectItem value="pt">포르투갈어 (pt)</SelectItem>
                    <SelectItem value="it">이탈리아어 (it)</SelectItem>
                    <SelectItem value="nl">네덜란드어 (nl)</SelectItem>
                    <SelectItem value="pl">폴란드어 (pl)</SelectItem>
                    <SelectItem value="tr">터키어 (tr)</SelectItem>
                    <SelectItem value="ar">아랍어 (ar)</SelectItem>
                    <SelectItem value="hi">힌디어 (hi)</SelectItem>
                    <SelectItem value="th">태국어 (th)</SelectItem>
                    <SelectItem value="vi">베트남어 (vi)</SelectItem>
                    <SelectItem value="id">인도네시아어 (id)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {task === 'transcribe'
                    ? '언어를 지정하면 더 정확한 전사가 가능합니다.'
                    : '원본 언어를 지정하면 더 정확한 번역이 가능합니다. (출력은 항상 영어)'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chunkLengthS">
                  청크 길이 (초, Long-form용)
                </Label>
                <Input
                  id="chunkLengthS"
                  type="number"
                  min="0"
                  placeholder="30초 권장"
                  value={chunkLengthS || ''}
                  onChange={(e) =>
                    setChunkLengthS(
                      e.target.value
                        ? Number.parseInt(e.target.value, 10)
                        : undefined
                    )
                  }
                />
              </div>
              {chunkLengthS && (
                <div className="space-y-2">
                  <Label htmlFor="strideLengthS">겹침 길이 (초)</Label>
                  <Input
                    id="strideLengthS"
                    type="number"
                    min="0"
                    placeholder="5초 권장"
                    value={strideLengthS || ''}
                    onChange={(e) =>
                      setStrideLengthS(
                        e.target.value
                          ? Number.parseInt(e.target.value, 10)
                          : undefined
                      )
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* 고급 옵션 설정 */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <Label className="font-semibold text-base">고급 옵션 (generate_kwargs)</Label>
            </div>
            <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="numBeams">
                  Beam Search 빔 수 (1=greedy, 5=기본값)
                </Label>
                <Input
                  id="numBeams"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="5 (기본값)"
                  value={numBeams || ''}
                  onChange={(e) =>
                    setNumBeams(
                      e.target.value
                        ? Number.parseInt(e.target.value, 10)
                        : undefined
                    )
                  }
                />
                <p className="text-muted-foreground text-xs">
                  1: 가장 빠름 (greedy), 5: 기본값, 높을수록 정확하지만 느림
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">온도 (0.0-1.0)</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0.0 (기본값)"
                  value={temperature !== undefined ? temperature : ''}
                  onChange={(e) =>
                    setTemperature(
                      e.target.value
                        ? Number.parseFloat(e.target.value)
                        : undefined
                    )
                  }
                />
                <p className="text-muted-foreground text-xs">
                  0.0: 결정적, 높을수록 다양하지만 느림
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxNewTokens">최대 생성 토큰 수</Label>
                <Input
                  id="maxNewTokens"
                  type="number"
                  min="1"
                  placeholder="자동"
                  value={maxNewTokens || ''}
                  onChange={(e) =>
                    setMaxNewTokens(
                      e.target.value
                        ? Number.parseInt(e.target.value, 10)
                        : undefined
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conditionOnPrevTokens">
                  이전 토큰 조건부 생성
                </Label>
                <Select
                  value={
                    conditionOnPrevTokens === undefined
                      ? 'default'
                      : conditionOnPrevTokens
                        ? 'true'
                        : 'false'
                  }
                  onValueChange={(value) => {
                    if (value === 'default') setConditionOnPrevTokens(undefined)
                    else setConditionOnPrevTokens(value === 'true')
                  }}
                >
                  <SelectTrigger id="conditionOnPrevTokens">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">기본값 (true)</SelectItem>
                    <SelectItem value="true">활성화</SelectItem>
                    <SelectItem value="false">비활성화 (더 빠름)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compressionRatioThreshold">
                  압축 비율 임계값
                </Label>
                <Input
                  id="compressionRatioThreshold"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="2.4 (기본값)"
                  value={compressionRatioThreshold !== undefined ? compressionRatioThreshold : ''}
                  onChange={(e) =>
                    setCompressionRatioThreshold(
                      e.target.value
                        ? Number.parseFloat(e.target.value)
                        : undefined
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logprobThreshold">로그 확률 임계값</Label>
                <Input
                  id="logprobThreshold"
                  type="number"
                  step="0.1"
                  placeholder="-1.0 (기본값)"
                  value={logprobThreshold !== undefined ? logprobThreshold : ''}
                  onChange={(e) =>
                    setLogprobThreshold(
                      e.target.value
                        ? Number.parseFloat(e.target.value)
                        : undefined
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noSpeechThreshold">무음 임계값</Label>
                <Input
                  id="noSpeechThreshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0.6 (기본값)"
                  value={noSpeechThreshold !== undefined ? noSpeechThreshold : ''}
                  onChange={(e) =>
                    setNoSpeechThreshold(
                      e.target.value
                        ? Number.parseFloat(e.target.value)
                        : undefined
                    )
                  }
                />
                <p className="text-muted-foreground text-xs">
                  높을수록 무음 구간을 더 많이 감지
                </p>
              </div>
            </div>
          </div>

          {/* 녹음 및 업로드 컨트롤 */}
          <div className="flex sm:flex-row flex-col gap-4">
            <div className="flex-1 space-y-2">
              <Label>녹음</Label>
              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <Button
                    onClick={handleStartRecording}
                    disabled={!isModelReady || isTranscribing}
                    className="w-full sm:w-auto"
                  >
                    <Mic className="w-4 h-4" />
                    녹음 시작
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopRecording}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    <Mic className="w-4 h-4" />
                    녹음 중지 ({formatTime(recordingTime)})
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Label>파일 업로드</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isModelReady || isTranscribing}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  파일 선택
                </Button>
              </div>
            </div>
          </div>

          {/* 전사 중 표시 */}
          {isTranscribing && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              전사 중...
            </div>
          )}

          {/* 전사 결과 */}
          <div className="space-y-2">
            <Label htmlFor="transcription">전사 결과</Label>
            <Textarea
              id="transcription"
              value={transcription}
              readOnly
              placeholder="전사 결과가 여기에 표시됩니다..."
              className="min-h-32"
            />
            {transcription && (
              <p className="text-muted-foreground text-xs">
                {transcription.length}자
              </p>
            )}
            {transcriptionChunks.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>타임스탬프 청크</Label>
                <div className="space-y-2 p-3 border rounded-md max-h-64 overflow-y-auto">
                  {transcriptionChunks.map((chunk, index) => (
                    <div
                      key={index}
                      className="space-y-1 pb-2 last:border-0 border-b text-sm"
                    >
                      <div className="text-muted-foreground text-xs">
                        [{chunk.timestamp[0].toFixed(2)}s -{' '}
                        {chunk.timestamp[1].toFixed(2)}s]
                      </div>
                      <div>{chunk.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 실시간 로그 */}
          <div className="space-y-2 p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <Label className="font-semibold text-base">실시간 로그</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearLogs}
                disabled={logs.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                로그 지우기
              </Button>
            </div>
            <div className="space-y-1 bg-muted/50 p-3 rounded-md max-h-64 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <p className="py-4 text-muted-foreground text-center">
                  로그가 없습니다. 전사를 시작하면 로그가 표시됩니다.
                </p>
              ) : (
                logs.map((log, index) => {
                  const date = new Date(log.timestamp)
                  const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`
                  
                  const levelColors = {
                    info: 'text-blue-600 dark:text-blue-400',
                    warn: 'text-yellow-600 dark:text-yellow-400',
                    error: 'text-red-600 dark:text-red-400',
                  }
                  
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-2 ${levelColors[log.level]}`}
                    >
                      <span className="text-muted-foreground shrink-0">
                        [{timeStr}]
                      </span>
                      <span className="font-semibold shrink-0">
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="flex-1 break-words">{log.message}</span>
                    </div>
                  )
                })
              )}
            </div>
            {logs.length > 0 && (
              <p className="text-muted-foreground text-xs">
                총 {logs.length}개의 로그 항목
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

