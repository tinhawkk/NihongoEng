import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { jlptService } from "../services/jlptService";
import { useUserStore } from "../store/useUserStore";
import {
  Trophy,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Flame,
  Star,
  CheckCircle2,
  ChevronLeft,
  Headphones,
} from "lucide-react";

const EXAMS_PER_PAGE = 12;

// Accent-insensitive string normalization
function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const LEVEL_BADGES = {
  n5: "bg-[#58CC02] shadow-[#46A31E]",
  n4: "bg-[#1CB0F6] shadow-[#1899D6]",
  n3: "bg-[#AF70FF] shadow-[#8A56CE]",
  n2: "bg-[#FF9600] shadow-[#D97E00]",
  n1: "bg-[#FF4B4B] shadow-[#D33131]",
};

export const JLPTExamsListPage = () => {
  const [examsByLevel, setExamsByLevel] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("n5");
  const [examType, setExamType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const quizHistory = useUserStore(s => s.account?.quizHistory || []);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const grouped = await jlptService.getExamsByLevel();
        setExamsByLevel(grouped);
        const levels = Object.keys(grouped).sort();
        if (levels.length > 0 && !grouped[activeTab]) {
          setActiveTab(levels[0]);
        }
      } catch (err) {
        console.error("Failed to fetch JLPT exams:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  // Handle Level Change or Filter Change: Reset Page
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, examType]);

  const currentExams = useMemo(() => {
    let exams = examsByLevel[activeTab] || [];
    if (examType === "real") {
      exams = exams.filter(e => e.Type === "REAL_EXAM");
    } else if (examType === "knowledge") {
      exams = exams.filter(e => ["VOCAB", "GRAMMAR", "READING"].includes(e.Type));
    } else if (examType === "listening") {
      exams = exams.filter(e => e.is_listening === true || e.Type === "LISTENING");
    }
    if (searchTerm.trim()) {
      const norm = normalizeString(searchTerm.trim());
      exams = exams.filter(e => normalizeString(e.title).includes(norm));
    }
    return exams;
  }, [examsByLevel, activeTab, examType, searchTerm]);

  const totalPages = Math.ceil(currentExams.length / EXAMS_PER_PAGE);
  const paginatedExams = currentExams.slice(
    (currentPage - 1) * EXAMS_PER_PAGE,
    currentPage * EXAMS_PER_PAGE
  );

  // Helper to find if exam is finished
  const getExamResult = id => {
    return quizHistory
      .filter(h => h.deckId === `exam_${id}`)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Trophy size={48} className="text-slate-200 mb-4 font-black" />
        <p className="text-slate-400 font-black uppercase tracking-widest">
          Đang tải 300+ bộ đề thi...
        </p>
      </div>
    );
  }

  const levels = Object.keys(examsByLevel).sort().reverse(); // N3, N4, N5

  return (
    <div className="max-w-5xl mx-auto space-y-4 lg:space-y-8 pb-32">
      {/* Header */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-3xl lg:rounded-[2.5rem] p-5 lg:p-8 border-2 border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 lg:gap-8 text-center md:text-left">
          <div className="w-16 h-16 md:w-32 md:h-32 bg-[#FFC800] rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-lg shadow-[#FFC800]/30 rotate-3 shrink-0">
            <GraduationCap size={40} className="text-white md:w-16 md:h-16" />
          </div>
          <div className="flex-1 space-y-1 lg:space-y-3">
            <h1 className="text-2xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
              Luyện Đề <span className="text-[#1CB0F6]">JLPT</span>
            </h1>
            <p className="text-sm md:text-lg text-slate-400 font-bold max-w-xl">
              Kho đề thi phong phú giúp bạn quen với nhịp độ thi JLPT thực tế.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-1.5 lg:gap-3 p-1.5 lg:p-2 bg-slate-100 dark:bg-slate-800/50 rounded-2xl lg:rounded-3xl border-2 border-slate-200 dark:border-slate-700 w-full lg:w-fit mx-auto transition-all">
        {levels.map(level => (
          <button
            key={level}
            onClick={() => setActiveTab(level)}
            className={`flex-1 lg:flex-none px-5 lg:px-10 py-3 lg:py-4 rounded-xl lg:rounded-2xl font-extrabold text-xl lg:text-2xl transition-all relative tracking-widest
              ${
                activeTab === level
                  ? `${LEVEL_BADGES[level]} text-white shadow-[0_6px_16px_0_rgba(0,0,0,0.10)] border-4 border-white scale-110 z-10`
                  : "text-slate-400 opacity-60 hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-2 border-transparent"
              }
            `}
            style={{ letterSpacing: "0.15em" }}
          >
            {level.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex justify-center flex-wrap gap-3 py-2 w-full max-w-4xl mx-auto px-4">
        <button
          onClick={() => setExamType("all")}
          className={`flex-1 min-w-[120px] px-6 py-2.5 rounded-2xl font-bold text-sm transition-all border-2 ${examType === "all" ? "border-slate-400 bg-slate-600 text-white shadow-md shadow-slate-600/30" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 bg-white dark:bg-slate-800"}`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setExamType("real")}
          className={`flex-1 min-w-[140px] px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${examType === "real" ? "border-[#FF4B4B] bg-[#FF4B4B] text-white shadow-md shadow-[#FF4B4B]/30" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 bg-white dark:bg-slate-800"}`}
        >
          <Flame size={16} /> Đề thi thật
        </button>
        <button
          onClick={() => setExamType("knowledge")}
          className={`flex-2 min-w-[180px] px-8 py-2.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${examType === "knowledge" ? "border-[#58CC02] bg-[#58CC02] text-white shadow-md shadow-[#58CC02]/20" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 bg-white dark:bg-slate-800"}`}
        >
          <BookOpen size={16} /> Kiến thức (V/G/R)
        </button>
        <button
          onClick={() => setExamType("listening")}
          className={`flex-1 min-w-[140px] px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${examType === "listening" ? "border-[#FFC800] bg-[#FFC800] text-white shadow-md shadow-[#FFC800]/30" : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 bg-white dark:bg-slate-800"}`}
        >
          <Headphones size={16} /> Nghe hiểu
        </button>
      </div>

      {/* Search + Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-8 py-2 px-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 w-full max-w-4xl mx-auto">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm tên đề..."
            className="w-full md:w-72 px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-sm focus:outline-none focus:border-[#1CB0F6] transition-all"
            style={{ letterSpacing: "0.05em" }}
          />
        </div>
        <div className="flex flex-row gap-8 text-xs font-black uppercase tracking-widest text-slate-400 font-mono justify-center md:justify-end">
          <span className="flex items-center gap-2">
            <strong className="text-[#1CB0F6]">{currentExams.length}</strong> Đề thi
          </span>
          <span className="flex items-center gap-2">
            <strong className="text-[#58CC02]">
              {currentExams.filter(e => getExamResult(e.id)).length}
            </strong>{" "}
            Đã hoàn thành
          </span>
        </div>
      </div>

      {/* Exam Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {paginatedExams.map((exam, i) => {
            const result = getExamResult(exam.id);
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/jlpt-exams/${exam.id}`)}
                className="group cursor-pointer"
              >
                <div
                  className={`h-full bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 transition-all relative overflow-hidden active:scale-95 ${result ? "border-[#58CC02]/30 bg-[#58CC02]/5 shadow-lg shadow-[#58CC02]/5" : "border-slate-100 dark:border-slate-700 hover:border-[#1CB0F6] hover:shadow-xl hover:shadow-[#1CB0F6]/10"}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-sm ${LEVEL_BADGES[activeTab]}`}
                    >
                      {activeTab.toUpperCase()}
                    </div>
                    {result ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase text-[#58CC02] tracking-widest leading-none mb-1">
                          XONG
                        </span>
                        <CheckCircle2 size={18} className="text-[#58CC02]" />
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        {[1, 2, 3].map(s => (
                          <Star key={s} size={14} className="text-amber-200 fill-current" />
                        ))}
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-slate-700 dark:text-slate-100 mb-2 leading-tight group-hover:text-[#1CB0F6] transition-colors line-clamp-2">
                    {exam.title.replace("Từ vựng kanji ", "").replace("Ngữ pháp - đọc hiểu ", "")}
                  </h3>

                  <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-tighter mt-1">
                    {exam.is_listening ? (
                      <span className="flex items-center gap-1 text-[#FFC800]">
                        <Headphones size={14} className="fill-current" />
                        Phần Nghe
                      </span>
                    ) : exam.Type === "REAL_EXAM" ? (
                      <span className="flex items-center gap-1 text-[#FF4B4B]">
                        <Flame size={14} className="fill-current" />
                        JLPT Thực tế
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#1CB0F6]">
                        <BookOpen size={14} />
                        Đề thi thử
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    {result ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold">
                          Lần cuối: {Math.round((result.score / result.total) * 100)}%
                        </span>
                        <span className="text-sm font-black text-[#58CC02] font-mono">
                          {result.score}/{result.total}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-black text-[#1CB0F6] uppercase tracking-wider">
                        Bắt đầu thi
                      </span>
                    )}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${result ? "bg-[#58CC02] text-white" : "bg-slate-50 dark:bg-slate-700 group-hover:bg-[#1CB0F6] group-hover:text-white"}`}
                    >
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-8">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${
              currentPage === 1
                ? "bg-slate-50 text-slate-200 border-slate-100"
                : "bg-white border-slate-200 text-slate-600 hover:border-[#1CB0F6] hover:text-[#1CB0F6]"
            }`}
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex gap-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum = i + 1;
              // Dynamic pagination window logic simplified
              if (currentPage > 3 && totalPages > 5) pageNum = currentPage - 2 + i;
              if (pageNum > totalPages) pageNum = totalPages - 4 + i;
              if (pageNum < 1) pageNum = i + 1;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-12 h-12 rounded-2xl font-black text-sm transition-all border-2 ${
                    currentPage === pageNum
                      ? "bg-[#1CB0F6] text-white border-[#1CB0F6] shadow-[0_4px_0_0_#1899D6]"
                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${
              currentPage === totalPages
                ? "bg-slate-50 text-slate-200 border-slate-100"
                : "bg-white border-slate-200 text-slate-600 hover:border-[#1CB0F6] hover:text-[#1CB0F6]"
            }`}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      {currentExams.length === 0 && (
        <div className="text-center py-20">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-400 font-black">Chưa có dữ liệu cho trình độ này.</p>
        </div>
      )}
    </div>
  );
};
