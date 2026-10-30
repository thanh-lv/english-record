import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { MoviesManager } from '../MoviesManager';
import { LanguageProvider } from '../../../../i18n/LanguageContext';
import { movieService } from '../../../../services/movieService';
import { clientCache } from '../../../../lib/cache';
import { vi as viText } from '../../../../i18n/vi';

vi.mock('../../../../services/movieService', () => ({
  movieService: { fetchKidsMovies: vi.fn() },
}));

const fetchKidsMovies = vi.mocked(movieService.fetchKidsMovies);

const page = (name: string, currentPage = 1, totalPages = 3) => ({
  items: [
    {
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      origin_name: `${name} origin`,
      poster_url: '',
      lang: 'Vietsub',
      time: '30 phút',
      episode_current: '',
      year: 2020,
      categories: ['Trẻ Em', 'Bí Ẩn'],
    },
  ],
  totalItems: 112,
  currentPage,
  totalPages,
});

function CurrentUrl() {
  const location = useLocation();
  return <output data-testid="url">{location.pathname + location.search}</output>;
}

function renderManager(entry = '/teacher/movies') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LanguageProvider>
        <MoviesManager />
        <CurrentUrl />
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe('MoviesManager', () => {
  beforeEach(() => {
    clientCache.clear();
    vi.clearAllMocks();
    localStorage.setItem('app-language', 'vi');
    window.scrollTo = vi.fn();
  });

  it('lists movies from the english filter by default, with their genre labels', async () => {
    fetchKidsMovies.mockResolvedValue(page('Danny Go'));
    renderManager();

    const link = await screen.findByRole('link', { name: /Danny Go/ });
    expect(link.getAttribute('href')).toBe('/teacher/movies/danny-go');
    expect(fetchKidsMovies).toHaveBeenCalledWith({ page: 1, filter: 'english' });
    expect(screen.getByText('Bí Ẩn')).toBeDefined();
    expect(screen.getByText('112 phim')).toBeDefined();
  });

  it('resets to page 1 and updates the URL when the filter changes', async () => {
    fetchKidsMovies.mockResolvedValue(page('Danny Go', 2));
    renderManager('/teacher/movies?page=2');
    await screen.findByRole('link', { name: /Danny Go/ });
    expect(fetchKidsMovies).toHaveBeenCalledWith({ page: 2, filter: 'english' });

    fireEvent.click(screen.getByRole('button', { name: viText.movies.filterAll }));

    await waitFor(() =>
      expect(fetchKidsMovies).toHaveBeenLastCalledWith({ page: 1, filter: 'all' })
    );
    expect(screen.getByTestId('url').textContent).toBe('/teacher/movies?filter=all');
  });

  it('moves between pages and stops at the last one', async () => {
    fetchKidsMovies.mockImplementation(async ({ page: p }) => page(`Movie ${p}`, p, 2));
    renderManager();
    await screen.findByRole('link', { name: /Movie 1/ });
    expect(screen.getByRole('button', { name: viText.movies.prevPage })).toHaveProperty(
      'disabled',
      true
    );

    fireEvent.click(screen.getByRole('button', { name: viText.movies.nextPage }));

    await screen.findByRole('link', { name: /Movie 2/ });
    expect(screen.getByTestId('url').textContent).toBe('/teacher/movies?page=2');
    expect(screen.getByRole('button', { name: viText.movies.nextPage })).toHaveProperty(
      'disabled',
      true
    );
  });

  it('falls back to page 1 for an invalid page in the URL', async () => {
    fetchKidsMovies.mockResolvedValue(page('Danny Go'));
    renderManager('/teacher/movies?page=abc');

    await screen.findByRole('link', { name: /Danny Go/ });
    expect(fetchKidsMovies).toHaveBeenCalledWith({ page: 1, filter: 'english' });
  });

  it('shows an error with a working retry button', async () => {
    fetchKidsMovies.mockRejectedValueOnce(new Error('down'));
    fetchKidsMovies.mockResolvedValue(page('Danny Go'));
    renderManager();

    expect(await screen.findByText(viText.movies.loadError)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: viText.common.retryBtn }));

    expect(await screen.findByRole('link', { name: /Danny Go/ })).toBeDefined();
    expect(screen.queryByText(viText.movies.loadError)).toBeNull();
  });

  it('shows an empty state when the source has no movies', async () => {
    fetchKidsMovies.mockResolvedValue({ ...page('x'), items: [], totalItems: 0 });
    renderManager();

    expect(await screen.findByText(viText.movies.empty)).toBeDefined();
  });
});
