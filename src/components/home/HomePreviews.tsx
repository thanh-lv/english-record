import { Check, Flame, Heart, MessageSquare, Play, Square, Star, Volume2 } from 'lucide-react';
import { useLanguage, interpolate } from '../../i18n/LanguageContext';
import { PRIZES } from '../../utils/prizes';

// Các khung minh hoạ giao diện cho trang chủ: chỉ để nhìn, nên ẩn khỏi trình đọc màn hình.
// Màu sắc và nhãn lấy theo màn hình thật để phần giới thiệu khớp với sản phẩm.

const WAVEFORM = [
  30, 55, 80, 45, 95, 65, 35, 75, 100, 50, 70, 40, 85, 60, 30, 55, 90, 45, 70, 35, 60, 95, 50, 80,
  40, 65, 30, 75, 55, 35,
];

export function SpeakingPreview() {
  const { t } = useLanguage();
  const tHome = t.home.previews;

  return (
    <div aria-hidden="true" className="relative">
      <div className="bg-white rounded-3xl border-4 border-[#FFFDE7] shadow-lg shadow-blue-100/70 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200/90 text-blue-700 text-xs font-black">
            Family
          </span>
          <span className="text-xs font-bold text-slate-500">
            {interpolate(t.exercises.questionIndex, { idx: 3 })}
          </span>
        </div>

        <p className="mt-4 text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
          Do you have any siblings?
        </p>
        <p className="mt-1.5 text-sm font-medium text-slate-500">
          {tHome.sampleAnswerLabel}{' '}
          <span className="text-slate-700">Yes, I have one sister who is very funny.</span>
        </p>

        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-rose-50/70 border border-rose-100 p-3 sm:p-4">
          <div className="relative shrink-0 flex items-center justify-center">
            <span className="absolute w-14 h-14 bg-rose-500/25 rounded-2xl animate-ping motion-reduce:hidden" />
            <span className="relative w-14 h-14 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/30">
              <Square size={18} className="fill-white" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-end justify-between gap-[2px] h-9">
              {WAVEFORM.map((height, i) => (
                <span
                  key={i}
                  className="flex-1 max-w-[5px] rounded-full bg-rose-400"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-mono font-black text-rose-600">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              00:12
            </p>
          </div>
        </div>
      </div>

      <div className="relative -mt-5 ml-5 sm:ml-16 bg-gradient-to-br from-[#FFFDE7] via-[#FFF9C4] to-[#FFF8E1] border-2 border-amber-300/80 rounded-2xl p-4 shadow-lg shadow-amber-200/40">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-black text-amber-900 flex items-center gap-1.5">
            <MessageSquare size={15} className="text-amber-600 shrink-0" />
            {t.feedback.title}
          </p>
          <div className="flex items-center gap-0.5 bg-white/90 px-2 py-1 rounded-xl border border-amber-200">
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} size={13} className="text-amber-400 fill-amber-400" />
            ))}
            <span className="text-[11px] font-black text-amber-800 ml-1">5/5</span>
          </div>
        </div>
        <p className="mt-2.5 bg-white/95 px-3 py-2.5 rounded-xl border border-amber-200 text-slate-800 font-bold text-sm italic">
          "{tHome.feedbackSample}"
        </p>
        <div className="mt-2.5 flex justify-end">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-600 border border-rose-200">
            <Heart size={13} className="fill-rose-500 text-rose-500" />
            {t.feedback.hearted}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TopicsPreview() {
  const { t } = useLanguage();

  return (
    <div aria-hidden="true" className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4">
      <div className="flex items-center justify-between text-xs font-black text-blue-800">
        <span>{t.exercises.completionProgress}</span>
        <span>3/8</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white overflow-hidden">
        <div className="h-full rounded-full bg-[#1E88E5]" style={{ width: '37.5%' }} />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
          const done = num <= 3;
          return (
            <span
              key={num}
              className={`aspect-square rounded-xl flex items-center justify-center font-black border-2 ${
                done
                  ? 'bg-white border-amber-200 text-xl'
                  : 'bg-white/70 border-slate-200/80 text-sm text-slate-500'
              }`}
            >
              {done ? PRIZES[num - 1] : num}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function ShadowingPreview() {
  const { t } = useLanguage();
  const steps = [t.shadowing.step1Title, t.shadowing.step2Title, t.shadowing.step3Title];

  return (
    <div aria-hidden="true">
      <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-indigo-700 to-indigo-950 flex items-center justify-center overflow-hidden">
        <span className="w-11 h-11 rounded-full bg-white/90 text-indigo-700 flex items-center justify-center shadow-md">
          <Play size={18} className="fill-indigo-700 ml-0.5" />
        </span>
        <span className="absolute bottom-2 inset-x-2 text-center text-[11px] font-bold text-white bg-black/50 rounded-lg px-2 py-1">
          How are you today?
        </span>
      </div>
      <ol className="mt-3 flex items-center gap-1.5 text-[11px] font-black text-indigo-700">
        {steps.map((step, i) => (
          <li
            key={step}
            className={`flex-1 min-w-0 text-center truncate px-1.5 py-1 rounded-lg ${
              i === 0 ? 'bg-indigo-600 text-white' : 'bg-indigo-50 border border-indigo-200/90'
            }`}
          >
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FlashcardPreview() {
  return (
    <div aria-hidden="true" className="relative pt-2 pb-1 px-2">
      <div className="absolute inset-x-6 top-0 bottom-3 rounded-2xl bg-rose-100 border-2 border-rose-200 rotate-3" />
      <div className="relative rounded-2xl bg-white border-2 border-rose-200 shadow-md p-4 text-center -rotate-1">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100/50 border-2 border-dashed border-blue-200 flex items-center justify-center text-3xl">
          🦋
        </div>
        <p className="mt-2 text-2xl font-black text-blue-700 tracking-tight">butterfly</p>
        <p className="mt-0.5 flex items-center justify-center gap-1.5 text-xs font-mono text-slate-500">
          <Volume2 size={13} className="text-blue-500" />
          /ˈbʌtəflaɪ/
        </p>
      </div>
    </div>
  );
}

export function StoryPreview() {
  const { t } = useLanguage();

  return (
    <div aria-hidden="true" className="rounded-2xl bg-purple-50/70 border border-purple-200/70 p-4">
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center text-2xl">
          🦊
        </span>
        <p className="text-sm font-black text-purple-900 leading-snug">
          The Little Fox and the Kite
        </p>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700 leading-relaxed">
        One windy morning, a little fox found a red kite in the tall grass.
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-black">
        <Volume2 size={13} />
        {t.stories.listen}
      </span>
    </div>
  );
}

export function GamesPreview() {
  const { t } = useLanguage();
  const games = [
    {
      emoji: '🃏',
      name: t.games.matchingName,
      color: 'from-violet-100 to-purple-100 border-violet-200',
    },
    { emoji: '⚡', name: t.games.quizName, color: 'from-amber-100 to-orange-100 border-amber-200' },
    {
      emoji: '🔤',
      name: t.games.scrambleName,
      color: 'from-emerald-100 to-teal-100 border-emerald-200',
    },
  ];

  return (
    <ul aria-hidden="true" className="space-y-2">
      {games.map(game => (
        <li
          key={game.name}
          className={`flex items-center gap-3 rounded-2xl border bg-gradient-to-r px-3 py-2.5 ${game.color}`}
        >
          <span className="text-xl shrink-0">{game.emoji}</span>
          <span className="text-sm font-black text-slate-800 truncate">{game.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function AchievementsPreview() {
  const { t } = useLanguage();

  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-2.5">
      <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-50 border border-orange-200/80 rounded-xl text-orange-700 text-sm font-black">
        <Flame size={16} className="fill-orange-500 text-orange-600" />7 {t.sidebar.days}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {PRIZES.slice(0, 10).map((prize, i) => (
          <span
            key={prize}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg ${
              i < 6
                ? 'bg-amber-50 border-amber-200'
                : 'bg-slate-50 border-slate-200 grayscale opacity-40'
            }`}
          >
            {prize}
          </span>
        ))}
      </div>
    </div>
  );
}

const ATTENDANCE_ROWS = [
  { avatar: '👦', name: 'An', days: [1, 1, 0.5, 1, 1, 1], sessions: 5.5 },
  { avatar: '👧', name: 'Linh', days: [1, 1, 1, 1, 0, 1], sessions: 5 },
  { avatar: '🧒', name: 'Minh', days: [1, 0, 1, 1, 1, 0.5], sessions: 4.5 },
];

export function AttendancePreview() {
  const tHome = useLanguage().t.home.previews;

  return (
    <div aria-hidden="true" className="bg-white rounded-2xl shadow-xl shadow-blue-950/25 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black text-slate-800">{tHome.attendanceTitle}</p>
        <span className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200/90 text-purple-700 text-[11px] font-black">
          {tHome.className}
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {ATTENDANCE_ROWS.map(row => (
          <li key={row.name} className="flex items-center gap-2.5">
            <span className="text-lg shrink-0">{row.avatar}</span>
            <span className="w-10 shrink-0 text-xs font-extrabold text-slate-700">{row.name}</span>
            <span className="flex gap-1 flex-1 min-w-0">
              {row.days.map((value, i) => (
                <span
                  key={i}
                  className={`flex-1 min-w-0 max-w-6 aspect-square rounded-md flex items-center justify-center text-[11px] font-black ${
                    value === 1
                      ? 'bg-emerald-500 text-white'
                      : value === 0.5
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100'
                  }`}
                >
                  {value === 1 ? <Check size={13} strokeWidth={3} /> : value === 0.5 ? '½' : null}
                </span>
              ))}
            </span>
            <span className="shrink-0 text-xs font-black text-slate-500">{row.sessions}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TuitionPreview() {
  const { t } = useLanguage();
  const tHome = t.home.previews;

  return (
    <div
      aria-hidden="true"
      className="bg-white rounded-2xl shadow-xl shadow-blue-950/25 overflow-hidden"
    >
      <div className="bg-gradient-to-br from-[#4fb8af] to-[#2f8f86] px-4 py-3 text-center text-white">
        <p className="text-sm font-black tracking-widest">{t.attendance.tuitionSlipTitle}</p>
      </div>
      <dl className="p-4 space-y-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="font-bold text-slate-500">{tHome.studentLabel}</dt>
          <dd className="font-black text-slate-800">An</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-bold text-slate-500">{tHome.sessionsLabel}</dt>
          <dd className="font-black text-slate-800">{tHome.sessionsSample}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-dashed border-slate-200 pt-2 mt-2">
          <dt className="font-black text-slate-700">{tHome.totalLabel}</dt>
          <dd className="font-black text-[#2f8f86] text-sm">{tHome.totalSample}</dd>
        </div>
      </dl>
    </div>
  );
}
