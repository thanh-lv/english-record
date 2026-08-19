import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vocabularyService } from '../vocabularyService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('vocabularyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchSets', () => {
    it('fetches vocabulary sets and computes card_count', async () => {
      const mockData = [
        {
          id: 'set-1',
          title: 'Animals',
          emoji: '🦁',
          vocabulary_cards: [{ id: 'c1' }, { id: 'c2' }],
        },
        {
          id: 'set-2',
          title: 'Colors',
          emoji: '🎨',
          vocabulary_cards: null,
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const sets = await vocabularyService.fetchSets();
      expect(supabase.from).toHaveBeenCalledWith('vocabulary_sets');
      expect(sets).toHaveLength(2);
      expect(sets[0].card_count).toBe(2);
      expect((sets[0] as any).vocabulary_cards).toBeUndefined();
      expect(sets[1].card_count).toBe(0);
    });

    it('throws error when fetching sets fails', async () => {
      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
      });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(vocabularyService.fetchSets()).rejects.toThrow('DB Error');
    });
  });

  describe('fetchCards', () => {
    it('fetches cards for a specific set sorted by order_index', async () => {
      const mockCards = [{ id: 'c1', front: 'Dog', back: 'Chó' }];
      const eqMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockCards, error: null }),
      });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      const cards = await vocabularyService.fetchCards('set-1');
      expect(cards).toEqual(mockCards);
      expect(eqMock).toHaveBeenCalledWith('set_id', 'set-1');
    });

    it('throws error when fetchCards fails', async () => {
      const eqMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Cards error') }),
      });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(vocabularyService.fetchCards('set-1')).rejects.toThrow('Cards error');
    });
  });

  describe('set operations: createSet, updateSet, deleteSet', () => {
    it('creates a new set and returns card_count initialized to 0', async () => {
      const createdSet = { id: 'set-new', title: 'Fruits', emoji: '🍎', grades: [1, 2] };
      const singleMock = vi.fn().mockResolvedValue({ data: createdSet, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const res = await vocabularyService.createSet('Fruits', '🍎', [1, 2]);
      expect(insertMock).toHaveBeenCalledWith({
        title: 'Fruits',
        emoji: '🍎',
        grades: [1, 2],
      });
      expect(res).toEqual({ ...createdSet, card_count: 0 });
    });

    it('throws error when createSet fails', async () => {
      const singleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Create set error') });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await expect(vocabularyService.createSet('Fruits', '🍎')).rejects.toThrow('Create set error');
    });

    it('updates an existing set', async () => {
      const updated = { id: 'set-1', title: 'Updated' };
      const singleMock = vi.fn().mockResolvedValue({ data: updated, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      const res = await vocabularyService.updateSet('set-1', { title: 'Updated' });
      expect(updateMock).toHaveBeenCalledWith({ title: 'Updated' });
      expect(eqMock).toHaveBeenCalledWith('id', 'set-1');
      expect(res).toEqual(updated);
    });

    it('throws error when updateSet fails', async () => {
      const singleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Update set error') });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ update: updateMock });

      await expect(vocabularyService.updateSet('set-1', { title: 'Err' })).rejects.toThrow(
        'Update set error'
      );
    });

    it('deletes a set', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await vocabularyService.deleteSet('set-1');
      expect(eqMock).toHaveBeenCalledWith('id', 'set-1');
    });

    it('throws error when deleteSet fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('Delete set error') });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await expect(vocabularyService.deleteSet('set-1')).rejects.toThrow('Delete set error');
    });
  });

  describe('card operations: createCard, deleteCard', () => {
    it('creates a card', async () => {
      const newCard = { id: 'c1', front: 'Cat', back: 'Mèo' };
      const singleMock = vi.fn().mockResolvedValue({ data: newCard, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      const res = await vocabularyService.createCard({ front: 'Cat', back: 'Mèo' });
      expect(res).toEqual(newCard);
    });

    it('throws error when createCard fails', async () => {
      const singleMock = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Create card error') });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      (supabase.from as any).mockReturnValue({ insert: insertMock });

      await expect(vocabularyService.createCard({ front: 'Cat' })).rejects.toThrow(
        'Create card error'
      );
    });

    it('deletes a card', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await vocabularyService.deleteCard('c1');
      expect(eqMock).toHaveBeenCalledWith('id', 'c1');
    });

    it('throws error when deleteCard fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('Delete card error') });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as any).mockReturnValue({ delete: deleteMock });

      await expect(vocabularyService.deleteCard('c1')).rejects.toThrow('Delete card error');
    });
  });

  describe('generateIpa', () => {
    it('returns null if API key is not configured', async () => {
      vi.stubEnv('VITE_AI_API_KEY', '');
      const ipa = await vocabularyService.generateIpa('elephant');
      expect(ipa).toBeNull();
    });

    it('returns ipa phonetic text from worker response', async () => {
      vi.stubEnv('VITE_AI_API_KEY', 'valid-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ipa: '/ˈel.ə.fənt/' }),
      });

      const ipa = await vocabularyService.generateIpa('elephant');
      expect(ipa).toBe('/ˈel.ə.fənt/');
    });

    it('returns null if fetch returns not ok status code', async () => {
      vi.stubEnv('VITE_AI_API_KEY', 'valid-key');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const ipa = await vocabularyService.generateIpa('elephant');
      expect(ipa).toBeNull();
    });

    it('returns null if fetch throws or network error occurs', async () => {
      vi.stubEnv('VITE_AI_API_KEY', 'valid-key');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const ipa = await vocabularyService.generateIpa('elephant');
      expect(ipa).toBeNull();
    });
  });
});
