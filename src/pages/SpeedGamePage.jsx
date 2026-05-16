import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Zap, Target, Award, ArrowLeft, RotateCcw, Play,
  CheckCircle2, XCircle, Book, Volume2, VolumeX
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import { useSpeedGame } from "../hooks/useCases/useSpeedGame";
import { nhostService } from "../services/nhostService";
import { premiumDecks, japienceDecks, dungMoriDecks } from "../data/communityDecks";

// ── Section Divider ──
const SectionDivider = ({ icon, title }) => (
  <div className="col-span-full flex items-center gap-3 pt-4 pb-1 px-1">
    <span className="text-base">{icon}</span>
    <span className="font-black text-xs text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{title}</span>
    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
  </div>
);

// ── Category Card ──
const CategoryCard = ({ icon, badgeColor, title, subtitle, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="relative w-full bg-white dark:bg-slate-800/90 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all text-left flex items-center gap-3 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 group"
  >
    <div className={`w-12 h-12 ${badgeColor || "bg-indigo-500"} rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="font-black text-slate-800 dark:text-white text-sm leading-tight truncate">
        {title}
      </p>
      {subtitle && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 truncate">{subtitle}</p>
      )}
    </div>
    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      <Play className="text-emerald-500" fill="currentColor" size={16} />
    </div>
  </motion.button>
);

// ── Nhost Community Categories ──
const NhostCommunityCategories = ({ startGameMulti }) => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [folders, decks] = await Promise.all([
          nhostService.getCommunityFolders(),
          nhostService.getCommunityDecks(),
        ]);
        const folderMap = {};
        folders.forEach(f => { folderMap[f.id] = { ...f, subfolders: [], decks: [] }; });
        decks.forEach(d => {
          if (d.community_folder_id && folderMap[d.community_folder_id]) {
            folderMap[d.community_folder_id].decks.push(d);
          }
        });
        const roots = [];
        const orphaned = decks.filter(d => !d.community_folder_id || !folderMap[d.community_folder_id]);
        folders.forEach(f => {
          const obj = folderMap[f.id];
          if (!f.parent_id) roots.push(obj);
          else if (folderMap[f.parent_id]) folderMap[f.parent_id].subfolders.push(obj);
        });
        if (orphaned.length > 0) {
          roots.push({ id: "orphaned", title: "Chưa phân loại", description: "Các bài chưa phân loại", subfolders: [], decks: orphaned });
        }
        setTree(roots);
      } catch (e) {
        console.error("Arena: failed to fetch community tree", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="col-span-full text-center py-4"><p className="text-xs text-slate-400 font-bold animate-pulse">Đang tải khóa học cộng đồng...</p></div>;
  if (tree.length === 0) return null;

  const flattenDeckIds = (node) => {
    let ids = (node.decks || []).map(d => d.id);
    (node.subfolders || []).forEach(sub => { ids = [...ids, ...flattenDeckIds(sub)]; });
    return ids;
  };

  return (
    <>
      <SectionDivider icon="📂" title="Khóa học cộng đồng" />
      {tree.map(root => {
        const allDeckIds = flattenDeckIds(root);
        if (allDeckIds.length === 0) return null;
        const badge = root.title?.substring(0, 2)?.toUpperCase();
        return (
          <CategoryCard
            key={root.id}
            icon={badge}
            badgeColor="bg-indigo-500"
            title={root.title}
            subtitle={`${allDeckIds.length} bài · ${root.description || ""}`}
            onClick={() => startGameMulti(root.title, allDeckIds)}
          />
        );
      })}
    </>
  );
};

// ══════════════════════════════════
// ── SpeedGamePage ──
// ══════════════════════════════════
export const SpeedGamePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const account = useUserStore(s => s.account);

  const customDeckId = searchParams.get("deckId");
  const customSource = searchParams.get("source");
  const customTitle = searchParams.get("title");

  const {
    gameState, setGameState, selectedLevel,
    score, timeLeft, highScore, countdown,
    streak, multiplier, powerups, removedOptionId,
    comboFx, questionText, questionSub,
    currentWord, options, feedback,
    startGame, startGameMulti, handleAnswer, handleUsePowerup, buyPowerup,
    ttsEnabled, setTtsEnabled
  } = useSpeedGame();

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col font-sans overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-400/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400/5 rounded-full blur-[150px]" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between p-4 md:p-5 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-xl shadow-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors font-black text-xs uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/50">
            <ArrowLeft size={14} /> Thoát
          </button>
          <button onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`flex items-center justify-center w-10 h-10 rounded-xl backdrop-blur shadow-sm transition-colors border ${
              ttsEnabled 
                ? "bg-white/80 dark:bg-slate-800/80 text-emerald-500 border-slate-200/50 dark:border-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" 
                : "bg-slate-100/80 dark:bg-slate-800/50 text-slate-400 border-slate-200/50 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}>
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-xl shadow-sm">
             <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-[10px] shadow-[0_2px_0_#b45309]">🪙</div>
             <span className="text-sm font-black text-amber-600 dark:text-amber-500">{account?.coins || 0}</span>
          </div>
        </div>
        {gameState === "playing" && (
          <div className="flex items-center gap-6 md:gap-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur px-6 py-2 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thời gian</p>
              <div className="flex items-center gap-1.5">
                <Clock size={16} className={timeLeft < 10 ? "text-red-500" : "text-slate-300"} />
                <p className={`text-2xl font-black tabular-nums ${timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-800 dark:text-white"}`}>{timeLeft}s</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Điểm</p>
              <div className="flex items-center gap-1.5">
                <Target size={16} className="text-emerald-500" />
                <p className="text-2xl font-black text-emerald-500 tabular-nums">{score}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Streak</p>
              <div className="flex items-center gap-1.5">
                <Zap size={16} className="text-amber-400" />
                <p className="text-xl font-black text-amber-500 tabular-nums">{streak}<span className="text-xs text-slate-400 ml-0.5">x{multiplier}</span></p>
              </div>
            </div>
          </div>
        )}
        <div className="hidden md:block w-20" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 md:px-6 pb-6 overflow-y-auto">
        {gameState === "countdown" && countdown != null && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-9xl md:text-[12rem] font-black text-white drop-shadow-2xl">{countdown}</motion.div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ══ LEVEL SELECT ══ */}
          {gameState === "level_select" && (
            <motion.div key="level_select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-3xl pb-10">

              {/* Hero */}
              <div className="text-center mb-6 pt-2">
                <motion.div
                  animate={{ rotate: [12, -8, 12], scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 mb-3"
                >
                  <Zap size={32} className="text-white fill-white" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Đấu Trường 60s</h2>
                <p className="text-slate-400 font-bold text-xs mt-1">Chọn đề mục · Tất cả từ vựng sẽ được tải để chơi</p>
              </div>

              {/* Grid of categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">

                {/* Custom deck from URL */}
                {customDeckId && (
                  <div className="col-span-full">
                    <CategoryCard icon={<Zap size={20} />} badgeColor="bg-emerald-500"
                      title={`⚡ THỰC CHIẾN: ${customTitle}`}
                      subtitle={`Kỷ lục: ${account?.arenaProgress?.levelScores?.[customDeckId]?.bestScore || 0} điểm`}
                      onClick={() => startGame(customDeckId, customSource)} />
                  </div>
                )}

                {/* ── Mimikara ── */}
                <SectionDivider icon="📘" title="Mimikara Oboeru" />
                {[
                  { id: "n5", label: "N5", t: "1000 Từ vựng JLPT N5", c: "bg-[#58CC02]" },
                  { id: "n4", label: "N4", t: "1500 Từ vựng JLPT N4", c: "bg-[#FF9600]" },
                  { id: "n3", label: "N3", t: "2000 Từ vựng JLPT N3", c: "bg-[#FF4B4B]" },
                  { id: "n2", label: "N2", t: "2500 Từ vựng JLPT N2", c: "bg-[#A342FF]" },
                  { id: "n1", label: "N1", t: "3000 Từ vựng JLPT N1", c: "bg-[#37464F]" },
                  { id: "eng", label: "ENG", t: "600 TOEIC PLUS+", c: "bg-[#CE82FF]" },
                ].map(lv => (
                  <CategoryCard key={lv.id} icon={lv.label} badgeColor={lv.c} title={lv.t}
                    subtitle="Giáo trình tiêu chuẩn"
                    onClick={() => startGame(lv.id, lv.id === "eng" ? "sheet" : undefined)} />
                ))}

                {/* ── Cloud Premium ── */}
                <SectionDivider icon="☁️" title="Cloud Premium" />
                <CategoryCard icon="☁️" badgeColor="bg-sky-500"
                  title="Toàn bộ Cloud Premium" subtitle={`${premiumDecks.length} đề mục · N1→N5`}
                  onClick={() => startGameMulti("Cloud Premium", premiumDecks.map(d => d.id), "voca")} />

                {/* ── Japanience ── */}
                <SectionDivider icon="🏯" title="Japanience Original" />
                <CategoryCard icon="🏯" badgeColor="bg-slate-700"
                  title="Toàn bộ Japanience" subtitle={`${japienceDecks.length} đề mục · N1→N5`}
                  onClick={() => startGameMulti("Japanience", japienceDecks.map(d => d.id), "japience")} />

                {/* ── Dũng Mori ── */}
                <SectionDivider icon="🎌" title="Dũng Mori" />
                <CategoryCard icon="🎌" badgeColor="bg-orange-500"
                  title="Toàn bộ Dũng Mori" subtitle={`${dungMoriDecks.length} lộ trình · N1→N5`}
                  onClick={() => startGameMulti("Dũng Mori", dungMoriDecks.map(d => d.id), "mori")} />

                {/* ── Community ── */}
                <NhostCommunityCategories startGameMulti={startGameMulti} />
              </div>
            </motion.div>
          )}

          {/* ══ LOADING ══ */}
          {gameState === "loading" && (
            <div className="flex flex-col items-center gap-6 mt-20">
              <div className="relative">
                <div className="w-20 h-20 border-[6px] border-slate-100 dark:border-slate-800 rounded-full" />
                <div className="absolute top-0 left-0 w-20 h-20 border-[6px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-sm">
                Đang tải {selectedLevel}...
              </p>
            </div>
          )}

          {/* ══ PLAYING ══ */}
          {gameState === "playing" && currentWord && (
            <motion.div key="playing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl space-y-8 mt-4">
              <div className={`relative bg-white dark:bg-slate-900 rounded-[40px] p-12 md:p-16 text-center shadow-2xl transition-all duration-300 border-4 ${
                feedback === "correct" ? "border-emerald-500 shadow-emerald-500/20"
                  : feedback === "wrong" ? "border-red-500 shadow-red-500/20"
                    : "border-white dark:border-slate-800 shadow-slate-200/50 dark:shadow-none"
              }`}>
                <AnimatePresence>
                  {feedback === "correct" && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1.2 }} exit={{ scale: 0 }}
                      className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white p-2.5 rounded-full shadow-lg"><CheckCircle2 size={28} /></motion.div>
                  )}
                  {feedback === "wrong" && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1.2 }} exit={{ scale: 0 }}
                      className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white p-2.5 rounded-full shadow-lg"><XCircle size={28} /></motion.div>
                  )}
                </AnimatePresence>
                <h1 className={`${questionText?.length > 10 ? "text-3xl md:text-5xl" : "text-6xl md:text-8xl"} font-black text-slate-800 dark:text-white mb-4 tracking-tighter`}>{questionText}</h1>
                <p className="text-xl md:text-2xl text-slate-400 font-bold tracking-widest uppercase">{questionSub}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lựa chọn</span>
                  <div className="flex items-center gap-2">
                    <button onClick={buyPowerup}
                      className="px-3 py-1 bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-700 text-amber-500 rounded-lg text-[9px] font-black hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all flex items-center gap-1 shadow-sm">
                      MUA ⚡ (-50🪙)
                    </button>
                    <button onClick={handleUsePowerup} disabled={powerups <= 0}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${powerups > 0 ? "bg-amber-400 text-white shadow-md active:scale-95" : "bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed"}`}>
                      SỬ DỤNG ⚡ ({powerups})
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                  <div className="absolute -right-24 top-1/2 -translate-y-1/2 hidden lg:block">
                    <AnimatePresence>
                      {comboFx && (
                        <motion.div initial={{ x: -20, opacity: 0, scale: 0.8 }} animate={{ x: 0, opacity: 1, scale: 1.1 }} exit={{ opacity: 0, scale: 0.5, x: 20 }}
                          className="bg-amber-500 text-white font-black px-5 py-2.5 rounded-2xl shadow-2xl shadow-amber-500/30 whitespace-nowrap rotate-12 border-4 border-white dark:border-slate-900 text-sm">{comboFx}</motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {options.map((opt, idx) => {
                    const isRemoved = opt.id === removedOptionId;
                    return (
                      <button key={opt.id} disabled={!!feedback || isRemoved} onClick={() => handleAnswer(opt.id)}
                        className={`group relative overflow-hidden p-5 rounded-2xl border-2 text-lg font-black transition-all text-left flex items-center gap-4 shadow-sm active:scale-[0.97] ${
                          isRemoved ? "opacity-0 pointer-events-none"
                            : feedback === "correct" && opt.id === currentWord.id ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/30"
                              : feedback === "wrong" && opt.id === currentWord.id ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400 text-emerald-700 dark:text-emerald-300"
                                : feedback ? "opacity-50 border-slate-100 dark:border-slate-800 text-slate-300"
                                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-emerald-400 text-slate-700 dark:text-slate-200"
                        }`}>
                        {!isRemoved && (
                          <>
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                              feedback === "correct" && opt.id === currentWord.id ? "bg-white/20 text-white"
                                : feedback === "wrong" && opt.id === currentWord.id ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-700"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                            }`}>{idx + 1}</span>
                            <span className="flex-1 line-clamp-2">{opt.display}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ FINISHED ══ */}
          {gameState === "finished" && (
            <motion.div key="finished" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 bg-white dark:bg-slate-900 p-10 md:p-14 rounded-[48px] shadow-2xl w-full max-w-lg border-2 border-slate-50 dark:border-slate-800 mt-8">
              <div className="space-y-3">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto text-amber-500">
                  <Award size={52} className="animate-bounce" />
                </div>
                <h2 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">HẾT GIỜ!</h2>
                <p className="text-slate-400 font-bold tracking-[0.2em] uppercase text-[10px]">Kết quả trận đấu</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm</p>
                  <p className="text-4xl font-black text-emerald-500">{score}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kỷ lục</p>
                  <p className="text-4xl font-black text-amber-500">{highScore}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => startGame(selectedLevel)}
                  className="w-full bg-[#1CB0F6] hover:bg-[#189ddb] text-white font-black py-4 rounded-2xl text-base shadow-[0_5px_0_0_#189ddb] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2">
                  <RotateCcw size={18} /> CHƠI LẠI
                </button>
                <button onClick={() => setGameState("level_select")}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-500 font-black py-4 rounded-2xl text-xs transition-all">
                  ĐỔI ĐỀ MỤC
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
