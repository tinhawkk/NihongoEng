import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Card = ({ children, className, ...props }) => {
  return (
    <div 
      className={cn(
        "bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
