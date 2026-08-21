import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Star,
  BookOpen,
  Sparkles,
  Search,
  X,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { getPrizeForTopic } from '../../../utils/prizes';

interface ExercisesTabProps {
  activeTopics: any[];
  isBongBe: boolean;
  completedNumbers: number[];
  myRecordings: any[];
  onTopicClick: (num: number, e: React.MouseEvent) => void;
  studentGrade?: number | string | null;
}

export function ExercisesTab({
  activeTopics,
  isBongBe,
  completedNumbers,
  myRecordings,
  onTopicClick,
  studentGrade,
}: ExercisesTabProps) {
  const { t } = useLanguage();
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'todo'>('all');

  const totalNumbers = useMemo(
    () => Array.from({ length: activeTopics.length }, (_, i) => i + 1),
    [activeTopics.length]
  );

  // Compute status for all topics
  const topicsData = useMemo(() => {
    return totalNumbers.map(num => {
      const topic = activeTopics[num - 1];
      const isTopicMatch = (r: any) =>
        (r.topic_id && topic?.id && r.topic_id === topic.id) ||
        (r.topic &&
          topic?.title &&
          r.topic.trim().toLowerCase() === topic.title.trim().toLowerCase()) ||
        Number(r.topic_number) === num ||
        (topic?.order_index != null && Number(r.topic_number) === Number(topic.order_index));

      let isCompleted = completedNumbers.includes(num);
      let isPartiallyCompleted = false;
      let progressText = t.exercises.done;

      const hasGlobalRecording = myRecordings.some(
        (r: any) => isTopicMatch(r) && !r.question_id && !r.question_text
      );

      let totalQs = 1;
      let answeredQs = 0;

      if (hasGlobalRecording) {
        isCompleted = true;
        isPartiallyCompleted = false;
        totalQs = 1;
        answeredQs = 1;
        progressText = t.exercises.done;
      } else if (topic && topic.questions && topic.questions.length > 0) {
        totalQs = topic.questions.length;
        answeredQs = topic.questions.filter((q: any) =>
          myRecordings.some(
            rec =>
              isTopicMatch(rec) &&
              ((rec.question_id && q.id && rec.question_id === q.id) ||
                (rec.question_text &&
                  q.text &&
                  rec.question_text.trim().toLowerCase() === q.text.trim().toLowerCase()) ||
                (!rec.question_id && !rec.question_text))
          )
        ).length;

        isCompleted = completedNumbers.includes(num) || answeredQs === totalQs;
        isPartiallyCompleted = answeredQs > 0 && answeredQs < totalQs;

        if (isCompleted) {
          progressText = t.exercises.done;
        } else if (answeredQs > 0) {
          progressText = `${answeredQs}/${totalQs}`;
        }
      } else {
        isCompleted =
          completedNumbers.includes(num) || myRecordings.some((r: any) => isTopicMatch(r));
        answeredQs = isCompleted ? 1 : 0;
      }

      const progressPct = totalQs > 0 ? Math.round((answeredQs / totalQs) * 100) : 0;

      const topicRating = !isBongBe
        ? (myRecordings.find(rec => isTopicMatch(rec) && rec.teacher_rating != null)
            ?.teacher_rating ?? 0)
        : 0;
      const needsRetry = isCompleted && topicRating > 0 && topicRating <= 3;

      return {
        num,
        topic,
        isCompleted,
        isPartiallyCompleted,
        progressText,
        totalQs,
        answeredQs,
        progressPct,
        topicRating,
        needsRetry,
      };
    });
  }, [activeTopics, totalNumbers, completedNumbers, myRecordings, isBongBe, t.exercises.done]);

  // Overall Statistics
  const completedCount = useMemo(
    () => topicsData.filter(item => item.isCompleted).length,
    [topicsData]
  );
  const totalTopics = topicsData.length;
  const overallProgressPct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

  // Filtered topics
  const filteredTopics = useMemo(() => {
    return topicsData.filter(item => {
      // Status filter
      if (statusFilter === 'completed' && !item.isCompleted) return false;
      if (statusFilter === 'todo' && item.isCompleted) return false;

      // Text search
      if (!filterText.trim()) return true;
      const q = filterText.toLowerCase().trim();
      const numMatch = String(item.num).includes(q) || (isBongBe && `test ${item.num}`.includes(q));
      const titleMatch = item.topic?.title?.toLowerCase().includes(q);
      return numMatch || titleMatch;
    });
  }, [topicsData, statusFilter, filterText, isBongBe]);

  return (
    <div className="space-y-5">
      {/* Hero / Progress Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/40 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-white/80 shadow-sm">
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Title Area */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                {isBongBe ? <Sparkles size={20} /> : <BookOpen size={20} />}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                {t.exercises.title}
              </h2>
              {studentGrade && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                  {interpolate(t.common?.gradeLabel || 'Lớp {grade}', {
                    grade: studentGrade,
                  })}
                </span>
              )}
            </div>
            <p className="text-slate-500 font-semibold text-xs sm:text-sm max-w-xl">
              {isBongBe ? t.exercises.subtitleBongBe : t.exercises.subtitleNormal}
            </p>
          </div>

          {/* Quick Progress Summary Card */}
          {totalTopics > 0 && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center gap-4 min-w-[260px] shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-400 flex items-center justify-center text-2xl shadow-sm shrink-0">
                🏆
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-extrabold text-slate-700 truncate">
                    {t.exercises.completionProgress}
                  </span>
                  <span className="text-xs font-black text-blue-600 shrink-0">
                    {completedCount}/{totalTopics} ({overallProgressPct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-700 ease-out"
                    style={{ width: `${overallProgressPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {interpolate(t.exercises.filterAll, { count: totalTopics })}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('todo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                statusFilter === 'todo'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {interpolate(t.exercises.filterPending, { count: totalTopics - completedCount })}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                statusFilter === 'completed'
                  ? 'bg-white text-emerald-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {interpolate(t.exercises.filterDone, { count: completedCount })}
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder={t.exercises.searchPlaceholder}
              className="w-full sm:w-56 pl-9 pr-8 py-2 bg-white rounded-xl border border-slate-200/80 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-500 transition-all shadow-2xs"
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

      {/* Topics Grid */}
      {filteredTopics.length === 0 ? (
        <div className="py-16 text-center bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200 p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <p className="font-black text-slate-700 text-base">{t.exercises.noMatchingFound}</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
            {t.exercises.noMatchingHint}
          </p>
          {(filterText || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterText('');
                setStatusFilter('all');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow-sm"
            >
              <RotateCcw size={13} /> {t.exercises.viewAllBtn}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredTopics.map(
            ({
              num,
              topic,
              isCompleted,
              isPartiallyCompleted,
              progressText,
              totalQs,
              answeredQs,
              progressPct,
              topicRating,
              needsRetry,
            }) => {
              return (
                <button
                  key={num}
                  type="button"
                  onClick={e => onTopicClick(num, e)}
                  className={`group relative text-left rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 active:scale-95 cursor-pointer overflow-hidden border ${
                    needsRetry
                      ? 'bg-gradient-to-b from-amber-50/90 via-white to-amber-50/50 border-amber-200/90 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1.5'
                      : isCompleted
                        ? 'bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/40 border-emerald-200/80 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1.5'
                        : isPartiallyCompleted
                          ? 'bg-gradient-to-b from-orange-50/90 via-white to-orange-50/40 border-orange-200/80 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1.5'
                          : 'bg-white border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/20 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1.5'
                  }`}
                >
                  {/* Top card row: Badge & Prize / Star */}
                  <div className="flex items-start justify-between gap-2 w-full mb-2.5">
                    {/* Topic Number Tag */}
                    <div
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                        needsRetry
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isPartiallyCompleted
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}
                    >
                      {isBongBe ? `Test ${num}` : `${t.exercises.lessonUnit} ${num}`}
                    </div>

                    {/* Prize / Stars / Status Indicator */}
                    {isCompleted && !needsRetry ? (
                      <span
                        className="text-2xl drop-shadow-md transform group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300"
                        title={t.exercises.giftTitle}
                      >
                        {getPrizeForTopic(num)}
                      </span>
                    ) : needsRetry ? (
                      <div className="flex items-center gap-0.5 bg-amber-100/80 px-1.5 py-0.5 rounded-lg border border-amber-200">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            className={
                              i < topicRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-amber-200 fill-amber-200'
                            }
                          />
                        ))}
                      </div>
                    ) : totalQs > 1 ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200/60">
                        {interpolate(t.exercises.questionsCount, { count: totalQs })}
                      </span>
                    ) : null}
                  </div>

                  {/* Topic Title */}
                  <div className="w-full my-1 min-h-[38px] flex items-center">
                    <h3 className="font-black text-slate-800 text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {topic?.title ||
                        (isBongBe ? `Test ${num}` : `${t.exercises.lessonUnit} ${num}`)}
                    </h3>
                  </div>

                  {/* Bottom Progress & Status Bar */}
                  <div className="w-full mt-3 pt-2.5 border-t border-slate-100/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-black">
                      {needsRetry ? (
                        <span className="text-amber-600 flex items-center gap-1">
                          <RotateCcw size={10} /> {t.exercises.needPractice}
                        </span>
                      ) : isCompleted ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-500" />{' '}
                          {t.exercises.completedStatus}
                        </span>
                      ) : isPartiallyCompleted ? (
                        <span className="text-orange-600">
                          {interpolate(t.exercises.inProgressStatus, { progress: progressText })}
                        </span>
                      ) : (
                        <span className="text-slate-400 group-hover:text-blue-600 flex items-center gap-1 transition-colors">
                          {t.exercises.startExercise}{' '}
                          <ArrowRight
                            size={10}
                            className="group-hover:translate-x-0.5 transition-transform"
                          />
                        </span>
                      )}

                      {totalQs > 1 && !isCompleted && (
                        <span className="text-slate-400 font-bold">
                          {answeredQs}/{totalQs}
                        </span>
                      )}
                    </div>

                    {/* Progress track */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          needsRetry
                            ? 'bg-amber-400'
                            : isCompleted
                              ? 'bg-emerald-500'
                              : isPartiallyCompleted
                                ? 'bg-orange-400'
                                : 'bg-transparent'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
