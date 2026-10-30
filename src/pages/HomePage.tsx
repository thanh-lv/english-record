import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  Award,
  BookMarked,
  BookOpen,
  Calendar,
  Check,
  Gamepad2,
  Library,
  LogIn,
  Send,
  Sparkles,
  Video,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  AchievementsPreview,
  AttendancePreview,
  FlashcardPreview,
  GamesPreview,
  ShadowingPreview,
  SpeakingPreview,
  StoryPreview,
  TopicsPreview,
  TuitionPreview,
} from '../components/home/HomePreviews';

const PRIMARY_CTA =
  'inline-flex items-center justify-center gap-2 h-14 px-8 text-white text-lg font-black rounded-2xl border-b-4 border-blue-900 bg-gradient-to-r from-[#1565C0] to-[#1E88E5] hover:from-[#0D47A1] hover:to-[#1565C0] shadow-md shadow-blue-200 active:scale-95 transition-all';

function FeatureCard({
  icon,
  iconClass,
  title,
  desc,
  wide = false,
  className = '',
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  desc: string;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`bg-white/90 rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 ${
        wide ? 'sm:grid sm:grid-cols-2 sm:gap-6 sm:items-center' : ''
      } ${className}`}
    >
      <div>
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
        >
          {icon}
        </span>
        <h3 className="mt-3 text-lg font-black text-slate-800 tracking-tight">{title}</h3>
        <p className="mt-1 text-sm font-medium text-slate-600 leading-relaxed">{desc}</p>
      </div>
      <div className={wide ? 'mt-4 sm:mt-0' : 'mt-4'}>{children}</div>
    </article>
  );
}

export default function HomePage() {
  const { t } = useLanguage();
  const tHome = t.home;
  const { speaking, shadowing, flashcards, stories, games, achievements } = tHome.features;

  const steps = [tHome.steps.one, tHome.steps.two, tHome.steps.three];
  const teacherPoints = [
    { ...tHome.teachers.attendance, icon: <Calendar size={18} /> },
    { ...tHome.teachers.tuition, icon: <Wallet size={18} /> },
    { ...tHome.teachers.zalo, icon: <Send size={18} /> },
    { ...tHome.teachers.ai, icon: <Sparkles size={18} /> },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto pt-4 lg:pt-10 pb-8 space-y-20 lg:space-y-28">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
        <div>
          <p className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-amber-200 rounded-full text-xs sm:text-sm font-black text-amber-800 shadow-xs">
            {tHome.hero.badge}
          </p>
          <h1 className="mt-5 text-[2rem] sm:text-5xl font-black text-slate-800 tracking-tight leading-[1.15] text-balance">
            {tHome.hero.titleStart}{' '}
            <span className="block w-fit bg-gradient-to-r from-[#1565C0] to-[#D81B60] bg-clip-text text-transparent">
              {tHome.hero.titleAccent}
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base sm:text-lg font-medium text-slate-600 leading-relaxed">
            {tHome.hero.subtitle}
          </p>

          <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
            <Link to="/login" className={PRIMARY_CTA}>
              <LogIn size={20} />
              {tHome.login}
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 h-14 px-6 text-base font-black text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl shadow-xs transition-colors"
            >
              {tHome.hero.secondaryCta}
              <ArrowDown size={18} />
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-slate-600">
            {[tHome.hero.factNoInstall, tHome.hero.factDevices, tHome.hero.factLanguages].map(
              fact => (
                <li key={fact} className="flex items-center gap-1.5">
                  <Check size={16} className="text-emerald-600 shrink-0" strokeWidth={3} />
                  {fact}
                </li>
              )
            )}
          </ul>
        </div>

        <SpeakingPreview />
      </section>

      {/* Góc học của học sinh */}
      <section id="features" aria-labelledby="home-features-title" className="scroll-mt-20">
        <div className="max-w-2xl">
          <h2
            id="home-features-title"
            className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight text-balance"
          >
            {tHome.features.title}
          </h2>
          <p className="mt-3 text-base sm:text-lg font-medium text-slate-600">
            {tHome.features.subtitle}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          <FeatureCard
            icon={<BookOpen size={20} />}
            iconClass="bg-blue-100/80 text-blue-600"
            title={speaking.title}
            desc={speaking.desc}
            wide
            className="md:col-span-2"
          >
            <TopicsPreview />
          </FeatureCard>
          <FeatureCard
            icon={<BookMarked size={20} />}
            iconClass="bg-rose-100/80 text-rose-600"
            title={flashcards.title}
            desc={flashcards.desc}
          >
            <FlashcardPreview />
          </FeatureCard>
          <FeatureCard
            icon={<Video size={20} />}
            iconClass="bg-indigo-100/80 text-indigo-600"
            title={shadowing.title}
            desc={shadowing.desc}
          >
            <ShadowingPreview />
          </FeatureCard>
          <FeatureCard
            icon={<Library size={20} />}
            iconClass="bg-purple-100/80 text-purple-600"
            title={stories.title}
            desc={stories.desc}
          >
            <StoryPreview />
          </FeatureCard>
          <FeatureCard
            icon={<Gamepad2 size={20} />}
            iconClass="bg-emerald-100/80 text-emerald-600"
            title={games.title}
            desc={games.desc}
            className="md:col-span-2 lg:col-span-1"
          >
            <GamesPreview />
          </FeatureCard>
          <FeatureCard
            icon={<Award size={20} />}
            iconClass="bg-amber-100/80 text-amber-600"
            title={achievements.title}
            desc={achievements.desc}
            wide
            className="md:col-span-2 lg:col-span-3"
          >
            <AchievementsPreview />
          </FeatureCard>
        </div>
      </section>

      {/* Cách hoạt động */}
      <section aria-labelledby="home-steps-title">
        <h2
          id="home-steps-title"
          className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight text-balance"
        >
          {tHome.steps.title}
        </h2>
        <ol className="mt-8 grid md:grid-cols-3 gap-8 md:gap-6">
          {steps.map((step, i) => (
            <li key={step.title} className="relative">
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden md:block absolute top-6 left-16 -right-3 border-t-2 border-dashed border-slate-300"
                />
              )}
              <span className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1565C0] to-[#D81B60] text-white text-xl font-black flex items-center justify-center shadow-md">
                {i + 1}
              </span>
              <h3 className="mt-4 text-xl font-black text-slate-800 tracking-tight">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm sm:text-base font-medium text-slate-600 leading-relaxed">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Dành cho thầy cô */}
      <section
        aria-labelledby="home-teachers-title"
        className="rounded-[2rem] bg-gradient-to-br from-[#0D47A1] to-[#1565C0] text-white p-5 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-12 items-center"
      >
        <div>
          <p className="text-sm font-black text-blue-100 tracking-wide">{tHome.teachers.eyebrow}</p>
          <h2
            id="home-teachers-title"
            className="mt-2 text-3xl sm:text-4xl font-black tracking-tight leading-tight text-balance"
          >
            {tHome.teachers.title}
          </h2>
          <ul className="mt-7 grid sm:grid-cols-2 gap-x-6 gap-y-5">
            {teacherPoints.map(point => (
              <li key={point.title}>
                <p className="flex items-center gap-2 font-black">
                  <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    {point.icon}
                  </span>
                  {point.title}
                </p>
                <p className="mt-1.5 text-sm font-medium text-blue-50 leading-relaxed">
                  {point.desc}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 max-w-md w-full mx-auto lg:mx-0 lg:ml-auto">
          <AttendancePreview />
          <div className="sm:ml-12">
            <TuitionPreview />
          </div>
        </div>
      </section>

      {/* Kêu gọi đăng nhập */}
      <section aria-labelledby="home-cta-title" className="text-center">
        <div className="relative inline-block">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-pink-100 rounded-2xl flex items-center justify-center text-4xl shadow-md border-4 border-white">
            🎤
          </div>
          <span className="absolute -top-1 -right-1 text-lg animate-bounce motion-reduce:animate-none">
            ✨
          </span>
        </div>
        <h2
          id="home-cta-title"
          className="mt-5 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight text-balance"
        >
          {tHome.cta.title}
        </h2>
        <p className="mt-3 text-base font-medium text-slate-600">{t.login.hint}</p>
        <Link to="/login" className={`${PRIMARY_CTA} mt-6`}>
          <LogIn size={20} />
          {tHome.login}
        </Link>
        <p className="mt-8 text-xs font-medium text-slate-500">{tHome.cta.previewNote}</p>
      </section>
    </div>
  );
}
