import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBodyScrollLock } from '../useBodyScrollLock';

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  it('locks body scroll when isLocked is true', () => {
    const { rerender } = renderHook(({ locked }) => useBodyScrollLock(locked), {
      initialProps: { locked: true },
    });

    expect(document.body.style.overflow).toBe('hidden');

    rerender({ locked: false });
    expect(document.body.style.overflow).toBe('');
  });

  it('restores original body scroll on unmount', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = renderHook(() => useBodyScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('does nothing when isLocked is false initially', () => {
    document.body.style.overflow = 'visible';
    renderHook(() => useBodyScrollLock(false));
    expect(document.body.style.overflow).toBe('visible');
  });
});
