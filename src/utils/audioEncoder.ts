/**
 * @file audioEncoder.ts
 * @description
 * Utility module for fetching TTS audio buffers, stitching vocabulary words with
 * configurable repetitions, calculating precision word slot timestamps, gap intervals,
 * and encoding AudioBuffers into standard 16-bit Mono WAV PCM Blobs using Web Audio API.
 *
 * @module utils/audioEncoder
 */

import { AudioBuilderConfig, WordTimestamp, RenderedAudioResult } from '../types';

export type { AudioBuilderConfig, WordTimestamp, RenderedAudioResult };

/**
 * Fetches or synthesizes an AudioBuffer for a single vocabulary word using a 4-tier fallback strategy:
 * 1. **Free Dictionary API**: High-quality native human pronunciations with US/UK accent selection.
 * 2. **Lingva Google Proxy**: Reliable CORS-friendly TTS proxy endpoint.
 * 3. **Google Translate TTS**: Direct text-to-speech endpoint.
 * 4. **Synthetic Pulse Generator**: Offline soft tone oscillator as safety fallback.
 *
 * @param {string} word - The vocabulary word or phrase to fetch audio for.
 * @param {AudioContext | OfflineAudioContext} audioCtx - The Web Audio context used to decode/create the buffer.
 * @param {string} [lang='en-US'] - The BCP-47 language tag (e.g. 'en-US', 'en-GB').
 * @returns {Promise<AudioBuffer>} A Promise resolving to the decoded single-channel/multi-channel AudioBuffer.
 *
 * @example
 * ```ts
 * const ctx = new AudioContext();
 * const buffer = await fetchWordAudioBuffer('elephant', ctx, 'en-US');
 * console.log(`Decoded duration: ${buffer.duration}s`);
 * ```
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
 * Synthesizes a pleasant offline harmonic sine pulse for a word when network TTS services are unavailable.
 * Uses a dynamic base frequency derived from the word's initial character and applies a half-sine envelope.
 *
 * @param {string} word - The word string used to derive the tone pitch.
 * @param {AudioContext | OfflineAudioContext} audioCtx - The Web Audio context.
 * @returns {AudioBuffer} A 600ms mono AudioBuffer containing the synthesized waveform.
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
 * Stitches an array of vocabulary words into a single continuous track with configurable repetitions,
 * word slot timings, gap intervals, and exact word timestamps using `OfflineAudioContext`.
 *
 * @param {string[]} words - List of vocabulary words to stitch together.
 * @param {AudioBuilderConfig} config - Timing and repetition configuration parameters.
 * @param {number} [config.repetitionsPerWord=3] - Number of times each word repeats within its time slot.
 * @param {number} [config.wordDurationSlot=3.0] - Time slot (in seconds) allocated for each word.
 * @param {number} [config.gapBetweenWords=4.0] - Silence interval (in seconds) between different words.
 * @param {string} [config.voiceLang='en-US'] - TTS voice locale.
 * @param {(percent: number, currentWord: string) => void} [onProgress] - Optional progress callback function.
 * @returns {Promise<RenderedAudioResult>} The rendered Audio WAV Blob, object URL, total duration, and word timestamps.
 * @throws {Error} If no valid words are provided.
 *
 * @example
 * ```ts
 * const result = await generateVocabularyAudio(
 *   ['apple', 'banana', 'cherry'],
 *   { repetitionsPerWord: 3, wordDurationSlot: 3.0, gapBetweenWords: 2.0 },
 *   (pct, word) => console.log(`Progress: ${pct}% - Processing: ${word}`)
 * );
 * console.log(`Generated WAV url: ${result.audioUrl}`);
 * ```
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
 * Encodes an AudioBuffer into a standard 16-bit Mono WAV PCM binary Blob.
 *
 * Constructs the canonical 44-byte RIFF/WAVE header:
 * - `RIFF` chunk descriptor + total chunk size.
 * - `WAVE` format descriptor + `fmt ` sub-chunk with audio format = 1 (Linear PCM), channels = 1, bit depth = 16.
 * - `data` sub-chunk + sample payload converted from Float32 (-1.0 to 1.0) into Signed 16-bit Integers (-32768 to 32767).
 *
 * @param {AudioBuffer} buffer - The input AudioBuffer to encode.
 * @returns {Blob} A standard Blob with MIME type `audio/wav`.
 *
 * @example
 * ```ts
 * const wavBlob = audioBufferToWavBlob(renderedBuffer);
 * const downloadUrl = URL.createObjectURL(wavBlob);
 * ```
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

/**
 * Writes an ASCII string into a DataView at a specified byte offset.
 *
 * @param {DataView} view - Target DataView.
 * @param {number} offset - Byte offset to start writing.
 * @param {string} string - ASCII string (e.g. 'RIFF', 'WAVE', 'fmt ', 'data').
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
