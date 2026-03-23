import React from "react";

export function DevtoolsBlockScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-center select-none">
      <div className="text-3xl md:text-4xl font-semibold text-white mb-4">
        Developer Tools Detected
      </div>
      <p className="text-slate-200 text-lg mb-1">Bạn định làm gì đấy :)))</p>
      <p className="text-slate-400 text-base">Không được đâu sói ạ :v</p>
    </div>
  );
}
