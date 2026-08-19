import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizeImageFile } from '../imageOptimizer';

describe('imageOptimizer utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bypasses non-image files such as audio or binary data', async () => {
    const audioFile = new File(['audio-binary'], 'recording.wav', { type: 'audio/wav' });
    const result = await optimizeImageFile(audioFile);
    expect(result).toBe(audioFile);
  });

  it('bypasses animated GIFs and vector SVGs to preserve animation and vector crispness', async () => {
    const svgFile = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' });
    const gifFile = new File(['gif-bytes'], 'anim.gif', { type: 'image/gif' });

    expect(await optimizeImageFile(svgFile)).toBe(svgFile);
    expect(await optimizeImageFile(gifFile)).toBe(gifFile);
  });

  it('processes raster image and downscales when dimensions exceed maxWidth/maxHeight', async () => {
    let toBlobCallback: any = null;
    const drawImageMock = vi.fn();

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low',
        drawImage: drawImageMock,
      }),
      toBlob: vi.fn().mockImplementation((cb: any) => {
        toBlobCallback = cb;
        // Simulate output smaller compressed WebP blob (100 bytes)
        cb(new Blob(['compressed-webp'], { type: 'image/webp' }));
      }),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') return mockCanvas as any;
      return document.createElement(tagName);
    });

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Mock Image load
    (global as any).Image = class {
      width = 2560;
      height = 1440;
      onload: any = null;
      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    };

    // Original uncompressed file (5000 bytes)
    const largeImage = new File([new Uint8Array(5000)], 'photo.png', { type: 'image/png' });

    const optimized = await optimizeImageFile(largeImage, {
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.85,
    });

    expect(mockCanvas.width).toBe(1280);
    expect(mockCanvas.height).toBe(720); // 2560x1440 scaled 50%
    expect(drawImageMock).toHaveBeenCalled();
    expect(optimized).toBeInstanceOf(File);
    expect((optimized as File).name).toBe('photo.webp');
    expect((optimized as File).type).toBe('image/webp');

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('falls back to original file if compression error occurs or blob is larger', async () => {
    (global as any).Image = class {
      onerror: any = null;
      set src(_val: string) {
        setTimeout(() => {
          if (this.onerror) this.onerror(new Error('Decode failed'));
        }, 10);
      }
    };

    const file = new File(['small'], 'pic.jpg', { type: 'image/jpeg' });
    const result = await optimizeImageFile(file);
    expect(result).toBe(file);
  });
});
