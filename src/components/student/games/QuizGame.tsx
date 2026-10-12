import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeToClose } from '../../../hooks/useEscapeToClose';
import { Volume2, X, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { VocabCard } from '../../../types';
import { speak } from './speak';

export function QuizGame({ cards, onClose }: { cards: VocabCard[]; onClose: () => void }) {
  const { t } = useLanguage();
  const TOTAL = Math.min(10, cards.length);
  const [questions] = useState(() => cards.sort(() => Math.random() - 0.5).slice(0, TOTAL));
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<VocabCard[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [streak, setStreak] = useState(0);

  const current = questions[index];

  const buildChoices = useCallback(
    (idx: number) => {
      const correct = questions[idx];
      if (!correct) return [];
      const pool = cards
        .filter(c => c.id !== correct.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      return [...pool, correct].sort(() => Math.random() - 0.5);
    },
    [cards, questions]
  );

  const handleAnswer = useCallback(
    (cardId: string | null) => {
      if (selected || !current) return;
      setSelected(cardId ?? '__timeout__');
      const correct = cardId === current.id;
      if (correct) {
        setScore(s => s + 1);
        setStreak(s => s + 1);
      } else {
        setStreak(0);
      }
      setTimeout(() => {
        if (index + 1 >= TOTAL) setFinished(true);
        else setIndex(i => i + 1);
      }, 1000);
    },
    [selected, current, index, TOTAL]
  );

  useEffect(() => {
    setChoices(buildChoices(index));
    setSelected(null);
    setTimeLeft(10);
  }, [index, buildChoices]);

  useEffect(() => {
    if (selected || finished) return;
    if (timeLeft <= 0) {
      handleAnswer(null);
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, selected, finished, handleAnswer]);

  useEffect(() => {
    if (current) speak(current.front);
  }, [current]);

  const restart = () => {
    setIndex(0);
    setScore(0);
    setStreak(0);
    setSelected(null);
    setFinished(false);
    setTimeLeft(10);
  };

  const pct = Math.round((score / TOTAL) * 100);
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;

  useEscapeToClose(onClose);

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center sm:p-4 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-game-title"
    >
      <div className="bg-white w-full sm:max-w-2xl rounded-lg sm:rounded-lg shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-3">
          <div>
            <h3 id="quiz-game-title" className="font-black text-slate-800 text-2xl">
              {t.games.quizTitle}
            </h3>
            {!finished && (
              <p className="text-sm font-bold text-slate-400 mt-0.5">
                {index + 1}/{TOTAL} · {interpolate(t.games.score, { score })}
                {streak >= 2 && (
                  <span className="ml-2 text-orange-500">
                    {interpolate(t.games.streak, { count: streak })}
                  </span>
                )}
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
              <p className="text-slate-400 font-bold">
                {pct >= 90 ? t.games.amazing : pct >= 60 ? t.games.goodJob : t.games.keepPractising}
              </p>
              <div className="flex gap-3 mt-3">
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
              {/* Progress bar */}
              <div className="h-3 bg-slate-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] rounded-lg transition-all duration-300"
                  style={{ width: `${(index / TOTAL) * 100}%` }}
                />
              </div>

              {/* Timer */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {Array.from({ length: TOTAL }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-lg ${i < index ? 'bg-emerald-400' : i === index ? 'bg-[#1E88E5]' : 'bg-slate-200'}`}
                    />
                  ))}
                </div>
                <div
                  className={`px-4 py-1.5 rounded-lg font-black text-base ${timeLeft <= 3 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}
                >
                  ⏱ {timeLeft}s
                </div>
              </div>

              {/* Question card */}
              <div className="bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] border-4 border-[#90CAF9] rounded-lg p-6 flex flex-col items-center gap-4 min-h-[160px] justify-center">
                {current.image_url && (
                  <img
                    src={current.image_url}
                    alt={current.front || t.games?.gameQuestionAlt || 'Hình minh họa câu hỏi game'}
                    className="w-28 h-28 object-cover rounded-lg shadow-md border-2 border-white"
                  />
                )}
                <p className="text-4xl font-black text-[#1E88E5] text-center">{current.front}</p>
                <button
                  onClick={() => speak(current.front)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1E88E5]/10 hover:bg-[#1E88E5]/20 rounded-lg transition-colors"
                >
                  <Volume2 size={18} className="text-[#1E88E5]" />
                  <span className="text-sm font-bold text-[#1E88E5]">Listen</span>
                </button>
                <p className="text-sm font-bold text-[#1E88E5]/60">What does this mean?</p>
              </div>

              {/* Choices */}
              <div className="grid grid-cols-2 gap-3">
                {choices.map(choice => {
                  const isCorrect = choice.id === current.id;
                  const isSelected = selected === choice.id;
                  let style =
                    'bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50';
                  if (selected) {
                    if (isCorrect) style = 'bg-emerald-100 border-emerald-400 text-emerald-800';
                    else if (isSelected) style = 'bg-rose-100 border-rose-400 text-rose-700';
                    else style = 'bg-white border-slate-200 text-slate-400 opacity-50';
                  }
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleAnswer(choice.id)}
                      disabled={!!selected}
                      className={`h-20 rounded-lg font-extrabold text-base transition-all active:scale-95 border-3 flex items-center justify-center gap-2 px-4 ${style}`}
                    >
                      {selected && isCorrect && (
                        <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                      )}
                      {selected && isSelected && !isCorrect && (
                        <XCircle size={20} className="text-rose-500 shrink-0" />
                      )}
                      <span className="line-clamp-2 text-center">{choice.back}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
