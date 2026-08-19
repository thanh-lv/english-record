import { AlertCircle, Heart, MessageSquare, Star } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { supabase } from '../../lib/supabase';

export function TeacherFeedback({
  recording,
  showAlways = true,
}: {
  recording: any;
  showAlways?: boolean;
}) {
  const { t } = useLanguage();
  const [reacting, setReacting] = useState(false);
  const [reacted, setReacted] = useState(!!recording?.student_reaction);
  const [showEffect, setShowEffect] = useState(false);
  const [reactionError, setReactionError] = useState('');

  useEffect(() => {
    setReacted(!!recording?.student_reaction);
  }, [recording?.student_reaction, recording?.id]);

  if (!recording) return null;
  const rating = Number(recording.teacher_rating || 0);
  const hasRating = rating > 0;
  const hasText = recording.teacher_feedback && recording.teacher_feedback.trim().length > 0;

  if (!hasRating && !hasText && !showAlways) return null;

  const handleReact = async () => {
    if (reacted || reacting) return;
    setReacting(true);
    setReactionError('');
    try {
      const { error } = await supabase
        .from('recordings')
        .update({ student_reaction: 'heart' })
        .eq('id', recording.id);
      if (error) throw error;
      setReacted(true);
      setShowEffect(true);
      setTimeout(() => setShowEffect(false), 2000);
    } catch (err) {
      console.error('Error reacting to feedback', err);
      setReactionError(t.feedback.reactionError);
    } finally {
      setReacting(false);
    }
  };

  return (
    <div className="w-full mt-3 bg-gradient-to-br from-[#FFFDE7] via-[#FFF9C4]/70 to-[#FFF8E1] border-2 border-amber-300/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-300/20 rounded-full -mr-6 -mt-6 blur-xl pointer-events-none" />

      {/* Top Header: Title & Stars */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3 relative z-10">
        <h4 className="text-xs sm:text-sm font-black text-amber-900 flex items-center gap-1.5">
          <MessageSquare size={16} className="text-amber-600 shrink-0" />
          <span>{t.feedback.title}</span>
        </h4>

        {/* 5-Star Rating Badge */}
        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-amber-200 shadow-2xs">
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              size={16}
              className={
                star <= rating
                  ? 'text-amber-400 fill-amber-400 drop-shadow-xs scale-105'
                  : 'text-slate-200 fill-slate-100'
              }
            />
          ))}
          <span className="text-[11px] font-black text-amber-800 ml-1">
            {hasRating ? `${rating}/5` : t.feedback.waitingRating || 'Chờ chấm điểm'}
          </span>
        </div>
      </div>

      {/* Teacher Comment Text */}
      <div className="space-y-3 relative z-10">
        {hasText ? (
          <div className="bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-amber-200 shadow-2xs">
            <p className="text-slate-800 font-bold text-xs sm:text-sm italic leading-relaxed">
              "{recording.teacher_feedback}"
            </p>
          </div>
        ) : (
          <div className="bg-white/70 p-3 rounded-xl border border-amber-200/60">
            <p className="text-slate-500 font-semibold text-xs italic">
              {t.feedback.waitingFeedback ||
                'Cô giáo đang xem bài và sẽ sớm nhận xét cho con nhé! 🌟'}
            </p>
          </div>
        )}

        {reactionError && (
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            <AlertCircle size={14} className="shrink-0" /> {reactionError}
          </div>
        )}

        {/* Heart Reaction Row */}
        <div className="pt-1 flex justify-end items-center relative">
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
                      '--tx': `${(Math.random() - 0.5) * 120}px`,
                      '--ty': `-${Math.random() * 50 + 80}px`,
                      '--rot': `${(Math.random() - 0.5) * 60}deg`,
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs active:scale-95 ${
              reacted
                ? 'bg-rose-100 text-rose-600 border border-rose-200 shadow-rose-500/10 cursor-default'
                : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-amber-200 hover:border-rose-200 cursor-pointer'
            }`}
          >
            <Heart
              size={14}
              className={reacted ? 'fill-rose-500 text-rose-500 animate-pulse' : ''}
            />
            <span>
              {reacting ? t.feedback.hearting : reacted ? t.feedback.hearted : t.feedback.heart}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
