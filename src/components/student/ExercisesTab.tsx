import { CheckCircle } from "lucide-react";

const PRIZES = [
  "🎈",
  "🎁",
  "🌟",
  "🏅",
  "👑",
  "💎",
  "🎀",
  "🎯",
  "🎨",
  "🎭",
  "🎪",
  "🎡",
  "🎢",
  "🎠",
];

export function getPrizeForTopic(topicNum: number) {
  return PRIZES[(topicNum - 1) % PRIZES.length];
}

interface ExercisesTabProps {
  activeTopics: any[];
  isBongBe: boolean;
  completedNumbers: number[];
  myRecordings: any[];
  onTopicClick: (num: number, e: React.MouseEvent) => void;
}

export function ExercisesTab({
  activeTopics,
  isBongBe,
  completedNumbers,
  myRecordings,
  onTopicClick,
}: ExercisesTabProps) {
  const totalNumbers = Array.from(
    { length: activeTopics.length },
    (_, i) => i + 1,
  );

  return (
    <div className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] border-3 border-white shadow-md">
      <div className="mb-6 space-y-1">
        <h3 className="text-2xl font-black text-slate-800">Chọn bài học 📚</h3>
        <p className="text-slate-500 font-bold text-sm">
          {isBongBe
            ? "Con hãy nhấn vào các Test ở dưới để làm bài kiểm tra đặc biệt nhé!"
            : "Con hãy nhấn vào số muốn chọn để xem chủ đề luyện nói nhé!"}
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 sm:gap-5">
        {totalNumbers.map((num) => {
          const topic = activeTopics[num - 1];
          let isCompleted = completedNumbers.includes(num);
          let isPartiallyCompleted = false;
          let progressText = "Đã làm";

          if (isBongBe && topic && topic.questions) {
            const totalQs = topic.questions.length;
            const answeredQs = topic.questions.filter((q: any) =>
              myRecordings.some(
                (rec) =>
                  rec.topicNumber === num &&
                  (rec.question_id === q.id || rec.questionText === q.text),
              ),
            ).length;

            isCompleted = answeredQs === totalQs && totalQs > 0;
            isPartiallyCompleted = answeredQs > 0 && answeredQs < totalQs;
            if (answeredQs > 0) {
              progressText = `${answeredQs}/${totalQs}`;
            }
          }

          const totalQs =
            isBongBe && topic?.questions ? topic.questions.length : 1;
          const answeredQs =
            isBongBe && topic?.questions
              ? topic.questions.filter((q: any) =>
                  myRecordings.some(
                    (rec) =>
                      rec.topicNumber === num &&
                      (rec.question_id === q.id || rec.questionText === q.text),
                  ),
                ).length
              : isCompleted
                ? 1
                : 0;
          const progressPct =
            totalQs > 0 ? Math.round((answeredQs / totalQs) * 100) : 0;

          return (
            <button
              key={num}
              type="button"
              onClick={(e) => onTopicClick(num, e)}
              className={`cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 rounded-[2rem] flex flex-col items-center justify-center gap-1.5 group border-3 relative px-2 py-3 ${
                isCompleted
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                  : isPartiallyCompleted
                    ? "bg-orange-50/80 text-orange-600 border-orange-300 hover:bg-orange-100"
                    : "bg-[#FFF0F0] hover:bg-[#FFCDD2] text-[#E53935] border-[#EF9A9A]"
              }`}
            >
              {isCompleted && (
                <span className="absolute -top-3 -right-3 text-2xl drop-shadow-md animate-in zoom-in spin-in-12 duration-500">
                  {getPrizeForTopic(num)}
                </span>
              )}
              <span className="text-3xl font-black tracking-tight group-hover:scale-125 transition-transform duration-300">
                {isBongBe ? `Test ${num}` : num}
              </span>
              {(isCompleted || isPartiallyCompleted) && (
                <span
                  className={`text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1 ${isCompleted ? "text-emerald-600" : "text-orange-600"}`}
                >
                  {isCompleted && <CheckCircle size={10} />} {progressText}
                </span>
              )}
              <div className="w-full px-1 mt-1">
                <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted
                        ? "bg-emerald-500"
                        : isPartiallyCompleted
                          ? "bg-orange-400"
                          : "bg-transparent"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
