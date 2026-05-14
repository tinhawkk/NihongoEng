import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { vocabularyRepository } from "../data/repositories/NhostVocabularyRepository";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Zap,
  Shuffle,
  Sparkles,
  Volume2,
  Star,
  Trophy,
  Flame,
  Play,
} from "lucide-react";
import { calculateCurrentStreak } from "../utils/streakUtils";
import { Button } from "../components/ui/Button";
import { useUserStore } from "../store/useUserStore";
import { useBookmarkStore } from "../store/useBookmarkStore";
import { tts } from "../utils/tts";
import { nhostService } from "../services/nhostService";
import { renderFurigana, removeFurigana } from "../utils/furigana";
import { DECK_LABELS } from "../utils/constants";
import confetti from "canvas-confetti";

const DECK_COLORS = {
  eng: "#1CB0F6",
  n5: "#58CC02",
  n4: "#FF9600",
  n3: "#FF4B4B",
  n2: "#A342FF",
  n1: "#37464F",
  jlpt: "#CE82FF",
  grammar: "#FFC800",
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Hàm loại bỏ furigana (từ trong ngoặc)

export const FlashcardPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [allWords, setAllWords] = useState([]);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  const updateFlashcardProgress = useUserStore(s => s.updateFlashcardProgress);
  const updateSrsItem = useUserStore(s => s.updateSrsItem);
  const getNextInterval = useUserStore(s => s.getNextInterval);
  const savedProgress = useUserStore(s => s.account?.flashcardProgress?.[deckId]);
  const account = useUserStore(s => s.account);
  const vocaSource = useUserStore(s => s.vocaSource);

  const { bookmarks, addBookmark, removeBookmark } = useBookmarkStore();
  const isBookmarked = word => bookmarks.some(b => b.word === word);

  const color = DECK_COLORS[deckId] || "#58CC02";
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId);

  const [deckMetadata, setDeckMetadata] = useState(null);

  // Lấy Metadata cho bài học từ DB
  useEffect(() => {
    if (isUUID) {
      const q = `query GetDeckTitle($id: String!) {
        decks_by_pk(id: $id) {
          title
        }
      }`;
      const normalizedId = deckId.toLowerCase();
      nhostService.fetchGraphQL(q, "GetDeckTitle", { id: normalizedId }).then(res => {
        if (res.data?.decks_by_pk) {
          setDeckMetadata(res.data.decks_by_pk);
        }
      });
    }
  }, [deckId, isUUID]);

  // Tự động đọc từ / ví dụ khi lướt hoặc lật
  useEffect(() => {
    if (showSetup || isFinished || words.length === 0) return;
    const card = words[currentIdx];
    if (!card) return;

    // Tạo độ trễ nhỏ để animation thẻ chạy mượt trước khi nói
    const timer = setTimeout(() => {
      const rate = isSlow ? 0.6 : 1.0;
      if (!flipped) {
        tts.playWithFallback(card.audio, removeFurigana(card.word), rate);
      } else if (flipped && card.example) {
        tts.playWithFallback(null, removeFurigana(card.example), rate);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [currentIdx, flipped, showSetup, isFinished, words, isSlow]);

  useEffect(() => {
    setTimeout(() => setLoading(true), 0);
    const params = new URLSearchParams(window.location.search);
    const forcedSource = params.get("source");
    const isAdvancedDecks =
      isUUID || /^n[1-5]$/i.test(deckId) || ["ENG", "IT"].includes(deckId.toUpperCase());
    const source = isAdvancedDecks ? forcedSource || vocaSource : "sheet";
    const filter = params.get("filter") || "all";
    vocabularyRepository.loadDeck(deckId, source).then(data => {
      let filtered = data;
      if (filter === "kanji") {
        filtered = data.filter(w => w.type === "kanji");
      } else if (filter === "voca") {
        filtered = data.filter(w => w.type === "voca" || !w.type);
      }
      setAllWords(filtered);

      // Tự động bỏ qua Setup Screen đối với các bài học cụ thể (isUUID)
      if (isUUID && filtered.length > 0) {
        setWords(filtered);

        // Auto-resume logic
        const state = useUserStore.getState();
        const savedProgress = state.account?.flashcardProgress?.[deckId];

        if (
          savedProgress &&
          savedProgress.lastIndex &&
          savedProgress.lastIndex < filtered.length - 1
        ) {
          setCurrentIdx(Math.min(savedProgress.lastIndex, filtered.length - 1));
        } else {
          setCurrentIdx(0);
          state.updateFlashcardProgress(deckId, {
            lastIndex: 0,
            totalCards: filtered.length,
            studied: 0,
          });
        }
        setShowSetup(false);
      }

      setLoading(false);
    });
  }, [deckId, vocaSource, isUUID]);

  const handleStart = (count, resume = false) => {
    let selectedWords = [...allWords];
    if (count < allWords.length) {
      selectedWords = selectedWords.slice(0, count);
    }

    setWords(selectedWords);

    if (resume && savedProgress?.lastIndex) {
      setCurrentIdx(Math.min(savedProgress.lastIndex, selectedWords.length - 1));
    } else {
      setCurrentIdx(0);
      // Reset progress in store if starting fresh
      updateFlashcardProgress(deckId, {
        lastIndex: 0,
        totalCards: selectedWords.length,
        studied: 0,
      });
    }

    setShowSetup(false);
    setIsFinished(false);
  };

  const card = words[currentIdx];

  const triggerSuccess = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: [color, "#ffffff", "#ffd700"],
    });
  }, [color]);

  const isWordEnglish = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng') || (card?.word && !/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(card?.word));

  const goNext = useCallback(() => {
    if (currentIdx >= words.length - 1) {
      useUserStore.getState().updateStreak();
      setIsFinished(true);
      return;
    }
    const nextIdx = currentIdx + 1;
    setDirection(1);
    setFlipped(false);
    setShowMnemonic(false);
    setCurrentIdx(nextIdx);

    updateFlashcardProgress(deckId, {
      lastIndex: nextIdx,
      totalCards: words.length,
      studied: nextIdx + 1,
    });

    if ((nextIdx + 1) % 10 === 0) triggerSuccess();
  }, [currentIdx, words, deckId, updateFlashcardProgress, triggerSuccess]);

  const goPrev = useCallback(() => {
    if (currentIdx <= 0) return;
    const prevIdx = currentIdx - 1;
    setDirection(-1);
    setFlipped(false);
    setShowMnemonic(false);
    setCurrentIdx(prevIdx);

    // Cập nhật lại vị trí hiện tại vào store để đồng bộ
    updateFlashcardProgress(deckId, {
      lastIndex: prevIdx,
      totalCards: words.length,
      studied: prevIdx + 1,
    });
  }, [currentIdx, words, deckId, updateFlashcardProgress]);

  const handleShuffle = () => {
    const shuffled = shuffleArray(allWords);
    setWords(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
    setShowMnemonic(false);
    updateFlashcardProgress(deckId, {
      lastIndex: 0,
      totalCards: shuffled.length,
      studied: 1,
    });
  };

  const handleReset = () => {
    setWords([...allWords]);
    setCurrentIdx(0);
    setFlipped(false);
    setShowMnemonic(false);
    updateFlashcardProgress(deckId, {
      lastIndex: 0,
      totalCards: allWords.length,
      studied: 1,
    });
  };

  useEffect(() => {
    // Chỉ kích hoạt phím tắt khi không ở màn hình Setup hoặc Finish
    if (showSetup || isFinished || loading) return;

    const handleKey = e => {
      // Khi đã lật, cho phép dùng phím số 1,2,3,4 để đánh giá
      if (flipped) {
        if (["1", "2", "3", "4"].includes(e.key)) {
          e.preventDefault();
          const rating = parseInt(e.key) - 1;
          const interval = getNextInterval(card?.id || card?.word, rating);
          updateSrsItem(card?.id || card?.word, { ...card, deckId: deckId === "srs" ? card.deckId : deckId }, rating, {
            source: "flashcard",
            deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
            deckName: deckId === "srs" ? (card.deckName || card.deck) : (deckMetadata?.title || DECK_LABELS[deckId] || deckId),
          });
          goNext();
          return;
        }
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setFlipped(f => !f);
      } else if (e.key === "h" || e.key === "H") {
        setShowMnemonic(s => !s);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, showSetup, isFinished, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-[#1CB0F6] rounded-full animate-spin" />
        <p className="text-slate-400 font-black animate-pulse">NHẬP THẦN NHẬP THÁNH...</p>
      </div>
    );
  }

  if (words.length === 0 && !loading) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-slate-400 font-bold text-lg">Không có từ vựng nào 😢</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Trang chủ
        </Button>
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-[#1CB0F6] rounded-[32px] flex items-center justify-center mx-auto shadow-xl">
            <Sparkles size={48} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-800">Flashcards</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
            {DECK_LABELS[deckId] || deckId.toUpperCase()} • {allWords.length} TỪ VỰNG
          </p>
        </div>

        <div className="space-y-4">
          {savedProgress?.studied > 0 && savedProgress?.studied < allWords.length && (
            <button
              onClick={() => handleStart(allWords.length, true)}
              className="w-full py-5 bg-[#58CC02] text-white rounded-3xl font-black text-lg shadow-[0_4px_0_0_#46A302] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Play size={24} fill="white" />
              TIẾP TỤC HỌC (Câu {savedProgress.studied})
            </button>
          )}

          <button
            onClick={() => handleStart(allWords.length, false)}
            className="w-full py-5 bg-white border-2 border-slate-200 text-slate-600 rounded-3xl font-black text-lg hover:border-[#1CB0F6] hover:text-[#1CB0F6] transition-all flex items-center justify-center gap-3"
          >
            <RotateCcw size={24} />
            HỌC TẤT CẢ ({allWords.length})
          </button>

          <div className="grid grid-cols-2 gap-3">
            {[10, 20, 50, 100]
              .filter(c => c < allWords.length)
              .map(c => (
                <button
                  key={c}
                  onClick={() => handleStart(c, false)}
                  className="py-4 bg-slate-50 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-sm hover:bg-white hover:border-slate-200 transition-all"
                >
                  Học {c} từ
                </button>
              ))}
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => navigate(`/deck/${deckId}`)}
          className="w-full text-slate-400"
        >
          Quay lại bộ sưu tập
        </Button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center space-y-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center mx-auto shadow-2xl"
        >
          <Trophy size={64} className="text-white" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-800">Tuyệt vời!</h2>
          <p className="text-slate-400 font-bold">Bạn đã hoàn thành bộ Flashcard này.</p>
        </div>

        <div className="pt-4 space-y-4">
          <button
            onClick={() => setShowSetup(true)}
            className="w-full py-5 bg-[#1CB0F6] text-white rounded-3xl font-black text-lg shadow-[0_4px_0_0_#1899D6] hover:scale-[1.02] transition-all"
          >
            HỌC LẠI
          </button>
          <button
            onClick={() => navigate(`/deck/${deckId}`)}
            className="w-full py-5 bg-white border-2 border-slate-200 text-slate-500 rounded-3xl font-black text-lg hover:bg-slate-50 transition-all"
          >
            QUAY LẠI BỘ SƯU TẬP
          </button>
        </div>
      </div>
    );
  }

  const progress = ((currentIdx + 1) / words.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-0 py-4 lg:py-6 space-y-4 lg:space-y-8 min-h-[90vh] flex flex-col pb-32 lg:pb-8">
      {/* Header with Stats */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 lg:p-4 rounded-2xl lg:rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => navigate(`/deck/${deckId}`)}
          className="flex items-center gap-1.5 lg:gap-2 text-slate-500 font-black hover:text-slate-800 transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={20} className="lg:w-6 lg:h-6" strokeWidth={3} />{" "}
          <span className="text-xs lg:text-base truncate max-w-[120px] lg:max-w-none">
            {new URLSearchParams(window.location.search).get("filter") === "kanji" ? "Hán tự" : ""}{" "}
            {deckMetadata?.title || DECK_LABELS[deckId] || (isUUID ? "Bộ thẻ" : deckId?.toUpperCase())}
          </span>
        </button>
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-500/10 px-2 lg:px-3 py-1 rounded-full">
            <Flame size={14} className="lg:w-4 lg:h-4 text-orange-500 fill-orange-500" />
            <span className="text-[10px] lg:text-sm font-black text-orange-600 dark:text-orange-400">
              {calculateCurrentStreak(account?.streak)}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-500/10 px-2 lg:px-3 py-1 rounded-full">
            <Zap size={14} className="lg:w-4 lg:h-4 text-blue-500 fill-blue-500" />
            <span className="text-[10px] lg:text-sm font-black text-blue-600 dark:text-blue-400">
              {Math.floor(currentIdx / 5)}
            </span>
          </div>
          <span className="text-sm lg:text-lg font-black text-slate-400">
            {currentIdx + 1}<span className="text-slate-200">/</span>{words.length}
          </span>
        </div>
      </div>

      {/* Progress Bar - Premium Style */}
      <div className="h-2.5 lg:h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-inner">
        <motion.div
           className="h-full rounded-full"
           style={{
             backgroundColor: color,
             background: `linear-gradient(90deg, ${color}, ${color}dd)`,
           }}
           initial={{ width: 0 }}
           animate={{ width: `${progress}%` }}
           transition={{ type: "spring", stiffness: 50, damping: 20 }}
        />
      </div>

      {/* Flashcard Container */}
      <div
        className="relative flex-grow flex flex-col justify-center perspective-2000"
        style={{ perspective: "2000px" }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIdx}
            custom={direction}
            initial={{ opacity: 0, x: direction * 200, rotateY: direction * 10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: direction * -200, rotateY: direction * -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full h-full min-h-[360px] lg:min-h-[420px] relative"
          >
            <div
              onClick={() => setFlipped(f => !f)}
              className="w-full h-full min-h-[360px] lg:min-h-[420px] relative transition-all duration-700 cursor-pointer group"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* FRONT SIDE */}
              <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-800 rounded-[2rem] lg:rounded-[40px] border-4 border-slate-100 dark:border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden group-hover:border-slate-200 dark:group-hover:border-slate-600 transition-colors">
                <div className="absolute top-0 right-0 p-3 lg:p-6 flex lg:flex-col gap-2 z-10">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowMnemonic(!showMnemonic);
                    }}
                    className={`p-2 lg:p-3 rounded-xl lg:rounded-2xl transition-all ${showMnemonic ? "bg-yellow-100 text-yellow-600 shadow-inner" : "bg-slate-50 dark:bg-slate-700 text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"}`}
                  >
                    <Lightbulb size={20} className={showMnemonic ? "animate-pulse" : ""} />
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setIsSlow(!isSlow);
                    }}
                    className={`p-2 lg:p-3 rounded-xl lg:rounded-2xl transition-all shadow-sm border-b-2 active:border-b-0 active:translate-y-0.5 ${isSlow ? "bg-amber-500 text-white border-amber-600" : "bg-slate-50 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600"}`}
                  >
                    <span className="text-lg lg:text-xl leading-none">{isSlow ? "🐢" : "🐇"}</span>
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      tts.playWithFallback(card?.audio, card?.word, isSlow ? 0.6 : 1.0);
                    }}
                    className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 border-b-2 border-blue-200 dark:border-blue-900 shadow-sm"
                  >
                    <Volume2 size={20} />
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (isBookmarked(card?.word)) removeBookmark(card?.word);
                      else addBookmark({ ...card, deck: deckId });
                    }}
                    className={`p-2 lg:p-3 rounded-xl lg:rounded-2xl transition-all border-b-2 ${isBookmarked(card?.word) ? "bg-amber-100 text-amber-500 border-amber-200 shadow-inner" : "bg-slate-50 dark:bg-slate-700 text-slate-300 border-slate-200 dark:border-slate-600"}`}
                  >
                    <Star size={20} fill={isBookmarked(card?.word) ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="absolute inset-0 p-4 lg:p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col items-center">
                  <div className="flex-grow shrink-0 min-h-[2rem]"></div>
                  
                  <div className="space-y-4 lg:space-y-6 text-center w-full max-w-md shrink-0">
                    <motion.h1
                      className={`${(card?.word?.length > 30) ? 'text-2xl lg:text-4xl' : (card?.word?.length > 15) ? 'text-3xl lg:text-5xl' : (card?.word?.length > 10) ? 'text-4xl lg:text-6xl' : 'text-5xl lg:text-8xl'} font-black text-slate-800 dark:text-white tracking-tight break-words whitespace-normal leading-tight text-center px-4`}
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                    >
                      {renderFurigana(card?.word)}
                    </motion.h1>
                    <AnimatePresence>
                      {showMnemonic && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="mt-4 lg:mt-8 space-y-3 lg:space-y-4"
                        >
                          {(card?.reading || card?.hanViet) && (
                            <div className="space-y-1 lg:space-y-2">
                              {card?.reading && (
                                <p className="text-xl lg:text-2xl text-slate-400 dark:text-slate-300 font-bold">
                                  {isWordEnglish ? `/${card.reading}/` : card.reading}
                                </p>
                              )}
                              {card?.hanViet && !isWordEnglish && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 px-3 py-1 rounded-lg inline-block border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs lg:text-md text-slate-400 dark:text-slate-300 font-black uppercase tracking-widest">
                                    Hán Việt: {card.hanViet}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {card?.mnemonic && (
                            <div className="p-3 lg:p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl lg:rounded-2xl border-2 border-yellow-100 dark:border-yellow-900/30 max-w-sm mx-auto">
                              <p className="text-xs lg:text-sm text-yellow-700 dark:text-yellow-200 italic font-medium leading-relaxed">
                                💡 {card.mnemonic}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex-grow shrink-0 min-h-[4rem]"></div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6 pointer-events-none flex justify-center bg-gradient-to-t from-white dark:from-slate-800 via-white/80 dark:via-slate-800/80 to-transparent">
                  <span className="text-slate-300 font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">
                    Nhấn thẻ để lật
                  </span>
                </div>
              </div>

              {/* BACK SIDE */}
              <div
                className="absolute inset-0 backface-hidden bg-white dark:bg-slate-800 rounded-[2rem] lg:rounded-[40px] border-4 shadow-xl overflow-hidden"
                style={{
                  borderColor: color,
                  transform: "rotateY(180deg)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-[inherit]"
                  style={{ backgroundColor: color }}
                />

                <div className="absolute inset-0 p-4 lg:p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col items-center">
                  <div className="flex-grow shrink-0 min-h-[2rem]"></div>
                  
                  <div className="space-y-4 lg:space-y-5 text-center max-w-md w-full shrink-0">
                    <Sparkles size={24} className="mx-auto lg:w-8 lg:h-8" style={{ color }} />
                    <h2 className={`${(card?.meaning?.length > 60) ? 'text-lg lg:text-xl' : (card?.meaning?.length > 40) ? 'text-xl lg:text-3xl' : 'text-2xl lg:text-4xl'} font-black leading-tight break-words whitespace-normal px-4`} style={{ color }}>
                      {card?.meaning}
                    </h2>

                    {card?.partOfSpeech && (
                      <div
                        className="inline-block px-2.5 py-0.5 rounded-lg text-white font-black text-[10px] uppercase"
                        style={{ backgroundColor: color }}
                      >
                        {card.partOfSpeech}
                      </div>
                    )}

                    {card?.example && (
                      <div className="mt-3 lg:mt-6 space-y-2 lg:space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 lg:p-6 rounded-2xl lg:rounded-[30px] border-2 border-white dark:border-slate-800 shadow-inner">
                        <p className="text-[1rem] lg:text-xl text-slate-700 dark:text-slate-200 font-bold leading-relaxed">
                          {renderFurigana(card.example)}
                        </p>
                        {card.exampleMeaning && (
                          <p className="text-[11px] lg:text-sm text-slate-400 font-medium">{card.exampleMeaning}</p>
                        )}
                      </div>
                    )}

                    {(card?.definitionEn || card?.definitionVi) && (
                      <div className="mt-3 lg:mt-5 bg-slate-50 dark:bg-slate-900/50 p-3 lg:p-5 rounded-2xl text-left border-l-[6px] shadow-sm" style={{ borderColor: color }}>
                        {card.definitionEn && (
                          <p className="text-[13px] lg:text-[15px] text-slate-700 dark:text-slate-200 font-bold whitespace-pre-wrap mb-2">
                             {card.definitionEn}
                          </p>
                        )}
                        {card.definitionVi && (
                          <p className="text-[11px] lg:text-xs text-slate-400 font-medium italic mt-1 whitespace-pre-wrap">
                             {card.definitionVi}
                          </p>
                        )}
                      </div>
                    )}

                    {card?.synonyms && (
                      <div className="mt-3 lg:mt-5 bg-purple-50 dark:bg-purple-900/20 p-3 lg:p-4 rounded-xl text-left border-l-4 border-purple-400">
                        <p className="text-xs lg:text-sm text-purple-600 dark:text-purple-300 font-bold flex flex-wrap items-center gap-1">
                          Liên quan: <span className="font-medium text-slate-600 dark:text-slate-300 break-words flex-1 leading-snug">{card.synonyms}</span>
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-grow shrink-0 min-h-[4rem]"></div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6 pointer-events-none flex justify-center bg-gradient-to-t from-white dark:from-slate-800 via-white/80 dark:via-slate-800/80 to-transparent z-10">
                  <span className="text-slate-300 font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">
                     Chạm để lật lại
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls / SRS Ratings - CONVERTED TO STICKY ON MOBILE */}
      <div className="fixed lg:relative bottom-0 left-0 right-0 lg:bottom-auto p-4 lg:p-0 bg-white/80 dark:bg-slate-900/80 lg:bg-transparent backdrop-blur-lg lg:backdrop-blur-none border-t lg:border-t-0 border-slate-100 dark:border-slate-800 lg:z-10 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 lg:gap-4 min-h-[60px] lg:min-h-[80px]">
          {flipped ? (
            <div className="w-full flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300">
              <p className="text-center font-bold text-slate-400 text-[9px] uppercase tracking-widest mb-2 lg:mb-3">
                Đánh giá mức độ nhớ
              </p>
              <div className="grid grid-cols-4 gap-2 lg:gap-3">
                {[
                  { rating: 0, label: "Lại", color: "text-red-500 border-red-200 bg-red-50 hover:bg-red-500 hover:text-white" },
                  { rating: 1, label: "Khó", color: "text-orange-500 border-orange-200 bg-orange-50 hover:bg-orange-500 hover:text-white" },
                  { rating: 2, label: "Tốt", color: "text-green-500 border-green-200 bg-green-50 hover:bg-green-500 hover:text-white" },
                  { rating: 3, label: "Dễ", color: "text-blue-500 border-blue-200 bg-blue-50 hover:bg-blue-500 hover:text-white" },
                ].map(btn => {
                  const interval = getNextInterval(card?.id || card?.word, btn.rating);
                  return (
                    <button
                      key={btn.rating}
                      onClick={e => {
                        e.stopPropagation();
                        updateSrsItem(card?.id || card?.word, { ...card, deckId: deckId === "srs" ? card.deckId : deckId }, btn.rating, {
                           source: "flashcard",
                           deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
                           deckName: deckId === "srs" ? (card.deckName || card.deck) : (deckMetadata?.title || DECK_LABELS[deckId] || deckId),
                        });
                        goNext();
                      }}
                      className={`flex flex-col items-center justify-center py-2 lg:py-3 rounded-xl lg:rounded-2xl border-2 transition-all active:translate-y-1 lg:shadow-[0_4px_0_0_currentColor] lg:active:shadow-none ${btn.color}`}
                    >
                      <span className="text-[8px] lg:text-[10px] font-black opacity-60 mb-0.5">{interval || "1m"}</span>
                      <span className="font-black text-xs lg:text-sm uppercase">{btn.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <button onClick={goPrev} disabled={currentIdx === 0} className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 disabled:opacity-30">
                <ChevronLeft size={24} strokeWidth={3} />
              </button>

              <div className="flex gap-2">
                <button onClick={handleShuffle} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400"><Shuffle size={18} /></button>
                <button onClick={handleReset} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400"><RotateCcw size={18} /></button>
              </div>

              <button
                onClick={goNext}
                disabled={currentIdx === words.length - 1}
                className="flex-1 max-w-[120px] h-12 lg:h-16 rounded-xl lg:rounded-3xl border-b-4 active:border-b-0 active:translate-y-1 flex items-center justify-center transition-all text-white font-black text-xs lg:text-lg gap-1"
                style={{ backgroundColor: color, borderBottomColor: color + "cc" }}
              >
                BỎ QUA <ChevronRight size={18} strokeWidth={3} />
              </button>
            </>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .perspective-2000 {
          perspective: 2000px;
        }
      `,
        }}
      />
    </div>
  );
};
