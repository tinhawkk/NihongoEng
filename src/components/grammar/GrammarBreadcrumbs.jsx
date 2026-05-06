import React from "react";
import { ChevronRight, Home, Book } from "lucide-react";
import { Link } from "react-router-dom";

export const GrammarBreadcrumbs = ({ currentLevel, currentLesson }) => {
  return (
    <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6 px-1">
      <Link 
        to="/grammar" 
        className="flex items-center gap-1.5 hover:text-[#58CC02] transition-colors"
      >
        <Home size={14} />
        <span>Ngữ pháp</span>
      </Link>
      
      {currentLevel && (
        <>
          <ChevronRight size={12} className="text-slate-300" />
          <Link 
            to={`/grammar/level/${currentLevel.id}`}
            className="hover:text-[#58CC02] transition-colors uppercase tracking-tight"
          >
            {currentLevel.title}
          </Link>
        </>
      )}

      {currentLesson && (
        <>
          <ChevronRight size={12} className="text-slate-300" />
          <span className="text-slate-600 dark:text-slate-200 truncate max-w-[150px]">
            {currentLesson.title}
          </span>
        </>
      )}
    </nav>
  );
};
