import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  audioBufferToWavBlob,
  fetchWordAudioBuffer,
  generateVocabularyAudio,
  AudioBuilderConfig,
} from '../audioEncoder';
import { MockAudioBuffer, MockAudioContext } from '../../test/setup';

describe('audioEncoder utilities', () => {
  describe('audioBufferToWavBlob', () => {
    it('creates a valid 16-bit Mono WAV Blob with correct RIFF headers', async () => {
      const sampleRate = 44100;
      const numSamples = 100;
      const mockBuffer = new MockAudioBuffer({
        numberOfChannels: 1,
        length: numSamples,
        sampleRate,
      });

      // Fill sample data
      const channelData = mockBuffer.getChannelData(0);
      channelData[0] = 0;
      channelData[1] = 1.0; // Max positive
      channelData[2] = -1.0; // Max negative
      channelData[3] = 2.0; // Should be clamped to 1.0
      channelData[4] = -2.0; // Should be clamped to -1.0

      const wavBlob = audioBufferToWavBlob(mockBuffer as any);
      expect(wavBlob).toBeInstanceOf(Blob);
      expect(wavBlob.type).toBe('audio/wav');

      const arrayBuffer = await wavBlob.arrayBuffer();
      const view = new DataView(arrayBuffer);

      // Total header (44 bytes) + data (100 samples * 2 bytes/sample) = 244 bytes
      const expectedSize = 44 + numSamples * 2;
      expect(wavBlob.size).toBe(expectedSize);
      expect(arrayBuffer.byteLength).toBe(expectedSize);

      // Verify RIFF header
      const riff = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
      );
      expect(riff).toBe('RIFF');
      expect(view.getUint32(4, true)).toBe(36 + numSamples * 2);

      const wave = String.fromCharCode(
        view.getUint8(8),
        view.getUint8(9),
        view.getUint8(10),
        view.getUint8(11)
      );
      expect(wave).toBe('WAVE');

      const fmt = String.fromCharCode(
        view.getUint8(12),
        view.getUint8(13),
        view.getUint8(14),
        view.getUint8(15)
      );
      expect(fmt).toBe('fmt ');
      expect(view.getUint32(16, true)).toBe(16); // Subchunk1Size for PCM
      expect(view.getUint16(20, true)).toBe(1); // AudioFormat: 1 = PCM
      expect(view.getUint16(22, true)).toBe(1); // NumChannels: 1
      expect(view.getUint32(24, true)).toBe(sampleRate); // SampleRate: 44100
      expect(view.getUint32(28, true)).toBe(sampleRate * 2); // ByteRate: 44100 * 2
      expect(view.getUint16(32, true)).toBe(2); // BlockAlign: 2 bytes
      expect(view.getUint16(34, true)).toBe(16); // BitsPerSample: 16

      // Data subchunk
      const dataHeader = String.fromCharCode(
        view.getUint8(36),
        view.getUint8(37),
        view.getUint8(38),
        view.getUint8(39)
      );
      expect(dataHeader).toBe('data');
      expect(view.getUint32(40, true)).toBe(numSamples * 2);

      // Verify clamped sample values
      // Sample 0: 0 -> 0
      expect(view.getInt16(44, true)).toBe(0);
      // Sample 1: 1.0 -> 0x7fff (32767)
      expect(view.getInt16(46, true)).toBe(32767);
      // Sample 2: -1.0 -> -0x8000 (-32768)
      expect(view.getInt16(48, true)).toBe(-32768);
      // Sample 3: 2.0 clamped -> 32767
      expect(view.getInt16(50, true)).toBe(32767);
      // Sample 4: -2.0 clamped -> -32768
      expect(view.getInt16(52, true)).toBe(-32768);
    });
  });

  describe('fetchWordAudioBuffer', () => {
    let mockCtx: MockAudioContext;

    beforeEach(() => {
      vi.restoreAllMocks();
      mockCtx = new MockAudioContext();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('returns a blank audio buffer when word is empty or whitespace', async () => {
      const buffer = await fetchWordAudioBuffer('   ', mockCtx as any);
      expect(buffer).toBeDefined();
      expect(buffer.duration).toBeCloseTo(0.5, 1);
    });

    it('fetches from Dictionary API and decodes audio data on success', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('dictionaryapi.dev')) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                phonetics: [
                  { audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/apple-us.mp3' },
                ],
              },
            ],
          });
        }
        if (url.includes('.mp3')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: async () => new Uint8Array(1024).buffer,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      global.fetch = mockFetch as any;

      const buffer = await fetchWordAudioBuffer('apple', mockCtx as any, 'en-US');
      expect(buffer).toBeDefined();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('fetches with UK pronunciation preference when lang is en-GB', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('dictionaryapi.dev')) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                phonetics: [
                  { audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/apple-us.mp3' },
                  { audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/apple-uk.mp3' },
                ],
              },
            ],
          });
        }
        if (url.includes('.mp3')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: async () => new Uint8Array(1024).buffer,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      global.fetch = mockFetch as any;
      const buffer = await fetchWordAudioBuffer('apple', mockCtx as any, 'en-GB');
      expect(buffer).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.dictionaryapi.dev/media/pronunciations/en/apple-uk.mp3'
      );
    });

    it('falls back to Lingva API when Dictionary API fails', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('dictionaryapi.dev')) {
          return Promise.resolve({ ok: false });
        }
        if (url.includes('lingva.ml')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ audio: [1, 2, 3, 4] }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      global.fetch = mockFetch as any;
      const buffer = await fetchWordAudioBuffer('cat', mockCtx as any, 'en-US');
      expect(buffer).toBeDefined();
    });

    it('falls back to Google TTS when Dictionary and Lingva fail', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('dictionaryapi.dev') || url.includes('lingva.ml')) {
          return Promise.resolve({ ok: false });
        }
        if (url.includes('translate.google.com')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: async () => new Uint8Array(512).buffer,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      global.fetch = mockFetch as any;
      const buffer = await fetchWordAudioBuffer('dog', mockCtx as any, 'en-US');
      expect(buffer).toBeDefined();
    });

    it('falls back to synthetic audio buffer when all network fetches fail', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const buffer = await fetchWordAudioBuffer('banana', mockCtx as any, 'en-US');
      expect(buffer).toBeDefined();
      // Synthetic buffer duration is 0.6s
      expect(buffer.duration).toBeCloseTo(0.6, 1);
      const data = buffer.getChannelData(0);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('generateVocabularyAudio', () => {
    const config: AudioBuilderConfig = {
      repetitionsPerWord: 2,
      wordDurationSlot: 2.0,
      gapBetweenWords: 1.0,
      voiceLang: 'en-US',
    };

    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));
    });

    it('throws an error if no valid words are provided', async () => {
      await expect(generateVocabularyAudio([], config)).rejects.toThrow('No valid words provided');
      await expect(generateVocabularyAudio(['  ', ''], config)).rejects.toThrow(
        'No valid words provided'
      );
    });

    it('generates vocabulary audio, tracks progress, and computes word timestamps', async () => {
      const words = ['apple', 'banana', 'orange'];
      const progressCalls: { percent: number; currentWord: string }[] = [];
      const onProgress = (percent: number, currentWord: string) => {
        progressCalls.push({ percent, currentWord });
      };

      const result = await generateVocabularyAudio(words, config, onProgress);

      expect(result).toBeDefined();
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.audioUrl).toMatch(/^blob:/);
      expect(result.wordTimestamps).toHaveLength(3);

      // Verify progress callback
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1]).toEqual({
        percent: 100,
        currentWord: 'Done!',
      });

      // Verify timestamp calculations
      const [w1, w2, w3] = result.wordTimestamps;

      expect(w1.word).toBe('apple');
      expect(w1.index).toBe(0);
      expect(w1.startTime).toBe(0);
      expect(w1.endTime).toBe(2.0); // startTime + slotDuration (2.0)
      expect(w1.repTimes).toHaveLength(2);

      // Next word starts after gap (2.0 + 1.0 = 3.0)
      expect(w2.word).toBe('banana');
      expect(w2.index).toBe(1);
      expect(w2.startTime).toBe(3.0);
      expect(w2.endTime).toBe(5.0);
      expect(w2.repTimes).toHaveLength(2);

      // Third word starts at 5.0 + 1.0 = 6.0
      expect(w3.word).toBe('orange');
      expect(w3.index).toBe(2);
      expect(w3.startTime).toBe(6.0);
      expect(w3.endTime).toBe(8.0);
    });

    it('handles repetitionsPerWord = 1 correctly', async () => {
      const singleRepConfig: AudioBuilderConfig = {
        repetitionsPerWord: 1,
        wordDurationSlot: 2.0,
        gapBetweenWords: 1.0,
      };

      const result = await generateVocabularyAudio(['apple'], singleRepConfig);
      expect(result.wordTimestamps[0].repTimes).toHaveLength(1);
    });
  });
});
