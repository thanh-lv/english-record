import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  shadowingService,
  extractYoutubeId,
  formatSecondsToTime,
  parseTimeToSeconds,
} from '../shadowingService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('shadowingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Utility Functions', () => {
    describe('extractYoutubeId', () => {
      it('extracts 11-char ID from various YouTube URL formats', () => {
        expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        expect(extractYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      });

      it('returns null for invalid or missing URLs', () => {
        expect(extractYoutubeId('')).toBeNull();
        expect(extractYoutubeId('https://example.com/video')).toBeNull();
        expect(extractYoutubeId('https://youtube.com/watch?v=short')).toBeNull();
      });
    });

    describe('formatSecondsToTime', () => {
      it('formats seconds to mm:ss format', () => {
        expect(formatSecondsToTime(0)).toBe('00:00');
        expect(formatSecondsToTime(65)).toBe('01:05');
        expect(formatSecondsToTime(600)).toBe('10:00');
      });

      it('returns empty string for null, undefined or NaN', () => {
        expect(formatSecondsToTime(null)).toBe('');
        expect(formatSecondsToTime(undefined)).toBe('');
        expect(formatSecondsToTime(NaN)).toBe('');
      });
    });

    describe('parseTimeToSeconds', () => {
      it('parses mm:ss and pure number strings to seconds', () => {
        expect(parseTimeToSeconds('01:30')).toBe(90);
        expect(parseTimeToSeconds('00:45')).toBe(45);
        expect(parseTimeToSeconds('120')).toBe(120);
      });

      it('returns null for empty or invalid strings', () => {
        expect(parseTimeToSeconds('')).toBeNull();
        expect(parseTimeToSeconds('abc')).toBeNull();
      });
    });
  });

  describe('fetchShadowingVideos', () => {
    it('fetches all videos ordered by created_at', async () => {
      const mockVideos = [{ id: 'v1', title: 'Video 1' }];
      const orderMock = vi.fn().mockResolvedValue({ data: mockVideos, error: null });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const res = await shadowingService.fetchShadowingVideos();
      expect(supabase.from).toHaveBeenCalledWith('shadowing_videos');
      expect(res).toEqual(mockVideos);
    });

    it('filters by active only when flag is true', async () => {
      const mockVideos = [{ id: 'v1', title: 'Video 1', is_active: true }];
      const eqMock = vi.fn().mockResolvedValue({ data: mockVideos, error: null });
      const orderMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const res = await shadowingService.fetchShadowingVideos(true);
      expect(eqMock).toHaveBeenCalledWith('is_active', true);
      expect(res).toEqual(mockVideos);
    });
  });

  describe('fetchShadowingVideoById', () => {
    it('fetches a single video by id', async () => {
      const mockVideo = { id: 'v1', title: 'Video 1' };
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockVideo, error: null });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const res = await shadowingService.fetchShadowingVideoById('v1');
      expect(eqMock).toHaveBeenCalledWith('id', 'v1');
      expect(res).toEqual(mockVideo);
    });
  });

  describe('createShadowingVideo', () => {
    it('creates a new video and handles grades fallback if needed', async () => {
      const created = { id: 'v1', title: 'New Video' };
      const singleMock = vi.fn().mockResolvedValue({ data: created, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const res = await shadowingService.createShadowingVideo({
        title: 'New Video',
        youtube_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      });

      expect(res).toEqual(created);
    });
  });

  describe('updateShadowingVideo', () => {
    it('updates a video record by id', async () => {
      const updated = { id: 'v1', title: 'Updated Video' };
      const singleMock = vi.fn().mockResolvedValue({ data: updated, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      const res = await shadowingService.updateShadowingVideo('v1', { title: 'Updated Video' });
      expect(res).toEqual(updated);
    });
  });

  describe('toggleShadowingVideoActive', () => {
    it('toggles is_active field to negated current value', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await shadowingService.toggleShadowingVideoActive('v1', true);
      expect(updateMock).toHaveBeenCalledWith({ is_active: false });
      expect(eqMock).toHaveBeenCalledWith('id', 'v1');
    });
  });

  describe('deleteShadowingVideo', () => {
    it('deletes video record by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await shadowingService.deleteShadowingVideo('v1');
      expect(eqMock).toHaveBeenCalledWith('id', 'v1');
    });
  });
});
