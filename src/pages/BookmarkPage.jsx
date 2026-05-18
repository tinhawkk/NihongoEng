import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useBookmarkStore } from "../store/useBookmarkStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Trash2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  X,
  Volume2,
  Trash,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Search } from "lucide-react";
import { tts } from "../utils/tts";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const BookmarkPage = () => {
  const navigate = useNavigate();
  const bookmarks = useBookmarkStore(state => state.bookmarks);
  const removeBookmark = useBookmarkStore(state => state.removeBookmark);
  const clearBookmarks = useBookmarkStore(state => state.clearBookmarks);
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState(0);

  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  const [search, setSearch] = useState("");
  const [filterDeck, setFilterDeck] = useState("all");

  const filteredBookmarks = React.useMemo(() => {
    return [...bookmarks]
      .sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0))
      .filter(b => {
        const meaningStr = Array.isArray(b.meaning) ? b.meaning.join(", ") : (b.meaning || "");
        const matchesSearch =
          search === "" ||
          b.word?.toLowerCase().includes(search.toLowerCase()) ||
          meaningStr.toLowerCase().includes(search.toLowerCase()) ||
          b.reading?.toLowerCase().includes(search.toLowerCase());
        const matchesDeck = filterDeck === "all" || b.deck === filterDeck;
        return matchesSearch && matchesDeck;
      });
  }, [bookmarks, search, filterDeck]);

  const uniqueDecks = React.useMemo(() => {
    const decks = bookmarks.map(b => b.deck).filter(Boolean);
    return ["all", ...new Set(decks)];
  }, [bookmarks]);

  const totalPages = Math.ceil(filteredBookmarks.length / ITEMS_PER_PAGE);

  // defensive check for out of bounds (after deletion or filter change)
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0) {
      setCurrentPage(1);
    }
  }, [filteredBookmarks.length, totalPages, currentPage]);

  // Reset page on search or filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterDeck]);

  const startFlashcard = () => {
    setCards(shuffleArray(filteredBookmarks));
    setCurrentIdx(0);
    setFlipped(false);
    setFlashcardMode(true);
  };

  const goNext = useCallback(() => {
    setCurrentIdx(prev => {
      if (prev >= cards.length - 1) return prev;
      setDirection(1);
      setFlipped(false);
      return prev + 1;
    });
  }, [cards.length]);

  const goPrev = useCallback(() => {
    setCurrentIdx(prev => {
      if (prev <= 0) return prev;
      setDirection(-1);
      setFlipped(false);
      return prev - 1;
    });
  }, []);

  // Keyboard support
  React.useEffect(() => {
    if (!flashcardMode) return;
    const handleKey = e => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        setFlipped(f => !f);
      } else if (e.key === "Escape") setFlashcardMode(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [flashcardMode, goNext, goPrev]);

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-6xl">📑</div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Chưa có từ nào được lưu</h2>
        <p className="text-slate-400 font-medium">
          Vào deck hoặc từ điển, nhấn ⭐ để bookmark từ vựng bạn muốn ôn tập.
        </p>
        <Button variant="primary" onClick={() => navigate("/")}>
          Về trang chủ
        </Button>
      </div>
    );
  }

  // ─── Flashcard Mode ─────────────────────
  if (flashcardMode && cards.length > 0) {
    const card = cards[currentIdx];
    const progress = ((currentIdx + 1) / cards.length) * 100;

    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFlashcardMode(false)}
            className="flex items-center gap-2 text-slate-400 font-bold hover:text-slate-600 transition-colors"
          >
            <X size={20} /> Thoát
          </button>
          <span className="text-sm font-black text-slate-400">
            {currentIdx + 1}/{cards.length}
          </span>
        </div>

        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#FFC800]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIdx}
            custom={direction}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.25 }}
            onClick={() => setFlipped(f => !f)}
            className="cursor-pointer select-none"
          >
            <div
              className={`relative w-full min-h-[320px] rounded-3xl border-2 transition-all duration-300 ${flipped ? "border-[#FFC800]" : "border-slate-200"}`}
            >
              {/* Front */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center p-8 rounded-3xl bg-white dark:bg-slate-800 transition-opacity duration-300 ${flipped ? "opacity-0 pointer-events-none" : "opacity-100"}`}
              >
                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      tts.playWithFallback(card.audio, card.word);
                    }}
                    onMouseEnter={() => tts.playWithFallback(card.audio, card.word)}
                    className="p-3 bg-blue-50 text-blue-500 rounded-2xl hover:bg-blue-100 transition-all border-b-2 border-blue-200 active:border-b-0 active:translate-y-0.5"
                  >
                    <Volume2 size={24} />
                  </button>
                </div>
                <p className="text-5xl font-black text-slate-800 dark:text-white mb-3 text-center">{card.word}</p>
                {card.reading && (
                  <p className="text-xl text-slate-400 font-medium">{card.reading}</p>
                )}
                {card.hanViet && (
                  <p className="text-sm text-slate-300 font-bold mt-2">HV: {card.hanViet}</p>
                )}
                <p className="text-xs text-slate-300 font-bold mt-6 uppercase tracking-widest">
                  Nhấn để xem nghĩa
                </p>
              </div>
              {/* Back */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center p-8 rounded-3xl bg-[#FFF8D9] transition-opacity duration-300 ${flipped ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                <p className="text-3xl font-black text-[#FF9600] text-center mb-4">
                  {card.meaning}
                </p>
                {card.partOfSpeech && (
                  <p className="text-sm text-slate-400 font-bold">{card.partOfSpeech}</p>
                )}
                {card.example && (
                  <div className="mt-4 bg-white dark:bg-slate-800/80 rounded-xl p-3 w-full max-w-xs">
                    <p className="text-sm text-slate-500 font-medium text-center">{card.example}</p>
                  </div>
                )}
                <p className="text-xs text-slate-300 font-bold mt-6 uppercase tracking-widest">
                  Nhấn để lật lại
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentIdx === 0}
            className="p-3 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={24} className="text-slate-400" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCards(shuffleArray(filteredBookmarks));
                setCurrentIdx(0);
                setFlipped(false);
              }}
              className="p-3 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 transition-all"
              title="Trộn"
            >
              <Shuffle size={20} className="text-slate-400" />
            </button>
            <button
              onClick={() => {
                setCurrentIdx(0);
                setFlipped(false);
              }}
              className="p-3 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 transition-all"
              title="Về đầu"
            >
              <RotateCcw size={20} className="text-slate-400" />
            </button>
          </div>
          <button
            onClick={goNext}
            disabled={currentIdx === cards.length - 1}
            className="p-3 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all"
          >
            <ChevronRight size={24} className="text-slate-400" />
          </button>
        </div>

        <p className="text-center text-xs text-slate-300 font-bold">
          ⌨️ ← → chuyển thẻ | ↑↓ Enter lật | Esc thoát
        </p>
      </div>
    );
  }

  // ─── Bookmark List ──────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Từ đã lưu ⭐</h2>
            <p className="text-sm text-slate-400 font-bold">{bookmarks.length} từ vựng</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (window.confirm("Xoá toàn bộ bookmark? Hành động này không thể hoàn tác.")) {
              clearBookmarks();
            }
          }}
          className="p-3 text-slate-300 hover:text-[#FF4B4B] hover:bg-red-50 rounded-2xl transition-all"
          title="Xoá tất cả"
        >
          <Trash size={22} />
        </button>
      </div>

      <div className="space-y-3">
        <Button variant="secondary" onClick={startFlashcard} className="w-full">
          <BookOpen size={18} /> Ôn tập Flashcard ({filteredBookmarks.length})
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm từ đã lưu..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#1CB0F6] transition-all font-medium text-sm shadow-sm"
            />
          </div>
          <select
            value={filterDeck}
            onChange={e => setFilterDeck(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#1CB0F6] transition-all font-bold text-sm shadow-sm appearance-none text-slate-600"
          >
            <option value="all">Tất cả bộ bài</option>
            {uniqueDecks.filter(d => d !== "all").map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredBookmarks.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-sm font-black text-slate-500 dark:text-slate-400 px-2">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">
            Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredBookmarks.length)}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {filteredBookmarks.length === 0 && (
          <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <p className="text-slate-400 font-bold">Không tìm thấy từ nào khớp với tìm kiếm 🔍</p>
          </div>
        )}
        {filteredBookmarks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((word, i) => (
          <motion.div
            key={word.id || `${word.word}-${word.deck}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="bg-white dark:bg-slate-800 border-2 border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800 dark:text-white text-lg">{word.word}</p>
                {word.reading && <span className="text-sm text-slate-400">({word.reading})</span>}
                <span
                  className="text-[10px] font-black text-white px-2 py-0.5 rounded-full uppercase"
                  style={{ 
                    backgroundColor: 
                      word.deck?.startsWith('n') ? 
                      (['#58CC02','#FF9600','#FF4B4B','#A342FF','#37464F'][5 - parseInt(word.deck[1])] || '#1CB0F6') : 
                      '#1CB0F6' 
                  }}
                >
                  {word.deck}
                </span>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-500 font-medium truncate">
                {Array.isArray(word.meaning) ? word.meaning.join(", ") : word.meaning}
              </p>
              {word.hanViet && <span className="text-xs text-orange-400 font-black">HV: {word.hanViet}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => tts.playWithFallback(word.audio, word.word)}
              className="p-2 text-slate-300 hover:text-blue-500 transition-all"
              title="Nghe"
            >
              <Volume2 size={18} />
            </button>
            <button
              onClick={() => removeBookmark(word.word, word.deck)}
              className="p-2 text-slate-300 hover:text-[#FF4B4B] hover:bg-red-50 rounded-xl transition-all shrink-0"
              title="Xoá bookmark"
            >
              <Trash2 size={18} />
            </button>
          </div>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-6">
           <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
             {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
               let pageNum;
               if (totalPages <= 5) pageNum = i + 1;
               else if (currentPage <= 3) pageNum = i + 1;
               else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
               else pageNum = currentPage - 2 + i;

               return (
                 <button
                   key={pageNum}
                   onClick={() => {
                     setCurrentPage(pageNum);
                     window.scrollTo({ top: 0, behavior: "smooth" });
                   }}
                   className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                     currentPage === pageNum
                       ? "bg-[#FFC800] text-white shadow-md shadow-amber-200"
                       : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                   }`}
                 >
                   {pageNum}
                 </button>
               );
             })}
           </div>
        </div>
      )}
    </div>
  );
};
