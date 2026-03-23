import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, GraduationCap, ChevronRight, PenTool, BookOpen, Sparkles, Star } from "lucide-react";
import { nhostService } from "../services/nhostService";
import { useNavigate } from "react-router-dom";

const KANJI_LEVELS = [
  { id: "N5_KANJI", level: "N5", label: "JLPT N5 Kanji", count: 100, color: "bg-[#58CC02]", trayColor: "from-[#58CC02]/20 to-[#58CC02]/5" },
  { id: "N4_KANJI", level: "N4", label: "JLPT N4 Kanji", count: 300, color: "bg-[#FF9600]", trayColor: "from-[#FF9600]/20 to-[#FF9600]/5" },
  { id: "N3_KANJI", level: "N3", label: "JLPT N3 Kanji", count: 650, color: "bg-[#FF4B4B]", trayColor: "from-[#FF4B4B]/20 to-[#FF4B4B]/5" },
  { id: "N2_KANJI", level: "N2", label: "JLPT N2 Kanji", count: 1000, color: "bg-[#A342FF]", trayColor: "from-[#A342FF]/20 to-[#A342FF]/5" },
  { id: "N1_KANJI", level: "N1", label: "JLPT N1 Kanji", count: 1200, color: "bg-[#37464F]", trayColor: "from-[#37464F]/20 to-[#37464F]/5" },
];

export const KanjiExplorerPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchTerm.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await nhostService.searchJapanese(searchTerm);
        // Prioritize Japience Kanji and my_vocabulary type=kanji
        const kanjis = [
          ...(data.japience_kanji || []),
          ...(data.my_voca || []).filter(v => v.type === 'kanji')
        ];
        setSearchResults(kanjis);
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVars = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-500 font-black text-[10px] uppercase tracking-[0.2em] border border-indigo-100 dark:border-indigo-500/20">
             <Star size={14} fill="currentColor" /> Xóa mù Hán tự
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight">
            Khám Phá Kanji
          </h2>
          <p className="text-sm md:text-base font-bold text-slate-400 max-w-lg leading-relaxed">
            Học Kanji theo phương pháp hiện đại từ Japanience. Kết hợp bộ gõ, mẹo nhớ và luyện viết trực quan.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative group w-full md:w-80">
          <div className="absolute inset-x-0 -bottom-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl group-focus-within:bg-indigo-500 transition-colors" />
          <div className="relative flex items-center bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-2 focus-within:border-indigo-500 transition-all -translate-y-1 group-focus-within:-translate-y-1.5 active:translate-y-0 shadow-sm">
            <Search className="ml-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Tra Hán Việt, Nghĩa, Kanji..."
              className="w-full bg-transparent px-3 py-2 text-sm font-bold outline-none dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Search Dropdown (Simplistic for now) */}
          <AnimatePresence>
            {searchTerm.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-16 inset-x-0 z-50 bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-700 shadow-2xl p-2 max-h-96 overflow-y-auto custom-scrollbar"
              >
                {isSearching ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">Đang tìm kiếm...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((k, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => navigate(`/deck/N${k.level?.match(/\d/)?.[0] || '3'}?filter=kanji&word=${k.kanji || k.word}`)}
                      className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
                    >
                      <div className="w-12 h-12 bg-indigo-500 text-white flex items-center justify-center rounded-xl text-xl font-black">
                        {k.kanji || k.word}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white">{k.han_viet || k.hanViet}</p>
                        <p className="text-xs font-bold text-slate-400">{k.meaning}</p>
                      </div>
                      <div className="ml-auto text-[10px] font-black px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-400">
                        Level {k.level}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                     <BookOpen size={32} className="mx-auto text-slate-200 mb-2" />
                     <p className="text-xs font-bold text-slate-400">Không tìm thấy Kanji nào</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Levels Grid */}
      <motion.div 
        variants={containerVars}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4"
      >
        {KANJI_LEVELS.map((level) => (
          <motion.div
            key={level.id}
            variants={itemVars}
            whileHover={{ y: -8 }}
            className="group relative cursor-pointer"
            onClick={() => navigate(`/deck/${level.level}?filter=kanji`)}
          >
            {/* The Tray Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${level.trayColor} rounded-[48px] border-2 border-slate-100 dark:border-slate-800 transition-all group-hover:shadow-2xl opacity-50 group-hover:opacity-100`} />
            
            <div className="relative p-8 h-full flex flex-col items-center text-center space-y-6">
              {/* Level Indicator */}
              <div className={`w-20 h-20 ${level.color} rounded-[32px] flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform`}>
                <span className="text-3xl font-black tracking-tighter">{level.level}</span>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors">
                  {level.label}
                </h3>
                <div className="flex items-center justify-center gap-2">
                   <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 overflow-hidden" />
                      ))}
                   </div>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                     {level.count} CHỮ HÁN TỰ
                   </p>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <div className="px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black shadow-md border border-slate-100 dark:border-slate-700 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition-all flex items-center gap-2">
                   HỌC NGAY <ChevronRight size={14} />
                </div>
              </div>

              {/* Decorative Kanji Icons */}
              <div className="absolute top-4 right-4 text-4xl opacity-[0.03] select-none pointer-events-none group-hover:opacity-10 transition-opacity font-black rotate-12">
                 語
              </div>
            </div>
          </motion.div>
        ))}



        {/* 214 Radicals Card */}
        <motion.div
          variants={itemVars}
          whileHover={{ y: -8 }}
          className="group relative cursor-pointer"
          onClick={() => navigate(`/radicals`)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-pink-500/5 rounded-[48px] border-2 border-slate-100 dark:border-slate-800 transition-all group-hover:shadow-2xl opacity-50 group-hover:opacity-100" />
          
          <div className="relative p-8 h-full flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-[#EC4899] rounded-[32px] flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
              <span className="text-3xl font-black tracking-tighter">部</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-pink-500 transition-colors">
                214 Bộ Thủ
              </h3>
              <div className="flex items-center justify-center gap-2">
                 <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 overflow-hidden" />
                    ))}
                 </div>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                   Khám phá
                 </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <div className="px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black shadow-md border border-slate-100 dark:border-slate-700 group-hover:bg-pink-500 group-hover:text-white group-hover:border-pink-500 transition-all flex items-center gap-2">
                 HỌC NGAY <ChevronRight size={14} />
              </div>
            </div>

            <div className="absolute top-4 right-4 text-4xl opacity-[0.03] select-none pointer-events-none group-hover:opacity-10 transition-opacity font-black rotate-12">
               首
            </div>
          </div>
        </motion.div>

        {/* Writing Practice Showcase Card */}
        <motion.div
           variants={itemVars}
           className="lg:col-span-3 bg-indigo-600 rounded-[48px] p-8 md:p-12 text-white relative overflow-hidden group shadow-xl shadow-indigo-200/50 flex flex-col md:flex-row items-center justify-between"
        >
           <div className="absolute top-0 right-0 w-60 h-60 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
           <div className="relative z-10 flex flex-col md:w-2/3 space-y-6">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                 <PenTool size={28} strokeWidth={2.5} />
              </div>
              <div className="space-y-3">
                 <h3 className="text-3xl font-black leading-tight">Luyện viết chuẩn xác <br/> từng nét vẽ</h3>
                 <p className="text-indigo-100 font-medium leading-relaxed max-w-md">
                   Hỗ trợ nhận diện thứ tự nét (Stroke Order) và hướng viết cho hàng nghìn chữ Hán. Tương tác trực quan trên mọi nền tảng thiết bị.
                 </p>
              </div>
              <div>
                 <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white text-indigo-600 px-6 py-3 rounded-2xl shadow-lg cursor-pointer hover:bg-indigo-50 transition-all active:scale-95">
                    <Sparkles size={14} /> Trải nghiệm ngay
                 </div>
              </div>
           </div>
           
           <div className="absolute -bottom-10 -right-4 text-9xl opacity-10 font-bold select-none pointer-events-none group-hover:scale-110 transition-transform">
              書
           </div>
        </motion.div>
      </motion.div>

      {/* Modern Method Section */}
      <section className="px-4">
        <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[60px] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
           <div className="flex-1 space-y-6">
              <h3 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">
                Phương pháp <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Modern Kanji</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {[
                  { title: "Mẹo nhớ trực quan", desc: "Sử dụng câu chuyện và hình ảnh liên tưởng (Pictograph)." },
                  { title: "Hán Việt chuẩn", desc: "Tích hợp âm Hán Việt giúp người Việt nhớ chữ nhanh gấp 3 lần." },
                  { title: "Ví dụ thực tế", desc: "Ghép chữ vào từ vựng thường gặp trong đời sống và đề thi." },
                  { title: "Viết tay cảm ứng", desc: "Luyện tập trên màn hình giúp kích thích vùng nhớ vận động." }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="text-sm font-black text-indigo-500 uppercase tracking-widest">{item.title}</h4>
                    <p className="text-xs font-bold text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>
           </div>
           <div className="w-full md:w-1/3 aspect-square bg-white dark:bg-slate-800 rounded-[48px] shadow-2xl flex flex-col items-center justify-center p-8 border-2 border-indigo-100 dark:border-indigo-500/20">
              <div className="text-7xl font-black text-indigo-500 mb-4">学</div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">HỌC - MANABU</p>
              <div className="mt-8 space-y-2 w-full">
                 <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-indigo-500" />
                 </div>
                 <p className="text-[10px] font-black text-indigo-500 text-right">60% Complete</p>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
};
