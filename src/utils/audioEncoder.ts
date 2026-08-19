/**
 * Utility for fetching TTS audio buffers, stitching vocabulary words with
 * configurable repetitions, word slot durations, gap timing, and encoding
 * into downloadable WAV/MP3 blobs.
 */

export interface AudioBuilderConfig {
  repetitionsPerWord: number; // default: 3
  wordDurationSlot: number; // default: 3.0 seconds
  gapBetweenWords: number; // default: 4.0 seconds
  voiceLang?: string; // default: 'en-US'
}

export interface WordTimestamp {
  word: string;
  index: number;
  startTime: number; // in seconds
  endTime: number; // in seconds
  repTimes: number[]; // timestamp for each rep
}

export interface RenderedAudioResult {
  blob: Blob;
  audioUrl: string;
  totalDuration: number;
  wordTimestamps: WordTimestamp[];
}

/**
 * Fetches TTS AudioBuffer for a word using Google TTS endpoint or synthetic fallback.
 */
export async function fetchWordAudioBuffer(
  word: string,
  audioCtx: AudioContext | OfflineAudioContext,
  lang: string = 'en-US'
): Promise<AudioBuffer> {
  const cleanWord = word.trim();
  if (!cleanWord) {
    return audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
  }

  // 1. Try Free Dictionary API (Excellent native pronunciations, CORS friendly)
  if (lang.startsWith('en')) {
    try {
      const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        cleanWord
      )}`;
      const dictRes = await fetch(dictUrl);
      if (dictRes.ok) {
        const data = await dictRes.json();
        const phonetics = data[0]?.phonetics || [];
        const validPhonetics = phonetics.filter((p: any) => p.audio && p.audio.length > 0);

        if (validPhonetics.length > 0) {
          const isUS = lang === 'en-US';
          const preferredCode = isUS ? '-us' : '-uk';
          let bestPhonetic = validPhonetics[0];
          let bestScore = -999;

          for (const p of validPhonetics) {
            let score = 0;
            const audioUrl = p.audio.toLowerCase();
            if (audioUrl.includes(preferredCode)) score += 10;
            if (audioUrl.includes('-stressed')) score += 5;
            if (audioUrl.includes('-unstressed')) score -= 5;

            if (score > bestScore) {
              bestScore = score;
              bestPhonetic = p;
            }
          }

          const audioRes = await fetch(bestPhonetic.audio);
          if (audioRes.ok) {
            const arrayBuffer = await audioRes.arrayBuffer();
            return await audioCtx.decodeAudioData(arrayBuffer.slice(0));
          }
        }
      }
    } catch (err) {
      console.warn('Dictionary API failed:', err);
    }
  }

  // 2. Try Lingva API (Google Translate proxy, CORS friendly)
  try {
    const lingvaLang = lang.split('-')[0] || 'en';
    const lingvaUrl = `https://lingva.ml/api/v1/audio/${lingvaLang}/${encodeURIComponent(
      cleanWord
    )}`;
    const lingvaRes = await fetch(lingvaUrl);
    if (lingvaRes.ok) {
      const json = await lingvaRes.json();
      if (json.audio && Array.isArray(json.audio)) {
        const uint8Array = new Uint8Array(json.audio);
        return await audioCtx.decodeAudioData(uint8Array.buffer);
      }
    }
  } catch (err) {
    console.warn('Lingva API failed:', err);
  }

  // 3. Try Google TTS direct (May fail due to CORS)
  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
      lang
    )}&q=${encodeURIComponent(cleanWord)}`;
    const response = await fetch(ttsUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    }
  } catch (err) {
    console.warn('Google TTS fetch failed:', err);
  }

  // 4. Fallback: Synthesize speech audio buffer
  return createFallbackSpeechBuffer(cleanWord, audioCtx);
}

/**
 * Generates a clean audio buffer representation for a word if offline
 */
function createFallbackSpeechBuffer(
  word: string,
  audioCtx: AudioContext | OfflineAudioContext
): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const duration = 0.6; // 600ms
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Generate pleasant soft tone pulse for fallback
  const baseFreq = 220 + (word.charCodeAt(0) % 20) * 10;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin((Math.PI * i) / numSamples);
    channelData[i] = Math.sin(2 * Math.PI * baseFreq * t) * envelope * 0.4;
  }

  return buffer;
}

/**
 * Stitches an array of vocabulary words into a single continuous AudioBuffer using OfflineAudioContext.
 */
export async function generateVocabularyAudio(
  words: string[],
  config: AudioBuilderConfig,
  onProgress?: (percent: number, currentWord: string) => void
): Promise<RenderedAudioResult> {
  const {
    repetitionsPerWord = 3,
    wordDurationSlot = 3.0,
    gapBetweenWords = 4.0,
    voiceLang = 'en-US',
  } = config;

  const validWords = words.map(w => w.trim()).filter(Boolean);
  if (validWords.length === 0) {
    throw new Error('No valid words provided');
  }

  const sampleRate = 44100;
  const totalDuration =
    validWords.length * wordDurationSlot + (validWords.length - 1) * gapBetweenWords + 1.0; // 1s tail buffer

  const offlineCtx = new OfflineAudioContext(1, Math.ceil(sampleRate * totalDuration), sampleRate);

  const wordTimestamps: WordTimestamp[] = [];
  let currentTime = 0.0;

  for (let i = 0; i < validWords.length; i++) {
    const word = validWords[i];
    if (onProgress) {
      const pct = Math.round(((i + 1) / validWords.length) * 80);
      onProgress(pct, word);
    }

    const wordBuffer = await fetchWordAudioBuffer(word, offlineCtx, voiceLang);

    const startTime = currentTime;
    const repTimes: number[] = [];

    // Calculate spacing for repetitions inside wordDurationSlot
    const slotDuration = Math.max(wordDurationSlot, wordBuffer.duration);
    const interval =
      repetitionsPerWord > 1
        ? Math.min((slotDuration - 0.2) / repetitionsPerWord, wordBuffer.duration + 0.1)
        : slotDuration;

    for (let r = 0; r < repetitionsPerWord; r++) {
      const repTime = currentTime + r * Math.max(interval, 0.6);
      repTimes.push(repTime);

      const source = offlineCtx.createBufferSource();
      source.buffer = wordBuffer;
      source.connect(offlineCtx.destination);
      source.start(repTime);
    }

    const wordEndTime = currentTime + slotDuration;
    wordTimestamps.push({
      word,
      index: i,
      startTime,
      endTime: wordEndTime,
      repTimes,
    });

    // Advance current time by slot duration + gap duration between words
    currentTime = wordEndTime + gapBetweenWords;
  }

  if (onProgress) {
    onProgress(90, 'Rendering final audio track...');
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  const audioUrl = URL.createObjectURL(wavBlob);

  if (onProgress) {
    onProgress(100, 'Done!');
  }

  return {
    blob: wavBlob,
    audioUrl,
    totalDuration: renderedBuffer.duration,
    wordTimestamps,
  };
}

/**
 * Encodes an AudioBuffer into a 16-bit Mono WAV PCM Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const channelData = buffer.getChannelData(0);
  const numSamples = channelData.length;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataSize, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
