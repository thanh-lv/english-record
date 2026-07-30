import { forwardRef } from "react";

interface TuitionSlipProps {
  tAtt: any;
  student: any;
  records: any[];
  month: number;
  note: string;
}

export const TuitionSlipTemplate = forwardRef<HTMLDivElement, TuitionSlipProps>(
  ({ tAtt, student, records, month, note }, ref) => {
    const dates = records.map((r) => {
      const dt = new Date(r.checkin_time);
      const day = String(dt.getDate()).padStart(2, "0");
      const monthStr = String(dt.getMonth() + 1).padStart(2, "0");
      return `${day}/${monthStr}`;
    });

    return (
      <div
        ref={ref}
        className="bg-white w-[500px] flex flex-col font-sans"
        style={{
          boxSizing: "border-box",
        }}
      >
        {/* Header Block */}
        <div className="bg-[#4fb8af] pt-8 pb-6 px-4 flex flex-col items-center justify-center text-white">
          <div className="w-48 h-12 bg-white mb-3" /> {/* Decorative top bar */}
          <h1 className="text-4xl font-light tracking-wide mb-1 uppercase">
            {tAtt.tuitionSlipTitle}
          </h1>
          <p className="text-xl font-light opacity-90">
            {tAtt.monthName.replace("{m}", month.toString())}
          </p>
        </div>

        {/* Info Rows */}
        <div className="px-8 pt-8 pb-4 space-y-4 text-xl text-slate-700">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <span>{tAtt.studentNameSlip.split(" ")[0]}</span>
              <span className="font-light">
                {tAtt.studentNameSlip.substring(3)}
              </span>
            </div>
            <span className="font-medium text-2xl text-slate-800">
              {student.name}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <span>{tAtt.unitPriceSlip.split(" ")[0]}</span>
              <span className="font-light">
                {tAtt.unitPriceSlip.substring(3)}
              </span>
            </div>
            <span className="font-medium">
              {student.unit_price.toLocaleString()} đ
            </span>
          </div>

          <div className="flex justify-between items-center pb-3 relative">
            <div className="flex items-center gap-3">
              <span>{tAtt.sessionsSlip.split(" ")[0]}</span>
              <span className="font-light">
                {tAtt.sessionsSlip.substring(3)}
              </span>
            </div>
            <span className="font-medium">{student.total_sessions}</span>
          </div>
        </div>

        {/* Total Box */}
        <div className="px-8 relative z-10 mt-2">
          {/* Offset text */}
          <div className="absolute -top-4 left-0 w-full text-center z-20">
            <span className="font-serif font-bold text-2xl text-slate-900 bg-white px-2">
              Học liệu (photo bài tập)
            </span>
          </div>

          <div className="bg-[#f4faf9] border-[1.5px] border-[#9fdcd7] rounded-lg p-6 pt-8 text-center shadow-md relative">
            <p className="text-slate-600 text-sm font-semibold tracking-widest uppercase mb-1">
              {tAtt.totalTuitionSlip}
            </p>
            <p className="text-[#138e83] text-5xl font-semibold tracking-tight">
              {student.total_fee.toLocaleString()} đ
            </p>
          </div>
        </div>

        {/* Dates Block */}
        <div className="px-6 mt-6">
          <p className="text-center text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2.5">
            {tAtt.attendanceDates}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 max-w-[440px] mx-auto">
            {dates.map((date, idx) => (
              <span
                key={idx}
                className="inline-block h-6 px-2.5 border border-[#9fdcd7] rounded-lg text-[13px] font-medium text-[#138e83] leading-none text-center"
              >
                <span className="relative -top-[2px] block">{date}</span>
              </span>
            ))}
            {dates.length === 0 && (
              <span className="text-slate-400 italic">...</span>
            )}
          </div>
        </div>

        {/* Note Footer */}
        <div className="px-8 mt-8 pb-10 font-serif">
          {note ? (
            <p className="text-xl font-bold text-slate-800 mb-4 leading-tight whitespace-pre-wrap">
              {tAtt.noteLabel}
              <span className="font-medium">{note}</span>
            </p>
          ) : null}
          <p className="text-2xl font-bold text-slate-900 leading-snug">
            {tAtt.defaultNote}
          </p>
        </div>
      </div>
    );
  },
);
