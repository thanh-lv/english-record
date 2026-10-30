import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MovieDetailView } from '../MovieDetailView';
import { LanguageProvider } from '../../../../i18n/LanguageContext';
import { movieService } from '../../../../services/movieService';
import { clientCache } from '../../../../lib/cache';
import { vi as viText } from '../../../../i18n/vi';

vi.mock('../../../../services/movieService', () => ({
  movieService: { fetchMovie: vi.fn() },
}));

const fetchMovie = vi.mocked(movieService.fetchMovie);

const movie = {
  slug: 'ca-do',
  name: 'Cá đỏ',
  origin_name: 'Red Fish',
  poster_url: '',
  lang: 'Vietsub',
  time: '',
  episode_current: 'Hoàn Tất',
  year: 2026,
  categories: ['Trẻ Em'],
  description: 'Một con cá',
  servers: [
    {
      name: 'Vietsub',
      episodes: [
        { name: 'Tập 1', embedUrl: 'https://krx.koyeb.app/player/vs1' },
        { name: 'Tập 2', embedUrl: 'https://krx.koyeb.app/player/vs2' },
      ],
    },
    {
      name: 'Lồng Tiếng',
      episodes: [{ name: 'Tập 1', embedUrl: 'https://krx.koyeb.app/player/lt1' }],
    },
  ],
};

function renderDetail(state?: { listSearch: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/teacher/movies/ca-do', state }]}>
      <LanguageProvider>
        <Routes>
          <Route path="/teacher/movies/:slug" element={<MovieDetailView />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  );
}

const playerSrc = () => screen.getByTitle(/Cá đỏ/).getAttribute('src');

describe('MovieDetailView', () => {
  beforeEach(() => {
    clientCache.clear();
    vi.clearAllMocks();
    localStorage.setItem('app-language', 'vi');
    // happy-dom mặc định tải thật trang trong iframe; test không được gọi mạng
    (
      window as unknown as { happyDOM: { settings: { disableIframePageLoading: boolean } } }
    ).happyDOM.settings.disableIframePageLoading = true;
  });

  it('plays the first episode of the first server in a sandboxed iframe', async () => {
    fetchMovie.mockResolvedValue(movie);
    renderDetail();

    const player = await screen.findByTitle(/Cá đỏ/);
    expect(fetchMovie).toHaveBeenCalledWith('ca-do');
    expect(player.getAttribute('src')).toBe('https://krx.koyeb.app/player/vs1');
    expect(player.getAttribute('sandbox')).not.toContain('allow-popups');
    expect(player.getAttribute('sandbox')).not.toContain('allow-top-navigation');
  });

  it('switches episode and keeps a valid episode when the new server has fewer', async () => {
    fetchMovie.mockResolvedValue(movie);
    renderDetail();
    await screen.findByTitle(/Cá đỏ/);

    fireEvent.click(screen.getByRole('button', { name: 'Tập 2' }));
    expect(playerSrc()).toContain('/player/vs2');

    fireEvent.click(screen.getByRole('button', { name: 'Lồng Tiếng' }));
    expect(playerSrc()).toContain('/player/lt1');
    expect(screen.queryByRole('button', { name: 'Tập 1' })).toBeNull();
  });

  it('does not render a player for a blocked link', async () => {
    fetchMovie.mockResolvedValue({
      ...movie,
      servers: [{ name: 'Vietsub', episodes: [{ name: 'Full', embedUrl: null }] }],
    });
    renderDetail();

    expect(await screen.findByText(viText.movies.noPlayer)).toBeDefined();
    expect(screen.queryByTitle(/Cá đỏ/)).toBeNull();
  });

  it('returns to the same list page it came from', async () => {
    fetchMovie.mockResolvedValue(movie);
    renderDetail({ listSearch: 'filter=all&page=3' });
    await screen.findByTitle(/Cá đỏ/);

    expect(screen.getByRole('link', { name: viText.movies.backToList }).getAttribute('href')).toBe(
      '/teacher/movies?filter=all&page=3'
    );
  });

  it('shows an error state and retries', async () => {
    fetchMovie.mockRejectedValueOnce(new Error('down'));
    fetchMovie.mockResolvedValue(movie);
    renderDetail();

    expect(await screen.findByText(viText.movies.loadError)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: viText.common.retryBtn }));
    expect(await screen.findByTitle(/Cá đỏ/)).toBeDefined();
  });
});
