import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Keyboard, CheckCircle2, XCircle, Volume2,
  Star, SkipForward, ChevronRight, Zap, RotateCcw
} from "lucide-react";
import { loadDeck } from "../api/loader";
import { useUserStore } from "../store/useUserStore";
import { useBookmarkStore } from "../store/useBookmarkStore";
import { tts } from "../utils/tts";
import { nhostService } from "../services/nhostService";
import confetti from "canvas-confetti";

const DECK_COLORS = {
  n1: "#FF4B4B", n2: "#FF9600", n3: "#1CB0F6", n4: "#58CC02", n5: "#A855F7",
  ENG: "#3B82F6", IT: "#10B981",
};

const DECK_LABELS = {
  n1: "JLPT N1", n2: "JLPT N2", n3: "JLPT N3", n4: "JLPT N4", n5: "JLPT N5",
  ENG: "600 TOEIC", IT: "IT Vocab", srs: "SRS Review",
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Normalize for comparison
function normalize(str) {
  if (!str) return "";
  return str.toLowerCase().trim()
    .replace(/[\s\u3000]+/g, "") // Remove spaces
    .replace(/[<>()[\]（）［］【】〜~.．…・]/g, "") // Remove symbols for leniency
    .replace(/ー/g, ""); // Remove long vowel mark
}

export const TypingPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [allWords, setAllWords] = useState([]);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong'
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const inputRef = useRef(null);

  const vocaSource = useUserStore(s => s.vocaSource);
  const updateSrsItem = useUserStore(s => s.updateSrsItem);
  const { bookmarks, addBookmark, removeBookmark } = useBookmarkStore();
  const isBookmarked = word => bookmarks.some(b => b.word === word);

  const color = DECK_COLORS[deckId] || "#58CC02";
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId);

  const [deckMetadata, setDeckMetadata] = useState(null);

  // Load Metadata
  useEffect(() => {
    if (isUUID) {
      const q = `query GetDeckTitle($id: String!) {
        decks_by_pk(id: $id) { title }
      }`;
      nhostService.fetchGraphQL(q, "GetDeckTitle", { id: deckId }).then(res => {
        if (res.data?.decks_by_pk) {
          setDeckMetadata(res.data.decks_by_pk);
        }
      });
    }
  }, [deckId, isUUID]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const forcedSource = params.get("source");
    const isAdvanced = isUUID || /^n[1-5]$/i.test(deckId) || ["ENG", "IT"].includes(deckId.toUpperCase());
    const source = isAdvanced ? forcedSource || vocaSource : "sheet";

    if (deckId === "srs") {
      // Load SRS due items
      const srsData = useUserStore.getState().account?.srsData || {};
      const todayStr = new Date().toLocaleDateString('en-CA');
      const due = Object.values(srsData).filter(item => {
        const reviewDate = new Date(item.nextReview).toLocaleDateString('en-CA');
        return reviewDate <= todayStr;
      });
      const shuffled = shuffleArray(due);
      setAllWords(shuffled);
      setWords(shuffled);
      setLoading(false);
    } else {
      loadDeck(deckId, source).then(data => {
        // Normalize: sheet uses 'hiragana' & 'english', Nhost uses 'furigana' & 'word'
        const normalized = data.map(w => ({
          ...w,
          word: w.word || w.english || "",
          furigana: w.furigana || w.hiragana || "",
          meaning: w.meaning || w.hanViet || w.vietnamese || "",
        }));
        // Filter to items that have reading
        const withReading = normalized.filter(w => w.furigana?.trim());
        const shuffled = shuffleArray(withReading);
        setAllWords(shuffled);
        setWords(shuffled);
        setLoading(false);
      });
    }
  }, [deckId, vocaSource, isUUID]);

  // Auto-focus input
  useEffect(() => {
    if (!loading && words.length > 0 && !isFinished) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIdx, loading, isFinished, words]);

  const card = words[currentIdx];

  const checkAnswer = useCallback(() => {
    if (!card || result) return;
    
    const userInput = normalize(input);
    const correctFurigana = normalize(card.furigana);
    // Also accept romaji converted to hiragana
    const userAsHiragana = normalize(romajiToHiragana(input));
    
    const isCorrect = userInput === correctFurigana || userAsHiragana === correctFurigana;
    
    setResult(isCorrect ? "correct" : "wrong");
    setShowAnswer(true);
    
    if (isCorrect) {
      setScore(s => ({ ...s, correct: s.correct + 1 }));
      tts.playWithFallback(card.audio, card.word);
      // Update SRS - typing correct = Good
      updateSrsItem(card.id || card.word, card, 3, {
        source: "typing",
        deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
        deckName: deckId === "srs" ? (card.deckName || card.deck) : (deckMetadata?.title || DECK_LABELS[deckId] || deckId),
      });
    } else {
      setScore(s => ({ ...s, wrong: s.wrong + 1 }));
      // Update SRS - typing wrong = Again
      updateSrsItem(card.id || card.word, card, 0, {
        source: "typing",
        deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
        deckName: deckId === "srs" ? (card.deckName || card.deck) : (deckMetadata?.title || DECK_LABELS[deckId] || deckId),
      });
    }
  }, [card, input, result, isUUID, deckId, updateSrsItem, deckMetadata]);

  const goNext = useCallback(() => {
    if (currentIdx >= words.length - 1) {
      setIsFinished(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      return;
    }
    setCurrentIdx(i => i + 1);
    setInput("");
    setResult(null);
    setShowAnswer(false);
  }, [currentIdx, words.length]);

  const skipWord = useCallback(() => {
    setResult("wrong");
    setShowAnswer(true);
    setScore(s => ({ ...s, wrong: s.wrong + 1 }));
  }, []);

  // Keyboard handler
  useEffect(() => {
    if (loading || isFinished) return;
    const handleKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (result) {
          goNext();
        } else if (input.trim()) {
          checkAnswer();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [loading, isFinished, result, input, goNext, checkAnswer]);

  const progress = words.length > 0 ? ((currentIdx + 1) / words.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-[#A342FF] rounded-full animate-spin" />
        <p className="text-slate-400 font-black animate-pulse">ĐANG TẢI...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto">
          <Keyboard size={40} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-black text-slate-600 dark:text-slate-300">Chưa có dữ liệu!</h2>
        <p className="text-sm text-slate-400 font-bold">Không tìm thấy từ vựng có furigana để luyện gõ.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-[#A342FF] text-white rounded-2xl font-black hover:bg-[#8B2FE0] transition-all shadow-lg shadow-purple-200/30"
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (isFinished) {
    const accuracy = Math.round((score.correct / (score.correct + score.wrong)) * 100) || 0;
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-6">
        <motion.div 
          initial={{ scale: 0 }} animate={{ scale: 1 }} 
          className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/30"
        >
          <Keyboard size={48} className="text-white" />
        </motion.div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">Hoàn thành!</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl">
            <p className="text-2xl font-black text-emerald-500">{score.correct}</p>
            <p className="text-[10px] font-black text-emerald-400 uppercase">Đúng</p>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl">
            <p className="text-2xl font-black text-red-500">{score.wrong}</p>
            <p className="text-[10px] font-black text-red-400 uppercase">Sai</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-2xl">
            <p className="text-2xl font-black text-purple-500">{accuracy}%</p>
            <p className="text-[10px] font-black text-purple-400 uppercase">Chính xác</p>
          </div>
        </div>
        <div className="flex gap-3 justify-center pt-4">
          <button
            onClick={() => { setCurrentIdx(0); setIsFinished(false); setScore({ correct: 0, wrong: 0 }); setInput(""); setResult(null); setShowAnswer(false); setWords(shuffleArray(allWords)); }}
            className="px-6 py-3 bg-[#A342FF] text-white rounded-2xl font-black hover:bg-[#8B2FE0] transition-all shadow-lg shadow-purple-200/30 flex items-center gap-2"
          >
            <RotateCcw size={18} /> Làm lại
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 transition-all"
          >
            Thoát
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pt-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 px-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#A342FF]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-sm font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          {currentIdx + 1}/{words.length}
        </span>
      </div>

      {/* Score Bar */}
      <div className="flex items-center justify-center gap-6 text-sm font-black">
        <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={16} /> {score.correct}</span>
        <span className="text-red-500 flex items-center gap-1"><XCircle size={16} /> {score.wrong}</span>
        <span className="text-purple-500 flex items-center gap-1"><Zap size={16} /> {Math.floor(currentIdx / 5)}</span>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          className="bg-white dark:bg-slate-800 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 shadow-lg overflow-hidden"
        >
          {/* Question */}
          <div className="p-8 text-center space-y-4">
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
              Nhập cách đọc (Hiragana / Romaji)
            </p>
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-5xl font-black text-slate-800 dark:text-white">{card?.word}</h2>
              <button
                onClick={() => tts.playWithFallback(card?.audio, card?.word)}
                className="p-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all"
              >
                <Volume2 size={20} />
              </button>
            </div>
            {card?.meaning && (
              <p className="text-sm text-slate-400 font-bold">{card.meaning}</p>
            )}
          </div>

          {/* Input Area */}
          <div className="px-6 pb-6 space-y-4">
            <div className="relative">
              <Keyboard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={result !== null}
                placeholder="たべる hoặc taberu"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className={`w-full pl-12 pr-4 py-4 text-lg font-bold rounded-2xl border-2 outline-none transition-all ${
                  result === "correct" 
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" 
                    : result === "wrong"
                    ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                    : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:border-[#A342FF] focus:ring-4 focus:ring-[#A342FF]/10"
                }`}
              />
              {input && !result && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-300 font-bold">
                  → {romajiToHiragana(input)}
                </span>
              )}
            </div>

            {/* Result Feedback */}
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`p-4 rounded-2xl ${
                  result === "correct" 
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30"
                    : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {result === "correct" ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <XCircle size={18} className="text-red-500" />
                  )}
                  <span className={`font-black ${result === "correct" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {result === "correct" ? "Chính xác! 🎉" : "Chưa đúng 😅"}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  Đáp án: <span className="text-lg font-black text-slate-800 dark:text-white">{card?.furigana}</span>
                </p>
                {card?.example_jp && (
                  <p className="text-xs text-slate-400 mt-2 font-bold italic">{card.example_jp}</p>
                )}
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!result ? (
                <>
                  <button
                    onClick={skipWord}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 font-black text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <SkipForward size={16} /> Bỏ qua
                  </button>
                  <button
                    onClick={checkAnswer}
                    disabled={!input.trim()}
                    className="flex-[2] py-3 rounded-2xl bg-[#A342FF] text-white font-black text-sm hover:bg-[#8B2FE0] transition-all shadow-lg shadow-purple-200/30 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    Kiểm tra
                  </button>
                </>
              ) : (
                <button
                  onClick={goNext}
                  className="w-full py-3 rounded-2xl bg-[#58CC02] text-white font-black text-sm hover:bg-[#46A302] transition-all shadow-lg shadow-green-200/30 flex items-center justify-center gap-2"
                >
                  Tiếp tục <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
