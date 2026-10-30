import { withServiceHandling } from './serviceHandler';
import { MovieDetail, MovieFilter, MoviePage } from '../types';
import { movieDetailResponseSchema, movieListResponseSchema, parseApiResponse } from '../schemas';

const API_BASE = 'https://phimapi.com';
const IMAGE_CDN = 'https://phimimg.com';
const PLAYER_BASE = 'https://krx.koyeb.app/player/';
const KIDS_GENRE = 'tre-em';
const PAGE_SIZE = 24;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`KKPhim HTTP ${res.status}`);
  return res.json();
}

// Danh sách trả ảnh dạng đường dẫn tương đối, còn trang chi tiết trả URL đầy đủ.
export function resolveImageUrl(path: string, cdn = IMAGE_CDN): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${cdn}/${path.replace(/^\/+/, '')}`;
}

// Trình phát chèn link vào mã JS của trang, mà link lại đến từ bên thứ ba,
// nên chỉ nhận link .m3u8 https không chứa ký tự có thể phá chuỗi JS.
export function buildPlayerUrl(m3u8Url: string): string | null {
  try {
    const parsed = new URL(m3u8Url);
    if (parsed.protocol !== 'https:' || !parsed.pathname.endsWith('.m3u8')) return null;
    if (/['"<>\\]/.test(m3u8Url)) return null;
    return PLAYER_BASE + encodeURIComponent(m3u8Url);
  } catch {
    return null;
  }
}

function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').trim();
}

export const movieService = {
  async fetchKidsMovies({
    page,
    filter,
  }: {
    page: number;
    filter: MovieFilter;
  }): Promise<MoviePage> {
    return withServiceHandling('movieService', 'fetchKidsMovies', async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (filter === 'english') {
        params.set('country', 'au-my');
        params.set('sort_lang', 'vietsub');
      }

      const json = await fetchJson(`${API_BASE}/v1/api/the-loai/${KIDS_GENRE}?${params}`);
      const { data } = parseApiResponse(movieListResponseSchema, json);

      return {
        items: data.items.map(({ category, ...item }) => ({
          ...item,
          categories: category,
          poster_url: resolveImageUrl(item.poster_url, data.APP_DOMAIN_CDN_IMAGE || IMAGE_CDN),
        })),
        totalItems: data.params.pagination.totalItems,
        currentPage: data.params.pagination.currentPage,
        totalPages: data.params.pagination.totalPages,
      };
    });
  },

  async fetchMovie(slug: string): Promise<MovieDetail> {
    return withServiceHandling('movieService', 'fetchMovie', async () => {
      const json = await fetchJson(`${API_BASE}/phim/${encodeURIComponent(slug)}`);
      const { movie, episodes } = parseApiResponse(movieDetailResponseSchema, json);
      const { category, content, ...base } = movie;

      return {
        ...base,
        categories: category,
        poster_url: resolveImageUrl(movie.poster_url),
        description: htmlToPlainText(content),
        servers: episodes
          .filter(server => server.server_data.length > 0)
          .map(server => ({
            name: server.server_name,
            episodes: server.server_data.map(episode => ({
              name: episode.name,
              embedUrl: buildPlayerUrl(episode.link_m3u8),
            })),
          })),
      };
    });
  },
};
