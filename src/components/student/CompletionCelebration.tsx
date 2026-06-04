import { useEffect, useState } from "react";
import { useLanguage, interpolate } from "../../i18n/LanguageContext";

const EMOJIS = ["🎉", "⭐", "🌟", "🎈", "🏆", "💫", "🎊", "✨", "🥳", "🎀"];

interface Particle {
  id: number;
  emoji: string;
  x: number;
  duration: number;
  delay: number;
  size: number;
  rotate: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    x: Math.random() * 100,
    duration: 2.5 + Math.random() * 2,
    delay: Math.random() * 1.2,
    size: 1.2 + Math.random() * 1.6,
    rotate: Math.random() * 360,
  }));
}

interface CompletionCelebrationProps {
  show: boolean;
  completedCount: number;
  totalTopics: number;
  onClose: () => void;
}

export function CompletionCelebration({
  show,
  completedCount,
  totalTopics,
  onClose,
}: CompletionCelebrationProps) {
  const { t } = useLanguage();
  const [particles] = useState(() => generateParticles(30));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400);
    }, 5000);
    return () => clearTimeout(timer);
  }, [show]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 400);
  };

  if (!show && !visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-400 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* falling particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 animate-fall"
            style={{
              left: `${p.x}%`,
              fontSize: `${p.size}rem`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationFillMode: "both",
              transform: `rotate(${p.rotate}deg)`,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* card */}
      <div className="relative z-10 bg-white rounded-[2.5rem] shadow-2xl border-4 border-yellow-200 px-10 py-10 flex flex-col items-center gap-4 max-w-sm w-full mx-4 animate-in zoom-in-75 duration-500">
        <div className="text-7xl animate-bounce">
          {completedCount === totalTopics ? "🏆" : "🎉"}
        </div>
        <h2 className="text-3xl font-black text-slate-800 text-center leading-tight">
          {completedCount === totalTopics
            ? t.celebration.excellent
            : t.celebration.goodJob}
        </h2>
        <p className="text-slate-500 font-bold text-center text-sm leading-relaxed">
          {completedCount === totalTopics ? (
            <>
              {t.celebration.allDone}{" "}
              <span className="text-emerald-600 font-black">
                {interpolate(t.celebration.allLessons, { total: totalTopics })}
              </span>
              {t.celebration.proud}
            </>
          ) : (
            <>
              {t.celebration.progress}{" "}
              <span className="text-emerald-600 font-black">
                {completedCount}/{totalTopics} {t.celebration.lessons}
              </span>
              {t.celebration.encourage}
            </>
          )}
        </p>
        <div className="flex gap-1 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="text-2xl animate-in zoom-in duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              ⭐
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="mt-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all border-b-4 border-emerald-700 text-sm"
        >
          {t.celebration.button}
        </button>
      </div>
    </div>
  );
}
