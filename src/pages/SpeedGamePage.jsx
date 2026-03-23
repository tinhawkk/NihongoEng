import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Zap,
  Target,
  Award,
  ArrowLeft,
  RotateCcw,
  Play,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loadDeck } from "../api/loader";
import confetti from "canvas-confetti";
import { useUserStore } from "../store/useUserStore";

// Helper to shuffle arrays properly
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LEVELS = [
  { id: "n5", label: "N5", color: "bg-[#58CC02]" },
  { id: "n4", label: "N4", color: "bg-[#FF9600]" },
  { id: "n3", label: "N3", color: "bg-[#FF4B4B]" },
  { id: "n2", label: "N2", color: "bg-[#A342FF]" },
  { id: "n1", label: "N1", color: "bg-[#37464F]" },
  { id: "eng", label: "ENG", color: "bg-[#CE82FF]", title: "Tiếng Anh" },
];

export const SpeedGamePage = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState("level_select"); // level_select, loading, playing, finished
  const [selectedLevel, setSelectedLevel] = useState("n5");
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState(null); // 'correct', 'wrong'
  const account = useUserStore(s => s.account);
  const [highScore, setHighScore] = useState(0);

  // Sync high score with server and local storage
  useEffect(() => {
    const localKey = `speed_high_score_${selectedLevel}`;
    const localHigh = parseInt(localStorage.getItem(localKey) || "0");
    // Get per-level score from account if it exists
    const levelProgress = account?.arenaProgress?.levelScores?.[selectedLevel] || {};
    const serverHigh = levelProgress.bestScore || 0;
    const finalHigh = Math.max(localHigh, serverHigh);
    
    setHighScore(finalHigh);
    if (finalHigh > localHigh) localStorage.setItem(localKey, finalHigh.toString());
  }, [selectedLevel, account?.arenaProgress]);
  const [countdown, setCountdown] = useState(null);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [powerups, setPowerups] = useState(0);
  const [removedOptionId, setRemovedOptionId] = useState(null);
  const [comboFx, setComboFx] = useState(null);
  const savedResultRef = React.useRef(false);

  const addArenaResult = useUserStore(s => s.addArenaResult);
  const updateArenaProgress = useUserStore(s => s.updateArenaProgress);

  const [questionMode, setQuestionMode] = useState("JP_TO_VI"); // JP_TO_VI, VI_TO_JP, VI_TO_READING, HAN_TO_JP, EN_TO_JP
  const [questionText, setQuestionText] = useState("");
  const [questionSub, setQuestionSub] = useState("");

  const startGame = async (lv, sourceOverride) => {
    setSelectedLevel(lv);
    setGameState("loading");
    setScore(0);
    setTimeLeft(60);
    setStreak(0);
    setMultiplier(1);
    savedResultRef.current = false;

    try {
      // Chỉ truyền đúng JLPT N1-N5 nếu lv là n1-n5
      let deckId = lv;
      let source = sourceOverride || "voca";
      if (["n1", "n2", "n3", "n4", "n5"].includes(lv)) {
        deckId = `JLPT ${lv.toUpperCase()}`;
      }
      const data = await loadDeck(deckId, source);
      if (!data || data.length < 4) throw new Error("Not enough data");
      setWords(shuffle(data));
      // Start 3..2..1 animated countdown
      setCountdown(3);
      setGameState("countdown");
      setTimeout(() => setCountdown(2), 800);
      setTimeout(() => setCountdown(1), 1600);
      setTimeout(() => {
        setCountdown(null);
        setGameState("playing");
      }, 2400);
    } catch (err) {
      console.error(err);
      alert("Không đủ dữ liệu cho cấp độ này, vui lòng thử cấp độ khác!");
      setGameState("level_select");
    }
  };

  const nextRound = useCallback(() => {
    if (words.length === 0) return;
    const correct = words[Math.floor(Math.random() * words.length)];

    // Determine possible modes based on available fields
    const possibleModes = ["JP_TO_VI", "VI_TO_JP"];
    if (correct.reading && correct.reading !== correct.word) possibleModes.push("VI_TO_READING");
    if (correct.hanViet) possibleModes.push("HAN_TO_JP");
    if (correct.meaningEn || correct.meaning_en) possibleModes.push("EN_TO_JP");

    const mode = possibleModes[Math.floor(Math.random() * possibleModes.length)];
    setQuestionMode(mode);

    // Set question text
    if (mode === "JP_TO_VI") {
      setQuestionText(correct.word);
      setQuestionSub(correct.reading || "");
    } else if (mode === "VI_TO_JP") {
      setQuestionText(correct.meaning);
      setQuestionSub("Chọn từ vựng đúng");
    } else if (mode === "VI_TO_READING") {
      setQuestionText(correct.meaning);
      setQuestionSub("Chọn cách đọc đúng");
    } else if (mode === "HAN_TO_JP") {
      setQuestionText(correct.hanViet);
      setQuestionSub("Hán Việt -> Kanji");
    } else if (mode === "EN_TO_JP") {
      setQuestionText(correct.meaningEn || correct.meaning_en);
      setQuestionSub("English -> Kanji");
    }

    const others = shuffle(words.filter(w => w.id !== correct.id)).slice(0, 3);

    // Prepare choices with mode-specific display text
    const choices = shuffle([correct, ...others]).map(w => {
      let display = w.meaning;
      if (mode === "VI_TO_JP" || mode === "HAN_TO_JP" || mode === "EN_TO_JP") display = w.word;
      if (mode === "VI_TO_READING") display = w.reading || w.word;
      return { ...w, display };
    });

    setCurrentWord(correct);
    setOptions(choices);
    setFeedback(null);
  }, [words]);

  useEffect(() => {
    if (gameState === "playing") {
      nextRound();
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState("finished");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, nextRound]);

  // Separate effect for keyboard support to avoid resetting timer
  useEffect(() => {
    if (gameState === "playing") {
      const handleKeyDown = e => {
        if (feedback) return;
        if (e.key === "1") handleAnswer(options[0]?.id);
        if (e.key === "2") handleAnswer(options[1]?.id);
        if (e.key === "3") handleAnswer(options[2]?.id);
        if (e.key === "4") handleAnswer(options[3]?.id);
        if (e.key === " ") {
          e.preventDefault();
          handleUsePowerup();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [gameState, options, feedback, powerups]);

  useEffect(() => {
    if (gameState === "finished") {
      const currentHighScore = parseInt(
        localStorage.getItem(`speed_high_score_${selectedLevel}`) || "0"
      );
      if (score > currentHighScore) {
        localStorage.setItem(`speed_high_score_${selectedLevel}`, score.toString());
        setHighScore(score);
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.7 } });
        // celebration sound
        playBeep(880, 300);
      }
      // save arena result once
      if (!savedResultRef.current) {
        savedResultRef.current = true;
        try {
          addArenaResult({ level: selectedLevel, score, duration: 60, streak });
          
          const currentLevelScores = account?.arenaProgress?.levelScores || {};
          const levelBest = Math.max(score, currentLevelScores[selectedLevel]?.bestScore || 0);
          const levelBestStreak = Math.max(streak, currentLevelScores[selectedLevel]?.bestStreak || 0);

          updateArenaProgress({
            bestScore: Math.max(score, account?.arenaProgress?.bestScore || 0), // Global best
            levelScores: {
              ...currentLevelScores,
              [selectedLevel]: {
                bestScore: levelBest,
                bestStreak: levelBestStreak
              }
            }
          });
        } catch (e) {
          console.error("Failed to save arena result", e);
        }
      }
    }
  }, [gameState, score, selectedLevel]);

  const handleAnswer = choiceId => {
    if (feedback) return; // Prevent double clicking

    if (choiceId === currentWord.id) {
      const newStreak = streak + 1;
      const newMultiplier = Math.max(1, Math.floor(newStreak / 3) + 1);
      
      setStreak(newStreak);
      setWrongStreak(0);
      setMultiplier(newMultiplier);
      setScore(s => s + 10 * newMultiplier);
      setFeedback("correct");
      // small confetti + sound for streaks
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } });
      playBeep(880, 120);
      // combo FX
      setComboFx(`+${newStreak} COMBO!`);
      setTimeout(() => setComboFx(null), 900);
      // Award bonuses at thresholds
      if (newStreak === 5) {
        // +5 seconds bonus
        setTimeLeft(t => Math.min(120, t + 5));
        setPowerups(p => p + 1);
      }
      if (newStreak === 10) {
        // big celebration and extra powerup
        confetti({ particleCount: 80, spread: 120, origin: { y: 0.6 } });
        setTimeLeft(t => Math.min(120, t + 10));
        setPowerups(p => p + 2);
        playBeep(1200, 250);
      }
      setTimeout(() => {
        setRemovedOptionId(null);
        nextRound();
      }, 600);
    } else {
      setScore(s => Math.max(0, s - 5));
      setFeedback("wrong");
      setStreak(0);
      setMultiplier(1);
      setWrongStreak(w => w + 1);
      playBeep(220, 200);
      // If user misses several in a row, give a rescue powerup
      setTimeout(() => {
        if (wrongStreak + 1 >= 3) {
          setPowerups(p => p + 1);
          // visual hint
          confetti({ particleCount: 20, spread: 30, origin: { y: 0.7 } });
        }
        setRemovedOptionId(null);
        nextRound();
      }, 1000); // More penalty for wrong
    }
  };

  // Use a powerup: either remove one wrong option (if available options >2) or extend time
  const handleUsePowerup = () => {
    if (powerups <= 0 || !options || options.length <= 2) return;
    // consume one
    setPowerups(p => p - 1);
    // remove a random wrong option
    const wrongs = options.filter(o => o.id !== currentWord.id);
    if (wrongs.length === 0) return;
    const pick = wrongs[Math.floor(Math.random() * wrongs.length)];
    setRemovedOptionId(pick.id);
    // small reward
    setTimeLeft(t => Math.min(120, t + 3));
    confetti({ particleCount: 20, spread: 40, origin: { y: 0.7 } });
    playBeep(980, 120);
  };

  // Simple WebAudio beep for feedback (no external files)
  function playBeep(freq = 440, duration = 150) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, duration + 20);
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col font-sans overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-500 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
        {/* Subtle particles for arena vibe */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-3 h-3 bg-white/60 rounded-full left-10 top-24 animate-pulse opacity-60" />
          <div className="absolute w-2 h-2 bg-white/50 rounded-full left-1/4 top-1/3 animate-bounce opacity-40" />
          <div className="absolute w-2.5 h-2.5 bg-white/40 rounded-full right-20 top-1/4 animate-pulse opacity-50" />
          <div className="absolute w-3 h-3 bg-white/50 rounded-full left-3/4 bottom-1/3 animate-bounce opacity-30" />
          <div className="absolute w-2 h-2 bg-white/30 rounded-full right-10 bottom-24 animate-pulse opacity-40" />
        </div>
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between p-6 md:p-10">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-500 hover:text-slate-800 transition-colors font-black text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Thoát
        </button>

        {gameState === "playing" && (
          <div className="flex items-center gap-8 md:gap-12">
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Thời gian
              </p>
              <div className="flex items-center gap-2">
                <Clock size={20} className={timeLeft < 10 ? "text-red-500" : "text-slate-300"} />
                <p
                  className={`text-3xl font-black tabular-nums ${timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-800 dark:text-white"}`}
                >
                  {timeLeft}s
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Điểm số
              </p>
              <div className="flex items-center gap-2">
                <Target size={20} className="text-emerald-500" />
                <p className="text-3xl font-black text-emerald-500 tabular-nums">{score}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Streak
              </p>
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-amber-400" />
                <p className="text-2xl font-black text-amber-500 tabular-nums">{streak}</p>
                <p className="text-sm text-slate-400">x{multiplier}</p>
              </div>
            </div>
          </div>
        )}
        <div className="hidden md:block w-24"></div>
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        {/* Countdown overlay */}
        {gameState === "countdown" && countdown != null && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30">
            <div className="text-center pointer-events-none">
              <div className="text-9xl md:text-[12rem] font-black text-white animate-pulse">
                {countdown}
              </div>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {gameState === "level_select" && (
            <motion.div
              key="level_select"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-xl w-full text-center space-y-10"
            >
              <div className="space-y-4">
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 rotate-12">
                  <Zap size={40} className="text-white fill-white" />
                </div>
                <h2 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  Thách thức 60s
                </h2>
                <p className="text-slate-500 font-bold">Chọn cấp độ để vào đấu trường ngay!</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {LEVELS.map(lv => (
                  <button
                    key={lv.id}
                    onClick={() => startGame(lv.id, lv.id === "eng" ? "sheet" : undefined)}
                    className="group relative overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500 transition-all text-left flex items-center justify-between shadow-sm active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 ${lv.color} rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg`}
                      >
                        {lv.label}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                          {lv.id === "eng" ? "TIẾNG ANH" : `TRÌNH ĐỘ ${lv.label}`}
                        </p>
                        <p className="text-xs text-slate-400 font-bold">
                          Kỷ lục: {localStorage.getItem(`speed_high_score_${lv.id}`) || "0"} điểm
                        </p>
                      </div>
                    </div>
                    <Play
                      className="text-slate-100 group-hover:text-emerald-500 transition-colors"
                      fill="currentColor"
                      size={20}
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {gameState === "loading" && (
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 border-8 border-slate-100 dark:border-slate-800 rounded-full" />
                <div className="absolute top-0 left-0 w-20 h-20 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-sm">
                Đang tải đấu trường {selectedLevel.toUpperCase()}...
              </p>
            </div>
          )}

          {gameState === "playing" && currentWord && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl space-y-10"
            >
              {/* Question Card */}
              <div
                className={`relative bg-white dark:bg-slate-900 rounded-[48px] p-16 text-center shadow-2xl transition-all duration-300 border-4 ${
                  feedback === "correct"
                    ? "border-emerald-500 shadow-emerald-500/20 bg-emerald-50/10"
                    : feedback === "wrong"
                      ? "border-red-500 shadow-red-500/20 bg-red-50/10"
                      : "border-white dark:border-slate-800 shadow-slate-200/50 dark:shadow-none"
                }`}
              >
                {/* Feedback Icons */}
                <AnimatePresence>
                  {feedback === "correct" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1.2 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white p-3 rounded-full shadow-lg"
                    >
                      <CheckCircle2 size={32} />
                    </motion.div>
                  )}
                  {feedback === "wrong" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1.2 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white p-3 rounded-full shadow-lg"
                    >
                      <XCircle size={32} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <h1
                  className={`${questionText?.length > 10 ? "text-4xl md:text-5xl" : "text-7xl md:text-8xl"} font-black text-slate-800 dark:text-white mb-6 uppercase tracking-tighter`}
                >
                  {questionText}
                </h1>
                <p className="text-2xl md:text-3xl text-slate-400 font-bold tracking-widest uppercase">
                  {questionSub}
                </p>
              </div>

              {/* Options & Powerups */}
              <div className="w-full max-w-2xl space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Lựa chọn của bạn
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Hỗ trợ
                    </span>
                    <button
                      onClick={handleUsePowerup}
                      disabled={powerups <= 0}
                      className={`px-4 py-1.5 rounded-xl font-black transition-all ${
                        powerups > 0
                          ? "bg-amber-400 text-white shadow-lg shadow-amber-400/20 active:scale-95"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                      }`}
                    >
                      ⚡ {powerups}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                  {/* Floating Combo FX */}
                  <div className="absolute -right-24 top-1/2 -translate-y-1/2 hidden lg:block">
                    <AnimatePresence>
                      {comboFx && (
                        <motion.div
                          initial={{ x: -20, opacity: 0, scale: 0.8 }}
                          animate={{ x: 0, opacity: 1, scale: 1.1 }}
                          exit={{ opacity: 0, scale: 0.5, x: 20 }}
                          className="bg-amber-500 text-white font-black px-6 py-3 rounded-[24px] shadow-2xl shadow-amber-500/30 whitespace-nowrap rotate-12 border-4 border-white dark:border-slate-900"
                        >
                          {comboFx}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {options.map((opt, idx) => {
                    const isRemoved = opt.id === removedOptionId;
                    return (
                      <button
                        key={opt.id}
                        disabled={!!feedback || isRemoved}
                        onClick={() => handleAnswer(opt.id)}
                      className={`group relative overflow-hidden p-6 rounded-[32px] border-2 text-xl font-black transition-all text-left flex items-center gap-5 shadow-sm active:scale-95 ${
                        isRemoved 
                          ? "opacity-0 pointer-events-none" 
                          : feedback === "correct" && opt.id === currentWord.id
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/30"
                            : feedback === "wrong" && opt.id === currentWord.id
                              ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400 text-emerald-700 dark:text-emerald-300"
                              : feedback === "wrong" && opt.id !== currentWord.id
                                ? "opacity-50 border-slate-100 dark:border-slate-800 text-slate-300"
                                : feedback === "correct" && opt.id !== currentWord.id
                                  ? "opacity-50 border-slate-100 dark:border-slate-800 text-slate-300"
                                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-emerald-500 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {!isRemoved && (
                        <>
                          <span
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-colors ${
                              feedback === "correct" && opt.id === currentWord.id
                                ? "bg-white/20 text-white"
                                : feedback === "wrong" && opt.id === currentWord.id
                                  ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                            }`}
                          >
                            {idx + 1}
                          </span>
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

          {gameState === "finished" && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-10 bg-white dark:bg-slate-900 p-12 md:p-16 rounded-[56px] shadow-2xl w-full max-w-xl border-2 border-slate-50 dark:border-slate-800"
            >
              <div className="space-y-4">
                <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto text-amber-500">
                  <Award size={64} className="animate-bounce" />
                </div>
                <div>
                  <h2 className="text-5xl font-black text-slate-800 dark:text-white mb-1 uppercase tracking-tighter">
                    HẾT GIỜ!
                  </h2>
                  <p className="text-slate-400 font-bold tracking-[0.3em] uppercase text-xs">
                    Phòng thay đồ của nhà vô địch
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-950/50 p-8 rounded-[36px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Điểm đạt được
                  </p>
                  <p className="text-4xl font-black text-emerald-500 scale-110">{score}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/50 p-8 rounded-[36px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Kỷ lục {selectedLevel.toUpperCase()}
                  </p>
                  <p className="text-4xl font-black text-amber-500">{highScore}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => startGame(selectedLevel)}
                  className="w-full bg-[#1CB0F6] hover:bg-[#189ddb] text-white font-black py-5 rounded-3xl text-lg shadow-[0_6px_0_0_#189ddb] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3"
                >
                  <RotateCcw size={20} /> CHƠI LẠI {selectedLevel.toUpperCase()}
                </button>
                <button
                  onClick={() => setGameState("level_select")}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-500 font-black py-5 rounded-3xl text-sm transition-all"
                >
                  ĐỔI CẤP ĐỘ
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
