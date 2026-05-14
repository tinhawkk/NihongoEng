import { useState, useEffect, useRef, useCallback } from "react";
import { vocabularyRepository } from "../../data/repositories/NhostVocabularyRepository";
import { useUserStore } from "../../store/useUserStore";
import { useBookmarkStore } from "../../store/useBookmarkStore";
import { nhostService } from "../../services/nhostService";
import { tts } from "../../utils/tts";
import { sounds } from "../../utils/sounds";
import confetti from "canvas-confetti";
import { romajiToHiragana } from "../../utils/kana";

const DECK_LABELS: Record<string, string> = {
  n1: "JLPT N1", n2: "JLPT N2", n3: "JLPT N3", n4: "JLPT N4", n5: "JLPT N5",
  ENG: "600 TOEIC", IT: "IT Vocab", srs: "SRS Review",
};

function shuffleArray(arr: any[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(str: string) {
  if (!str) return "";
  return str.toLowerCase().trim()
    .replace(/[\s\u3000]+/g, "")
    // Remove content inside brackets: (), [], <>, {}, （）, ［］, 【】, ＜＞, 〈〉
    .replace(/\(.*?\)|\[.*?\]|<.*?>|{.*?}|（.*?）|［.*?］|【.*?】|＜.*?＞|〈.*?〉/g, "")
    // Remove remaining symbols
    .replace(/[<>()\[\]{}（）［］【】＜＞〈〉〜~.．…・]/g, "")
    .replace(/ー/g, "");
}

export const useTypingGame = (deckId: string | undefined) => {
  const [allWords, setAllWords] = useState<any[]>([]);
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [deckMetadata, setDeckMetadata] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const vocaSource = useUserStore(s => s.vocaSource);
  const updateSrsItem = useUserStore(s => s.updateSrsItem);

  const searchParams = new URLSearchParams(window.location.search);
  const practiceMode = searchParams.get("practice") || "typing";
  const scope = searchParams.get("scope") || "due";
  const targetDeck = searchParams.get("deck");
  const isRecallMode = practiceMode === "recall";
  const isMasteryMode = practiceMode === "mastery";
  const recallRequired = isRecallMode ? 2 : 1;
  const [recallStreaks, setRecallStreaks] = useState<Record<string, number>>({});
  const [masteryPlan, setMasteryPlan] = useState<Record<string, string[]>>({});
  const [masteryDone, setMasteryDone] = useState<Record<string, string[]>>({});

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId || "");

  useEffect(() => {
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
  }, [deckId, isUUID]);

  useEffect(() => {
    if (!deckId) return;
    setLoading(true);
    const forcedSource = searchParams.get("source");
    const isAdvanced = isUUID || /^n[1-5]$/i.test(deckId) || ["ENG", "IT"].includes(deckId.toUpperCase());
    const source = (isAdvanced ? forcedSource || vocaSource : "sheet") as "sheet" | "voca";

    if (deckId === "srs") {
      const srsData = useUserStore.getState().account?.srsData || {};
      let list = Object.values(srsData);
      if (targetDeck && targetDeck !== "all") {
        list = list.filter((item: any) => {
          if (targetDeck === "DICTIONARY_SOURCE" || targetDeck === "Từ điển & Tìm kiếm") {
            return item.source === "search";
          }
          return item.deckName === targetDeck || item.deck === targetDeck || item.deckId === targetDeck;
        });
      }

      if (scope !== "all") {
        const today = new Date();
        list = list.filter((item: any) => item.nextReview && new Date(item.nextReview) <= today);
      }

      const normalized = list.map((item: any) => ({
        ...item,
        word: item.word || item.english || "",
        furigana: item.furigana || item.reading || item.hiragana || "",
        meaning: item.meaning || item.vietnamese || "",
        hanViet: item.hanViet || item.han_viet || "",
        example: item.example || item.example_jp || "",
        example_meaning: item.example_meaning || item.example_vi || "",
      }));

      const shuffled = shuffleArray(normalized);
      if (isMasteryMode) {
        const plan: Record<string, string[]> = {};
        const queue = shuffled.flatMap(w => {
          const tasks = ["recall", "dictation"];
          if (w.example && w.example.includes(w.word)) tasks.push("cloze");
          const stableId = w.id || w.word;
          plan[stableId] = tasks;
          return tasks.map(taskType => ({ ...w, taskType }));
        });
        setMasteryPlan(plan);
        setMasteryDone({});
        setAllWords(queue);
        setWords(queue);
      } else {
        setAllWords(shuffled);
        setWords(shuffled);
      }
      setRecallStreaks({});
      setLoading(false);
    } else {
        vocabularyRepository.loadDeck(deckId, source).then(data => {
          const normalized = data.map((w: any) => ({
            ...w,
            word: w.word || w.english || "",
            furigana: w.furigana || w.reading || w.hiragana || "",
            meaning: w.meaning || w.vietnamese || "",
            hanViet: w.han_viet || w.hanViet || "",
            example: w.example || w.explanation || w.example_jp || "",
            example_meaning: [w.example_meaning, w.example_vn, w.example_vi, w.example_en, w.example_viet, w.example_english].filter(Boolean).join(" / "),
          }));
        const isEnglishDeck = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng');
        const withReading = normalized.map(w => {
          // Fix for data where 'reading' field contains the example sentence instead of the word reading
          const isWordKana = /^[\u3040-\u30FF\s]+$/.test(w.word);
          const furiganaContainsPunctuation = w.furigana?.includes("。") || w.furigana?.includes("、") || false;
          const furiganaIsTooLong = (w.furigana?.length || 0) > w.word.length * 3 && (w.furigana?.length || 0) > 10;
          
          if (isWordKana && (furiganaContainsPunctuation || furiganaIsTooLong)) {
            return { ...w, furigana: w.word };
          }
          // For English, if no furigana (IPA), use the word itself as the target
          if (isEnglishDeck && !w.furigana?.trim()) {
            return { ...w, furigana: w.word };
          }
          return w;
        }).filter(w => isEnglishDeck || w.furigana?.trim());
        const shuffled = shuffleArray(withReading);
        if (isMasteryMode) {
          const plan: Record<string, string[]> = {};
          const queue = shuffled.flatMap(w => {
            const tasks = ["recall", "dictation"];
            if (w.example && w.example.includes(w.word)) tasks.push("cloze");
            const stableId = w.id || w.word;
            plan[stableId] = tasks;
            return tasks.map(taskType => ({ ...w, taskType }));
          });
          setMasteryPlan(plan);
          setMasteryDone({});
          setAllWords(queue);
          setWords(queue);
        } else {
          setAllWords(shuffled);
          setWords(shuffled);
        }
        setRecallStreaks({});
        setLoading(false);
      });
    }
  }, [deckId, vocaSource, isUUID, practiceMode, scope, targetDeck, isMasteryMode]);

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
    const correctWord = normalize(card.word);
    const userAsHiragana = normalize(romajiToHiragana(input));
    const stableId = card.id || card.word;
    const taskType = card.taskType || (isRecallMode ? "recall" : "reading");
    const isEnglishDeck = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng');

    const isRecallTask = taskType === "recall" || taskType === "dictation" || taskType === "cloze";
    const isWordEnglish = isEnglishDeck || (card.word && !/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(card.word));

    const isCorrect = isRecallTask
      ? userInput === correctWord ||
        userAsHiragana === correctWord ||
        userInput === correctFurigana ||
        userAsHiragana === correctFurigana ||
        (isWordEnglish && userInput === normalize(card.meaning))
      : userInput === correctFurigana ||
        userAsHiragana === correctFurigana ||
        (userInput === correctWord && /^[\u3040-\u30FF]+$/.test(correctWord)) ||
        (userAsHiragana === correctWord && /^[\u3040-\u30FF]+$/.test(correctWord)) ||
        (isWordEnglish && (userInput === correctWord || userInput === normalize(card.meaning)));
    
    setResult(isCorrect ? "correct" : "wrong");
    setShowAnswer(true);
    
    if (isMasteryMode) {
      const plan = masteryPlan[stableId] || ["recall", "dictation", "cloze"];
      const completed = masteryDone[stableId] || [];
      if (isCorrect) {
        const nextCompleted = completed.includes(taskType)
          ? completed
          : [...completed, taskType];
        setMasteryDone(prev => ({ ...prev, [stableId]: nextCompleted }));
        setScore(s => ({ ...s, correct: s.correct + 1 }));
        sounds.playBeep(880, 100, 0.1);
        tts.playWithFallback(card.audio, card.word);

        if (nextCompleted.length >= plan.length) {
          updateSrsItem(stableId, card, 2, {
            source: "mastery",
            deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
            deckName:
              deckId === "srs"
                ? (card.deckName || card.deck)
                : deckMetadata?.title || DECK_LABELS[deckId!] || deckId,
          });
        }
      } else {
        setScore(s => ({ ...s, wrong: s.wrong + 1 }));
        sounds.playError();
        setWords(prev => [...prev, { ...card }]);
        updateSrsItem(stableId, card, 0, {
          source: "mastery",
          deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
          deckName:
            deckId === "srs"
              ? (card.deckName || card.deck)
              : deckMetadata?.title || DECK_LABELS[deckId!] || deckId,
        });
      }
      return;
    }

    if (isRecallMode) {
      if (isCorrect) {
        const nextStreak = (recallStreaks[stableId] || 0) + 1;
        setRecallStreaks(prev => ({ ...prev, [stableId]: nextStreak }));
        setScore(s => ({ ...s, correct: s.correct + 1 }));
        sounds.playBeep(880, 100, 0.1);
        tts.playWithFallback(card.audio, card.word);
        if (nextStreak < recallRequired) {
          setWords(prev => [...prev, { ...card }]);
        } else {
          updateSrsItem(stableId, card, 2, {
            source: "recall",
            deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
            deckName:
              deckId === "srs"
                ? (card.deckName || card.deck)
                : deckMetadata?.title || DECK_LABELS[deckId!] || deckId,
          });
        }
      } else {
        setRecallStreaks(prev => ({ ...prev, [stableId]: 0 }));
        setScore(s => ({ ...s, wrong: s.wrong + 1 }));
        sounds.playError();
        setWords(prev => [...prev, { ...card }]);
        updateSrsItem(stableId, card, 0, {
          source: "recall",
          deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
          deckName:
            deckId === "srs"
              ? (card.deckName || card.deck)
              : deckMetadata?.title || DECK_LABELS[deckId!] || deckId,
        });
      }
      return;
    }

    if (isCorrect) {
      setScore(s => ({ ...s, correct: s.correct + 1 }));
      sounds.playBeep(880, 100, 0.1);
      tts.playWithFallback(card.audio, card.word);
      updateSrsItem(card.id || card.word, card, 3, {
        source: "typing",
        deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
        deckName: deckId === "srs" ? (card.deckName || card.deck) : (deckMetadata?.title || DECK_LABELS[deckId!] || deckId),
      });
    } else {
      setScore(s => ({ ...s, wrong: s.wrong + 1 }));
      sounds.playError();
      updateSrsItem(card.id || card.word, card, 0, {
        source: "typing",
        deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
        deckName: deckId === "srs" ? (card.deckName || card.deck) : (deckMetadata?.title || DECK_LABELS[deckId!] || deckId),
      });
    }
  }, [
    card,
    input,
    result,
    isRecallMode,
    isMasteryMode,
    recallRequired,
    recallStreaks,
    masteryPlan,
    masteryDone,
    deckId,
    updateSrsItem,
    deckMetadata,
  ]);

  const goNext = useCallback(() => {
    if (currentIdx >= words.length - 1) {
      useUserStore.getState().updateStreak();
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
    if (!card || result) return;
    setResult("wrong");
    setShowAnswer(true);
    setScore(s => ({ ...s, wrong: s.wrong + 1 }));
    if (isMasteryMode) {
      setWords(prev => [...prev, { ...card }]);
      updateSrsItem(card.id || card.word, card, 0, {
        source: "mastery",
        deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
        deckName:
          deckId === "srs"
            ? (card.deckName || card.deck)
            : deckMetadata?.title || DECK_LABELS[deckId!] || deckId,
      });
      return;
    }
    if (isRecallMode) {
      const stableId = card.id || card.word;
      setRecallStreaks(prev => ({ ...prev, [stableId]: 0 }));
      setWords(prev => [...prev, { ...card }]);
      updateSrsItem(stableId, card, 0, {
        source: "recall",
        deckId: deckId === "srs" ? (card.deck || card.deckId) : deckId,
        deckName:
          deckId === "srs"
            ? (card.deckName || card.deck)
            : deckMetadata?.title || DECK_LABELS[deckId!] || deckId,
      });
    }
  }, [card, result, isRecallMode, isMasteryMode, deckId, updateSrsItem, deckMetadata]);

  const resetGame = () => {
    setCurrentIdx(0); 
    setIsFinished(false); 
    setScore({ correct: 0, wrong: 0 }); 
    setInput(""); 
    setResult(null); 
    setShowAnswer(false); 
    setWords(shuffleArray(allWords));
    setRecallStreaks({});
    setMasteryDone({});
  };

  useEffect(() => {
    if (loading || isFinished) return;
    const handleKey = (e: KeyboardEvent) => {
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

  return {
    allWords,
    words,
    loading,
    currentIdx,
    setCurrentIdx,
    input,
    setInput,
    result,
    setResult,
    showAnswer,
    setShowAnswer,
    score,
    setScore,
    isFinished,
    setIsFinished,
    inputRef,
    card,
    checkAnswer,
    goNext,
    skipWord,
    resetGame,
    deckMetadata,
    practiceMode,
    isRecallMode,
    isMasteryMode,
    recallRequired,
    recallStreak: card ? (recallStreaks[card.id || card.word] || 0) : 0,
    taskType: card?.taskType || (isRecallMode ? "recall" : "reading"),
    masteryTotal: card ? (masteryPlan[card.id || card.word]?.length || 0) : 0,
    masteryDone: card ? (masteryDone[card.id || card.word]?.length || 0) : 0,
  };
};

