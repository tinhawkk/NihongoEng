import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useUserStore } from "../../store/useUserStore";
import { Flame, Trophy, Home, Book, Search, User, Timer, Bookmark, Headphones, Brain } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { getDueItems } from "../../utils/srsUtils";
import { motion, AnimatePresence } from "framer-motion";
import { PetCompanion } from "../pet/PetCompanion";

export const Layout = ({ children }) => {
  const account = useUserStore(state => state.account);
  const location = useLocation();
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const isExamPage = location.pathname.startsWith('/jlpt-exams/');
  const isSRSPage = location.pathname === '/srs';
  const isGrammarPage = location.pathname.startsWith('/grammar');
  const isDeckPage = location.pathname.startsWith('/deck/');
  const isStudyPage = location.pathname.startsWith('/learn/') || 
                      location.pathname.startsWith('/flashcard/') ||
                      location.pathname.startsWith('/quiz/');

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] transition-colors duration-300">
      <Sidebar />

      <main className="lg:ml-64 flex-1 min-h-screen">
        {/* Mobile Header - Hide on study pages */}
        {!isStudyPage && (
          <div className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b-2 border-slate-100 dark:border-slate-800 h-14 flex items-center justify-between px-5">
            <h1 className="text-xl font-black tracking-tighter">
              <span className="text-[#58CC02]">NIHONGO-ENG</span>
              <span className="text-[#1CB0F6]">EDU</span>
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-500/10 px-2.5 py-1.5 rounded-xl">
                <Flame className="w-4 h-4 text-[#FF9600]" fill="#FF9600" />
                <span className="font-black text-[#FF9600] text-xs">
                  {account?.streak?.length || 0}
                </span>
              </div>
              <NavLink
                to="/settings"
                className="w-8 h-8 rounded-xl bg-[#1CB0F6] flex items-center justify-center text-white text-xs font-black shadow-md shadow-[#1CB0F6]/20"
              >
                {account?.username?.charAt(0).toUpperCase() || "U"}
              </NavLink>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`${isExamPage || isGrammarPage ? 'w-full' : (isSRSPage || isDeckPage) ? 'max-w-[1600px] mx-auto' : 'max-w-5xl mx-auto'} px-5 py-4 lg:px-6 ${isStudyPage ? 'lg:py-8' : 'lg:py-16'} ${isStudyPage ? 'pb-6' : 'pb-24 lg:pb-16'}`}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav - Hide on study pages */}
      {!isStudyPage && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-around lg:hidden z-40 pb-[env(safe-area-inset-bottom)]">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 ${isActive ? "text-[#1CB0F6]" : "text-slate-400 dark:text-slate-500"}`
            }
          >
            <Home size={22} />
            <span className="text-[9px] font-black">Home</span>
          </NavLink>
          <NavLink
            to="/grammar"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 ${isActive ? "text-[#1CB0F6]" : "text-slate-400 dark:text-slate-500"}`
            }
          >
            <Book size={22} />
            <span className="text-[9px] font-black">Ngữ pháp</span>
          </NavLink>
          <NavLink
            to="/srs"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 relative ${isActive ? "text-[#1CB0F6]" : "text-slate-400 dark:text-slate-500"}`
            }
          >
            <Brain size={22} />
            <span className="text-[9px] font-black">Ôn tập</span>
            {getDueItems(account?.srsData || {}).length > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-[#FF4B4B] rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </NavLink>
          <NavLink
            to="/reading"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 ${isActive ? "text-[#1CB0F6]" : "text-slate-400 dark:text-slate-500"}`
            }
          >
            <Headphones size={22} />
            <span className="text-[9px] font-black">Luyện tập</span>
          </NavLink>
          <NavLink
            to="/dictionary"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 ${isActive ? "text-[#1CB0F6]" : "text-slate-400 dark:text-slate-500"}`
            }
          >
            <Search size={22} />
            <span className="text-[9px] font-black">Từ điển</span>
          </NavLink>
          <NavLink
            to="/bookmarks"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 ${isActive ? "text-[#1CB0F6]" : "text-slate-400 dark:text-slate-500"}`
            }
          >
            <Bookmark size={22} />
            <span className="text-[9px] font-black">Đã lưu</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 ${isActive ? "text-[#1CB0F6]" : "text-slate-400 dark:text-slate-500"}`
            }
          >
            <User size={22} />
            <span className="text-[9px] font-black">Tôi</span>
          </NavLink>
        </nav>
      )}

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-24 lg:bottom-10 right-6 z-50 w-16 h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden shadow-2xl hover:scale-110 active:scale-95 transition-all group border-4 border-white dark:border-slate-800 bg-white dark:bg-slate-900"
            title="Cuộn lên đầu trang"
          >
            <img 
              src="/f_img.png" 
              alt="Scroll to top" 
              className="w-full h-full object-contain p-1"
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Pet Companion - floats above everything */}
      <PetCompanion />
    </div>
  );
};
