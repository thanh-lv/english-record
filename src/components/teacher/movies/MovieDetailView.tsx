import { useState } from 'react';
import { AlertCircle, ArrowLeft, Film, RotateCcw } from 'lucide-react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useQuery } from '../../../hooks/useQuery';
import { movieService } from '../../../services/movieService';
import { MovieDetail } from '../../../types';

const CACHE_TTL_MS = 5 * 60 * 1000;

function choiceClass(active: boolean) {
  return `min-h-9 px-3 py-1.5 rounded-lg text-xs font-black border transition-colors ${
    active
      ? 'bg-pink-600 border-pink-600 text-white'
      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
  }`;
}

function MoviePlayer({ movie }: { movie: MovieDetail }) {
  const { t } = useLanguage();
  const tMovies = t.movies;
  const [serverIndex, setServerIndex] = useState(0);
  const [episodeIndex, setEpisodeIndex] = useState(0);

  const server = movie.servers[serverIndex];
  const episode = server?.episodes[episodeIndex];

  const changeServer = (nextIndex: number) => {
    setServerIndex(nextIndex);
    // Giữ nguyên tập đang xem nếu nguồn mới cũng có tập đó
    setEpisodeIndex(current => Math.min(current, movie.servers[nextIndex].episodes.length - 1));
  };

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900">
        {episode?.embedUrl ? (
          <iframe
            src={episode.embedUrl}
            title={`${movie.name} - ${episode.name}`}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300 px-4 text-center">
            <Film size={28} />
            <p className="text-sm font-bold">{tMovies.noPlayer}</p>
          </div>
        )}
      </div>

      {movie.servers.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-500">{tMovies.serversLabel}</span>
          {movie.servers.map((item, index) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={index === serverIndex}
              onClick={() => changeServer(index)}
              className={choiceClass(index === serverIndex)}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      {server && server.episodes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-500">{tMovies.episodesLabel}</span>
          {server.episodes.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              type="button"
              aria-pressed={index === episodeIndex}
              onClick={() => setEpisodeIndex(index)}
              className={choiceClass(index === episodeIndex)}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MovieDetailView() {
  const { t } = useLanguage();
  const tMovies = t.movies;
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const listSearch: string = location.state?.listSearch ?? '';

  const { data, loading, error, refetch } = useQuery(
    ['kids-movie', slug],
    () => movieService.fetchMovie(slug as string),
    { ttlMs: CACHE_TTL_MS, persist: false, enabled: !!slug }
  );

  if (!slug) return <Navigate to="/teacher/movies" replace />;

  const backLink = (
    <Link
      to={`/teacher/movies${listSearch ? `?${listSearch}` : ''}`}
      className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
    >
      <ArrowLeft size={15} />
      {tMovies.backToList}
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-lg animate-spin" />
          <p className="text-xs font-bold text-slate-500">{tMovies.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        {backLink}
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
      </div>
    );
  }

  const meta = [data.year, data.time || data.episode_current, data.lang].filter(Boolean);

  return (
    <div className="space-y-4">
      {backLink}
      <MoviePlayer movie={data} />

      <div className="bg-white/95 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <h3 className="text-xl font-black text-slate-800">{data.name}</h3>
        {data.origin_name && <p className="text-sm font-bold text-slate-500">{data.origin_name}</p>}
        <p className="text-xs font-bold text-slate-500">{meta.join(' · ')}</p>
        <ul className="flex flex-wrap gap-1.5">
          {data.categories.map(category => (
            <li
              key={category}
              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold"
            >
              {category}
            </li>
          ))}
        </ul>
        {data.description && (
          <p className="text-sm font-medium text-slate-600 leading-relaxed">{data.description}</p>
        )}
      </div>
    </div>
  );
}
