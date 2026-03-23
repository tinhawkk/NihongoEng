import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { KanjiWriter } from "./KanjiWriter";

export const KanjiWriterModal = ({ open, onClose, kanji, meaning }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className="bg-white dark:bg-slate-800 rounded-[48px] shadow-2xl border-4 border-white/20 w-full max-w-md overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1CB0F6] to-[#A342FF] p-6 text-white text-center relative overflow-hidden">
               {/* Decorative elements */}
               <div className="absolute top-0 left-0 w-full h-full opacity-10">
                 <div className="absolute top-[-20px] left-[-20px] w-40 h-40 rounded-full bg-white blur-3xl" />
                 <div className="absolute bottom-[-20px] right-[-20px] w-40 h-40 rounded-full bg-white blur-3xl" />
               </div>

              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition-all active:scale-90"
              >
                <X size={20} strokeWidth={3} />
              </button>
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-1">
                  <Sparkles size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-black tracking-tight">Luyện Viết Hán Tự</h3>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 text-xs font-black uppercase tracking-widest">
                   {kanji} <span className="opacity-60">|</span> {meaning}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
              <KanjiWriter kanji={kanji} size={300} />
            </div>

            {/* Modal Footer */}
            <div className="p-8 pt-2 text-center bg-slate-50 dark:bg-slate-900/50">
                <p className="text-xs text-slate-400 font-bold max-w-[240px] mx-auto leading-relaxed">
                    Mẹo: Hãy quan sát kỹ thứ tự nét trước khi bắt đầu luyện tập để ghi nhớ lâu hơn!
                </p>
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-10 py-3 rounded-2xl bg-slate-800 text-white font-black text-sm hover:bg-slate-700 transition-all shadow-xl active:scale-95"
                    >
                        HOÀN TẤT
                    </button>
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
