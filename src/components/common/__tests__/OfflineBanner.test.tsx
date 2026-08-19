import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { OfflineBanner } from '../OfflineBanner';
import * as onlineStatusHook from '../../../hooks/useOnlineStatus';

describe('OfflineBanner component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders nothing when user is online and has never been offline', () => {
    vi.spyOn(onlineStatusHook, 'useOnlineStatus').mockReturnValue(true);
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders offline warning banner when offline', () => {
    vi.spyOn(onlineStatusHook, 'useOnlineStatus').mockReturnValue(false);
    render(<OfflineBanner />);

    const statusBanner = screen.getByRole('status');
    expect(statusBanner).toBeInTheDocument();
    expect(statusBanner.textContent).toContain('Mất kết nối mạng');
  });

  it('renders back online banner when transitioning from offline to online, then auto-dismisses', () => {
    const hookSpy = vi.spyOn(onlineStatusHook, 'useOnlineStatus');

    // 1. First render: offline
    hookSpy.mockReturnValue(false);
    const { rerender } = render(<OfflineBanner />);
    expect(screen.getByRole('status').textContent).toContain('Mất kết nối mạng');

    // 2. Re-render: back online
    hookSpy.mockReturnValue(true);
    rerender(<OfflineBanner />);
    expect(screen.getByRole('status').textContent).toContain('kết nối lại');

    // 3. Fast-forward timer 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByRole('status')).toBeNull();
  });
});
