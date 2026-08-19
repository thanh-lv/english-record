import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LazyImage } from '../LazyImage';

describe('LazyImage component', () => {
  it('renders fallback when src is not provided or empty', () => {
    const { container } = render(<LazyImage src="" alt="Empty" />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders image with lazy loading and decoding async attributes', () => {
    render(<LazyImage src="https://example.com/photo.jpg" alt="Photo" className="test-img" />);

    const img = screen.getByAltText('Photo') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('src')).toBe('https://example.com/photo.jpg');
  });

  it('transitions to loaded state on successful image load', () => {
    render(<LazyImage src="https://example.com/photo.jpg" alt="Photo" />);

    const img = screen.getByAltText('Photo');
    expect(img.className).toContain('opacity-0');

    fireEvent.load(img);
    expect(img.className).toContain('opacity-100');
  });

  it('displays fallback icon on image error event', () => {
    const { container } = render(<LazyImage src="https://example.com/broken.jpg" alt="Broken" />);

    const img = screen.getByAltText('Broken');
    fireEvent.error(img);

    expect(screen.queryByAltText('Broken')).toBeNull();
    expect(container.querySelector('svg')).toBeDefined();
  });
});
