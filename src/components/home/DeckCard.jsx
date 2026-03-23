import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, BookOpen, ChevronRight } from "lucide-react";
import { useUserStore } from "../../store/useUserStore";

export const DeckCard = ({ id, label, color, icon: Icon, description }) => {
  const navigate = useNavigate();
  const progress = useUserStore(s => s.account?.flashcardProgress?.[id.toLowerCase()]);
  const [showActions, setShowActions] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = e => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setShowActions(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <>
      <motion.div
        variants={{
          hidden: { y: 20, opacity: 0 },
          show: { y: 0, opacity: 1 },
        }}
        whileHover={{ y: -8, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[32px] p-6 shadow-xl shadow-slate-200/40 dark:shadow-none hover:border-blue-100 dark:hover:border-slate-600 transition-all cursor-pointer group"
        onClick={() => navigate(`/deck/${id.toLowerCase()}`)}
      >
        <div
          className={`w-16 h-16 rounded-[22px] flex items-center justify-center mb-6 text-white shadow-lg ${color} group-hover:scale-110 transition-transform duration-300`}
          onClick={e => {
            e.stopPropagation();
            setShowIconModal(true);
          }}
        >
          <Icon size={34} strokeWidth={2.5} />
        </div>

        <div className="space-y-2">
          <h3
            ref={ref}
            className="text-2xl font-black text-slate-800 dark:text-white leading-tight flex items-center justify-between"
          >
            <span
              onClick={e => {
                e.stopPropagation();
                setShowActions(s => !s);
              }}
              className="cursor-pointer"
              title="Tùy chọn: Quiz / Flashcard cho cả level"
            >
              {label}
            </span>
            <ChevronRight
              className="text-slate-100 group-hover:text-slate-300 transition-colors"
              size={20}
            />
            {showActions && (
              <div className="absolute mt-2 right-6 z-50" onClick={e => e.stopPropagation()}>
                <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2 flex flex-col gap-2 w-44">
                  <button
                    onClick={() => navigate(`/quiz/${id.toLowerCase()}`)}
                    className="text-left px-3 py-2 rounded-lg font-bold text-sm bg-[#58CC02] text-white"
                  >
                    Làm Quiz (Toàn trình độ)
                  </button>
                  <button
                    onClick={() => navigate(`/flashcards/${id.toLowerCase()}`)}
                    className="text-left px-3 py-2 rounded-lg font-bold text-sm bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700"
                  >
                    Flashcards (Toàn trình độ)
                  </button>
                </div>
              </div>
            )}
          </h3>

          <p className="text-sm text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
            {description}
          </p>
          
          {progress && progress.totalCards > 0 && (
            <div className="pt-2">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tiến độ Flashcard</span>
                <span className="text-[10px] font-black" style={{ color }}>
                  {Math.round((progress.studied / progress.totalCards) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((progress.studied / progress.totalCards) * 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            className="flex-grow bg-[#58CC02] hover:bg-[#46a302] text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-[0.15em] shadow-[0_4px_0_0_#46a302] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
            onClick={e => {
              e.stopPropagation();
              navigate(`/quiz/${id.toLowerCase()}`);
            }}
          >
            <Zap size={14} fill="white" /> Làm Quiz
          </button>
          <button
            className="w-14 h-14 border-2 border-slate-100 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-all group-hover:border-slate-200"
            onClick={e => {
              e.stopPropagation();
              navigate(`/flashcards/${id.toLowerCase()}`);
            }}
            title="Flashcards"
          >
            <BookOpen className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </button>
        </div>
      </motion.div>
      {/* Icon modal: choose Quiz or Flashcards for whole level */}
      {showIconModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setShowIconModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-80 shadow-2xl border-2 border-slate-100 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="text-lg font-black text-slate-800 dark:text-white mb-4">{label}</h4>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate(`/quiz/${id.toLowerCase()}`)}
                className="w-full px-4 py-3 rounded-xl bg-[#58CC02] text-white font-bold"
              >
                Làm Quiz (Toàn trình độ)
              </button>
              <button
                onClick={() => navigate(`/flashcards/${id.toLowerCase()}`)}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold"
              >
                Flashcards (Toàn trình độ)
              </button>
              <button
                onClick={() => setShowIconModal(false)}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
