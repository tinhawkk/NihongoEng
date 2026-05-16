import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { vocabularyRepository } from "../data/repositories/NhostVocabularyRepository";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Ear,
  Target,
  Keyboard,
  Check,
  Volume2,
  Award,
  AlertTriangle,
  Info,
  BookOpen,
  Flame,
  Mic,
  MicOff,
  Layers,
} from "lucide-react";
import { useUserStore } from "../store/useUserStore";
import { calculateCurrentStreak } from "../utils/streakUtils";
import { tts } from "../utils/tts";
import { renderFurigana, removeFurigana, combineFurigana } from "../utils/furigana";
import { Button } from "../components/ui/Button";
import confetti from "canvas-confetti";
import { shuffleArray, getRandomItems } from "../utils/helpers";
import { romajiToHiragana } from "../utils/kana";
import { isTypo } from "../utils/textUtils";
import { nhostService } from "../services/nhostService";
import { examGeneratorService } from "../services/examGeneratorService";
import { useLearnSession } from "../hooks/useCases/useLearnSession";
import { createRecognition } from "../utils/speechUtils";
import { getLevenshteinDistance } from "../utils/textUtils";

const DECK_LABELS = {
  n1: "JLPT N1", n2: "JLPT N2", n3: "JLPT N3", n4: "JLPT N4", n5: "JLPT N5",
  ENG: "600 TOEIC", IT: "IT Vocab",
};

const normalize = str => str?.toLowerCase().trim().replace(/[〜\s・ー]/g, "") || "";

function parseDialog(text) {
  if (!text) return [];
  const matches = Array.from(text.matchAll(/([AB]\s?[:：(（\[【].*?[)）\]】]?)/g));
  if (matches.length === 0) {
    const parts = text.split(/([AB][:：\s(（])/);
    if (parts.length > 2) {
      const results = [];
      for (let i = 1; i < parts.length; i += 2) {
        results.push({
          type: "dialog",
          label: parts[i].trim(),
          content: parts[i + 1]?.trim() || "",
        });
      }
      return results;
    }
    return [{ type: "text", content: text }];
  }
  const results = [];
  matches.forEach((m, idx) => {
    const label = m[0];
    const contentStart = m.index + label.length;
    const contentEnd = matches[idx + 1]?.index || text.length;
    const content = text.substring(contentStart, contentEnd).trim();
    results.push({ type: "dialog", label, content });
  });
  return results;
}

function generateLessonSteps(words) {
  const steps = [];
  const seenPool = [];
  const BATCH_SIZE = 4;
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    batch.forEach(w => {
      steps.push({ type: "intro", word: w });
      seenPool.push(w);
    });
    const practiceBatch = shuffleArray([...batch]);
    practiceBatch.forEach((w, idx) => {
      // Đa dạng hóa các loại bài tập: Nghĩa -> Kanji, Nghe -> Kanji, Kanji -> Nghĩa, Typing
      if (idx % 4 === 0)
        steps.push({ type: "choice", word: w }); // Kanji -> Nghĩa
      else if (idx % 4 === 1)
        steps.push({ type: "choice_kanji", word: w }); // Nghĩa -> Kanji (Mới)
      else if (idx % 4 === 2)
        steps.push({ type: "listen", word: w }); // Nghe -> Kanji
      else steps.push({ type: "typing", word: w }); // Nhập cách đọc
    });
    // Add a matching step at the end of each batch
    if (batch.length >= 3) {
      steps.push({ type: "matching", words: batch });
    }
  }
  return steps;
}

const ChoiceStep = ({ word, allWords, showFeedback, userAnswer, checkAnswer, type = "choice", deckId }) => {
  const isEnglish = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng');
  const options = useMemo(
    () =>
      shuffleArray([
        word,
        ...getRandomItems(
          allWords.filter(w => w.word !== word.word),
          3
        ),
      ]),
    [word, allWords]
  );

  useEffect(() => {
    const handleNum = e => {
      if (!showFeedback && ["1", "2", "3", "4"].includes(e.key)) {
        checkAnswer(options[parseInt(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", handleNum);
    return () => window.removeEventListener("keydown", handleNum);
  }, [options, showFeedback, checkAnswer]);

  const cleanDisplay = text => text?.toString().replace(/[〜~.．…・]/g, "") || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto space-y-10"
    >
      <div className="text-center space-y-4">
        <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2">
          <Target size={16} /> {word.type === "kanji" || (!word.type && !isEnglish) ? "Chọn Kanji đúng" : "Chọn từ đúng"}
        </p>
        {type === "choice" ? (
          <h2 className="text-6xl md:text-7xl font-black text-slate-800 dark:text-white tracking-tight whitespace-nowrap flex justify-center">
            {cleanDisplay(word.word)}
          </h2>
        ) : (
          <div className="space-y-4">
            <p className="text-4xl md:text-5xl font-black text-[#A342FF] dark:text-purple-400">
              {word.meaning}
            </p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 px-4 pb-4">
        {options.map((opt, i) => (
          <button
            key={i}
            disabled={showFeedback}
            onClick={() => checkAnswer(opt)}
            className={`p-6 rounded-[2rem] border-4 font-bold text-left transition-all flex items-center justify-between group active:scale-95 ${showFeedback && opt.word === word.word ? "bg-green-50 border-green-500 text-green-700 shadow-lg shadow-green-100" : showFeedback && userAnswer?.word === opt.word && opt.word !== word.word ? "bg-red-50 border-red-500 text-red-700 shadow-lg shadow-red-100" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md"}`}
          >
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors uppercase">
                {i + 1}
              </span>
              <span className="text-xl md:text-2xl break-words whitespace-normal leading-tight">
                {type === "choice" ? opt.meaning : cleanDisplay(opt.word)}
              </span>
            </div>
            <div
              className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-colors ${showFeedback && opt.word === word.word ? "bg-green-500 border-green-500 text-white" : "border-slate-100"}`}
            >
              {showFeedback && opt.word === word.word && <Check size={18} strokeWidth={4} />}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

const ListenStep = ({ word, allWords, showFeedback, userAnswer, checkAnswer, cleanDisplay }) => {
  const options = useMemo(
    () =>
      shuffleArray([
        word,
        ...getRandomItems(
          allWords.filter(w => w.word !== word.word),
          3
        ),
      ]),
    [word, allWords]
  );
  useEffect(() => {
    const handleNum = e => {
      if (!showFeedback && ["1", "2", "3", "4"].includes(e.key)) {
        checkAnswer(options[parseInt(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", handleNum);
    return () => window.removeEventListener("keydown", handleNum);
  }, [options, showFeedback, checkAnswer]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl mx-auto space-y-12"
    >
      <div className="text-center space-y-8">
        <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2">
          <Ear size={16} /> Nghe và chọn từ đúng
        </p>
        <button
          onClick={() => tts.playWithFallback(word.audio, removeFurigana(word.word))}
          className="w-32 h-32 bg-blue-500 text-white rounded-[40px] flex items-center justify-center shadow-2xl mx-auto active:scale-90 hover:scale-105 transition-all duration-300 ring-8 ring-blue-50 dark:ring-blue-900/20"
        >
          <Volume2 size={56} strokeWidth={2.5} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6 px-4">
        {options.map((opt, i) => (
          <button
            key={i}
            disabled={showFeedback}
            onClick={() => checkAnswer(opt)}
            className={`relative p-8 pt-12 min-h-[140px] rounded-[2.5rem] border-4 font-black transition-all text-2xl active:scale-95 text-center flex flex-col items-center justify-center ${showFeedback && opt.word === word.word ? "bg-green-50 border-green-500 text-green-700 shadow-xl scale-[1.02]" : showFeedback && userAnswer?.word === opt.word && opt.word !== word.word ? "bg-red-50 border-red-500 text-red-700 shadow-xl" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-200 shadow-md hover:shadow-lg hover:-translate-y-1"}`}
          >
            <span className="absolute top-4 left-4 text-[10px] bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-xl text-slate-500 font-black uppercase tracking-widest shadow-sm">
              {i + 1}
            </span>
            <span className="block leading-tight">
              {cleanDisplay ? cleanDisplay(opt.word) : opt.word}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

const ClozeStep = ({ word, showFeedback, userAnswer, checkAnswer, deckId }) => {
  const isEnglish = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng');

  const { displayExample } = useMemo(() => {
    const rawExample = removeFurigana(word.example || "");
    const target = removeFurigana(word.word);
    const regex = new RegExp(target, 'g');
    const display = rawExample.replace(regex, '[ ____ ]');
    return { displayExample: display };
  }, [word]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl mx-auto space-y-12 text-center"
    >
      <div className="space-y-6">
        <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2">
          <BookOpen size={16} /> Điền từ vào câu
        </p>
        <div className="p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border-4 border-slate-50 dark:border-slate-700 shadow-md">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-700 dark:text-slate-100 leading-relaxed">
            {displayExample}
          </h3>
        </div>
        <p className="text-2xl font-bold text-[#A342FF] bg-purple-50 dark:bg-purple-900/40 py-3 px-8 rounded-3xl inline-block shadow-sm">
          {word.meaning}
        </p>
      </div>

      <div className="relative max-w-lg mx-auto w-full">
        {userAnswer && !showFeedback && (
          isTypo(normalize(userAnswer), normalize(word.word)) ||
          isTypo(normalize(userAnswer), normalize(word.reading)) ||
          isTypo(normalize(userAnswer), normalize(word.romaji))
        ) && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-10 left-0 right-0 text-amber-500 font-bold text-sm"
          >
            ⚠️ Hình như bạn gõ nhầm một chút?
          </motion.p>
        )}
        <input
          autoFocus
           disabled={showFeedback}
          value={typeof userAnswer === "string" ? userAnswer : ""}
          onChange={e => {
            const isEnglishMode = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng');
            checkAnswer(isEnglishMode ? e.target.value : romajiToHiragana(e.target.value), false);
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && userAnswer) {
              e.preventDefault();
              e.stopPropagation();
              checkAnswer(userAnswer);
            }
          }}
          placeholder="Nhập vào đây..."
          className={`w-full p-8 pr-20 bg-slate-50 dark:bg-slate-800 border-4 rounded-[2.5rem] text-center text-3xl font-black outline-none transition-all shadow-inner ${showFeedback ? (userAnswer.toLowerCase() === word.word.toLowerCase() ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-slate-100 focus:border-blue-400 focus:bg-white"}`}
        />
      </div>
    </motion.div>
  );
};

const SpeakingStep = ({ word, showFeedback, userAnswer, checkAnswer, deckId }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const targetLang = useMemo(() => {
    const isEnglish = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng');
    return isEnglish ? "en-US" : "ja-JP";
  }, [deckId]);

  useEffect(() => {
    recognitionRef.current = createRecognition(targetLang);
    recognitionRef.current.onResult = (text, isFinal) => {
      setTranscript(text);
      if (isFinal) {
        setIsListening(false);
        // Manual trigger if it looks correct
        const dist = getLevenshteinDistance(normalize(text), normalize(word.word));
        const distReading = getLevenshteinDistance(normalize(text), normalize(word.reading));
        if (dist <= 1 || distReading <= 1) {
           checkAnswer(text);
        }
      }
    };
    recognitionRef.current.onError = (err) => {
      setError(err);
      setIsListening(false);
    };
    recognitionRef.current.onEnd = () => setIsListening(false);

    return () => recognitionRef.current?.stop();
  }, [word, targetLang]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript("");
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto space-y-12 text-center"
    >
      <div className="space-y-6">
        <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2">
           <Mic size={16} /> Luyện phát âm
        </p>
        <div className="space-y-2">
           <h2 className="text-6xl md:text-7xl font-black text-slate-800 dark:text-white tracking-tighter">
             {word.word}
           </h2>
           <p className="text-xl text-slate-400 font-bold tracking-widest uppercase">{word.reading}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-8">
        <button
          onClick={toggleListening}
          disabled={showFeedback}
          className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative ${isListening ? "bg-red-500 scale-110" : "bg-blue-500 hover:scale-105 active:scale-95"}`}
        >
          {isListening ? (
            <>
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-red-500 rounded-full"
              />
              <MicOff size={48} className="text-white relative z-10" />
            </>
          ) : (
            <Mic size={48} className="text-white" />
          )}
        </button>

        <div className="w-full min-h-[100px] p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-4 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2">
           {transcript ? (
             <p className="text-2xl font-black text-slate-700 dark:text-slate-200 animate-in fade-in">{transcript}</p>
           ) : isListening ? (
             <p className="text-slate-400 font-bold italic animate-pulse">Đang lắng nghe...</p>
           ) : (
             <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">Phát âm ngay để tiếp tục</p>
           )}
           {error && <p className="text-xs text-red-500 font-bold mt-2">Lỗi: {error}</p>}
        </div>

        <div className="w-full flex flex-col gap-4">
          {transcript && !showFeedback ? (
            <Button onClick={() => checkAnswer(transcript)} className="w-full py-4 text-sm font-black uppercase">
              XÁC NHẬN
            </Button>
          ) : (
            <button
              onClick={goToNext}
              className="text-slate-400 hover:text-slate-600 font-bold text-sm uppercase tracking-widest transition-colors py-2"
            >
              Bỏ qua luyện nói
            </button>
          )}
        </div>
        
        {!recognitionRef.current?.supported && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
             <p className="text-xs text-amber-600 font-bold">
               Trình duyệt của bạn không hỗ trợ nhận diện giọng nói hoặc bạn chưa cấp quyền Mic. Hãy nhấn "Bỏ qua" để tiếp tục.
             </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const KanjiBreakdownStep = ({ word, goToNext }) => {
  const kanjiList = useMemo(() => {
    const kanjis = word.word.match(/[\u4e00-\u9faf]/g) || [];
    const meanings = word.hanViet ? word.hanViet.split(/[\/\s・,]+/).filter(Boolean) : [];
    return kanjis.map((k, i) => ({ char: k, hanViet: meanings[i] || "" }));
  }, [word]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl mx-auto space-y-12 text-center"
    >
      <div className="space-y-4">
        <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2">
          <Layers size={16} /> Phân tích Hán Tự
        </p>
        <h2 className="text-7xl md:text-8xl font-black text-slate-800 dark:text-white tracking-tighter">
          {word.word}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {kanjiList.map((k, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-6 p-6 bg-white dark:bg-slate-800 rounded-3xl border-4 border-slate-50 dark:border-slate-700 shadow-sm"
          >
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-5xl font-black text-slate-800 dark:text-white border-2 border-slate-100 dark:border-slate-700">
              {k.char}
            </div>
            <div className="text-left">
              <p className="text-2xl font-black text-amber-500 uppercase tracking-[0.2em]">{k.hanViet}</p>
              <p className="text-slate-400 font-bold text-sm">Chữ này có trong bài học</p>
            </div>
          </motion.div>
        ))}
      </div>

      {word.mnemonic && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-3xl p-6 text-center shadow-sm">
          <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-2">💡 Cách nhớ nhanh</p>
          <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{word.mnemonic}</p>
        </div>
      )}

      <Button onClick={goToNext} className="w-full py-6 text-xl font-black uppercase tracking-widest bg-[#58CC02] hover:bg-[#4cad02] text-white shadow-[0_6px_0_0_#4cad02] active:translate-y-1 active:shadow-none transition-all">
        ĐÃ HIỂU! TIẾP TỤC
      </Button>
    </motion.div>
  );
};

const MatchingStep = ({ words, onComplete, deckId }) => {
  const isEnglish = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng');
  const pairs = useMemo(
    () =>
      words.map(w => ({
        id: w.id || w.word,
        // Giữ lại word object để lấy audio
        raw: w,
        // Ẩn toàn bộ Furigana ở cột trái để ép thuộc mặt chữ Kanji
        leftLabel: removeFurigana(w.word),
        // Chỉ hiện nghĩa ở bên phải
        rightLabel: w.meaning || removeFurigana(w.word),
      })),
    [words]
  );

  const leftItems = useMemo(() => shuffleArray(pairs), [pairs]);
  const rightItems = useMemo(() => shuffleArray(pairs), [pairs]);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matchedIds, setMatchedIds] = useState(() => new Set());
  const [mismatch, setMismatch] = useState(null);

  useEffect(() => {
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedIds(new Set());
    setMismatch(null);
  }, [pairs]);

  const tryMatch = useCallback((left, right) => {
    if (!left || !right) return;
    if (left.id === right.id) {
      setMatchedIds(prev => {
        const next = new Set(prev);
        next.add(left.id);
        return next;
      });
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      setMismatch({ leftId: left.id, rightId: right.id });
      setTimeout(() => setMismatch(null), 500);
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 180);
    }
  }, []);

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      tryMatch(selectedLeft, selectedRight);
    }
  }, [selectedLeft, selectedRight, tryMatch]);

  useEffect(() => {
    if (matchedIds.size === pairs.length && pairs.length > 0) {
      const timer = setTimeout(onComplete, 400);
      return () => clearTimeout(timer);
    }
  }, [matchedIds, pairs.length, onComplete]);

  // Cố định độ cao linh hoạt để lọt trong 1 màn hình
  const baseCard =
    "w-full px-3 lg:px-5 py-2 lg:py-3 rounded-xl lg:rounded-2xl border-2 lg:border-4 shadow-sm transition-all text-left h-[70px] lg:h-[85px] flex flex-col justify-center overflow-hidden";

  const renderCard = (item, side) => {
    const isMatched = matchedIds.has(item.id);
    const isSelected =
      side === "left" ? selectedLeft?.id === item.id : selectedRight?.id === item.id;
    const isMismatch =
      mismatch &&
      ((side === "left" && mismatch.leftId === item.id) ||
        (side === "right" && mismatch.rightId === item.id));
    const palette = isMatched
      ? "bg-emerald-50 border-emerald-400 text-emerald-700 opacity-60"
      : isSelected
        ? "bg-blue-50 border-blue-400 text-blue-700 scale-[1.02] shadow-xl"
        : isMismatch
          ? "bg-red-50 border-red-400 text-red-700 animate-shake"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:shadow-md";
    const badge = isMatched
      ? "bg-emerald-500 text-white"
      : isSelected
        ? "bg-blue-500 text-white"
        : "bg-slate-100 dark:bg-slate-700 text-slate-500 font-black";
    const onClick = () => {
      if (isMatched) return;
      if (side === "left") {
        // Phát âm thanh khi nhấn bên trái (Kanji)
        tts.playWithFallback(item.raw.audio, removeFurigana(item.raw.word));
        setSelectedLeft(prev => (prev?.id === item.id ? null : item));
      } else {
        setSelectedRight(prev => (prev?.id === item.id ? null : item));
      }
    };
    return (
      <button
        key={`${side}-${item.id}`}
        onClick={onClick}
        className={`${baseCard} ${palette} active:scale-95 group relative transition-all duration-200`}
      >
        <div className="flex items-center gap-2 lg:gap-4">
          <span
            className={`shrink-0 w-7 h-7 lg:w-10 lg:h-10 rounded-full text-[8px] lg:text-[10px] flex items-center justify-center uppercase tracking-widest shadow-sm transition-colors ${badge}`}
          >
            {side === "left" ? (isEnglish ? "EN" : "JP") : "VN"}
          </span>
          <div className="space-y-0 flex-1 pr-1 lg:pr-2 min-w-0">
            <div className="text-xl md:text-2xl font-black leading-tight break-words">
              {side === "left" ? (
                <div className="flex items-center gap-1">{item.leftLabel}</div>
              ) : (
                <span className="block text-lg md:text-xl text-[#A342FF] dark:text-purple-400 line-clamp-2 leading-tight">
                  {item.rightLabel}
                </span>
              )}
            </div>
            {side === "left" && !isMatched && (
              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest opacity-70">
                Nhấp để nối
              </p>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto space-y-4 lg:space-y-8"
    >
      <div className="text-center space-y-1">
        <p className="text-slate-400 font-black uppercase text-[8px] lg:text-[10px] tracking-[0.2em] flex items-center justify-center gap-2">
          <BookOpen size={12} className="lg:w-3.5 lg:h-3.5" /> Nối từ với nghĩa
        </p>
        <h3 className="text-xl lg:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
          Match Game
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:gap-4">
        <div className="space-y-2 lg:space-y-3">
          {leftItems.map(item => renderCard(item, "left"))}
        </div>
        <div className="space-y-2 lg:space-y-3">
          {rightItems.map(item => renderCard(item, "right"))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-400">
        <span className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          Đã ghép {matchedIds.size}/{pairs.length}
        </span>
      </div>
    </motion.div>
  );
};

export const LearnPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterFilter = searchParams.get("filter") || "all";

  const [shake, setShake] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const typingRef = useRef(null);

  const {
    loading,
    allWords,
    remainingWords,
    step,
    steps,
    currentIdx,
    isFinished,
    userAnswer,
    isCorrect,
    showFeedback,
    deckTitle,
    startBatch,
    checkAnswer,
    goToNext,
    setShowFeedback,
    setIsCorrect,
    setUserAnswer,
  } = useLearnSession(deckId, filterFilter);

  const playStepAudio = useCallback(() => {
    if (!step || step.type === "matching") return;
    const rate = isSlow ? 0.6 : 1.0;
    if (step.type === "intro" || (!isCorrect && showFeedback)) {
      const sequence = [{ url: step.word.audio, text: removeFurigana(step.word.word) }];
      if (step.word.example) {
        const dialogs = parseDialog(step.word.example);
        if (dialogs.length > 0) {
          dialogs.forEach(d =>
            sequence.push({
              text: removeFurigana(d.content || d.label),
              pitch: d.label?.includes("A") ? 0.9 : 1.1,
            })
          );
        } else {
          sequence.push({ text: removeFurigana(step.word.example) });
        }
      }
      tts.playSequentially(sequence, rate);
    } else if (step.word) {
      tts.playWithFallback(step.word.audio, removeFurigana(step.word.word), rate);
    }
  }, [step, isCorrect, showFeedback, isSlow]);

  useEffect(() => {
    if (!loading && step && !isFinished) {
      const timer = setTimeout(playStepAudio, 300);
      return () => {
        clearTimeout(timer);
        tts.stop();
      };
    }
  }, [currentIdx, loading, step, isFinished, playStepAudio]);

  const handleNextWithAudioStop = useCallback(() => {
    tts.stop();
    goToNext();
    if (currentIdx >= steps.length - 1) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [goToNext, currentIdx, steps.length]);

  useEffect(() => {
    if (showFeedback && isCorrect === false) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      tts.playWithFallback(step?.word?.audio, removeFurigana(step?.word?.word), isSlow ? 0.6 : 1.0);
    }
  }, [showFeedback, isCorrect, step, isSlow]);

  useEffect(() => {
    const handleKey = e => {
      if (e.key === "Enter") {
        if (showExitConfirm) return;
        if (showFeedback) {
          goToNext();
          return;
        }
        if (step?.type === "intro") {
          goToNext();
        } else if (userAnswer) {
          checkAnswer(userAnswer);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showFeedback, step, userAnswer, goToNext, checkAnswer, showExitConfirm]);

  if (loading)
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[200] flex flex-col items-center justify-center space-y-4">
        <div className="w-20 h-20 border-8 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-black animate-pulse uppercase tracking-[0.3em] text-sm">
          Đang chuẩn bị bài học...
        </p>
      </div>
    );
  if (steps.length === 0)
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[200] flex flex-col items-center justify-center p-10 text-center space-y-6">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
          <BookOpen size={48} />
        </div>
        <p className="text-slate-400 font-bold text-xl">Bài học này chưa có dữ liệu.</p>
        <Button onClick={() => navigate(-1)} className="px-10 py-4 text-lg">
          Trở về
        </Button>
      </div>
    );
  if (isFinished)
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[200] flex flex-col items-center justify-center p-10 text-center space-y-10 animate-in fade-in duration-700">
        <div className="relative w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-[40px] flex items-center justify-center shadow-2xl animate-bounce">
          <Award size={64} className="text-white" />
        </div>
        <div className="space-y-4">
          <h2 className="text-5xl font-black text-slate-800 dark:text-white tracking-tight">
            Tuyệt vời!
          </h2>
          <div className="flex items-center justify-center gap-2 text-orange-500 font-black text-2xl">
            <Flame size={28} fill="currentColor" />
            <span>{calculateCurrentStreak(useUserStore.getState().account?.streak)} n</span>
          </div>
          <p className="text-slate-500 font-bold text-lg max-w-sm mx-auto">
            {remainingWords.length > 0 
              ? "Bạn đã hoàn thành đợt học này." 
              : "Bạn đã hoàn thành toàn bộ từ vựng trong bài."}
          </p>
        </div>
        <div className="space-y-4 w-full max-w-xs">
          {remainingWords.length > 0 ? (
            <>
              <button
                onClick={() => startBatch(remainingWords)}
                className="w-full py-5 bg-[#58CC02] text-white rounded-3xl font-black shadow-xl hover:shadow-2xl transition-all text-xl hover:scale-105 active:scale-95 uppercase tracking-widest"
              >
                HỌC TIẾP ({remainingWords.length} TỪ)
              </button>
              <button
                onClick={() => navigate(`/deck/${deckId}`)}
                className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-3xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm uppercase tracking-widest"
              >
                NGHỈ NGƠI
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate(`/deck/${deckId}`)}
              className="w-full py-5 bg-[#58CC02] text-white rounded-3xl font-black shadow-xl hover:shadow-2xl transition-all text-xl hover:scale-105 active:scale-95 uppercase tracking-widest"
            >
              HOÀN THÀNH
            </button>
          )}
        </div>
      </div>
    );

  const progress = ((currentIdx + 1) / steps.length) * 100;

  // Helper để làm sạch hiển thị (Xóa các loại ngoặc)
  const cleanDisplay = text => {
    if (!text) return "";
    // Keep brackets as they might contain grammatical info like <する>
    return text.toString().replace(/[〜~.．…・]/g, "");
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[150] flex flex-col overflow-hidden">
      <div className="p-6 md:p-10 flex items-center gap-6 max-w-5xl mx-auto w-full">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
        >
          <X size={32} />
        </button>
        <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner relative">
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          />
        </div>
        <span className="text-sm font-black text-slate-400 font-mono tracking-tighter">
          {currentIdx + 1}/{steps.length}
        </span>
      </div>

      <div
        className={`flex-1 flex flex-col items-center justify-center px-6 pb-24 min-h-0 overflow-y-auto custom-scrollbar ${shake ? "animate-shake" : ""}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            {step.type === "intro" && (
              <div className="space-y-12 flex flex-col items-center w-full max-w-full overflow-hidden">
                <div className="text-center space-y-6 group w-full">
                  <div className="relative inline-block w-full text-center">
                    <h2
                      onClick={playStepAudio}
                      className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-slate-800 dark:text-white tracking-tighter group-active:scale-95 transition-transform duration-300 drop-shadow-sm cursor-pointer leading-tight w-full px-4 flex justify-center"
                    >
                      {combineFurigana(
                        step.word.word,
                        step.word.reading
                      )}
                    </h2>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setIsSlow(!isSlow);
                      }}
                      className={`absolute -right-20 top-1/2 -translate-y-1/2 p-3 rounded-2xl transition-all shadow-md active:scale-90 ${isSlow ? "bg-amber-500 text-white animate-pulse" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}
                      title={isSlow ? "Đọc chậm: Bật" : "Đọc chậm: Tắt"}
                    >
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-xl">{isSlow ? "🐢" : "🐇"}</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          {isSlow ? "0.6x" : "1.0x"}
                        </span>
                      </div>
                    </button>
                  </div>
                  {step.word.hanViet && (
                    <p className="text-2xl sm:text-3xl text-amber-500 font-black uppercase tracking-[0.4em] drop-shadow-sm">
                      {step.word.hanViet}
                    </p>
                  )}
                </div>
                <div className="w-full space-y-4">
                  <div className="text-center space-y-4 w-full">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                        Ý nghĩa
                      </h4>
                      <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#A342FF] tracking-tight leading-tight px-4 break-words whitespace-normal">
                        {step.word.meaning}
                      </p>
                    </div>

                    {(step.word.definitionEn || step.word.definitionVi) && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 text-left border-l-4 border-indigo-400 rounded-r-2xl p-4 mt-4 max-w-lg mx-auto shadow-sm">
                        {step.word.definitionEn && (
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
                            {step.word.definitionEn}
                          </p>
                        )}
                        {step.word.definitionVi && (
                          <p className="text-xs font-medium text-slate-500 italic mt-1">
                            {step.word.definitionVi}
                          </p>
                        )}
                      </div>
                    )}
                    {step.word.synonyms && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 text-left border-l-4 border-purple-400 rounded-r-2xl p-4 mt-4 max-w-lg mx-auto shadow-sm">
                        <p className="text-xs font-black text-purple-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                          Từ đồng nghĩa
                        </p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                          {step.word.synonyms}
                        </p>
                      </div>
                    )}
                    {step.word.mnemonic && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 mt-4 text-center max-w-lg mx-auto shadow-sm">
                        <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
                          💡 Mẹo nhớ
                        </p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                          {step.word.mnemonic}
                        </p>
                      </div>
                    )}

                    {/* Phase 5: Inline Kanji Breakdown for Intro */}
                    {step.word.word.match(/[\u4e00-\u9faf]/) && step.word.hanViet && (
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                        {step.word.word.match(/[\u4e00-\u9faf]/g).map((k, i) => {
                          const meanings = (step.word.hanViet || "").split(/[\/\s・,]+/).filter(Boolean);
                          return (
                            <div key={`${k}-${i}`} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                              <span className="font-black text-slate-700 dark:text-slate-200">{k}</span>
                              <span className="text-[10px] font-black text-amber-500 uppercase">{meanings[i] || ""}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {step.word.example && (
                    <div
                      className="p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border-4 border-slate-50 dark:border-slate-700 shadow-md transition-all cursor-pointer space-y-6"
                      onClick={playStepAudio}
                    >
                      <div className="space-y-6">
                        {parseDialog(step.word.example).map((p, i) => (
                          <div
                            key={`${p.label}-${i}`}
                            className={`space-y-2 relative pl-10 border-l-4 ${p.label?.includes("A") ? "border-blue-400" : p.label?.includes("B") ? "border-indigo-400" : "border-slate-300"}`}
                          >
                            {p.label && (
                              <span
                                className={`text-[11px] font-black uppercase absolute -left-1.5 top-0.5 px-3 py-1 rounded-full ${p.label.includes("A") ? "bg-blue-500 text-white" : "bg-indigo-500 text-white shadow-lg"}`}
                              >
                                {p.label.includes("A") ? "A" : "B"}
                              </span>
                            )}
                            <p lang="ja" className="text-2xl font-bold text-slate-700 dark:text-slate-100 leading-[1.8]">
                              {renderFurigana(p.content)}
                            </p>
                          </div>
                        ))}
                      </div>
                      {(step.word.exampleMeaning ||
                        step.word.example_vi ||
                        step.word.example_meaning_vi) && (
                        <div className="pt-8 border-t-4 border-slate-100 dark:border-slate-700 space-y-4">
                          {parseDialog(
                            step.word.exampleMeaning ||
                              step.word.example_vi ||
                              step.word.example_meaning_vi
                          ).map((m, idx) => (
                            <p
                              key={`m-${idx}`}
                              className="text-xl text-slate-500 dark:text-slate-400 font-bold leading-relaxed italic"
                            >
                              {m.label && (
                                <span className="font-black text-xs mr-3 inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-400 uppercase not-italic">
                                  {m.label.includes("A")
                                    ? "A"
                                    : m.label.includes("B")
                                      ? "B"
                                      : m.label}
                                </span>
                              )}
                              {m.content}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {(step.type === "choice" || step.type === "choice_kanji") && (
              <ChoiceStep
                word={step.word}
                allWords={allWords}
                showFeedback={showFeedback}
                userAnswer={userAnswer}
                checkAnswer={checkAnswer}
                type={step.type}
                deckId={deckId}
              />
            )}
            {step.type === "listen" && (
              <ListenStep
                word={step.word}
                allWords={allWords}
                showFeedback={showFeedback}
                userAnswer={userAnswer}
                checkAnswer={checkAnswer}
                cleanDisplay={cleanDisplay}
              />
            )}
            {step.type === "cloze" && (
              <ClozeStep
                word={step.word}
                showFeedback={showFeedback}
                userAnswer={userAnswer}
                checkAnswer={(val, isSubmit = true) => {
                   if (isSubmit) checkAnswer(val);
                   else setUserAnswer(val);
                }}
                deckId={deckId}
              />
            )}
            {step.type === "speak" && (
              <SpeakingStep
                word={step.word}
                showFeedback={showFeedback}
                userAnswer={userAnswer}
                checkAnswer={checkAnswer}
                deckId={deckId}
              />
            )}
            {step.type === "kanji_breakdown" && (
              <KanjiBreakdownStep
                word={step.word}
                goToNext={goToNext}
              />
            )}
            {step.type === "matching" && (
              <MatchingStep
                words={step.words}
                onComplete={goToNext}
                deckId={deckId}
              />
            )}
            {step.type === "typing" && (
              <div className="space-y-12 text-center">
                <div className="space-y-6">
                  <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2">
                    <Keyboard size={16} /> Nhập cách đọc
                  </p>
                  <h2 className="text-4xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter flex justify-center break-words whitespace-normal px-4">
                    {cleanDisplay(step.word.word)}
                  </h2>
                  <p className="text-2xl font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/40 py-3 px-8 rounded-3xl inline-block shadow-sm">
                    {step.word.meaning}
                  </p>
                </div>
                <div className="relative max-w-lg mx-auto w-full">
                  {userAnswer && !showFeedback && (
                    isTypo(normalize(userAnswer), normalize(step.word.word)) ||
                    isTypo(normalize(userAnswer), normalize(step.word.reading)) ||
                    isTypo(normalize(userAnswer), normalize(step.word.romaji))
                  ) && (
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-10 left-0 right-0 text-amber-500 font-bold text-sm"
                    >
                      ⚠️ Hình như bạn gõ nhầm một chút?
                    </motion.p>
                  )}
                  <input
                    ref={typingRef}
                    autoFocus
                    disabled={showFeedback}
                    value={typeof userAnswer === "string" ? userAnswer : ""}
                    onChange={e => {
                      const isEnglishMode = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng');
                      setUserAnswer(isEnglishMode ? e.target.value : romajiToHiragana(e.target.value));
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && userAnswer) {
                        e.preventDefault();
                        e.stopPropagation();
                        checkAnswer(userAnswer);
                      }
                    }}
                    placeholder="Gõ romaji hoặc hiragana..."
                    className={`w-full p-8 pr-20 bg-slate-50 dark:bg-slate-800 border-4 rounded-[2.5rem] text-center text-3xl font-black outline-none transition-all shadow-inner ${showFeedback ? (isCorrect ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-slate-100 focus:border-blue-400 focus:bg-white"}`}
                  />
                  {!showFeedback && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        onClick={() => setIsSlow(!isSlow)}
                        className={`p-2 rounded-lg transition-all ${isSlow ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-400"}`}
                      >
                        {isSlow ? "🐢" : "🐇"}
                      </button>
                      <button
                        onClick={() =>
                          tts.playWithFallback(
                            step.word.audio,
                            removeFurigana(step.word.word),
                            isSlow ? 0.6 : 1.0
                          )
                        }
                        className="p-4 bg-white dark:bg-slate-700 text-slate-400 hover:text-blue-500 rounded-3xl shadow-md border border-slate-100 placeholder:text-slate-300 transition-all active:scale-90"
                        title="Phát âm thanh"
                      >
                        <Volume2 size={24} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 p-4 md:p-6 backdrop-blur-3xl z-[160] border-t-2 transition-all duration-500 ${showFeedback ? (isCorrect ? "bg-emerald-50 border-emerald-200 shadow-[0_-10px_40px_rgba(16,185,129,0.1)]" : "bg-red-50 border-red-200 shadow-[0_-10px_40px_rgba(239,68,68,0.1)]") : "bg-white/95 dark:bg-slate-900/95 border-slate-100 dark:border-slate-800"}`}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {step.type === "matching" ? null : !showFeedback ? (
            <button
              onClick={() =>
                step.type === "intro" ? handleNextWithAudioStop() : userAnswer && checkAnswer(userAnswer)
              }
              className={`w-full max-w-md mx-auto py-3.5 rounded-[2rem] font-black text-xl transition-all shadow-xl active:scale-[0.97] uppercase tracking-widest ${step.type === "intro" || userAnswer ? "bg-[#58CC02] text-white shadow-green-200/50 hover:bg-[#46a302]" : "bg-slate-100 text-slate-300 pointer-events-none"}`}
            >
              <div className="flex items-center justify-center gap-4">
                {step.type === "intro" ? "TIẾP TỤC" : "KIỂM TRA"}
                <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-white/20 px-1.5 font-mono text-[10px] font-black text-white opacity-80 backdrop-blur-sm">
                  ENTER
                </kbd>
              </div>
            </button>
          ) : (
            <>
              {!isCorrect && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="flex items-start gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border-2 border-red-100 dark:border-red-900/20 backdrop-blur-sm"
                >
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 text-red-500 rounded-xl flex items-center justify-center shrink-0">
                    <Info size={24} />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div>
                      <p className="text-red-400 font-black uppercase text-[9px] tracking-widest leading-none mb-1">
                        Đáp án chính xác là:
                      </p>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                        {combineFurigana(step.word.word, step.word.reading)}
                      </h4>
                    </div>
                    <p className="text-lg font-bold text-[#A342FF] line-clamp-1">
                      {step.word.meaning}
                    </p>
                    {step.word.mnemonic && (
                      <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">💡 Mẹo nhớ</p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 italic">{step.word.mnemonic}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={playStepAudio}
                    className="w-10 h-10 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg flex items-center justify-center text-blue-500 active:scale-95 transition-all"
                  >
                    <Volume2 size={18} />
                  </button>
                </motion.div>
              )}

              <div className="flex items-center justify-between gap-6 w-full">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ${isCorrect ? "bg-green-500" : "bg-red-500"}`}
                  >
                    {isCorrect ? (
                      <Check size={32} strokeWidth={4} />
                    ) : (
                      <X size={32} strokeWidth={4} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`font-black text-2xl tracking-tight leading-tight ${isCorrect ? "text-green-700" : "text-red-700"}`}
                    >
                      {isCorrect ? "Tuyệt vời!" : "Chưa đúng rồi..."}
                    </p>
                    {isCorrect && step.type !== "intro" && (
                      <div className="hidden lg:block max-w-md">
                        <p className="text-sm font-black text-green-700 mb-0.5">
                          {step.word.meaning}
                        </p>
                        {step.word.example && (
                          <p className="text-base font-bold text-green-800 italic opacity-80 leading-snug">
                            {removeFurigana(step.word.example)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={goToNext}
                  className={`px-10 py-3.5 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest shrink-0 ${isCorrect ? "bg-green-500 text-white hover:bg-green-600" : "bg-red-500 text-white hover:bg-red-600"}`}
                >
                  TIẾP TỤC
                  <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-white/20 px-1.5 font-mono text-[10px] font-black text-white opacity-80 backdrop-blur-sm">
                    ENTER
                  </kbd>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 40 }}
              className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 max-w-md w-full shadow-[0_40px_100px_rgba(0,0,0,0.5)] border-8 border-slate-50 dark:border-slate-800 text-center space-y-10"
            >
              <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle size={56} strokeWidth={2.5} />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                  Thoát bài học?
                </h3>
                <p className="text-slate-500 font-bold text-lg leading-relaxed px-4">
                  Tiến độ của bài học hiện tại sẽ bị mất hoàn toàn nếu bạn rời đi.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="w-full py-5 bg-red-500 text-white rounded-[2rem] font-black hover:bg-red-600 transition-all shadow-xl shadow-red-200/40 text-lg uppercase tracking-widest"
                >
                  Xác nhận thoát
                </button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black hover:bg-slate-200 transition-all text-lg uppercase tracking-widest"
                >
                  Tiếp tục học
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-15px); } 40%, 80% { transform: translateX(15px); } } .animate-shake { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }`,
        }}
      />
    </div>
  );
};
