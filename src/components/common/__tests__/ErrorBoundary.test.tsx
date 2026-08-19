import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { loggerService } from '../../../services/loggerService';

const ProblemChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Explosion in render');
  }
  return <div>Everything is fine</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Everything is fine')).toBeInTheDocument();
  });

  it('catches render error, renders fallback UI, and logs to loggerService', () => {
    const errorSpy = vi.spyOn(loggerService, 'error');

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Đã xảy ra lỗi không mong muốn!')).toBeInTheDocument();
    expect(screen.getByText('Thử lại')).toBeInTheDocument();
    expect(screen.getByText('Tải lại trang')).toBeInTheDocument();

    expect(errorSpy).toHaveBeenCalledWith(
      'ReactErrorBoundary',
      'Explosion in render',
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('renders custom fallback prop when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error Page</div>}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error Page')).toBeInTheDocument();
  });

  it('allows toggling technical details and copying error info', () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const toggleBtn = screen.getByText('Xem chi tiết kỹ thuật');
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Explosion in render/)).toBeInTheDocument();
    expect(screen.getByText('Ẩn chi tiết kỹ thuật')).toBeInTheDocument();

    const copyBtn = screen.getByTitle('Sao chép thông tin lỗi');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
  });

  it('calls loggerService.downloadLogs when clicking download log button', () => {
    const downloadSpy = vi.spyOn(loggerService, 'downloadLogs').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const downloadBtn = screen.getByTitle('Tải file log');
    fireEvent.click(downloadBtn);

    expect(downloadSpy).toHaveBeenCalled();
  });
});
