/**
 * 오디오 전처리 유틸리티
 * Whisper 모델에 필요한 형식으로 오디오를 변환합니다.
 */

/**
 * Blob을 Float32Array로 변환
 * @param blob 오디오 Blob
 * @returns Float32Array 오디오 데이터
 */
export async function blobToFloat32Array(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new AudioContext()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  // 모든 채널 데이터 추출
  const channels: Float32Array[] = []
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i))
  }

  // 모노 오디오로 변환
  const monoAudio = convertToMono(channels)

  // 16kHz로 리샘플링 (필요시)
  const targetSampleRate = 16000
  if (audioBuffer.sampleRate !== targetSampleRate) {
    return resampleAudio(monoAudio, audioBuffer.sampleRate, targetSampleRate)
  }

  return monoAudio
}

/**
 * 샘플링 레이트 조정
 * @param audioData 원본 오디오 데이터
 * @param sourceRate 원본 샘플링 레이트
 * @param targetRate 목표 샘플링 레이트
 * @returns 리샘플링된 오디오 데이터
 */
export function resampleAudio(
  audioData: Float32Array,
  sourceRate: number,
  targetRate: number
): Float32Array {
  if (sourceRate === targetRate) {
    return audioData
  }

  const ratio = sourceRate / targetRate
  const newLength = Math.round(audioData.length / ratio)
  const result = new Float32Array(newLength)

  for (let i = 0; i < newLength; i++) {
    const index = i * ratio
    const indexFloor = Math.floor(index)
    const indexCeil = Math.min(indexFloor + 1, audioData.length - 1)
    const fraction = index - indexFloor

    result[i] =
      audioData[indexFloor] * (1 - fraction) + audioData[indexCeil] * fraction
  }

  return result
}

/**
 * 모노 오디오로 변환
 * @param audioData 오디오 데이터 (단일 채널 또는 다중 채널)
 * @returns 모노 오디오 데이터
 */
export function convertToMono(
  audioData: Float32Array | Float32Array[]
): Float32Array {
  if (!Array.isArray(audioData)) {
    return audioData
  }

  if (audioData.length === 1) {
    return audioData[0]
  }

  // 스테레오를 모노로 변환
  const length = audioData[0].length
  const mono = new Float32Array(length)
  const scalingFactor = Math.sqrt(audioData.length)

  for (let i = 0; i < length; i++) {
    let sum = 0
    for (let channel = 0; channel < audioData.length; channel++) {
      sum += audioData[channel][i]
    }
    mono[i] = sum / scalingFactor
  }

  return mono
}

/**
 * 오디오 길이 확인 (초)
 * @param blob 오디오 Blob
 * @returns 오디오 길이 (초)
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new AudioContext()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  return audioBuffer.duration
}

/**
 * 오디오 파일 검증
 * @param blob 오디오 Blob
 * @param maxSizeMB 최대 파일 크기 (MB)
 * @param maxDurationSeconds 최대 오디오 길이 (초)
 * @returns 검증 결과
 */
export async function validateAudioFile(
  blob: Blob,
  maxSizeMB: number,
  maxDurationSeconds: number
): Promise<{ valid: boolean; error?: string }> {
  // 파일 크기 검증
  const fileSizeMB = blob.size / (1024 * 1024)
  if (fileSizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 지원됩니다. (현재: ${fileSizeMB.toFixed(2)}MB)`,
    }
  }

  // 오디오 길이 검증
  try {
    const duration = await getAudioDuration(blob)
    if (duration > maxDurationSeconds) {
      return {
        valid: false,
        error: `오디오 길이가 너무 깁니다. 최대 ${maxDurationSeconds}초까지 지원됩니다. (현재: ${duration.toFixed(2)}초)`,
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: '오디오 파일을 읽을 수 없습니다. 지원되는 오디오 형식인지 확인해주세요.',
    }
  }

  return { valid: true }
}

