import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { movieService, resolveImageUrl, buildPlayerUrl } from '../movieService';

vi.mock('../loggerService', () => ({
  loggerService: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const fetchMock = vi.fn();

function respondWith(body: unknown, ok = true, status = 200) {
  fetchMock.mockResolvedValue({ ok, status, json: async () => body });
}

const listResponse = {
  status: true,
  data: {
    APP_DOMAIN_CDN_IMAGE: 'https://cdn.example.com',
    items: [
      {
        _id: 'a1',
        slug: 'danny-go-phan-1',
        name: 'Danny Go! (Phần 1)',
        origin_name: 'Danny Go! (Season 1)',
        poster_url: 'upload/vod/poster.jpg',
        lang: 'Vietsub',
        time: '30 phút',
        episode_current: 'Hoàn Tất',
        year: 2019,
        category: [{ name: 'Trẻ Em', slug: 'tre-em' }],
      },
    ],
    params: { pagination: { totalItems: 112, currentPage: 2, totalPages: 5 } },
  },
};

describe('movieService', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('resolveImageUrl', () => {
    it('joins relative paths to the CDN and keeps full URLs', () => {
      expect(resolveImageUrl('upload/a.jpg', 'https://cdn.example.com')).toBe(
        'https://cdn.example.com/upload/a.jpg'
      );
      expect(resolveImageUrl('/upload/a.jpg', 'https://cdn.example.com')).toBe(
        'https://cdn.example.com/upload/a.jpg'
      );
      expect(resolveImageUrl('https://other.example.com/a.jpg')).toBe(
        'https://other.example.com/a.jpg'
      );
      expect(resolveImageUrl('')).toBe('');
    });
  });

  describe('buildPlayerUrl', () => {
    it('encodes the m3u8 link into the player path', () => {
      expect(buildPlayerUrl('https://v7.kkphimplayer7.com/2026/abc/index.m3u8')).toBe(
        'https://krx.koyeb.app/player/https%3A%2F%2Fv7.kkphimplayer7.com%2F2026%2Fabc%2Findex.m3u8'
      );
    });

    it('rejects links that are not https m3u8', () => {
      expect(buildPlayerUrl('http://x.com/index.m3u8')).toBeNull();
      expect(buildPlayerUrl('https://x.com/video.mp4')).toBeNull();
      expect(buildPlayerUrl('javascript:alert(1)')).toBeNull();
      expect(buildPlayerUrl('')).toBeNull();
    });

    it('rejects characters that could break out of the JS string in the player page', () => {
      expect(buildPlayerUrl("https://x.com/a';alert(1);//index.m3u8")).toBeNull();
      expect(buildPlayerUrl('https://x.com/a"b/index.m3u8')).toBeNull();
      expect(buildPlayerUrl('https://x.com/a<script>/index.m3u8')).toBeNull();
      expect(buildPlayerUrl('https://x.com/a\\b/index.m3u8')).toBeNull();
    });
  });

  describe('fetchKidsMovies', () => {
    it('requests Western Vietsub titles for the english filter', async () => {
      respondWith(listResponse);

      await movieService.fetchKidsMovies({ page: 2, filter: 'english' });

      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(url.origin + url.pathname).toBe('https://phimapi.com/v1/api/the-loai/tre-em');
      expect(url.searchParams.get('page')).toBe('2');
      expect(url.searchParams.get('country')).toBe('au-my');
      expect(url.searchParams.get('sort_lang')).toBe('vietsub');
    });

    it('does not narrow the genre for the all filter', async () => {
      respondWith(listResponse);

      await movieService.fetchKidsMovies({ page: 1, filter: 'all' });

      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(url.searchParams.has('country')).toBe(false);
      expect(url.searchParams.has('sort_lang')).toBe(false);
    });

    it('normalizes items, poster URLs and pagination', async () => {
      respondWith(listResponse);

      const result = await movieService.fetchKidsMovies({ page: 2, filter: 'english' });

      expect(result.totalItems).toBe(112);
      expect(result.currentPage).toBe(2);
      expect(result.totalPages).toBe(5);
      expect(result.items[0]).toMatchObject({
        slug: 'danny-go-phan-1',
        poster_url: 'https://cdn.example.com/upload/vod/poster.jpg',
        categories: ['Trẻ Em'],
        year: 2019,
      });
    });

    it('throws on HTTP errors and on malformed responses', async () => {
      respondWith({}, false, 503);
      await expect(movieService.fetchKidsMovies({ page: 1, filter: 'all' })).rejects.toThrow(
        'KKPhim HTTP 503'
      );

      respondWith({ status: true, data: { items: 'nope' } });
      await expect(movieService.fetchKidsMovies({ page: 1, filter: 'all' })).rejects.toThrow(
        'API Boundary Validation Error'
      );
    });

    it('surfaces network failures', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(movieService.fetchKidsMovies({ page: 1, filter: 'all' })).rejects.toThrow(
        'Failed to fetch'
      );
    });
  });

  describe('fetchMovie', () => {
    const detailResponse = {
      status: true,
      movie: {
        slug: 'ca-do-ca-xanh',
        name: 'Cá đỏ, cá xanh',
        origin_name: 'Red Fish Blue Fish',
        content: '<p>Một con cá &amp; hai con cá</p><script>alert(1)</script>',
        poster_url: 'https://phimimg.com/upload/poster.jpg',
        year: 2026,
        category: [{ name: 'Trẻ Em' }],
      },
      episodes: [
        {
          server_name: 'Vietsub',
          server_data: [
            { name: 'Tập 1', link_m3u8: 'https://cdn.example.com/a/index.m3u8' },
            { name: 'Tập 2', link_m3u8: 'https://evil.example.com/not-a-playlist' },
          ],
        },
        { server_name: 'Trống', server_data: [] },
      ],
    };

    it('turns the description into plain text and drops empty servers', async () => {
      respondWith(detailResponse);

      const movie = await movieService.fetchMovie('ca-do-ca-xanh');

      expect(fetchMock.mock.calls[0][0]).toBe('https://phimapi.com/phim/ca-do-ca-xanh');
      expect(movie.description).toContain('Một con cá & hai con cá');
      expect(movie.description).not.toContain('<p>');
      expect(movie.servers.map(s => s.name)).toEqual(['Vietsub']);
    });

    it('builds player links from m3u8 and blanks invalid ones', async () => {
      respondWith(detailResponse);

      const movie = await movieService.fetchMovie('ca-do-ca-xanh');

      expect(movie.servers[0].episodes[0].embedUrl).toBe(
        'https://krx.koyeb.app/player/https%3A%2F%2Fcdn.example.com%2Fa%2Findex.m3u8'
      );
      expect(movie.servers[0].episodes[1].embedUrl).toBeNull();
    });

    it('encodes the slug and rejects the not-found response', async () => {
      respondWith({ status: false, msg: 'hmmm!' });

      await expect(movieService.fetchMovie('a/b')).rejects.toThrow('API Boundary Validation Error');
      expect(fetchMock.mock.calls[0][0]).toBe('https://phimapi.com/phim/a%2Fb');
    });
  });
});
