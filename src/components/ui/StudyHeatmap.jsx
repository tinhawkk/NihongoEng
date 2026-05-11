import React, { useMemo } from "react";
import { Calendar } from "lucide-react";

/**
 * StudyHeatmap
 * A component that displays a grid of activity for the last 35 days.
 * @param {Object} props
 * @param {string[]} props.streak - Array of dates in 'en-CA' format (YYYY-MM-DD)
 * @param {boolean} props.dark - Whether to use dark mode styling
 */
export const StudyHeatmap = ({ streak = [], dark = false }) => {
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    // 35 days (5 full weeks)
    for (let i = 34; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const ds = d.toLocaleDateString("en-CA");
      result.push({ 
        date: ds, 
        active: streak.includes(ds),
        label: d.toLocaleDateString("vi-VN", { day: 'numeric', month: 'numeric' })
      });
    }
    return result;
  }, [streak]);

  const currentMonth = new Date().toLocaleString("vi-VN", { month: "long" });

  const containerClass = dark 
    ? "bg-white/5 border-white/10" 
    : "bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800";
  
  const textClass = dark ? "text-slate-400" : "text-slate-500";
  const emptyBoxClass = dark ? "bg-white/5 border-white/5" : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800";

  return (
    <div className={`flex flex-col items-start p-4 rounded-2xl border ${containerClass}`}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={12} className="text-emerald-500" />
        <p className={`text-[10px] font-black uppercase tracking-widest ${textClass}`}>
          Lịch học {currentMonth}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div
            key={i}
            title={`${d.label}: ${d.active ? "Đã học" : "Chưa học"}`}
            className={`w-4 h-4 rounded-[3px] transition-all relative group ${
              d.active 
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                : emptyBoxClass + " border"
            }`}
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[8px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
              {d.label}: {d.active ? "✅ Đã học" : "❌ Chưa học"}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[8px] font-bold text-slate-400 uppercase">Ít</span>
        <div className="flex gap-1">
          <div className={`w-2 h-2 rounded-[1px] ${emptyBoxClass} border`} />
          <div className="w-2 h-2 rounded-[1px] bg-emerald-500/30" />
          <div className="w-2 h-2 rounded-[1px] bg-emerald-500/60" />
          <div className="w-2 h-2 rounded-[1px] bg-emerald-500" />
        </div>
        <span className="text-[8px] font-bold text-slate-400 uppercase">Nhiều</span>
      </div>
    </div>
  );
};
