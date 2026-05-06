import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Keyboard, CheckCircle2, XCircle, Volume2,
  Star, SkipForward, ChevronRight, Zap, RotateCcw
} from "lucide-react";
import { useBookmarkStore } from "../store/useBookmarkStore";
import { tts } from "../utils/tts";
import { sounds } from "../utils/sounds";
import { romajiToHiragana } from "../utils/kana";
import { renderFurigana } from "../utils/furigana";
import { useTypingGame } from "../hooks/useCases/useTypingGame";

export const TypingPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [showFuriganaHint, setShowFuriganaHint] = useState(false);
  const [autoConvert, setAutoConvert] = useState(true);
  
  const {
    words,
    loading,
    currentIdx,
    input,
    setInput,
    result,
    showAnswer,
    score,
    isFinished,
    inputRef,
    card,
    checkAnswer,
    goNext,
    skipWord,
    resetGame,
  } = useTypingGame(deckId);

  // Force focus when card changes
  useEffect(() => {
    if (!loading && !isFinished && !result) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, loading, isFinished, result]);

  // Global key redirection
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // If user is typing and not in any other input/textarea
      const target = e.target;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (!isInput && !loading && !isFinished && !result) {
        // Redirect focus and let the input handle it
        inputRef.current?.focus();
      }
    };
    
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [loading, isFinished, result]);

  const progress = words.length > 0 ? ((currentIdx + 1) / words.length) * 100 : 0;

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (autoConvert) {
      setInput(romajiToHiragana(val));
    } else {
      setInput(val);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-[#A342FF] rounded-full animate-spin" />
        <p className="text-slate-400 font-black animate-pulse">ĐANG TẢI...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto">
          <Keyboard size={40} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-black text-slate-600 dark:text-slate-300">Chưa có dữ liệu!</h2>
        <p className="text-sm text-slate-400 font-bold">Không tìm thấy từ vựng có furigana để luyện gõ.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-[#A342FF] text-white rounded-2xl font-black hover:bg-[#8B2FE0] transition-all shadow-lg shadow-purple-200/30"
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (isFinished) {
    const accuracy = Math.round((score.correct / (score.correct + score.wrong)) * 100) || 0;
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-6">
        <motion.div 
          initial={{ scale: 0 }} animate={{ scale: 1 }} 
          className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/30"
        >
          <Keyboard size={48} className="text-white" />
        </motion.div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">Hoàn thành!</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl">
            <p className="text-2xl font-black text-emerald-500">{score.correct}</p>
            <p className="text-[10px] font-black text-emerald-400 uppercase">Đúng</p>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl">
            <p className="text-2xl font-black text-red-500">{score.wrong}</p>
            <p className="text-[10px] font-black text-red-400 uppercase">Sai</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-2xl">
            <p className="text-2xl font-black text-purple-500">{accuracy}%</p>
            <p className="text-[10px] font-black text-purple-400 uppercase">Chính xác</p>
          </div>
        </div>
        <div className="flex gap-3 justify-center pt-4">
          <button
            onClick={resetGame}
            className="px-6 py-3 bg-[#A342FF] text-white rounded-2xl font-black hover:bg-[#8B2FE0] transition-all shadow-lg shadow-purple-200/30 flex items-center gap-2"
          >
            <RotateCcw size={18} /> Làm lại
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 transition-all"
          >
            Thoát
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pt-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 px-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#A342FF]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-sm font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          {currentIdx + 1}/{words.length}
        </span>
      </div>

      {/* Score Bar */}
      <div className="flex items-center justify-center gap-6 text-sm font-black">
        <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={16} /> {score.correct}</span>
        <span className="text-red-500 flex items-center gap-1"><XCircle size={16} /> {score.wrong}</span>
        <span className="text-purple-500 flex items-center gap-1"><Zap size={16} /> {Math.floor(currentIdx / 5)}</span>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          onClick={() => inputRef.current?.focus()}
          className="bg-white dark:bg-slate-800 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 shadow-lg overflow-hidden cursor-text"
        >
          {/* Question */}
          <div className="p-8 text-center space-y-4">
             <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  {showFuriganaHint && (
                    <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-black text-[#A342FF] mb-1">
                      {card?.furigana}
                    </motion.p>
                  )}
                  <h2 className="text-5xl font-black text-slate-800 dark:text-white leading-tight">{card?.word}</h2>
                </div>
                <button
                  onClick={() => tts.playWithFallback(card?.audio, card?.word)}
                  className="p-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all"
                >
                  <Volume2 size={20} />
                </button>
              </div>
              <button 
                onClick={() => setShowFuriganaHint(!showFuriganaHint)}
                className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-[#A342FF] transition-colors"
              >
                {showFuriganaHint ? "Ẩn cách đọc" : "Hiện cách đọc"}
              </button>
            </div>
            {(card?.meaning || card?.hanViet) && (
              <div className="space-y-1">
                {card?.hanViet && (
                  <p className="text-sm font-black text-indigo-500 uppercase tracking-widest">
                    Hán Việt: {card.hanViet}
                  </p>
                )}
                {card?.meaning && (
                  <p className="text-lg text-slate-400 font-bold">{card.meaning}</p>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="px-6 pb-6 space-y-4">
            <div className="relative">
              <Keyboard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                disabled={result !== null}
                placeholder={autoConvert ? "Nhập romaji (osaki...)" : "Nhập hiragana"}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className={`w-full pl-12 pr-4 py-4 text-lg font-bold rounded-2xl border-2 outline-none transition-all ${
                  result === "correct" 
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" 
                    : result === "wrong"
                    ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                    : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:border-[#A342FF] focus:ring-4 focus:ring-[#A342FF]/10"
                }`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                 <button 
                  onClick={() => setAutoConvert(!autoConvert)}
                  className={`text-[9px] font-black px-2 py-1 rounded-md border transition-all ${autoConvert ? "bg-[#A342FF] text-white border-[#A342FF]" : "bg-white text-slate-300 border-slate-200"}`}
                 >
                   {autoConvert ? "Tự động" : "Tắt"}
                 </button>
              </div>
            </div>

            {/* Result Feedback */}
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`p-4 rounded-2xl ${
                  result === "correct" 
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"
                    : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {result === "correct" ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <XCircle size={18} className="text-red-500" />
                  )}
                  <span className={`font-black ${result === "correct" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {result === "correct" ? "Chính xác! 🎉" : "Chưa đúng 😅"}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  Đáp án: <span className="text-lg font-black text-slate-800 dark:text-white">{card?.furigana}</span>
                </p>
                {card?.example && (
                  <div className="mt-3 space-y-2 text-left">
                    <div className="flex items-start gap-3 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-l-4 border-purple-300">
                      <p className="flex-1 text-base sm:text-lg text-slate-700 dark:text-slate-200 font-medium italic font-jp leading-relaxed">
                        {renderFurigana(card.example)}
                      </p>
                      <button
                        onClick={() => tts.playWithFallback(null, card.example)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all shadow-sm"
                        title="Nghe ví dụ"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                    {card?.example_meaning && (
                      <p className="px-5 text-sm sm:text-base text-slate-500 font-bold leading-relaxed">
                        {card.example_meaning}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!result ? (
                <>
                  <button
                    onClick={skipWord}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 font-black text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <SkipForward size={16} /> Bỏ qua
                  </button>
                  <button
                    onClick={checkAnswer}
                    disabled={!input.trim()}
                    className="flex-[2] py-3 rounded-2xl bg-[#A342FF] text-white font-black text-sm hover:bg-[#8B2FE0] transition-all shadow-lg shadow-purple-200/30 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    Kiểm tra
                  </button>
                </>
              ) : (
                <button
                  onClick={goNext}
                  className="w-full py-3 rounded-2xl bg-[#58CC02] text-white font-black text-sm hover:bg-[#46A302] transition-all shadow-lg shadow-green-200/30 flex items-center justify-center gap-2"
                >
                  Tiếp tục <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
