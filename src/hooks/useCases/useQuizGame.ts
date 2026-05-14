import { useState, useEffect, useRef, useCallback } from "react";
import { vocabularyRepository } from "../../data/repositories/NhostVocabularyRepository";
import { nhostService } from "../../services/nhostService";
import { useUserStore } from "../../store/useUserStore";
import { tts } from "../../utils/tts";
import { sounds } from "../../utils/sounds";

const DECK_LABELS: Record<string, string> = {
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

function shuffle(arr: any[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestions(words: any[], count = 10, globalDistractorPool: any[] = [], isEnglish: boolean = false) {
  if (words.length === 0) return [];
  
  const selected = shuffle(words).slice(0, Math.min(count, words.length));
  
  const cleanedDistractors = globalDistractorPool.filter(w => {
    if (isEnglish && w.word) {
      return !/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(w.word); 
    }
    return true;
  });
  const globalPool = cleanedDistractors.length > 20 ? cleanedDistractors : globalDistractorPool;
  const basePool = [...words, ...globalPool];

  return selected.map(word => {
    const reading = word.reading || word.furigana || "";
    const example = word.example || word.example_jp || word.explanation || "";
    const exampleMeaning = word.exampleMeaning || word.example_vi || word.example_meaning_vi || word.example_meaning || word.vietnamese || word.meaning_vi || "";
    
    const isWordEnglish = isEnglish || (word.word && !/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(word.word));
    
    const types = ['meaning', 'reverse'];
    if (reading && reading !== word.word && !isWordEnglish) types.push('reading');
    if (example && example.includes(word.word)) types.push('context');
    
    const qType = types[Math.floor(Math.random() * types.length)];
    
    let questionText = word.word;
    let correctAnswer = word.meaning;
    let distractorKey = 'meaning';
    let prompt = "Nghĩa của từ này là gì?";

    if (qType === 'meaning') {
      questionText = word.word;
      correctAnswer = word.meaning;
      distractorKey = 'meaning';
      prompt = "Nghĩa của từ này là gì?";
    } else if (qType === 'reverse') {
      questionText = word.meaning;
      correctAnswer = word.word;
      distractorKey = 'word';
      prompt = isWordEnglish ? "Chọn từ tiếng Anh tương ứng:" : "Chọn từ tiếng Nhật tương ứng:";
    } else if (qType === 'reading') {
      questionText = word.word;
      correctAnswer = reading;
      distractorKey = 'reading'; 
      prompt = "Cách đọc đúng là gì?";
    } else if (qType === 'context') {
      const safeWord = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let qText = example;
      qText = qText.replace(new RegExp(`\\[${safeWord}\\]\\([^)]+\\)`, 'g'), "___");
      qText = qText.replace(new RegExp(`${safeWord}[（\\(\\[<][^）\\)\\]>]+[）\\)\\]>]`, 'g'), "___");
      qText = qText.replace(new RegExp(safeWord, 'g'), "___");
      
      questionText = qText;
      correctAnswer = word.word;
      distractorKey = 'word';
      prompt = "Điền từ thích hợp vào chỗ trống:";
    }

    let wrongPool = basePool.filter(w => {
      if (w.id === word.id) return false;
      const val = distractorKey === 'reading' ? (w.reading || w.furigana) : w[distractorKey];
      return val && val.trim() !== "" && val !== correctAnswer;
    });

    const wrongs: string[] = [];
    shuffle(wrongPool).forEach(w => {
      const val = distractorKey === 'reading' ? (w.reading || w.furigana) : w[distractorKey];
      const cleanVal = val?.trim();
      if (wrongs.length < 3 && cleanVal && !wrongs.includes(cleanVal)) {
        wrongs.push(cleanVal);
      }
    });
    
    while (wrongs.length < 3) {
      wrongs.push(`Đáp án nhiễu ${wrongs.length + 1}`);
    }

    const options = shuffle([correctAnswer, ...wrongs]);

    return {
      id: word.id,
      word: word.word, 
      qType,
      prompt,
      questionText,
      reading,
      correctAnswer,
      options,
      audio: word.audio || "",
      meaning: word.meaning,
      example: example,
      exampleMeaning: exampleMeaning,
      mnemonic: word.mnemonic || "",
      hanViet: word.hanViet || "",
    };
  });
}

export const useQuizGame = (deckId: string | undefined) => {
  const account = useUserStore(s => s.account);
  const addQuizResult = useUserStore(s => s.addQuizResult);
  const updateStreak = useUserStore(s => s.updateStreak);
  const updateSrsItem = useUserStore(s => s.updateSrsItem);
  const vocaSource = useUserStore(s => s.vocaSource);

  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"setup" | "playing" | "result">("setup");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<"pause" | "auto">("pause");
  const [distractorPool, setDistractorPool] = useState<any[]>([]);
  const scoreRef = useRef(0);
  const [deckMetadata, setDeckMetadata] = useState<any>(null);

  useEffect(() => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId || "");
    if (isUUID && deckId) {
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
    if (!deckId) return;
    const loadQuizData = async () => {
      setLoading(true);
      
      try {
        const isSrs = deckId === "srs";
        const isVocaSource = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId) || vocaSource === "voca";
        
        const mainData = isSrs ? [] : await vocabularyRepository.loadDeck(deckId, isVocaSource ? "voca" : "sheet");
        
        const params = new URLSearchParams(window.location.search);
        let currentDistractorPool = [];
        let filtered = [];
        
        if (isSrs) {
          const allSrsItems = Object.values(useUserStore.getState().account?.srsData || {});
          const targetDeck = params.get("deck");
          const queryMode = params.get("mode");
          const today = new Date();
          
          let srsDeckItems = allSrsItems;
          if (targetDeck && targetDeck !== "all") {
             srsDeckItems = allSrsItems.filter((item: any) => {
               if (targetDeck === "DICTIONARY_SOURCE" || targetDeck === "Từ điển & Tìm kiếm") {
                 return item.source === "search";
               }
               return item.deckName === targetDeck || item.deck === targetDeck || item.deckId === targetDeck;
             });
          }
          
          filtered = srsDeckItems.filter((item: any) => {
            const reviewDate = new Date(item.nextReview || 0);
            const isDue = reviewDate <= today;
            return queryMode === 'all' ? true : isDue;
          });
          
          currentDistractorPool = srsDeckItems;
        } else {
          filtered = mainData;
          currentDistractorPool = mainData; // Distractors now exclusively come from the same deck
        }

        const filter = params.get("filter") || "all";
        if (filter === "kanji") {
          filtered = filtered.filter(w => w.type === "kanji");
          currentDistractorPool = currentDistractorPool.filter(w => w.type === "kanji");
        } else if (filter === "voca") {
          filtered = filtered.filter(w => w.type === "voca" || !w.type);
          currentDistractorPool = currentDistractorPool.filter(w => w.type === "voca" || !w.type);
        }

        setWords(filtered);
        setDistractorPool(currentDistractorPool);
      } catch (err) {
        console.error("Failed to load quiz data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadQuizData();
  }, [deckId, vocaSource]);

  const handleStart = (count: number, selectedMode: "pause" | "auto") => {
    const isEnglish = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng');
    const qs = generateQuestions(words, count, distractorPool.length > 0 ? distractorPool : words, isEnglish);
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

  const goToNext = (rating?: number) => {
    if (rating !== undefined && questions[currentIdx]) {
      const q = questions[currentIdx];
      const originalWord = words.find(w => w.id === q.id || w.word === q.word);
      if (originalWord && typeof updateSrsItem === "function") {
        const stableId = originalWord.id || originalWord.word;
        updateSrsItem(stableId, originalWord, rating, {
          source: "quiz",
          deckId: deckId === "srs" ? (originalWord.deck || originalWord.deckId) : deckId,
          deckName: deckId === "srs" ? (originalWord.deckName || originalWord.deck) : (deckMetadata?.title || DECK_LABELS[deckId!] || deckId),
        });
      }
    }

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1);
      setAnswered(false);
      setSelectedIdx(null);
    } else {
      addQuizResult({ deckId, score: scoreRef.current, total: questions.length });
      updateStreak(new Date().toLocaleDateString('en-CA'));
      setPhase("result");
    }
  };

  const handleAnswer = (idx: number, opt: string) => {
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
      if (deckId === "srs") {
        setQuestions(prev => [...prev, currentQuestion]);
      }
    }

    setTimeout(() => {
      const cleanExample = currentQuestion.example
        ? currentQuestion.example
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/[（(][^)）]*[)）]/g, "")
        : "";

      if (currentQuestion.qType === 'context' && cleanExample) {
        tts.playWithFallback("", cleanExample);
      } else if (cleanExample) {
        tts.playSequentially([
          { url: currentQuestion.audio, text: currentQuestion.word },
          { url: "", text: cleanExample }
        ]);
      } else {
        tts.playWithFallback(currentQuestion.audio, currentQuestion.word);
      }
    }, 300);

    if (mode === "auto") {
      setTimeout(() => goToNext(isCorrect ? 2 : 0), 1200);
    }
  };

  return {
    words,
    loading,
    phase,
    questions,
    currentIdx,
    score,
    answered,
    selectedIdx,
    mode,
    handleStart,
    goToNext,
    handleAnswer,
  };
};

