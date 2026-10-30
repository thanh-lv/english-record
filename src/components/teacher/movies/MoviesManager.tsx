import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { useQuery } from '../../../hooks/useQuery';
import { movieService } from '../../../services/movieService';
import { MovieFilter, MovieListItem } from '../../../types';

const CACHE_TTL_MS = 5 * 60 * 1000;

// CDN ảnh của KKPhim rất chậm: cho ảnh hiện dần thay vì chờ tải xong như LazyImage.
function MoviePoster({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-[2/3] w-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
      <Film size={28} className="opacity-50" />
      {src && !failed && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}
    </div>
  );
}

function MovieCard({ movie, listSearch }: { movie: MovieListItem; listSearch: string }) {
  const meta = [movie.year, movie.time || movie.episode_current, movie.lang].filter(Boolean);

  return (
    <li>
      <Link
        to={`/teacher/movies/${movie.slug}`}
        state={{ listSearch }}
        className="group block h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-pink-200 transition-all overflow-hidden"
      >
        <MoviePoster src={movie.poster_url} />
        <div className="p-3 space-y-1.5">
          <h4 className="text-sm font-black text-slate-800 leading-snug line-clamp-2">
            {movie.name}
          </h4>
          {movie.origin_name && (
            <p className="text-xs font-bold text-slate-500 truncate">{movie.origin_name}</p>
          )}
          <p className="text-[11px] font-bold text-slate-500">{meta.join(' · ')}</p>
          <ul className="flex flex-wrap gap-1 pt-0.5">
            {movie.categories.slice(0, 4).map(category => (
              <li
                key={category}
                className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold"
              >
                {category}
              </li>
            ))}
          </ul>
        </div>
      </Link>
    </li>
  );
}

function MovieResults({
  page,
  filter,
  listSearch,
  onPageChange,
}: {
  page: number;
  filter: MovieFilter;
  listSearch: string;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLanguage();
  const tMovies = t.movies;
  const { data, loading, error, refetch } = useQuery(
    ['kids-movies', filter, page],
    () => movieService.fetchKidsMovies({ page, filter }),
    { ttlMs: CACHE_TTL_MS, persist: false }
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-lg animate-spin" />
        <p className="text-xs font-bold text-slate-500">{tMovies.loading}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 gap-3 bg-white rounded-2xl border border-slate-200/80">
        <AlertCircle size={28} className="text-rose-500" />
        <p className="text-sm font-bold text-slate-600">{tMovies.loadError}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="h-9 px-4 flex items-center gap-1.5 text-xs font-black text-white bg-pink-600 hover:bg-pink-700 rounded-xl transition-colors"
        >
          <RotateCcw size={14} />
          {t.common.retryBtn}
        </button>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 gap-2 bg-white rounded-2xl border border-slate-200/80">
        <Film size={28} className="text-slate-400" />
        <p className="text-sm font-bold text-slate-600">{tMovies.empty}</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs font-bold text-slate-500">
        {interpolate(tMovies.totalCount, { count: data.totalItems })}
      </p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {data.items.map(movie => (
          <MovieCard key={movie.slug} movie={movie} listSearch={listSearch} />
        ))}
      </ul>

      <nav className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-10 px-3 flex items-center gap-1 text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
          {tMovies.prevPage}
        </button>
        <span className="text-xs font-black text-slate-600">
          {interpolate(tMovies.pageOf, { page, total: data.totalPages })}
        </span>
        <button
          type="button"
          disabled={page >= data.totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-10 px-3 flex items-center gap-1 text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {tMovies.nextPage}
          <ChevronRight size={16} />
        </button>
      </nav>
    </>
  );
}

export function MoviesManager() {
  const { t } = useLanguage();
  const tMovies = t.movies;
  const [searchParams, setSearchParams] = useSearchParams();

  const filter: MovieFilter = searchParams.get('filter') === 'all' ? 'all' : 'english';
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const updateList = (nextFilter: MovieFilter, nextPage: number) => {
    const next = new URLSearchParams();
    if (nextFilter === 'all') next.set('filter', 'all');
    if (nextPage > 1) next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0 });
  };

  const filters: { id: MovieFilter; label: string }[] = [
    { id: 'english', label: tMovies.filterEnglish },
    { id: 'all', label: tMovies.filterAll },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="p-2 rounded-xl bg-pink-50 text-pink-600 border border-pink-100">
              <Clapperboard size={22} />
            </span>
            {tMovies.title}
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-1">{tMovies.subtitle}</p>
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl self-start lg:self-auto">
          {filters.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => updateList(item.id, 1)}
              className={`h-9 px-3 rounded-lg text-xs font-black transition-all ${
                filter === item.id
                  ? 'bg-white text-pink-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* key: đổi trang hoặc bộ lọc thì xoá dữ liệu và lỗi của lần tải trước */}
      <MovieResults
        key={`${filter}:${page}`}
        page={page}
        filter={filter}
        listSearch={searchParams.toString()}
        onPageChange={nextPage => updateList(filter, nextPage)}
      />
    </div>
  );
}
