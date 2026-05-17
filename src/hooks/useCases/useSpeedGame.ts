import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { useUserStore } from "../../store/useUserStore";
import { vocabularyRepository } from "../../data/repositories/NhostVocabularyRepository";
import { sounds } from "../../utils/sounds";
import { detectDeckLanguage } from "../../utils/helpers";

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
  const [gameMode, setGameMode] = useState<"quiz" | "match">("quiz");
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
  
  const [deckLang, setDeckLang] = useState<"japanese" | "english">("japanese");
  
  const [questionText, setQuestionText] = useState("");
  const [questionSub, setQuestionSub] = useState("");
  
  const [leftItems, setLeftItems] = useState<any[]>([]); 
  const [rightItems, setRightItems] = useState<any[]>([]);
  
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [mismatchIds, setMismatchIds] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [allWordsCount, setAllWordsCount] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const poolRef = useRef<any[]>([]);
  const roundPoolRef = useRef<any[]>([]);

  const [ttsEnabled, setTtsEnabled] = useState(true);

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

  // TTS helper
  const speakWord = useCallback((text: string) => {
    if (!ttsEnabled || !text || typeof window === "undefined" || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Detection logic
    const isJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
    // Simple ASCII check for English (excluding specific Jp characters already checked)
    const isEnglish = /^[a-zA-Z0-9\s.,!?'"-]+$/.test(text);

    if (isJapanese) {
      utterance.lang = "ja-JP";
    } else if (isEnglish) {
      utterance.lang = "en-US";
    } else {
      // Don't speak Vietnamese or other languages as per user request
      return;
    }
    
    const voices = window.speechSynthesis.getVoices();
    // Prioritize natural sounding Google/Enhanced voices
    const voice = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]) && (v.name.includes("Google") || v.localService)) 
               || voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
    
    if (voice) utterance.voice = voice;
    utterance.rate = isJapanese ? 0.9 : 1.0;
    
    setTimeout(() => window.speechSynthesis.speak(utterance), 50);
  }, [ttsEnabled]);

  const startGame = async (lv: string, mode: string = "quiz", sourceOverride?: string) => {
    setSelectedLevel(lv);
    setGameMode(mode as "quiz" | "match");
    setGameState("loading");
    setScore(0);
    setTimeLeft(60);
    setStreak(0);
    setMultiplier(1);
    setRound(1);
    setMatchedCount(0);
    savedResultRef.current = false;

    try {
      let deckId = lv;
      let source = sourceOverride || "voca";
      if (!sourceOverride && ["n1", "n2", "n3", "n4", "n5"].includes(lv)) {
        deckId = `JLPT ${lv.toUpperCase()}`;
      }
      const data = await vocabularyRepository.loadDeck(deckId, source as "sheet" | "voca");
      if (!data || data.length < 4) throw new Error("Not enough data");
      
      const lang = detectDeckLanguage(deckId, lv);
      setDeckLang(lang as "japanese" | "english");

      const shuffled = shuffle(data);
      setWords(shuffled);
      setAllWordsCount(data.length);
      
      if (mode === "match") {
        poolRef.current = [...shuffled];
        roundPoolRef.current = [...shuffled];
        prepareMatchBatch(lang);
      }
      
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
      alert("Không đủ dữ liệu cho đề mục này!");
      setGameState("level_select");
    }
  };

  const prepareMatchBatch = (lang: string) => {
      const batch = roundPoolRef.current.splice(0, 5);
      const left: any[] = [];
      const right: any[] = [];
      
      batch.forEach(w => {
          // Store both word and reading for speech
          left.push({ 
            id: `${w.id}_l`, 
            type: 'left', 
            content: w.word, 
            speechText: w.reading || w.word,
            wordId: w.id 
          });
          
          let rightContent = w.meaning;
          let subLabel = "MEANING";
          let speechText = w.meaning; // Default meaning
          
          if (lang === "japanese" && w.reading && w.reading !== w.word && Math.random() > 0.5) {
              rightContent = w.reading;
              subLabel = "READING";
              speechText = w.reading;
          }
          
          right.push({ 
            id: `${w.id}_r`, 
            type: 'right', 
            content: rightContent, 
            subLabel, 
            speechText,
            wordId: w.id 
          });
      });
      
      setLeftItems(shuffle(left));
      setRightItems(shuffle(right));
  };

  const startGameMulti = async (label: string, deckIds: string[], sourceOverride?: string) => {
    setSelectedLevel(label);
    setGameMode("quiz");
    setGameState("loading");
    setScore(0);
    setTimeLeft(60);
    setStreak(0);
    setMultiplier(1);
    savedResultRef.current = false;

    try {
      const source = sourceOverride || "voca";
      const results = await Promise.allSettled(
        deckIds.map(id => vocabularyRepository.loadDeck(id, source as "sheet" | "voca"))
      );
      const all: any[] = [];
      results.forEach(r => {
        if (r.status === "fulfilled" && r.value) all.push(...r.value);
      });
      if (all.length < 4) throw new Error("Not enough data");
      setWords(shuffle(all));

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
      alert("Lỗi dữ liệu!");
      setGameState("level_select");
    }
  };

  // ── Quiz Logic ──
  const nextQuizRound = useCallback(() => {
    if (words.length === 0) return;
    const correct = words[Math.floor(Math.random() * words.length)];
    const others = shuffle(words.filter(w => w.id !== correct.id)).slice(0, 3);
    const choices = shuffle([correct, ...others]).map(w => ({ ...w, display: w.meaning }));
    
    setQuestionText(correct.word);
    setQuestionSub(correct.reading || "");
    setCurrentWord(correct);
    setOptions(choices);
    setFeedback(null);
  }, [words]);

  const handleQuizAnswer = (choiceId: string) => {
    if (feedback) return;
    if (choiceId === currentWord?.id) {
      setScore(s => s + 10 * multiplier);
      setStreak(s => s + 1);
      setMultiplier(m => Math.floor(streak / 5) + 1);
      setFeedback("correct");
      playBeep(880, 100);
      // Speak phonetic reading if available
      speakWord(currentWord.reading || currentWord.word);
      setTimeout(nextQuizRound, 600);
    } else {
      setFeedback("wrong");
      setStreak(0);
      setMultiplier(1);
      playBeep(220, 200);
      setTimeout(nextQuizRound, 1000);
    }
  };

  // ── Match Logic ──
  const handleSelectItem = (item: any) => {
    if (mismatchIds.length > 0) return;
    
    // Only speak the "left" side (target language) or "reading" on the right
    if (item.type === 'left' || item.subLabel === "READING") {
        speakWord(item.speechText || item.content);
    }

    if (selectedItem?.id === item.id) {
        setSelectedItem(null);
        return;
    }

    if (!selectedItem) {
      setSelectedItem(item);
      playBeep(440, 50);
      return;
    }

    // Check match
    if (selectedItem.wordId === item.wordId && selectedItem.type !== item.type) {
      // Match!
      playBeep(880, 80);
      
      // Speak the target language word
      if (item.type === 'left') speakWord(item.speechText || item.content);
      else if (selectedItem.type === 'left') speakWord(selectedItem.speechText || selectedItem.content);

      setMatchedCount(prev => prev + 1);
      setScore(s => s + 20);
      
      setLeftItems(prev => prev.filter(p => p.wordId !== item.wordId));
      setRightItems(prev => prev.filter(p => p.wordId !== item.wordId));
      setSelectedItem(null);

      if (roundPoolRef.current.length > 0) {
          const next = roundPoolRef.current.shift();
          if (next) {
              setLeftItems(prev => shuffle([...prev, { 
                id: `${next.id}_l`, 
                type: 'left', 
                content: next.word, 
                speechText: next.reading || next.word,
                wordId: next.id 
              }]));
              
              let rightContent = next.meaning;
              let subLabel = "MEANING";
              let speechText = next.meaning;
              if (deckLang === "japanese" && next.reading && next.reading !== next.word && Math.random() > 0.5) {
                rightContent = next.reading;
                subLabel = "READING";
                speechText = next.reading;
              }
              setRightItems(prev => shuffle([...prev, { 
                id: `${next.id}_r`, 
                type: 'right', 
                content: rightContent, 
                subLabel, 
                speechText,
                wordId: next.id 
              }]));
          }
      } else {
          const currentCount = leftItems.length - 1;
          if (currentCount === 0) {
            if (round < 2) {
              setRound(2);
              setMatchedCount(0);
              roundPoolRef.current = [...poolRef.current];
              setTimeout(() => prepareMatchBatch(deckLang), 500);
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            } else {
              setGameState("finished");
              confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
            }
          }
      }
    } else {
      // Mismatch
      playBeep(220, 150);
      setMismatchIds([selectedItem.id, item.id]);
      setTimeout(() => {
        setMismatchIds([]);
        setSelectedItem(null);
      }, 500);
    }
  };

  useEffect(() => {
    if (gameState === "playing") {
      if (gameMode === "quiz") nextQuizRound();
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
  }, [gameState, gameMode, nextQuizRound]);

  useEffect(() => {
    if (gameState === "finished" && !savedResultRef.current) {
      savedResultRef.current = true;
      if (score > highScore) {
          setHighScore(score);
          updateArenaProgress({
            bestScore: Math.max(score, account?.arenaProgress?.bestScore || 0),
            levelScores: {
              ...(account?.arenaProgress?.levelScores || {}),
              [selectedLevel]: {
                bestScore: score,
                bestStreak: streak
              }
            }
          });
      }
    }
  }, [gameState, score, highScore, selectedLevel, account?.arenaProgress, updateArenaProgress]);

  return {
    gameState, setGameState, gameMode, selectedLevel, score, timeLeft, highScore,
    countdown, streak, multiplier,
    currentWord, options, feedback, handleQuizAnswer,
    leftItems, rightItems, selectedItem, mismatchIds, round, allWordsCount, matchedCount, handleSelectItem,
    startGame, startGameMulti, ttsEnabled, setTtsEnabled, questionText, questionSub
  };
};
