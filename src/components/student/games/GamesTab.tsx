import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Gamepad2 } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { VocabCard, VocabSet } from '../../../types';
import { MatchingGame } from './MatchingGame';
import { QuizGame } from './QuizGame';
import { ScrambleGame } from './ScrambleGame';

export function GamesTab({
  studentGrade,
  teacherId,
}: {
  studentGrade?: number;
  teacherId?: string | null;
}) {
  const { t } = useLanguage();
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSet, setSelectedSet] = useState<VocabSet | null>(null);
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [activeGame, setActiveGame] = useState<'matching' | 'quiz' | 'scramble' | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      let query = supabase
        .from('vocabulary_sets')
        .select('id, title, emoji, grades, vocabulary_cards(id), teacher_id')
        .order('created_at', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data } = await query;

      setSets(
        (data || [])
          .filter((s: any) => {
            if ((s.vocabulary_cards?.length ?? 0) < 4) return false;
            if (Array.isArray(s.grades) && s.grades.length > 0) {
              if (!studentGrade) return true;
              return s.grades.includes(studentGrade);
            }
            return true;
          })
          .map((s: any) => ({ id: s.id, title: s.title, emoji: s.emoji }))
      );
      setLoading(false);
    };
    fetch();
  }, [studentGrade, teacherId]);

  const handleSelectSet = async (set: VocabSet) => {
    setSelectedSet(set);
    setCardsLoading(true);
    const { data } = await supabase
      .from('vocabulary_cards')
      .select('id, set_id, front, back, ipa, image_url, order_index')
      .eq('set_id', set.id)
      .order('order_index');
    setCards(data || []);
    setCardsLoading(false);
  };

  const GAMES = [
    {
      id: 'matching' as const,
      emoji: '🃏',
      name: t.games.matchingName,
      desc: t.games.matchingDesc,
      color: 'from-violet-100 to-purple-100 border-violet-200',
      btn: 'bg-violet-500 hover:bg-violet-600 border-violet-800',
      min: 4,
    },
    {
      id: 'quiz' as const,
      emoji: '⚡',
      name: t.games.quizName,
      desc: t.games.quizDesc,
      color: 'from-amber-100 to-orange-100 border-amber-200',
      btn: 'bg-amber-500 hover:bg-amber-600 border-amber-800',
      min: 4,
    },
    {
      id: 'scramble' as const,
      emoji: '🔤',
      name: t.games.scrambleName,
      desc: t.games.scrambleDesc,
      color: 'from-emerald-100 to-teal-100 border-emerald-200',
      btn: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-800',
      min: 3,
    },
  ];

  if (loading) {
    return (
      <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:p-6 rounded-lg border-3 sm:border-white sm:shadow-md">
        <div className="h-6 w-32 bg-slate-100 rounded-lg mb-4" />
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:p-6 rounded-lg border-3 sm:border-white sm:shadow-md">
      <div className="mb-6 space-y-1">
        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Gamepad2 size={22} className="text-violet-500" /> {t.games.title}
        </h3>
        <p className="text-slate-500 font-bold text-sm">{t.games.subtitle}</p>
      </div>

      {sets.length === 0 ? (
        <div className="py-12 px-2 text-center text-slate-400 font-bold rounded-lg border-2 border-dashed border-slate-200">
          {t.games.emptySets}
        </div>
      ) : (
        <>
          {/* Set picker */}
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              {t.games.selectSet}
            </p>
            <div className="flex flex-wrap gap-2">
              {sets.map(set => (
                <button
                  key={set.id}
                  onClick={() => handleSelectSet(set)}
                  aria-pressed={selectedSet?.id === set.id}
                  className={`px-4 py-2 rounded-lg border-2 font-extrabold text-sm flex items-center gap-2 transition-all active:scale-95 ${
                    selectedSet?.id === set.id
                      ? 'bg-[#E3F2FD] border-[#1E88E5] text-[#1E88E5] shadow-md'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
                  }`}
                >
                  {set.emoji} {set.title}
                </button>
              ))}
            </div>
          </div>

          {/* Game cards */}
          {selectedSet && (
            <div className="space-y-3">
              {cardsLoading ? (
                <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ) : cards.length < 4 ? (
                <p className="text-sm font-bold text-slate-400 text-center py-4">
                  {t.games.needMoreCards}
                </p>
              ) : (
                GAMES.map(game => (
                  <div
                    key={game.id}
                    className={`bg-gradient-to-r ${game.color} border-2 rounded-lg p-4 flex items-center gap-4`}
                  >
                    <span className="text-4xl">{game.emoji}</span>
                    <div className="flex-1">
                      <p className="font-black text-slate-800">{game.name}</p>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">{game.desc}</p>
                    </div>
                    <button
                      onClick={() => setActiveGame(game.id)}
                      className={`shrink-0 px-4 py-2.5 ${game.btn} text-white font-black rounded-lg text-sm border-b-4 active:scale-95 transition-all shadow-md`}
                    >
                      {t.games.play}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {activeGame === 'matching' && selectedSet && cards.length >= 4 && (
        <MatchingGame cards={cards} onClose={() => setActiveGame(null)} />
      )}
      {activeGame === 'quiz' && selectedSet && cards.length >= 4 && (
        <QuizGame cards={cards} onClose={() => setActiveGame(null)} />
      )}
      {activeGame === 'scramble' && selectedSet && cards.length >= 3 && (
        <ScrambleGame cards={cards} onClose={() => setActiveGame(null)} />
      )}
    </div>
  );
}
