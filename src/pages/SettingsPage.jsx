import React, { useState } from "react";
import { useUserStore } from "../store/useUserStore";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Bell, Shield, LogOut, ChevronRight } from "lucide-react";
import { ConfirmModal } from "../components/ui/ConfirmModal";

export const SettingsPage = () => {
  const { theme, setTheme, account, logout } = useUserStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-black text-slate-800 dark:text-white">Cài đặt</h2>

      {/* Profile Section */}
      <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl p-6 flex items-center gap-4">
        <div className="w-16 h-16 bg-[#1CB0F6] rounded-full flex items-center justify-center text-2xl text-white font-black shadow-lg shadow-[#1CB0F6]/20">
          {account?.username?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex-1">
          <p className="text-xl font-black text-slate-800 dark:text-white">
            {account?.username || "Người dùng"}
          </p>
          <p className="text-sm text-slate-400 font-bold">Học viên chăm chỉ ⚡</p>
        </div>
      </div>

      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-4">
            Giao diện
          </h3>
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${theme === "dark" ? "bg-orange-500/20 text-orange-400" : "bg-blue-100 text-blue-600"}`}
                >
                  {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    Giao diện: {theme === "dark" ? "Chế độ tối" : "Chế độ sáng"}
                  </p>
                  <p className="text-xs text-slate-400 font-bold">Nhấn để thay đổi</p>
                </div>
              </div>
              <div
                className={`w-12 h-6 rounded-full transition-all relative ${theme === "dark" ? "bg-[#58CC02]" : "bg-slate-200"}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-all shadow-sm ${theme === "dark" ? "left-7" : "left-1"}`}
                />
              </div>
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-4">
            Thông báo & Bảo mật
          </h3>
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
                  <Bell size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-700 dark:text-slate-200">Nhắc nhở học tập</p>
                  <p className="text-xs text-slate-400 font-bold">Hàng ngày lúc 20:00</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
            <div className="h-px bg-slate-100 dark:bg-slate-700 mx-4" />
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
                  <Shield size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-700 dark:text-slate-200">Quyền riêng tư</p>
                  <p className="text-xs text-slate-400 font-bold">Quản lý dữ liệu đồng bộ</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          </div>
        </section>

        <button
          onClick={handleLogout}
          className="w-full mt-6 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-black py-4 rounded-3xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 border-2 border-red-100 dark:border-red-500/20"
        >
          <LogOut size={20} /> Đăng xuất
        </button>

        <div className="flex flex-col items-center pt-12 pb-8">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Vocab Quiz
              </span>
              <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-500/10 text-[#1CB0F6] text-[9px] font-black rounded-lg">
                V2.1.1
              </span>
            </div>
            <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Made with ❤️ by
              </span>
              <span className="text-[#58CC02] text-[10px] font-black uppercase tracking-widest animate-pulse">
                TinHT
              </span>
              <span className="text-xs text-slate-400 font-bold">Project này duy trì phi lợi nhuận</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Đăng xuất?"
        message={`Bạn có chắc chắn muốn đăng xuất khỏi tài khoản ${account?.username}?`}
        confirmLabel="Đăng xuất ngay"
        cancelLabel="Hủy"
        variant="danger"
      />
    </div>
  );
};
