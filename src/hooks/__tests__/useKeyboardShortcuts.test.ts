import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('triggers onPlayPause when Space is pressed inside modal', () => {
    const onPlayPause = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        isModalOpen: true,
        onPlayPause,
      }),
    );

    const event = new KeyboardEvent('keydown', { code: 'Space' });
    window.dispatchEvent(event);
    expect(onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('triggers onStartRecord when KeyR is pressed and not recording', () => {
    const onStartRecord = vi.fn();
    const onStopRecord = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        isModalOpen: true,
        isRecording: false,
        onStartRecord,
        onStopRecord,
      }),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
    expect(onStartRecord).toHaveBeenCalledTimes(1);
    expect(onStopRecord).not.toHaveBeenCalled();
  });

  it('triggers onStopRecord when KeyR is pressed and currently recording', () => {
    const onStartRecord = vi.fn();
    const onStopRecord = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        isModalOpen: true,
        isRecording: true,
        onStartRecord,
        onStopRecord,
      }),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
    expect(onStopRecord).toHaveBeenCalledTimes(1);
    expect(onStartRecord).not.toHaveBeenCalled();
  });

  it('triggers onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        isModalOpen: true,
        onClose,
      }),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts when target is an input, textarea, or select element', () => {
    const onPlayPause = vi.fn();
    const onStartRecord = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        isModalOpen: true,
        onPlayPause,
        onStartRecord,
      }),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
    input.dispatchEvent(event);

    expect(onPlayPause).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('does nothing when isModalOpen is false', () => {
    const onPlayPause = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        isModalOpen: false,
        onPlayPause,
      }),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(onPlayPause).not.toHaveBeenCalled();
  });
});
