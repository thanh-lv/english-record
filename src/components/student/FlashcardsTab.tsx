import { ArrowLeft, ArrowRight, Shuffle, Volume2, X } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import { useEscapeToClose } from "../../hooks/useEscapeToClose";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";

interface VocabSet {
  id: string;
  title: string;
  emoji: string;
  age_group: "kindergarten" | "primary" | "all";
  card_count?: number;
}

interface VocabCard {
  id: string;
  front: string;
  back: string;
  ipa: string | null;
  image_url: string | null;
  order_index: number;
}

interface FlashcardsTabProps {
  studentAge: number;
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
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  return (
    <div
      className="cursor-pointer select-none w-full"
      style={{ perspective: "1200px" }}
      onClick={() => setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${card.front} – ${flipped ? card.back : t.teacherModal.flashcardsTapToFlip}`}
      onKeyDown={(e) => {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "340px",
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(0.4,0.2,0.2,1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          className="rounded-[1.5rem] bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] border-4 border-[#90CAF9] shadow-xl flex flex-col items-center justify-center p-6 gap-2"
        >
          {card.image_url && (
            <img
              src={card.image_url}
              alt=""
              className="w-40 h-40 object-cover rounded-2xl shadow-md border-2 border-white"
            />
          )}
          <p className="text-4xl font-black text-[#1E88E5] text-center leading-tight">
            {card.front}
          </p>
          {card.ipa && (
            <p className="text-base font-mono text-[#1E88E5]/60 text-center">
              {card.ipa}
            </p>
          )}
          <button
            onClick={speak}
            className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-[#1E88E5]/10 hover:bg-[#1E88E5]/20 rounded-full transition-colors active:scale-95"
          >
            <Volume2 size={16} className="text-[#1E88E5]" />
            <span className="text-xs font-bold text-[#1E88E5]">
              {t.teacherModal.flashcardsListen}
            </span>
          </button>
          <p className="text-xs font-bold text-[#1E88E5]/40 mt-1">
            {t.teacherModal.flashcardsTapToSeeMeaning}
          </p>
        </div>

        {/* Back */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className="rounded-[1.5rem] bg-gradient-to-br from-[#1E88E5] to-[#1565C0] border-4 border-[#1976D2] shadow-xl flex flex-col items-center justify-center p-6 gap-3"
        >
          <p className="text-4xl font-black text-white text-center leading-tight">
            {card.back}
          </p>
          <div className="px-4 py-2 bg-white/20 rounded-full">
            <p className="text-sm font-extrabold text-blue-100">{card.front}</p>
          </div>
          {card.ipa && (
            <p className="text-sm font-mono text-blue-300">{card.ipa}</p>
          )}
          <p className="text-xs font-bold text-blue-300/70 mt-1">
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
    setCards((prev) =>
      shuffled
        ? [...prev].sort((a, b) => a.order_index - b.order_index)
        : [...prev].sort(() => Math.random() - 0.5),
    );
    setCurrentIndex(0);
    setShuffled((s) => !s);
  };

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("vocabulary_cards")
          .select("id, front, back, ipa, image_url, order_index")
          .eq("set_id", set.id)
          .order("order_index", { ascending: true });
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

  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex((i) => Math.min(total - 1, i + 1));

  useEscapeToClose(onClose);

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flashcards-study-title"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">
              {set.emoji}
            </span>
            <div>
              <h3
                id="flashcards-study-title"
                className="font-black text-slate-800 text-lg leading-tight"
              >
                {set.title}
              </h3>
              {!loading && total > 0 && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1E88E5] rounded-full transition-all duration-300"
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
          <div className="flex items-center gap-1">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-full transition-colors ${shuffled ? "bg-blue-100 text-[#1E88E5]" : "hover:bg-slate-100 text-slate-400"}`}
              title="Shuffle"
              aria-label="Shuffle"
              aria-pressed={shuffled}
            >
              <Shuffle size={18} />
            </button>
            <button
              onClick={onClose}
              aria-label={t.common.close}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Card area */}
        <div className="px-6 pb-2">
          {loading ? (
            <div className="h-[340px] flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-[#1E88E5] rounded-full animate-spin" />
            </div>
          ) : total === 0 ? (
            <div className="h-[340px] flex flex-col items-center justify-center gap-3 text-slate-400">
              <span className="text-5xl opacity-30">📭</span>
              <p className="font-bold text-sm">
                {t.teacherModal.flashcardsNoCardsInSet}
              </p>
            </div>
          ) : currentCard ? (
            <FlipCard key={currentCard.id} card={currentCard} />
          ) : null}
        </div>

        {/* Progress dots */}
        {!loading && total > 1 && (
          <div className="flex justify-center gap-1.5 py-3">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                aria-label={`${t.topic.question} ${i + 1}`}
                aria-current={i === currentIndex}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? "bg-[#1E88E5] w-6"
                    : "bg-slate-200 hover:bg-slate-300 w-1.5"
                }`}
              />
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          {!loading && total > 0 ? (
            <>
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label={t.common.prevQuestion}
                className="w-14 h-14 shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600 transition-colors flex items-center justify-center border-b-4 border-slate-200"
              >
                <ArrowLeft size={20} />
              </button>
              {currentIndex === total - 1 ? (
                <button
                  onClick={onClose}
                  className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-2xl transition-all shadow-lg border-b-4 border-emerald-700 active:scale-95 text-base"
                >
                  {t.teacherModal.flashcardsDone}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex-1 h-14 bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] hover:from-[#1565C0] hover:to-[#1E88E5] text-white font-black rounded-2xl transition-all shadow-lg border-b-4 border-blue-900 active:scale-95 flex items-center justify-center gap-2 text-base"
                >
                  {t.teacherModal.flashcardsNext} <ArrowRight size={18} />
                </button>
              )}
            </>
          ) : !loading && total === 0 ? (
            <button
              onClick={onClose}
              className="flex-1 h-14 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-sm transition-colors"
            >
              {t.teacherModal.flashcardsClose}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function FlashcardsTab({ studentAge }: FlashcardsTabProps) {
  const { t } = useLanguage();
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSet, setActiveSet] = useState<VocabSet | null>(null);

  useEffect(() => {
    const fetchSets = async () => {
      setLoading(true);
      try {
        const ageGroup = studentAge <= 5 ? "kindergarten" : "primary";

        const { data, error } = await supabase
          .from("vocabulary_sets")
          .select(
            "id, title, emoji, age_group, created_at, vocabulary_cards(id)",
          )
          .or(`age_group.eq.all,age_group.eq.${ageGroup}`)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const setsWithCounts = (data || []).map((set: any) => ({
          ...set,
          card_count: set.vocabulary_cards?.length ?? 0,
          vocabulary_cards: undefined,
        }));
        setSets(setsWithCounts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSets();
  }, [studentAge]);

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] border-3 border-white shadow-sm animate-pulse">
        <div className="h-6 w-40 bg-slate-100 rounded-xl mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] border-3 border-white shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-800">
          {t.teacherModal.flashcardsTitle}
        </h2>
        <p className="text-sm font-bold text-slate-500 mt-1">
          {t.teacherModal.flashcardsSubtitle}
        </p>
      </div>

      {sets.length === 0 ? (
        <div className="py-12 text-center text-slate-400 font-bold rounded-2xl border-2 border-dashed border-slate-200">
          {t.teacherModal.flashcardsEmpty}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sets.map((set) => (
            <button
              key={set.id}
              type="button"
              onClick={() => setActiveSet(set)}
              className="bg-white border-2 border-slate-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95 text-left"
            >
              <span className="text-4xl">{set.emoji}</span>
              <p className="font-extrabold text-slate-800 text-sm text-center line-clamp-2">
                {set.title}
              </p>
              <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-black rounded-full">
                {set.card_count} cards
              </span>
            </button>
          ))}
        </div>
      )}

      {activeSet && (
        <StudyMode set={activeSet} onClose={() => setActiveSet(null)} />
      )}
    </div>
  );
}
