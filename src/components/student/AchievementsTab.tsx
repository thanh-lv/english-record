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
  const pct =
    totalNumbers.length > 0
      ? Math.round((completedNumbers.length / totalNumbers.length) * 100)
      : 0;

  return (
    <div className="bg-white/70 backdrop-blur-sm p-5 sm:p-8 rounded-[2rem] border-3 border-white shadow-md space-y-5">
      <div className="text-center space-y-1">
        <h3 className="text-2xl font-black text-amber-500 flex items-center justify-center gap-2">
          <Award size={26} /> Tủ đồ Thành tích
        </h3>
        <p className="text-slate-500 font-bold text-sm">
          Mỗi bài học hoàn thành con sẽ nhận được một món quà!
        </p>
      </div>

      {/* Progress summary */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-4">
        <div className="text-4xl">🏆</div>
        <div className="flex-1">
          <p className="font-black text-amber-800 text-sm">
            {completedNumbers.length}/{totalNumbers.length} bài hoàn thành
          </p>
          <div className="w-full h-2.5 bg-amber-100 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="font-black text-amber-600 text-lg">{pct}%</span>
      </div>

      {completedNumbers.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3 opacity-40">🔒</div>
          <p className="text-slate-400 font-bold text-sm">
            Con chưa nhận được món quà nào.
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Hãy bắt đầu làm bài tập ngay thôi!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
          {completedNumbers
            .slice()
            .sort((a, b) => a - b)
            .map((num) => (
              <div
                key={num}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 border-3 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-md hover:scale-105 hover:shadow-xl transition-all duration-300"
              >
                <span className="text-3xl drop-shadow-md">
                  {getPrizeForTopic(num)}
                </span>
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wide">
                  #{num}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
