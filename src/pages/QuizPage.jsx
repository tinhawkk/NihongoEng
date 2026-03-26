import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadDeck } from "../api/loader";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Trophy,
  X,
  Check,
  RotateCcw,
  Zap,
  ChevronRight,
  Pause,
  FastForward,
  Volume2,
  Lightbulb,
  Star,
} from "lucide-react";
import { nhostService } from "../services/nhostService";
import confetti from "canvas-confetti";
import { Button } from "../components/ui/Button";
import { useUserStore } from "../store/useUserStore";
import { tts } from "../utils/tts";
import { sounds } from "../utils/sounds";
import { ConfirmModal } from "../components/ui/ConfirmModal";

const DECK_LABELS = {
  eng: "Tiếng Anh",
  n5: "JLPT N5",
  n4: "JLPT N4",
  n3: "JLPT N3",
  n2: "JLPT N2",
  n1: "JLPT N1",
  jlpt: "JLPT Tổng hợp",
  grammar: "Ngữ pháp",
  it: "IT Passport",
  "it-strategy": "IT Strategy",
  "it-management": "IT Management",
  "it-technology": "IT Technology",
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestions(words, count = 10, globalDistractorPool = []) {
  if (words.length === 0) return [];
  
  // Shuffle and pick the target words
  const selected = shuffle(words).slice(0, Math.min(count, words.length));
  
  // Create a massive pool for distractors by merging everything we have
  // Priority: current words + global pool
  const basePool = [...words, ...globalDistractorPool];

  return selected.map(word => {
    // Pick 3 wrong answers from the massive pool
    // Filter out the word itself and any synonyms (same meaning string)
    let wrongPool = basePool.filter(w => 
      w.word !== word.word && 
      w.meaning && // Đảm bảo từ nhiễu có nghĩa
      w.meaning.trim() !== "" &&
      w.meaning !== word.meaning &&
      w.id !== word.id
    );

    // Shuffle the wrong pool and pick 3 unique meanings
    const wrongs = [];
    shuffle(wrongPool).forEach(w => {
      const m = w.meaning?.trim();
      if (wrongs.length < 3 && m && !wrongs.includes(m)) {
        wrongs.push(m);
      }
    });
    
    // Fallback in the rare case we still don't have enough
    while (wrongs.length < 3) {
      wrongs.push(`Đáp án nhiễu ${wrongs.length + 1}`);
    }

    const options = shuffle([word.meaning, ...wrongs]);

    return {
      id: word.id,
      word: word.word,
      reading: word.reading || word.furigana || "",
      correctAnswer: word.meaning,
      options,
      audio: word.audio || "",
      explanation: word.example || word.example_jp || `${word.word} = ${word.meaning}`,
      mnemonic: word.mnemonic || "",
      hanViet: word.hanViet || "",
    };
  });
}

// ─── Setup Screen ────────────────────────────────────────────
const SetupScreen = ({ deckId, wordCount, onStart }) => {
  const [count, setCount] = useState(10);
  const [mode, setMode] = useState("pause"); // 'pause' | 'auto'
  const options = [5, 10, 15, 20, 30, 50];

  return (
    <div className="max-w-md mx-auto space-y-8 py-8">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-[#58CC02] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Zap size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-800">
          Quiz {new URLSearchParams(window.location.search).get("filter") === "kanji" ? "Hán tự" : ""} {DECK_LABELS[deckId] || deckId.toUpperCase()}
        </h2>
        <p className="text-slate-400 font-bold">{wordCount} từ vựng</p>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Số câu hỏi
        </label>
        <div className="grid grid-cols-3 gap-2 text-center">
          {options
            .filter(o => o < wordCount) // Change <= to < to avoid duplicates with "All"
            .map(o => (
              <button
                key={o}
                onClick={() => setCount(o)}
                className={`py-3 rounded-2xl font-black text-lg transition-all ${
                  count === o
                    ? "bg-[#1CB0F6] text-white shadow-[0_4px_0_0_#1899D6]"
                    : "bg-white border-2 border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {o}
              </button>
            ))}
          <button
            onClick={() => setCount(wordCount)}
            className={`py-3 rounded-2xl font-black text-lg transition-all ${
              count === wordCount
                ? "bg-[#1CB0F6] text-white shadow-[0_4px_0_0_#1899D6]"
                : "bg-white border-2 border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="space-y-3">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Chế độ
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("pause")}
            className={`py-3 px-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              mode === "pause"
                ? "bg-[#FF9600] text-white shadow-[0_4px_0_0_#D97E00]"
                : "bg-white border-2 border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            <Pause size={16} /> Dừng xem đáp án
          </button>
          <button
            onClick={() => setMode("auto")}
            className={`py-3 px-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              mode === "auto"
                ? "bg-[#1CB0F6] text-white shadow-[0_4px_0_0_#1899D6]"
                : "bg-white border-2 border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            <FastForward size={16} /> Lướt nhanh
          </button>
        </div>
      </div>

      <Button
        variant="primary"
        onClick={() => onStart(count, mode)}
        className="w-full py-4 text-lg"
      >
        BẮT ĐẦU!
      </Button>
    </div>
  );
};

// ─── Question Screen ─────────────────────────────────────────
const QuestionScreen = ({
  question,
  index,
  total,
  onAnswer,
  answered,
  selectedIdx,
  mode,
  onNext,
  onExit,
}) => {
  const [showHint, setShowHint] = useState(false);
  const progress = (index / total) * 100;
  const isCorrect =
    answered && selectedIdx !== null && question.options[selectedIdx] === question.correctAnswer;

  const getNextInterval = useUserStore(s => s.getNextInterval);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Progress bar + exit */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExit}
          className="p-2 rounded-xl text-slate-400 hover:text-[#FF4B4B] hover:bg-red-50 transition-all shrink-0"
          title="Thoát"
        >
          <X size={18} />
        </button>
        <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#58CC02] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-sm font-black text-slate-400">
          {index + 1}/{total}
        </span>
      </div>

      {/* Question */}
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-center py-6 space-y-2"
      >
        <div className="flex items-center justify-center gap-4">
          <p className="text-5xl font-black text-slate-800 dark:text-white">{question.word}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => tts.playWithFallback(question.audio, question.word)}
              onMouseEnter={() => tts.playWithFallback(question.audio, question.word)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all shadow-sm border-b-2 border-slate-200 dark:border-slate-700 active:border-b-0 active:translate-y-0.5"
              title="Nghe phát âm"
            >
              <Volume2 size={24} />
            </button>
            <button
               onClick={() => setShowHint(!showHint)}
               className={`p-2 rounded-xl transition-all shadow-sm border-b-2 active:border-b-0 active:translate-y-0.5 ${showHint ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-amber-50"}`}
               title="Gợi ý"
            >
               <Lightbulb size={24} className={showHint ? "fill-current animate-pulse" : ""} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showHint && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {(question.reading || question.hanViet) && (
                <div className="flex flex-wrap justify-center gap-2">
                  {question.reading && (
                    <p className="text-xl text-slate-400 dark:text-slate-300 font-black uppercase tracking-widest">{question.reading}</p>
                  )}
                  {question.hanViet && (
                    <p className="text-xl text-amber-500 font-black uppercase tracking-widest">({question.hanViet})</p>
                  )}
                </div>
              )}
              {question.mnemonic && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border-2 border-amber-100 dark:border-amber-900/30">
                  <p className="text-amber-800 dark:text-amber-200 italic font-medium">💡 {question.mnemonic}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((opt, i) => {
          let style =
            "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#1CB0F6] hover:bg-blue-50 dark:hover:bg-sky-900/30";
          if (answered) {
            if (opt === question.correctAnswer) {
              style = "bg-[#d7ffb8] border-2 border-[#58CC02] text-[#46A302]";
            } else if (i === selectedIdx && opt !== question.correctAnswer) {
              style = "bg-[#ffdfe0] dark:bg-red-900/40 border-2 border-[#FF4B4B] text-[#FF4B4B]";
            } else {
              style = "bg-white dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600";
            }
          }

          return (
            <motion.button
              key={i}
              whileTap={!answered ? { scale: 0.98 } : undefined}
              disabled={answered}
              onClick={() => onAnswer(i, opt)}
              className={`w-full p-4 rounded-2xl font-bold text-left transition-all flex items-center gap-3 ${style}`}
            >
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                  answered && opt === question.correctAnswer
                    ? "bg-[#58CC02] text-white"
                    : answered && i === selectedIdx && opt !== question.correctAnswer
                      ? "bg-[#FF4B4B] text-white"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {answered && opt === question.correctAnswer ? (
                  <Check size={16} />
                ) : answered && i === selectedIdx && opt !== question.correctAnswer ? (
                  <X size={16} />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              {opt}
            </motion.button>
          );
        })}
      </div>

      {/* SRS Rating Buttons (Show after answering) */}
      <AnimatePresence>
        {answered && mode === "pause" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className={`p-4 rounded-2xl border-2 ${isCorrect ? "bg-[#d7ffb8]/50 border-[#58CC02]/30" : "bg-[#ffdfe0]/50 border-[#FF4B4B]/30"}`}>
              <p className={`text-sm font-black uppercase tracking-widest mb-1 ${isCorrect ? "text-[#58CC02]" : "text-[#FF4B4B]"}`}>
                {isCorrect ? "✅ Chính xác!" : "❌ Sai rồi!"}
              </p>
              <p className="text-sm text-slate-600 font-medium">
                <span className="font-bold">Đáp án:</span> {question.correctAnswer}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Again", value: 0 },
                { label: "Hard", value: 1 },
                { label: "Good", value: 2 },
                { label: "Easy", value: 3 }
              ].map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => onNext(btn.value)}
                  className="flex flex-col items-center py-3 rounded-2xl border-b-4 border-black/10 active:border-b-0 active:translate-y-1 transition-all group"
                  style={{ backgroundColor: "white", border: "2px solid #e2e8f0" }}
                >
                  <span className="text-[10px] font-black text-slate-400 uppercase group-hover:text-slate-600">{btn.label}</span>
                  <span className={`text-lg font-black ${btn.value === 0 ? "text-red-500" : btn.value === 1 ? "text-orange-500" : btn.value === 2 ? "text-blue-500" : "text-green-500"}`}>
                    {getNextInterval(question.word, btn.value) || "--"}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-center font-bold text-slate-400 italic">Rate your recall to schedule next review</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Result Screen ───────────────────────────────────────────
const ResultScreen = ({ correct, total, onRetry, onHome }) => {
  const pct = Math.round((correct / total) * 100);
  const emoji = pct >= 90 ? "🏆" : pct >= 70 ? "🎉" : pct >= 50 ? "💪" : "📚";
  const msg =
    pct >= 90 ? "Xuất sắc!" : pct >= 70 ? "Tốt lắm!" : pct >= 50 ? "Cố gắng thêm!" : "Ôn lại nhé!";

  return (
    <div className="max-w-md mx-auto text-center space-y-8 py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="text-7xl"
      >
        {emoji}
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-3xl font-black text-slate-800">{msg}</h2>
        <p className="text-slate-400 font-bold">Bạn đã trả lời đúng</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-6xl font-black text-[#58CC02]">{correct}</span>
        <span className="text-3xl text-slate-300 font-black">/</span>
        <span className="text-6xl font-black text-slate-300">{total}</span>
      </div>

      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${pct >= 70 ? "bg-[#58CC02]" : pct >= 50 ? "bg-[#FFC800]" : "bg-[#FF4B4B]"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.3 }}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onHome} className="flex-1">
          Trang chủ
        </Button>
        <Button variant="primary" onClick={onRetry} className="flex-1">
          <RotateCcw size={18} /> Làm lại
        </Button>
      </div>
    </div>
  );
};

// ─── Main Quiz Page ──────────────────────────────────────────
export const QuizPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const account = useUserStore(s => s.account);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("setup"); // setup | playing | result
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [mode, setMode] = useState("pause"); // 'pause' | 'auto'
  const [distractorPool, setDistractorPool] = useState([]);
  const scoreRef = useRef(0); // track score in ref to avoid stale closure
  
  const addQuizResult = useUserStore(s => s.addQuizResult);
  const updateStreak = useUserStore(s => s.updateStreak);
  const updateSrsItem = useUserStore(s => s.updateSrsItem);
  const vocaSource = useUserStore(s => s.vocaSource);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [deckMetadata, setDeckMetadata] = useState(null);

  // Lấy Metadata cho bài học từ DB
  useEffect(() => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId);
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
  }, [deckId]);

  useEffect(() => {
    const loadQuizData = async () => {
      setLoading(true);
      
      const extraDecks = ["n1", "n2", "n3", "n4", "n5"].filter(d => d !== deckId);
      const randomExtra = extraDecks[Math.floor(Math.random() * extraDecks.length)];

      try {
        const isSrs = deckId === "srs";
        const isVocaSource = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId) || vocaSource === "voca";
        
        const [extraData, mainData] = await Promise.all([
          loadDeck(randomExtra, "sheet"),
          isSrs ? Promise.resolve([]) : loadDeck(deckId, isVocaSource ? "voca" : "sheet")
        ]);
        
        let filtered = isSrs ? Object.values(useUserStore.getState().account?.srsData || {}) : mainData;
        const params = new URLSearchParams(window.location.search);
        
        if (isSrs) {
          const targetDeck = params.get("deck");
          const mode = params.get("mode"); // 'all' or undefined/null
          const today = new Date();
          
          filtered = filtered.filter(item => {
            const reviewDate = new Date(item.nextReview || 0);
            let matchDeck = true;
            
            if (targetDeck && targetDeck !== "all") {
              if (targetDeck === "DICTIONARY_SOURCE" || targetDeck === "Từ điển & Tìm kiếm") {
                matchDeck = item.source === "search";
              } else {
                matchDeck = item.deckName === targetDeck || item.deck === targetDeck || item.deckId === targetDeck;
              }
            }
            
            // If mode is 'all', show everything in the deck. Otherwise only due items.
            const isDue = reviewDate <= today;
            return mode === 'all' ? matchDeck : (isDue && matchDeck);
          });
        }

        const filter = params.get("filter") || "all";
        if (filter === "kanji") {
          filtered = filtered.filter(w => w.type === "kanji");
        } else if (filter === "voca") {
          filtered = filtered.filter(w => w.type === "voca" || !w.type);
        }

        setWords(filtered);
        setDistractorPool(extraData);
      } catch (err) {
        console.error("Failed to load quiz data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadQuizData();
  }, [deckId, vocaSource]);

  const handleStart = (count, selectedMode) => {
    // Pass words as selection and distractorPool for distractors (especially for SRS)
    const qs = generateQuestions(words, count, distractorPool.length > 0 ? distractorPool : words);
    if (!qs || qs.length === 0) {
      alert("Không tìm thấy đủ từ vựng để tạo câu hỏi!");
      return;
    }
    setQuestions(qs);
    setCurrentIdx(0);
    setScore(0);
    scoreRef.current = 0;
    setAnswered(false);
    setSelectedIdx(null);
    setMode(selectedMode);
    setPhase("playing");
  };

  const goToNext = rating => {
    // Nếu có rating (được truyền từ nút SRS), cập nhật SRS cho từ hiện tại
    if (rating !== undefined && questions[currentIdx]) {
      const q = questions[currentIdx];
      const originalWord = words.find(w => w.id === q.id || w.word === q.word);
      if (originalWord && typeof updateSrsItem === "function") {
        const stableId = originalWord.id || originalWord.word;
        updateSrsItem(stableId, originalWord, rating, {
          source: "quiz",
          deckId: deckId === "srs" ? (originalWord.deck || originalWord.deckId) : deckId,
          deckName: deckId === "srs" ? (originalWord.deckName || originalWord.deck) : (deckMetadata?.title || DECK_LABELS[deckId] || deckId),
        });
      }
    }

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1);
      setAnswered(false);
      setSelectedIdx(null);
    } else {
      // Save quiz result using ref to avoid stale closure
      addQuizResult({ deckId, score: scoreRef.current, total: questions.length });
      updateStreak(new Date().toLocaleDateString('en-CA'));
      setPhase("result");
    }
  };

  const handleAnswer = (idx, opt) => {
    if (answered) return;
    const currentQuestion = questions[currentIdx];
    const isCorrect = opt === currentQuestion.correctAnswer;

    setSelectedIdx(idx);
    setAnswered(true);

    if (isCorrect) {
      scoreRef.current += 1;
      setScore(s => s + 1);
      sounds.playBeep(880, 150, 0.1);
    } else {
      sounds.playError();
    }

    // Auto mode: advance after 1.2s (Good rating by default in auto mode)
    if (mode === "auto") {
      setTimeout(() => goToNext(isCorrect ? 2 : 0), 1200);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1CB0F6] rounded-full animate-spin" />
        <p className="text-slate-400 font-bold">Đang tải...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      {phase !== "playing" && (
        <button
          onClick={() => navigate(`/deck/${deckId}`)}
          className="flex items-center gap-2 text-slate-400 font-bold mb-6 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={20} /> Quay lại
        </button>
      )}

      {phase === "setup" && (
        <SetupScreen deckId={deckId} wordCount={words.length} onStart={handleStart} />
      )}

      {phase === "playing" && questions[currentIdx] && (
        <QuestionScreen
          question={questions[currentIdx]}
          index={currentIdx}
          total={questions.length}
          onAnswer={handleAnswer}
          answered={answered}
          selectedIdx={selectedIdx}
          mode={mode}
          onNext={goToNext}
          onExit={() => setExitConfirmOpen(true)}
        />
      )}

      <ConfirmModal
        open={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        onConfirm={() => navigate(`/deck/${deckId}`)}
        title="Thoát Quiz?"
        message="Tiến độ hiện tại của bạn sẽ không được lưu. Bạn có chắc chắn muốn thoát không?"
        confirmLabel="Thoát ngay"
        cancelLabel="Tiếp tục học"
        variant="danger"
      />

      {phase === "result" && (
        <ResultScreen
          correct={score}
          total={questions.length}
          onRetry={() => handleStart(questions.length, mode)}
          onHome={() => navigate("/")}
        />
      )}
    </div>
  );
};
