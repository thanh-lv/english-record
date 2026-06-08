import { AlertCircle, Heart, MessageSquare, Star } from "lucide-react";
import React, { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";

export function TeacherFeedback({ recording }: { recording: any }) {
  const { t } = useLanguage();
  const [reacting, setReacting] = useState(false);
  const [reacted, setReacted] = useState(!!recording?.student_reaction);
  const [showEffect, setShowEffect] = useState(false);
  const [reactionError, setReactionError] = useState("");

  if (!recording) return null;
  const hasRating = recording.teacher_rating > 0;
  const hasText =
    recording.teacher_feedback && recording.teacher_feedback.trim().length > 0;

  if (!hasRating && !hasText) return null;

  const handleReact = async () => {
    if (reacted) return;
    setReacting(true);
    setReactionError("");
    try {
      const { error } = await supabase
        .from("recordings")
        .update({ student_reaction: "heart" })
        .eq("id", recording.id);
      if (error) throw error;
      setReacted(true);
      setShowEffect(true);
      setTimeout(() => setShowEffect(false), 2000);
    } catch (err) {
      console.error("Error reacting to feedback", err);
      setReactionError(t.feedback.reactionError);
    } finally {
      setReacting(false);
    }
  };

  return (
    <div className="w-full mt-3 bg-gradient-to-br from-[#FFF8E1] to-[#FFF9C4] border-2 border-[#FFD54F] rounded-2xl p-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 rounded-bl-full -mr-2 -mt-2 blur-md"></div>

      <h4 className="text-sm font-black text-amber-800 flex items-center gap-2 mb-3 relative z-10">
        <MessageSquare size={16} className="text-amber-600" />{" "}
        {t.feedback.title}
      </h4>

      <div className="space-y-3 relative z-10">
        {hasRating && (
          <div className="flex items-center gap-1.5 bg-white/50 w-fit px-3 py-1.5 rounded-xl border border-amber-200">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={20}
                className={
                  star <= recording.teacher_rating
                    ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                    : "text-amber-100 fill-amber-100"
                }
              />
            ))}
          </div>
        )}

        {hasText && (
          <p className="text-slate-700 font-bold bg-white p-3 rounded-xl border border-amber-200 text-sm italic">
            "{recording.teacher_feedback}"
          </p>
        )}

        {reactionError && (
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            <AlertCircle size={14} className="shrink-0" /> {reactionError}
          </div>
        )}
        <div className="pt-2 flex justify-end relative">
          {showEffect && (
            <div className="absolute bottom-full right-10 pointer-events-none z-50 flex items-center justify-center">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-rose-500 text-3xl opacity-0"
                  style={
                    {
                      animation: `floatUpHeart 1.5s ease-out forwards`,
                      animationDelay: `${i * 150}ms`,
                      "--tx": `${(Math.random() - 0.5) * 120}px`,
                      "--ty": `-${Math.random() * 50 + 80}px`,
                      "--rot": `${(Math.random() - 0.5) * 60}deg`,
                    } as React.CSSProperties
                  }
                >
                  ❤️
                </div>
              ))}
              <style>{`
                @keyframes floatUpHeart {
                  0% { opacity: 1; transform: translate(0, 0) scale(0.5) rotate(0deg); }
                  50% { opacity: 1; }
                  100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(1.5) rotate(var(--rot)); }
                }
              `}</style>
            </div>
          )}
          <button
            type="button"
            disabled={reacted || reacting}
            onClick={handleReact}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all ${
              reacted
                ? "bg-rose-100 text-rose-600 border border-rose-200 shadow-sm"
                : "bg-white text-slate-500 border border-slate-200 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50"
            }`}
          >
            <Heart
              size={14}
              className={reacted ? "fill-rose-500 text-rose-500" : ""}
            />
            {reacting
              ? t.feedback.hearting
              : reacted
                ? t.feedback.hearted
                : t.feedback.heart}
          </button>
        </div>
      </div>
    </div>
  );
}
