import React from "react";
import { Link } from "react-router-dom";
import { List, Bookmark, ChevronRight, Hash, Layers } from "lucide-react";
import { motion } from "framer-motion";

export const GrammarSidebar = ({ 
  view, 
  data, 
  id, 
  selectedEntryId, 
  onEntryClick 
}) => {
  // Lesson view: show entries in this lesson
  if (view === "lesson" && data?.entries) {
    return (
      <aside className="w-72 sticky top-24 h-[calc(100vh-8rem)] hidden lg:block overflow-y-auto pr-4 custom-scrollbar">
        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
            <List size={18} className="text-[#58CC02]" />
            <h4 className="font-black text-xs uppercase tracking-widest">Nội dung bài học</h4>
          </div>

          <nav className="space-y-1">
            {data.entries.map((entry, idx) => (
              <button
                key={entry.id}
                onClick={() => onEntryClick(entry.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-2xl transition-all group relative ${
                  selectedEntryId === entry.id
                    ? "bg-[#58CC02] text-white shadow-lg shadow-[#58CC02]/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span className={`text-[10px] font-black mt-1 ${
                  selectedEntryId === entry.id ? "text-white/70" : "text-slate-300"
                }`}>
                  #{idx + 1}
                </span>
                <span className="text-sm font-bold text-left line-clamp-2 leading-snug">
                  {entry.title}
                </span>
                {selectedEntryId === entry.id && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute inset-0 border-2 border-white/20 rounded-2xl"
                  />
                )}
              </button>
            ))}
          </nav>

          <Link 
            to={`/grammar/level/${data.level_id}`}
            className="mt-8 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-[#58CC02] hover:border-[#58CC02]/50 transition-all text-xs font-bold"
          >
            <Layers size={14} />
            <span>Xem các bài khác</span>
          </Link>
        </div>
      </aside>
    );
  }

  // Level view: show levels sidebar (optional enhancement)
  return null;
};
