import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAvatar, AVATARS } from '../useAvatar';
import { supabase } from '../../../../lib/supabase';

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('useAvatar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('exports valid avatar emoji options', () => {
    expect(AVATARS).toContain('🐰');
    expect(AVATARS).toContain('🐯');
  });

  it('initializes with avatar from profile if available', () => {
    const { result } = renderHook(() => useAvatar({ id: 'user-1', avatar: '🐯' }));
    expect(result.current.currentAvatar).toBe('🐯');
  });

  it('initializes with avatar from localStorage when profile has no avatar', () => {
    localStorage.setItem('avatar_user-1', '🐼');
    const { result } = renderHook(() => useAvatar({ id: 'user-1' }));
    expect(result.current.currentAvatar).toBe('🐼');
  });

  it('falls back to default bunny avatar when no stored or profile avatar exists', () => {
    const { result } = renderHook(() => useAvatar({ id: 'user-new' }));
    expect(result.current.currentAvatar).toBe('🐰');
  });

  it('updates avatar, closes selector, updates localStorage and Supabase profile', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any).mockReturnValue({ update: updateMock });

    const { result } = renderHook(() => useAvatar({ id: 'user-1' }));

    await act(async () => {
      await result.current.changeAvatar('🦁');
    });

    expect(result.current.currentAvatar).toBe('🦁');
    expect(localStorage.getItem('avatar_user-1')).toBe('🦁');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(updateMock).toHaveBeenCalledWith({ avatar: '🦁' });
    expect(eqMock).toHaveBeenCalledWith('id', 'user-1');
  });
});
