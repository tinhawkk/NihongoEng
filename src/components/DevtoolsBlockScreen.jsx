import React from "react";
import { ShieldAlert, AlertOctagon } from "lucide-react";

export function DevtoolsBlockScreen() {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-900 text-center select-none p-6 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-[32px] shadow-2xl border-4 border-rose-500 max-w-xl w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertOctagon size={48} strokeWidth={2.5} className="text-rose-500" />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-4 uppercase tracking-tight">
          Truy cập bị từ chối
        </h1>
        
        <div className="space-y-3 text-slate-600 dark:text-slate-300 text-base md:text-lg font-medium">
          <p>Hệ thống phát hiện bạn đang cố gắng mở <strong className="text-rose-500">Developer Tools (F12)</strong> hoặc <strong className="text-rose-500">Inspect Element</strong>.</p>
          <p>Hành động này không được phép trên hệ thống để bảo vệ dữ liệu nội bộ và tính công bằng của bài học.</p>
        </div>

        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-full flex items-start gap-3 border border-slate-200 dark:border-slate-700">
          <ShieldAlert size={24} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 text-left">
            Vui lòng đóng công cụ dành cho nhà phát triển (nhấn F12 lần nữa) và tải lại trang để tiếp tục học. Chuột phải cũng đã bị khóa.
          </p>
        </div>
      </div>
    </div>
  );
}
