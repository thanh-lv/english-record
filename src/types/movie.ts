export type MovieFilter = 'english' | 'all';

export interface MovieListItem {
  slug: string;
  name: string;
  origin_name: string;
  poster_url: string;
  lang: string;
  time: string;
  episode_current: string;
  year: number | null;
  categories: string[];
}

export interface MoviePage {
  items: MovieListItem[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

export interface MovieEpisode {
  name: string;
  /** null khi nguồn trả link m3u8 không hợp lệ */
  embedUrl: string | null;
}

export interface MovieEpisodeServer {
  name: string;
  episodes: MovieEpisode[];
}

export interface MovieDetail extends MovieListItem {
  description: string;
  servers: MovieEpisodeServer[];
}
