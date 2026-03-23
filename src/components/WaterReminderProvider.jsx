import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const WaterReminderToast = ({ onDismiss }) => (
  <motion.div
    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-2 border-blue-200 dark:border-blue-500/40 shadow-2xl rounded-3xl px-6 py-4"
    initial={{ y: 100, opacity: 0, scale: 0.85 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    exit={{ y: 100, opacity: 0, scale: 0.85 }}
    transition={{ type: "spring", stiffness: 300, damping: 24 }}
  >
    <motion.div
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 1.4, repeat: Infinity }}
      className="text-3xl shrink-0"
    >
      💧
    </motion.div>
    <div>
      <p className="text-sm font-black text-slate-800 dark:text-white">Uống nước đi bạn ơi!</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
        Cơ thể cần ít nhất 2L nước mỗi ngày 🌊
      </p>
    </div>
    <button
      onClick={onDismiss}
      className="ml-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-black rounded-2xl transition-all shrink-0"
    >
      OK 👍
    </button>
  </motion.div>
);

export const WaterReminderProvider = ({ children }) => {
  const [showWaterAlert, setShowWaterAlert] = useState(false);
  const [waterReminderOn, setWaterReminderOn] = useState(true);
  const [waterIntervalMin, setWaterIntervalMin] = useState(20);
  const waterTimerRef = useRef(null);

  useEffect(() => {
    if (!waterReminderOn) return;
    if (waterTimerRef.current) clearInterval(waterTimerRef.current);
    
    waterTimerRef.current = setInterval(() => {
      // Don't show if in quiz or arena
      const path = window.location.pathname;
      if (path.includes("/quiz") || path.includes("/speed-game")) {
        return;
      }
      setShowWaterAlert(true);
    }, waterIntervalMin * 60000);
    
    return () => clearInterval(waterTimerRef.current);
  }, [waterReminderOn, waterIntervalMin]);


  return (
    <>
      {children}
      <AnimatePresence>
        {showWaterAlert && <WaterReminderToast onDismiss={() => setShowWaterAlert(false)} />}
      </AnimatePresence>
    </>
  );
};
