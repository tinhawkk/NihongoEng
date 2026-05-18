import React, { useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import { RotateCcw, PenTool, Eye, CheckCircle2, Info, ListOrdered, Brush } from "lucide-react";
import { KanjiStrokeOrder } from "./KanjiStrokeOrder";

const IS_KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/;

export const KanjiWriter = ({ kanji, size = 300, simple = false }) => {
  const containerRef = useRef(null);
  const writerRef = useRef(null);
  const [isQuizzing, setIsQuizzing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("Nhấn 'Bắt đầu' để luyện viết!");
  const [mode, setMode] = useState("writer"); // "writer" | "stroke"

  useEffect(() => {
    if (mode !== "writer") return;
    if (!kanji || !containerRef.current) return;

    if (!IS_KANJI_REGEX.test(kanji)) {
      setTimeout(() => setError(true), 0);
      return;
    }

    containerRef.current.innerHTML = "";
    setTimeout(() => {
      setError(false);
      setIsQuizzing(false);
      setComplete(false);
      setMessage("Nhấn 'Bắt đầu' để luyện viết!");
    }, 0);
    
    try {
      writerRef.current = HanziWriter.create(containerRef.current, kanji, {
        width: size,
        height: size,
        padding: simple ? 5 : 20,
        showOutline: true,
        strokeAnimationSpeed: 1.5,
        delayBetweenStrokes: 150,
        strokeColor: "#1CB0F6",
        outlineColor: simple ? "#F1F5F9" : "#E2E8F0",
        drawingColor: "#334155",
        drawingWidth: 20,
        showHintAfterMisses: 1,
      });

      if (simple) {
        setTimeout(() => {
          writerRef.current?.animateCharacter();
        }, 500);
      }
    } catch (err) {
      console.warn("[KanjiWriter] Failed to init or character data missing:", err);
      setTimeout(() => setError(true), 0);
    }

    return () => {
      // Cleanup handled by clearing innerHTML next time
    };
  }, [kanji, size, simple, mode]);

  const handleAnimate = () => {
    if (!writerRef.current) return;
    setIsQuizzing(false);
    setComplete(false);
    setMessage("Đang biểu diễn thứ tự nét...");
    writerRef.current.animateCharacter({
      onComplete: () => setMessage("Bây giờ hãy thử tự viết nhé!")
    });
  };

  const handleReset = () => {
    if (!writerRef.current) return;
    writerRef.current.cancelQuiz();
    setIsQuizzing(false);
    setComplete(false);
    setMessage("Đã xóa. Nhấn 'Bắt đầu' để luyện viết!");
    writerRef.current.showCharacter();
  };

  const handleQuiz = () => {
    if (!writerRef.current) return;
    setIsQuizzing(true);
    setComplete(false);
    setMessage("Hãy viết theo đúng thứ tự nét!");
    writerRef.current.quiz({
      onComplete: (summary) => {
        setComplete(true);
        setMessage("Tuyệt vời! Bạn đã viết đúng rồi! 🎉");
      }
    });
  };

  if (error) {
    return (
      <div 
        className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 text-center"
        style={{ width: size, height: size }}
      >
        <span className="text-4xl mb-2">🤔</span>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
          Không hỗ trợ minh họa cho "{kanji}"
        </p>
      </div>
    );
  }

  if (simple) {
    return (
      <div className="flex flex-col gap-2 relative">
        <div className="absolute top-2 right-2 flex bg-white dark:bg-slate-800/50 backdrop-blur-md rounded-xl p-1 z-20 border border-slate-200 shadow-sm opacity-0 hover:opacity-100 transition-opacity">
          <button 
            onClick={() => setMode("writer")} 
            className={`p-1.5 rounded-lg transition-all ${mode === "writer" ? "bg-white dark:bg-slate-800 shadow text-sky-500" : "text-slate-400 hover:text-slate-600"}`}
          >
            <Brush size={14} />
          </button>
          <button 
            onClick={() => setMode("stroke")} 
            className={`p-1.5 rounded-lg transition-all ${mode === "stroke" ? "bg-white dark:bg-slate-800 shadow text-indigo-500" : "text-slate-400 hover:text-slate-600"}`}
          >
            <ListOrdered size={14} />
          </button>
        </div>
        {mode === "writer" ? (
          <div 
            ref={containerRef} 
            className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden cursor-pointer"
            style={{ width: size, height: size }}
            onClick={() => writerRef.current?.animateCharacter()}
          />
        ) : (
          <KanjiStrokeOrder kanji={kanji} size={size} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Mode Selector */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
        <button
          onClick={() => setMode("writer")}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            mode === "writer" 
              ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Brush size={16} />
          Luyện viết
        </button>
        <button
          onClick={() => setMode("stroke")}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            mode === "stroke" 
              ? "bg-white dark:bg-slate-700 text-indigo-500 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <ListOrdered size={16} />
          Thứ tự nét
        </button>
      </div>

      <div className="relative group">
        {mode === "writer" ? (
          <div 
            ref={containerRef} 
            className="bg-white dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[32px] shadow-inner overflow-hidden cursor-crosshair transition-all"
            style={{ width: size, height: size }}
          />
        ) : (
          <KanjiStrokeOrder kanji={kanji} size={size} />
        )}
        <div className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-2 rounded-2xl shadow-lg z-20">
          <Info size={16} className="text-slate-400" />
        </div>
      </div>

      {mode === "writer" && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <div className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
            complete ? "bg-green-100 text-green-600 border border-green-200" : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}>
            {complete ? <CheckCircle2 size={16} /> : <PenTool size={16} />}
            {message}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            <button
              onClick={handleAnimate}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-sky-50 text-[#1CB0F6] rounded-2xl border-b-4 border-sky-100 hover:bg-sky-100 active:border-b-0 active:translate-y-1 transition-all"
            >
              <Eye size={20} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider">Xem mẫu</span>
            </button>

            <button
              onClick={handleQuiz}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-[#58CC02]/10 text-[#58CC02] rounded-2xl border-b-4 border-[#58CC02]/20 hover:bg-[#58CC02]/20 active:border-b-0 active:translate-y-1 transition-all"
            >
              <PenTool size={20} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider">Bắt đầu</span>
            </button>

            <button
              onClick={handleReset}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-red-50 text-red-400 rounded-2xl border-b-4 border-red-100 hover:bg-red-100 active:border-b-0 active:translate-y-1 transition-all"
            >
              <RotateCcw size={20} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider">Làm lại</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
