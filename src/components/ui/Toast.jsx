import React from "react";
import { useToastStore } from "../../store/useToastStore";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";

export const ToastProvider = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            layout
            className={`
              pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-[24px] shadow-2xl backdrop-blur-md border-2
              ${
                toast.type === "success"
                  ? "bg-white/80 dark:bg-slate-900/80 border-[#58CC02]/20 text-slate-800 dark:text-white"
                  : toast.type === "error"
                  ? "bg-red-50/80 dark:bg-red-900/20 border-red-500/20 text-red-600 dark:text-red-400"
                  : "bg-amber-50/80 dark:bg-amber-900/20 border-amber-500/20 text-amber-600 dark:text-amber-400"
              }
            `}
          >
            <div className="shrink-0">
              {toast.type === "success" && <CheckCircle2 size={24} className="text-[#58CC02]" />}
              {toast.type === "error" && <XCircle size={24} className="text-red-500" />}
              {toast.type === "warning" && <AlertCircle size={24} className="text-amber-500" />}
            </div>
            
            <p className="text-sm font-black tracking-tight pr-4">
              {toast.message}
            </p>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
