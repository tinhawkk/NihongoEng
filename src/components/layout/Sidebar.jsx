import {
  Home,
  Settings,
  Book,
  Trophy,
  Search,
  Star,
  Timer,
  Flame,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Headphones,
  Brain,
} from "lucide-react";
import { clsx } from "clsx";
import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { nhostService } from "../../services/nhostService";
import { twMerge } from "tailwind-merge";
import { useUserStore } from "../../store/useUserStore";
import { getDueItems } from "../../utils/srsUtils";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: Home, label: "Trang chủ", path: "/" },
  { icon: Search, label: "Từ điển", path: "/dictionary" },
  { icon: Brain, label: "Ôn tập SRS", path: "/srs" },
  { icon: Headphones, label: "Đọc & Nghe", path: "/reading" },
  { icon: Trophy, label: "Luyện đề JLPT", path: "/jlpt-exams" },
  { icon: Star, label: "Từ đã lưu", path: "/bookmarks" },
  { icon: Timer, label: "Pomodoro", path: "/pomodoro" },
  { icon: Sparkles, label: "Xóa mù Kanji", path: "/kanji-explorer" },
  { icon: Settings, label: "Cài đặt", path: "/settings" },
];

export const Sidebar = () => {
  const { account } = useUserStore();
  const location = useLocation();
  const [grammarLevels, setGrammarLevels] = useState([]);
  const [grammarOpen, setGrammarOpen] = useState(location.pathname.startsWith("/grammar"));

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const q = `query GetLevels { grammar_levels(order_by: {title: asc}) { id title } }`;
        const { data } = await nhostService.fetchGraphQL(q, "GetLevels", {});
        if (data?.grammar_levels) {
          setGrammarLevels(
            data.grammar_levels.map(l => ({
              label: l.title,
              path: `/grammar/level/${l.id}`,
            }))
          );
        }
      } catch (err) {
        console.error("Sidebar fetch levels failed:", err);
      }
    };
    fetchLevels();
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/grammar")) {
      const t = setTimeout(() => setGrammarOpen(true), 0);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  // Optimize SRS due count calculation
  const dueCount = React.useMemo(() => {
    return getDueItems(account?.srsData).length;
  }, [account?.srsData]);

  const todayStr = new Date().toLocaleDateString("en-CA");

  const hasStudiedToday = React.useMemo(() => {
    return account?.streak?.includes(todayStr) || false;
  }, [account?.streak, todayStr]);

  const hasDoneQuizToday = React.useMemo(() => {
    if (!account?.quizHistory) return false;
    return account.quizHistory.some((q) => {
      try {
        return new Date(q.date).toLocaleDateString("en-CA") === todayStr;
      } catch (e) {
        return false;
      }
    });
  }, [account?.quizHistory, todayStr]);

  return (
    <div className="fixed left-0 top-0 h-full w-64 border-r-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-6 flex flex-col hidden lg:flex overflow-y-auto scrollbar-hide">
      <div className="mb-8 px-4 flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tighter shrink-0">
          <span className="text-[#58CC02]">NIHONGO-ENG</span>
          <span className="text-[#1CB0F6]">EDU</span>
        </h1>
      </div>

      <nav className="space-y-1 mb-8">
        {navItems.map(item => {
          const isSrs = item.path === "/srs";

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-4 py-3 rounded-2xl font-black transition-all duration-200 uppercase tracking-wider text-[11px] relative",
                  isActive
                    ? "bg-[#DDF4FF] dark:bg-sky-500/10 text-[#1CB0F6] border-b-4 border-[#84D8FF] dark:border-sky-500/30"
                    : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
              {isSrs && dueCount > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#FF4B4B] text-white text-[10px] flex items-center justify-center rounded-full shadow-sm">
                  {dueCount > 99 ? "99+" : dueCount}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Grammar nav with expandable sub-levels */}
        <div>
          <div className="flex items-center">
            <NavLink
              to="/grammar"
              end
              className={({ isActive }) =>
                cn(
                  "flex-1 flex items-center gap-4 px-4 py-3 rounded-l-2xl font-black transition-all duration-200 uppercase tracking-wider text-[11px]",
                  isActive || location.pathname.startsWith("/grammar")
                    ? "bg-[#DDF4FF] dark:bg-sky-500/10 text-[#1CB0F6] border-b-4 border-[#84D8FF] dark:border-sky-500/30"
                    : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )
              }
            >
              <Book className="w-5 h-5 shrink-0" />
              Ngữ pháp
            </NavLink>
            <button
              onClick={() => setGrammarOpen(prev => !prev)}
              className={cn(
                "px-2 py-3 rounded-r-2xl transition-all text-[11px]",
                location.pathname.startsWith("/grammar")
                  ? "bg-[#DDF4FF] dark:bg-sky-500/10 text-[#1CB0F6] border-b-4 border-[#84D8FF] dark:border-sky-500/30"
                  : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <ChevronDown
                size={14}
                className={cn("transition-transform duration-200", grammarOpen && "rotate-180")}
              />
            </button>
          </div>
          {grammarOpen && grammarLevels.length > 0 && (
            <div className="ml-9 mt-1 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
              {grammarLevels.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all",
                      isActive
                        ? "bg-[#58CC02]/10 text-[#58CC02]"
                        : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )
                  }
                >
                  <span className="truncate">{item.label}</span>
                  <ChevronRight size={12} className="shrink-0 opacity-30" />
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="mt-auto space-y-4">
        {/* Stats Card */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-4 border-2 border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-1">
              <Flame 
                className={hasStudiedToday ? "w-6 h-6 text-[#FF9600]" : "w-6 h-6 text-slate-300 dark:text-slate-600"} 
                fill={hasStudiedToday ? "#FF9600" : "currentColor"} 
              />
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                {account?.streak?.length || 0}
              </span>
              <span className="text-[8px] font-black text-slate-400 uppercase">Streak</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col items-center gap-1">
              <Trophy 
                className={hasDoneQuizToday ? "w-6 h-6 text-[#FFC800]" : "w-6 h-6 text-slate-300 dark:text-slate-600"} 
                fill={hasDoneQuizToday ? "#FFC800" : "currentColor"} 
              />
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                {account?.totalQuizzes || 0}
              </span>
              <span className="text-[8px] font-black text-slate-400 uppercase">Quiz</span>
            </div>
          </div>
        </div>

        {/* Profile/Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 p-3 rounded-2xl transition-all border-2",
              isActive
                ? "bg-white dark:bg-slate-800 border-[#1CB0F6]/30 shadow-sm"
                : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
            )
          }
        >
          <div className="w-10 h-10 rounded-xl bg-[#1CB0F6] flex items-center justify-center text-white font-black shadow-lg shadow-[#1CB0F6]/20 shrink-0">
            {account?.username?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-700 dark:text-white truncate">
              {account?.username || "Học viên"}
            </p>
            <p className="text-[9px] font-bold text-[#58CC02] flex items-center gap-1">
              <Sparkles size={10} fill="currentColor" /> Premium
            </p>
          </div>
        </NavLink>
      </div>
    </div>
  );
};
