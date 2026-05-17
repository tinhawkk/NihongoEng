import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Star } from "lucide-react";

const TIPS = [
  "Ôn tập ngắt quãng giúp bạn nhớ lâu hơn gấp 3 lần!",
  "Học 15 phút mỗi ngày hiệu quả hơn học 2 tiếng cuối tuần.",
  "Đừng quên uống đủ nước và nghỉ ngơi nhé!",
  "Bạn đang làm rất tốt, tiếp tục phát huy nha!",
  "Đừng sợ sai, mỗi lỗi sai là một lần học hỏi."
];

export const GlobalLoader = ({ fullScreen = false }) => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const containerClasses = fullScreen 
    ? "fixed inset-0 z-[999] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center gap-8"
    : "w-full h-full min-h-[60vh] flex flex-col items-center justify-center gap-8";

  return (
    <div className={containerClasses}>
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 w-24 h-24 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 rounded-[2rem] shadow-2xl shadow-indigo-500/30 flex items-center justify-center text-white border-4 border-white dark:border-slate-800"
        >
          <Brain size={48} strokeWidth={2.5} />
        </motion.div>
        
        {/* Decorative sparkles */}
        <motion.div 
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], top: ["-10%", "-30%"] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.1 }}
          className="absolute right-0 text-yellow-400 z-0"
        >
          <Sparkles size={28} />
        </motion.div>
        <motion.div 
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], left: ["-10%", "-30%"] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: 0.8 }}
          className="absolute top-1/2 text-emerald-400 z-0"
        >
          <Star size={24} />
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/30 px-5 py-2 rounded-full"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest text-sm">
            Đang chuẩn bị
          </span>
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        </motion.div>
        
        <div className="h-12 relative w-full flex items-center justify-center mt-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base absolute w-full leading-relaxed"
            >
              💡 {TIPS[tipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
