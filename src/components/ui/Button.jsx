import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  loading = false,
  disabled,
  ...props 
}) => {
  const variants = {
    primary: "bg-[#58CC02] text-white shadow-[0_4px_0_0_#46A302] active:shadow-none",
    secondary: "bg-[#1CB0F6] text-white shadow-[0_4px_0_0_#1899D6] active:shadow-none",
    danger: "bg-[#FF4B4B] text-white shadow-[0_4px_0_0_#D33131] active:shadow-none",
    outline: "bg-white border-2 border-slate-200 text-slate-400 shadow-[0_4px_0_0_#E2E8F0] active:shadow-none hover:bg-slate-50",
    ghost: "bg-transparent text-slate-400 hover:bg-slate-100 shadow-none",
  };

  return (
    <motion.button
      whileTap={{ y: 2 }}
      className={cn(
        "px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
};
