import {
  ArrowLeft,
  ArrowRight,
  Shuffle,
  Volume2,
  X,
  BookMarked,
  Search,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { useEscapeToClose } from '../../../hooks/useEscapeToClose';
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { VocabSet, VocabCard } from '../../../types';

interface FlashcardsTabProps {
  studentGrade?: number | string | null;
}

function FlipCard({ card }: { card: VocabCard }) {
  const { t } = useLanguage();
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [card.id]);

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(card.front);
    u.lang = 'en-US';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  return (
    <div
      className="cursor-pointer select-none w-full max-w-sm mx-auto"
      style={{ perspective: '1200px' }}
      onClick={() => setFlipped(f => !f)}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${card.front} – ${flipped ? card.back : t.teacherModal.flashcardsTapToFlip}`}
      onKeyDown={e => {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          setFlipped(f => !f);
        }
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '360px',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.55s cubic-bezier(0.4,0.2,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front Face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className="rounded-3xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 border-2 border-blue-200/80 shadow-md flex flex-col items-center justify-between p-6 gap-3"
        >
          {card.image_url ? (
            <img
              src={card.image_url}
              alt={
                card.front ||
                t.vocabManager?.flashcardImageAlt ||
                'Hình minh họa thẻ từ vựng Flashcard'
              }
              className="w-36 h-36 sm:w-40 sm:h-40 object-cover rounded-2xl shadow-sm border-2 border-white"
            />
          ) : (
            <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-2xl bg-blue-100/50 border-2 border-dashed border-blue-200 flex items-center justify-center text-4xl">
              🔤
            </div>
          )}

          <div className="text-center space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-blue-700 leading-tight tracking-tight">
              {card.front}
            </p>
            {card.ipa && (
              <p className="text-xs sm:text-sm font-mono font-bold text-blue-500/80 bg-blue-50 px-3 py-0.5 rounded-full inline-block border border-blue-100">
                {card.ipa}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={speak}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 font-black text-xs"
            >
              <Volume2 size={15} />
              <span>{t.teacherModal.flashcardsListen}</span>
            </button>
            <p className="text-[11px] font-bold text-slate-400">
              {t.teacherModal.flashcardsTapToSeeMeaning}
            </p>
          </div>
        </div>

        {/* Back Face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 border-2 border-blue-400 shadow-md flex flex-col items-center justify-between p-6 gap-3 text-white"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-2xl">
            💡
          </div>

          <div className="text-center space-y-3">
            <p className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
              {card.back}
            </p>
            <div className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-xl inline-block border border-white/20">
              <p className="text-sm font-black text-blue-100">{card.front}</p>
            </div>
            {card.ipa && <p className="text-xs font-mono text-blue-200">{card.ipa}</p>}
          </div>

          <p className="text-[11px] font-bold text-blue-200/80">
            {t.teacherModal.flashcardsTapToFlipBack}
          </p>
        </div>
      </div>
    </div>
  );
}

function StudyMode({ set, onClose }: { set: VocabSet; onClose: () => void }) {
  const { t } = useLanguage();
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffled, setShuffled] = useState(false);

  const toggleShuffle = () => {
    setCards(prev =>
      shuffled
        ? [...prev].sort((a, b) => a.order_index - b.order_index)
        : [...prev].sort(() => Math.random() - 0.5)
    );
    setCurrentIndex(0);
    setShuffled(s => !s);
  };

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('vocabulary_cards')
          .select('id, set_id, front, back, ipa, image_url, order_index')
          .eq('set_id', set.id)
          .order('order_index', { ascending: true });
        if (error) throw error;
        setCards(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [set.id]);

  const total = cards.length;
  const currentCard = cards[currentIndex];

  const handlePrev = () => setCurrentIndex(i => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex(i => Math.min(total - 1, i + 1));

  useEscapeToClose(onClose);

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-3 sm:p-6 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flashcards-study-title"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl sm:text-4xl shrink-0" aria-hidden="true">
              {set.emoji}
            </span>
            <div className="min-w-0">
              <h3
                id="flashcards-study-title"
                className="font-black text-slate-800 text-base sm:text-lg leading-tight truncate"
              >
                {set.title}
              </h3>
              {!loading && total > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-24 sm:w-32 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                      style={{
                        width: `${((currentIndex + 1) / total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-400">
                    {currentIndex + 1}/{total}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`p-2 rounded-xl transition-colors ${
                shuffled ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400'
              }`}
              title="Xáo trộn thẻ"
              aria-label="Shuffle"
              aria-pressed={shuffled}
            >
              <Shuffle size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="px-5 sm:px-8 py-5">
          {loading ? (
            <div className="h-[360px] flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-400">Đang tải thẻ từ vựng...</span>
            </div>
          ) : total === 0 ? (
            <div className="h-[360px] flex flex-col items-center justify-center gap-3 text-slate-400">
              <span className="text-5xl opacity-40">📭</span>
              <p className="font-bold text-sm">{t.teacherModal.flashcardsNoCardsInSet}</p>
            </div>
          ) : currentCard ? (
            <FlipCard key={currentCard.id} card={currentCard} />
          ) : null}
        </div>

        {/* Step Dots indicator */}
        {!loading && total > 1 && (
          <div className="flex justify-center items-center gap-1.5 pb-2">
            {cards.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                aria-label={`Thẻ ${i + 1}`}
                aria-current={i === currentIndex}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'bg-blue-600 w-6' : 'bg-slate-200 hover:bg-slate-300 w-1.5'
                }`}
              />
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 pb-6 pt-2 flex gap-3 border-t border-slate-100 bg-slate-50/50">
          {!loading && total > 0 ? (
            <>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label={t.common.prevQuestion}
                className="w-12 h-12 shrink-0 rounded-2xl bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors flex items-center justify-center border border-slate-200 shadow-2xs active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>
              {currentIndex === total - 1 ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-2xl transition-all shadow-md shadow-emerald-500/20 active:scale-95 text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> {t.teacherModal.flashcardsDone}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  {t.teacherModal.flashcardsNext} <ArrowRight size={18} />
                </button>
              )}
            </>
          ) : !loading && total === 0 ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-colors"
            >
              {t.teacherModal.flashcardsClose}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function FlashcardsTab({ studentGrade }: FlashcardsTabProps) {
  const { t } = useLanguage();
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [activeSet, setActiveSet] = useState<VocabSet | null>(null);
  const parsedStudentGrade = studentGrade ? Number(studentGrade) : null;

  useEffect(() => {
    const fetchSets = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('vocabulary_sets')
          .select('id, title, emoji, grades, created_at, vocabulary_cards(id)')
          .order('created_at', { ascending: false });
        if (error) throw error;

        const filtered = (data || [])
          .filter((set: any) => {
            if (Array.isArray(set.grades) && set.grades.length > 0) {
              if (!parsedStudentGrade) return true;
              return set.grades.includes(parsedStudentGrade);
            }
            return true;
          })
          .map((set: any) => ({
            ...set,
            card_count: set.vocabulary_cards?.length ?? 0,
            vocabulary_cards: undefined,
          }));

        setSets(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSets();
  }, [parsedStudentGrade]);

  const filteredSets = useMemo(() => {
    if (!filterText.trim()) return sets;
    const q = filterText.toLowerCase().trim();
    return sets.filter(s => s.title.toLowerCase().includes(q));
  }, [sets, filterText]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white/80 backdrop-blur-md rounded-3xl border border-white/80 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-400">Đang tải danh sách thẻ từ vựng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white/95 via-rose-50/40 to-pink-50/40 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-white/80 shadow-sm">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-gradient-to-br from-rose-400/10 to-pink-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
                <BookMarked size={20} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                {t.teacherModal.flashcardsTitle}
              </h2>
              {parsedStudentGrade && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
                  {interpolate(t.common?.gradeLabel || 'Lớp {grade}', {
                    grade: parsedStudentGrade,
                  })}
                </span>
              )}
            </div>
            <p className="text-slate-500 font-semibold text-xs sm:text-sm max-w-xl">
              {t.teacherModal.flashcardsSubtitle}
            </p>
          </div>

          {/* Stats Pill */}
          <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3 self-start md:self-auto">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-sm">
              🗂️
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tổng bộ thẻ
              </p>
              <p className="text-sm font-black text-slate-800">{filteredSets.length} chủ đề</p>
            </div>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Tìm bộ từ vựng..."
              className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-slate-200/80 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-500 transition-all shadow-2xs"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vocab Sets Grid */}
      {filteredSets.length === 0 ? (
        <div className="py-16 text-center bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200 p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto text-2xl">
            📭
          </div>
          <p className="font-black text-slate-700 text-base">{t.teacherModal.flashcardsEmpty}</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
            Hãy thử đổi từ khóa tìm kiếm để xem các bộ thẻ từ vựng khác nhé!
          </p>
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText('')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow-sm"
            >
              <RotateCcw size={13} /> Xem tất cả bộ thẻ
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredSets.map(set => (
            <button
              key={set.id}
              type="button"
              onClick={() => setActiveSet(set)}
              className="group relative bg-white border border-slate-200/80 hover:border-rose-300 hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1.5 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-between text-center transition-all duration-300 active:scale-95 cursor-pointer"
            >
              {/* Emoji Icon Container */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100/80 flex items-center justify-center text-3xl sm:text-4xl shadow-2xs group-hover:scale-110 transition-transform duration-300">
                {set.emoji}
              </div>

              {/* Set Title */}
              <div className="my-2 min-h-[36px] flex items-center justify-center">
                <p className="font-black text-slate-800 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-rose-600 transition-colors">
                  {set.title}
                </p>
              </div>

              {/* Card Count Pill */}
              <div className="pt-2 border-t border-slate-100 w-full flex items-center justify-center">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] sm:text-[11px] font-black rounded-full border border-rose-200/60">
                  <Sparkles size={11} className="text-rose-500" /> {set.card_count} thẻ
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Study Mode Dialog */}
      {activeSet && <StudyMode set={activeSet} onClose={() => setActiveSet(null)} />}
    </div>
  );
}
