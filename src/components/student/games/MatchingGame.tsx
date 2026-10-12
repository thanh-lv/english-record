import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeToClose } from '../../../hooks/useEscapeToClose';
import { X, RefreshCw } from 'lucide-react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { VocabCard } from '../../../types';
import { speak } from './speak';

interface MatchTile {
  id: string;
  type: 'word' | 'meaning';
  text: string;
  image_url?: string | null;
  pairId: string;
  matched: boolean;
  flipped: boolean;
}

export function MatchingGame({ cards, onClose }: { cards: VocabCard[]; onClose: () => void }) {
  const { t } = useLanguage();
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  const buildTiles = (cards: VocabCard[]) => {
    const pool = cards.slice(0, 6);
    const wordTiles: MatchTile[] = pool.map(c => ({
      id: `w-${c.id}`,
      type: 'word',
      text: c.front,
      image_url: c.image_url,
      pairId: c.id,
      matched: false,
      flipped: false,
    }));
    const meaningTiles: MatchTile[] = pool.map(c => ({
      id: `m-${c.id}`,
      type: 'meaning',
      text: c.back,
      pairId: c.id,
      matched: false,
      flipped: false,
    }));
    return [...wordTiles, ...meaningTiles].sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    setTiles(buildTiles(cards));
  }, [cards]);

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500);
    return () => clearInterval(t);
  }, [finished, startTime]);

  const handleTileClick = (tileId: string) => {
    const tile = tiles.find(t => t.id === tileId);
    if (!tile || tile.matched || tile.flipped) return;
    if (wrongPair) return;

    if (tile.type === 'word') speak(tile.text);

    if (!selected) {
      setSelected(tileId);
      setTiles(prev => prev.map(t => (t.id === tileId ? { ...t, flipped: true } : t)));
      return;
    }

    const selTile = tiles.find(t => t.id === selected)!;
    setMoves(m => m + 1);

    if (selTile.pairId === tile.pairId && selTile.type !== tile.type) {
      // Match!
      setTiles(prev =>
        prev.map(t => (t.pairId === tile.pairId ? { ...t, matched: true, flipped: true } : t))
      );
      setSelected(null);
      setTimeout(() => {
        setTiles(prev => {
          const allDone = prev.every(t => t.matched);
          if (allDone) setFinished(true);
          return prev;
        });
      }, 300);
    } else {
      // Wrong
      setTiles(prev => prev.map(t => (t.id === tileId ? { ...t, flipped: true } : t)));
      setWrongPair([selected, tileId]);
      setTimeout(() => {
        setTiles(prev =>
          prev.map(t => (t.id === selected || t.id === tileId ? { ...t, flipped: false } : t))
        );
        setSelected(null);
        setWrongPair(null);
      }, 900);
    }
  };

  const restart = () => {
    setTiles(buildTiles(cards));
    setSelected(null);
    setWrongPair(null);
    setMoves(0);
    setFinished(false);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  useEscapeToClose(onClose);

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center sm:p-4 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="matching-game-title"
    >
      <div className="bg-white w-full sm:max-w-2xl rounded-lg sm:rounded-lg shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4">
          <div>
            <h3 id="matching-game-title" className="font-black text-slate-800 text-2xl">
              {t.games.matchingTitle}
            </h3>
            <p className="text-sm font-bold text-slate-400 mt-0.5">
              {interpolate(t.games.movesAndElapsed, {
                moves,
                time: fmt(elapsed),
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={restart}
              aria-label={t.games.restart}
              className="p-2.5 hover:bg-slate-100 rounded-lg text-slate-400"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={onClose}
              aria-label={t.games.close}
              className="p-2.5 hover:bg-slate-100 rounded-lg text-slate-400"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="px-6 pb-8">
          {finished ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="text-8xl animate-bounce">🏆</div>
              <p className="font-black text-3xl text-amber-600">{t.games.wellDone}</p>
              <p className="text-slate-500 font-bold">
                {interpolate(t.games.movesAndElapsed, {
                  moves,
                  time: fmt(elapsed),
                })}
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={restart}
                  className="px-8 py-4 bg-[#1E88E5] text-white font-black text-lg rounded-lg shadow-md border-b-4 border-blue-900 active:scale-95 transition-all"
                >
                  {t.games.playAgain}
                </button>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-slate-100 text-slate-700 font-black text-lg rounded-lg active:scale-95 transition-all"
                >
                  {t.games.close}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {tiles.map(tile => {
                const isSelected = selected === tile.id;
                const isWrong = wrongPair?.includes(tile.id);
                return (
                  <button
                    key={tile.id}
                    onClick={() => handleTileClick(tile.id)}
                    disabled={tile.matched}
                    className={`
                      h-28 rounded-lg font-extrabold text-sm transition-all duration-300 flex flex-col items-center justify-center gap-2 p-3 border-3 select-none
                      ${
                        tile.matched
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700 scale-95 opacity-60'
                          : tile.flipped
                            ? isWrong
                              ? 'bg-rose-100 border-rose-300 text-rose-700 scale-95'
                              : isSelected
                                ? 'bg-blue-100 border-[#1E88E5] text-[#1E88E5] scale-105 shadow-md'
                                : 'bg-blue-50 border-blue-200 text-slate-700'
                            : 'bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] border-blue-700 text-white hover:scale-105 hover:shadow-md active:scale-95'
                      }
                    `}
                  >
                    {tile.flipped || tile.matched ? (
                      <>
                        {tile.type === 'word' && tile.image_url && (
                          <img
                            src={tile.image_url}
                            alt={
                              tile.text || t.vocabManager?.cardImageAlt || 'Hình minh họa từ vựng'
                            }
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        )}
                        <span className="text-center text-sm leading-tight line-clamp-2 font-black">
                          {tile.text}
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl">?</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
