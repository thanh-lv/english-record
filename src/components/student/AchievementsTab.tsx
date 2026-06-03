import { Award } from "lucide-react";
import { getPrizeForTopic } from "./ExercisesTab";

interface AchievementsTabProps {
  totalNumbers: number[];
  completedNumbers: number[];
}

export function AchievementsTab({
  totalNumbers,
  completedNumbers,
}: AchievementsTabProps) {
  return (
    <div className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] border-3 border-white shadow-md">
      <div className="mb-8 space-y-2 text-center">
        <h3 className="text-3xl font-black text-amber-500 flex items-center justify-center gap-3">
          <Award size={32} /> Tủ đồ Thành tích <Award size={32} />
        </h3>
        <p className="text-slate-500 font-bold text-sm">
          Mỗi bài học hoàn thành con sẽ nhận được một món quà. Hãy sưu tập thật
          nhiều nhé!
        </p>
      </div>

      {completedNumbers.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-4 opacity-50">🏆</div>
          <p className="text-slate-400 font-bold">
            Con chưa nhận được món quà nào.
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Hãy bắt đầu làm bài tập ngay thôi!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
          {totalNumbers.map((num) => {
            const isCompleted = completedNumbers.includes(num);
            const prize = getPrizeForTopic(num);
            return (
              <div
                key={num}
                className={`aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 border-4 transition-all duration-500 ${
                  isCompleted
                    ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg hover:scale-105 hover:shadow-xl"
                    : "bg-slate-50 border-slate-100 opacity-50 grayscale"
                }`}
              >
                <span className="text-4xl drop-shadow-md">
                  {isCompleted ? prize : "🔒"}
                </span>
                <span
                  className={`text-xs font-black uppercase tracking-wider ${isCompleted ? "text-amber-700" : "text-slate-400"}`}
                >
                  Topic {num}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
