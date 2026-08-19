import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEscapeToClose } from '../useEscapeToClose';

describe('useEscapeToClose', () => {
  it('calls onClose when Escape key is pressed and active is true', () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(onClose, true));

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when other keys are pressed', () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(onClose, true));

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when active is false', () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(onClose, false));

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useEscapeToClose(onClose, true));

    unmount();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
