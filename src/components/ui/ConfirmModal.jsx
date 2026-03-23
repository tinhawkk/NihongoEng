import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";

/**
 * A beautiful, reusable confirmation modal using Framer Motion.
 */
export const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "danger", // 'danger' | 'primary' | 'success'
}) => {
  const colors = {
    danger: {
      bg: "bg-red-500",
      hover: "hover:bg-red-600",
      shadow: "shadow-red-200/50",
      iconBg: "bg-red-50 dark:bg-red-900/30",
      iconColor: "text-red-500",
    },
    primary: {
      bg: "bg-[#1CB0F6]",
      hover: "hover:bg-[#1899D6]",
      shadow: "shadow-sky-200/50",
      iconBg: "bg-sky-50 dark:bg-sky-900/30",
      iconColor: "text-[#1CB0F6]",
    },
    success: {
      bg: "bg-[#58CC02]",
      hover: "hover:bg-[#46A302]",
      shadow: "shadow-green-200/50",
      iconBg: "bg-green-50 dark:bg-green-900/30",
      iconColor: "text-[#58CC02]",
    },
  }[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 text-center space-y-6">
              <div
                className={`w-16 h-16 ${colors.iconBg} ${colors.iconColor} rounded-2xl flex items-center justify-center mx-auto mb-2`}
              >
                <AlertTriangle size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white">{title}</h3>
                <p className="text-sm font-bold text-slate-400 leading-relaxed">{message}</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onConfirm}
                  className={`w-full py-4 ${colors.bg} ${colors.hover} text-white font-black rounded-2xl transition-all shadow-xl ${colors.shadow} active:scale-95`}
                >
                  {confirmLabel}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 font-black rounded-2xl hover:text-slate-600 dark:hover:text-slate-300 transition-all text-sm"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
