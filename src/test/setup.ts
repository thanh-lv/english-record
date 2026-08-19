import { vi } from 'vitest';

// Polyfill URL.createObjectURL and revokeObjectURL
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-audio-url');
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = vi.fn();
  }
}

// Polyfill AudioBuffer
export class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private _channels: Float32Array[];

  constructor(options: { numberOfChannels?: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels || 1;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = this.length / this.sampleRate;
    this._channels = [];
    for (let i = 0; i < this.numberOfChannels; i++) {
      this._channels.push(new Float32Array(this.length));
    }
  }

  getChannelData(channel: number): Float32Array {
    return this._channels[channel] || this._channels[0];
  }
}

// Polyfill AudioBufferSourceNode
export class MockAudioBufferSourceNode {
  buffer: any = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

// Polyfill Base AudioContext
export class MockAudioContext {
  sampleRate: number = 44100;
  destination: any = {};

  createBuffer(numberOfChannels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }

  async decodeAudioData(_arrayBuffer: ArrayBuffer) {
    // Generate a dummy buffer with 0.5s duration
    const sampleRate = 44100;
    const length = Math.floor(sampleRate * 0.5);
    return new MockAudioBuffer({ numberOfChannels: 1, length, sampleRate });
  }
}

// Polyfill OfflineAudioContext
export class MockOfflineAudioContext extends MockAudioContext {
  length: number;
  numberOfChannels: number;

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    super();
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
  }

  async startRendering() {
    return new MockAudioBuffer({
      numberOfChannels: this.numberOfChannels,
      length: this.length,
      sampleRate: this.sampleRate,
    });
  }
}

// Attach to globalThis / window
if (typeof globalThis !== 'undefined') {
  if (!globalThis.AudioBuffer) {
    (globalThis as any).AudioBuffer = MockAudioBuffer;
  }
  if (!globalThis.AudioContext) {
    (globalThis as any).AudioContext = MockAudioContext;
  }
  if (!globalThis.OfflineAudioContext) {
    (globalThis as any).OfflineAudioContext = MockOfflineAudioContext;
  }
}
