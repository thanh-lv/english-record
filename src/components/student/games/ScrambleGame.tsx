import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeToClose } from '../../../hooks/useEscapeToClose';
import { X } from 'lucide-react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { VocabCard } from '../../../types';
import { speak } from './speak';

export function ScrambleGame({ cards, onClose }: { cards: VocabCard[]; onClose: () => void }) {
  const { t } = useLanguage();
  const pool = cards.filter(c => c.front.length >= 3 && c.front.length <= 10);
  const [index, setIndex] = useState(0);
  const [scrambled, setScrambled] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const TOTAL = Math.min(8, pool.length);
  const [questions] = useState(() => pool.sort(() => Math.random() - 0.5).slice(0, TOTAL));

  const current = questions[index];

  const buildScramble = (word: string) => {
    const letters = word.toUpperCase().split('');
    // ensure scramble differs from original
    let shuffled = [...letters].sort(() => Math.random() - 0.5);
    let tries = 0;
    while (shuffled.join('') === letters.join('') && tries < 10) {
      shuffled = [...letters].sort(() => Math.random() - 0.5);
      tries++;
    }
    return shuffled;
  };

  useEffect(() => {
    if (!current) return;
    setScrambled(buildScramble(current.front));
    setAnswer([]);
    setResult(null);
  }, [current]);

  const handlePickLetter = (i: number) => {
    if (result) return;
    const letter = scrambled[i];
    setAnswer(prev => [...prev, letter]);
    setScrambled(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleRemoveLetter = (i: number) => {
    if (result) return;
    const letter = answer[i];
    setAnswer(prev => prev.filter((_, idx) => idx !== i));
    setScrambled(prev => [...prev, letter]);
  };

  const checkAnswer = () => {
    const correct = answer.join('') === current.front.toUpperCase();
    setResult(correct ? 'correct' : 'wrong');
    if (correct) {
      setScore(s => s + 1);
      speak(current.front);
    }
    setTimeout(() => {
      if (index + 1 >= TOTAL) setFinished(true);
      else setIndex(i => i + 1);
    }, 1200);
  };

  const restart = () => {
    setIndex(0);
    setScore(0);
    setAnswer([]);
    setResult(null);
    setFinished(false);
  };

  const pct = Math.round((score / TOTAL) * 100);
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;

  useEscapeToClose(onClose);

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center sm:p-4 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scramble-game-title"
    >
      <div className="bg-white w-full sm:max-w-2xl rounded-lg sm:rounded-lg shadow-md">
        <div className="flex items-center justify-between px-7 pt-6 pb-3">
          <div>
            <h3 id="scramble-game-title" className="font-black text-slate-800 text-2xl">
              {t.games.scrambleTitle}
            </h3>
            {!finished && (
              <p className="text-sm font-bold text-slate-400 mt-0.5">
                {index + 1}/{TOTAL} · {interpolate(t.games.score, { score })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t.games.close}
            className="p-2.5 hover:bg-slate-100 rounded-lg text-slate-400"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 pb-8">
          {finished ? (
            <div className="py-10 flex flex-col items-center gap-4">
              <div className="text-8xl">
                {stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '😅'}
              </div>
              <p className="font-black text-3xl text-slate-800">
                {'⭐'.repeat(stars)}
                {'☆'.repeat(3 - stars)}
              </p>
              <p className="font-black text-2xl text-[#1E88E5]">
                {interpolate(t.games.correctCount, {
                  score,
                  total: TOTAL,
                })}
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={restart}
                  className="px-8 py-4 bg-[#1E88E5] text-white font-black text-lg rounded-lg shadow-md border-b-4 border-blue-900 active:scale-95 transition-all"
                >
                  {t.games.tryAgain}
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
            <div className="space-y-5">
              {/* Progress */}
              <div className="h-3 bg-slate-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-lg transition-all duration-300"
                  style={{ width: `${(index / TOTAL) * 100}%` }}
                />
              </div>

              {/* Hint: meaning + image */}
              <div
                className={`border-4 rounded-lg p-5 flex flex-col items-center gap-3 min-h-[140px] justify-center transition-colors ${result === 'correct' ? 'bg-emerald-50 border-emerald-300' : result === 'wrong' ? 'bg-rose-50 border-rose-300' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'}`}
              >
                {current.image_url && (
                  <img
                    src={current.image_url}
                    alt={current.back || t.games?.gameHintAlt || 'Gợi ý từ vựng game'}
                    className="w-24 h-24 object-cover rounded-lg shadow-md border-2 border-white"
                  />
                )}
                <p className="text-2xl font-black text-emerald-700 text-center">{current.back}</p>
                <p className="text-sm font-bold text-emerald-500/70">{t.games.scrambleHint}</p>
                {result === 'correct' && (
                  <p className="text-emerald-600 font-black text-lg animate-bounce">
                    {t.games.scrambleCorrect}
                  </p>
                )}
                {result === 'wrong' && (
                  <p className="text-rose-500 font-black text-lg">
                    {t.games.scrambleAnswer}{' '}
                    <span className="text-rose-700">{current.front.toUpperCase()}</span>
                  </p>
                )}
              </div>

              {/* Answer slots */}
              <div className="flex justify-center gap-2 flex-wrap min-h-[56px]">
                {answer.map((letter, i) => (
                  <button
                    key={i}
                    onClick={() => handleRemoveLetter(i)}
                    disabled={!!result}
                    aria-label={`Remove letter ${letter}`}
                    className="w-12 h-12 rounded-lg bg-[#1E88E5] text-white font-black text-lg shadow-md border-b-4 border-blue-900 active:scale-95 transition-all disabled:opacity-70"
                  >
                    {letter}
                  </button>
                ))}
                {answer.length === 0 && !result && (
                  <p className="text-slate-300 font-bold text-sm self-center">
                    {t.games.tapLettersBelow}
                  </p>
                )}
              </div>

              {/* Scrambled letters */}
              <div className="flex justify-center gap-2 flex-wrap min-h-[56px]">
                {scrambled.map((letter, i) => (
                  <button
                    key={i}
                    onClick={() => handlePickLetter(i)}
                    disabled={!!result}
                    aria-label={`Letter ${letter}`}
                    className="w-12 h-12 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg border-b-4 border-slate-300 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {letter}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setAnswer([]);
                    setScrambled(buildScramble(current.front));
                  }}
                  disabled={!!result}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-lg text-sm transition-colors disabled:opacity-40"
                >
                  {t.games.reset}
                </button>
                <button
                  onClick={checkAnswer}
                  disabled={answer.length !== current.front.length || !!result}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-lg text-sm shadow-md border-b-4 border-emerald-800 active:scale-95 transition-all disabled:opacity-40"
                >
                  {t.games.check}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
