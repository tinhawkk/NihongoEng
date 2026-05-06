import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { useUserStore } from "../../store/useUserStore";
import { vocabularyRepository } from "../../data/repositories/NhostVocabularyRepository";
import { sounds } from "../../utils/sounds";

function shuffle(arr: any[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const useSpeedGame = () => {
  const [gameState, setGameState] = useState<"level_select" | "loading" | "countdown" | "playing" | "finished">("level_select");
  const [selectedLevel, setSelectedLevel] = useState("n5");
  const [words, setWords] = useState<any[]>([]);
  const [currentWord, setCurrentWord] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [powerups, setPowerups] = useState(0);
  const [removedOptionId, setRemovedOptionId] = useState<string | null>(null);
  const [comboFx, setComboFx] = useState<string | null>(null);

  const [questionMode, setQuestionMode] = useState("JP_TO_VI");
  const [questionText, setQuestionText] = useState("");
  const [questionSub, setQuestionSub] = useState("");

  const account = useUserStore(s => s.account);
  const addArenaResult = useUserStore(s => s.addArenaResult);
  const updateArenaProgress = useUserStore(s => s.updateArenaProgress);
  const savedResultRef = useRef(false);

  useEffect(() => {
    const levelProgress = account?.arenaProgress?.levelScores?.[selectedLevel] || {};
    const serverHigh = levelProgress.bestScore || 0;
    setHighScore(serverHigh);
  }, [selectedLevel, account?.arenaProgress]);

  function playBeep(freq = 440, duration = 150) {
    sounds.playBeep(freq, duration);
  }

  const startGame = async (lv: string, sourceOverride?: string) => {
    setSelectedLevel(lv);
    setGameState("loading");
    setScore(0);
    setTimeLeft(60);
    setStreak(0);
    setMultiplier(1);
    savedResultRef.current = false;

    try {
      let deckId = lv;
      let source = sourceOverride || "voca";
      if (["n1", "n2", "n3", "n4", "n5"].includes(lv)) {
        deckId = `JLPT ${lv.toUpperCase()}`;
      }
      const data = await vocabularyRepository.loadDeck(deckId, source);
      if (!data || data.length < 4) throw new Error("Not enough data");
      setWords(shuffle(data));
      
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

    const possibleModes = ["JP_TO_VI", "VI_TO_JP"];
    if (correct.reading && correct.reading !== correct.word) possibleModes.push("VI_TO_READING");
    if (correct.hanViet) possibleModes.push("HAN_TO_JP");
    if (correct.meaningEn || correct.meaning_en) possibleModes.push("EN_TO_JP");

    const mode = possibleModes[Math.floor(Math.random() * possibleModes.length)];
    setQuestionMode(mode);

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

  useEffect(() => {
    if (gameState === "finished") {
      const currentServerBest = account?.arenaProgress?.levelScores?.[selectedLevel]?.bestScore || 0;
      if (score > currentServerBest) {
        setHighScore(score);
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.7 } });
        playBeep(880, 300);
      }
      
      if (!savedResultRef.current) {
        savedResultRef.current = true;
        try {
          addArenaResult({ level: selectedLevel, score, duration: 60, streak });
          
          const currentLevelScores = account?.arenaProgress?.levelScores || {};
          const levelBest = Math.max(score, currentLevelScores[selectedLevel]?.bestScore || 0);
          const levelBestStreak = Math.max(streak, currentLevelScores[selectedLevel]?.bestStreak || 0);

          updateArenaProgress({
            bestScore: Math.max(score, account?.arenaProgress?.bestScore || 0),
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
  }, [gameState, score, selectedLevel, account?.arenaProgress, addArenaResult, updateArenaProgress, streak]);

  const handleUsePowerup = () => {
    if (powerups <= 0 || !options || options.length <= 2) return;
    setPowerups(p => p - 1);
    const wrongs = options.filter(o => o.id !== currentWord.id);
    if (wrongs.length === 0) return;
    const pick = wrongs[Math.floor(Math.random() * wrongs.length)];
    setRemovedOptionId(pick.id);
    setTimeLeft(t => Math.min(120, t + 3));
    confetti({ particleCount: 20, spread: 40, origin: { y: 0.7 } });
    playBeep(980, 120);
  };

  const handleAnswer = (choiceId: string) => {
    if (feedback) return;

    if (choiceId === currentWord.id) {
      const newStreak = streak + 1;
      const newMultiplier = Math.max(1, Math.floor(newStreak / 3) + 1);
      
      setStreak(newStreak);
      setWrongStreak(0);
      setMultiplier(newMultiplier);
      setScore(s => s + 10 * newMultiplier);
      setFeedback("correct");
      
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } });
      playBeep(880, 120);
      
      setComboFx(`+${newStreak} COMBO!`);
      setTimeout(() => setComboFx(null), 900);
      
      if (newStreak === 5) {
        setTimeLeft(t => Math.min(120, t + 5));
        setPowerups(p => p + 1);
      }
      if (newStreak === 10) {
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
      
      setTimeout(() => {
        if (wrongStreak + 1 >= 3) {
          setPowerups(p => p + 1);
          confetti({ particleCount: 20, spread: 30, origin: { y: 0.7 } });
        }
        setRemovedOptionId(null);
        nextRound();
      }, 1000);
    }
  };

  useEffect(() => {
    if (gameState === "playing") {
      const handleKeyDown = (e: KeyboardEvent) => {
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

  return {
    gameState,
    setGameState,
    selectedLevel,
    score,
    timeLeft,
    highScore,
    countdown,
    streak,
    multiplier,
    powerups,
    removedOptionId,
    comboFx,
    questionText,
    questionSub,
    currentWord,
    options,
    feedback,
    startGame,
    handleAnswer,
    handleUsePowerup,
  };
};

