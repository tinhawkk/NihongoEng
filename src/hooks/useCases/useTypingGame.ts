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
    const params = new URLSearchParams(window.location.search);
    const forcedSource = params.get("source");
    const isAdvanced = isUUID || /^n[1-5]$/i.test(deckId) || ["ENG", "IT"].includes(deckId.toUpperCase());
    const source = (isAdvanced ? forcedSource || vocaSource : "sheet") as "sheet" | "voca";

    if (deckId === "srs") {
      const srsData = useUserStore.getState().account?.srsData || {};
      const todayStr = new Date().toLocaleDateString('en-CA');
      const due = Object.values(srsData).filter((item: any) => {
        const reviewDate = new Date(item.nextReview).toLocaleDateString('en-CA');
        return reviewDate <= todayStr;
      });
      const shuffled = shuffleArray(due);
      setAllWords(shuffled);
      setWords(shuffled);
      setLoading(false);
    } else {
      vocabularyRepository.loadDeck(deckId, source).then(data => {
        const normalized = data.map(w => ({
          ...w,
          word: w.word || w.english || "",
          furigana: w.furigana || w.reading || w.hiragana || "",
          meaning: w.meaning || w.vietnamese || "",
          hanViet: w.han_viet || w.hanViet || "",
          example: w.example || w.explanation || w.example_jp || "",
          example_meaning: [w.example_meaning, w.example_vn, w.example_vi, w.example_en, w.example_viet, w.example_english].filter(Boolean).join(" / "),
        }));
        const withReading = normalized.map(w => {
          // Fix for data where 'reading' field contains the example sentence instead of the word reading
          const isWordKana = /^[\u3040-\u30FF\s]+$/.test(w.word);
          const furiganaContainsPunctuation = w.furigana.includes("。") || w.furigana.includes("、");
          const furiganaIsTooLong = w.furigana.length > w.word.length * 3 && w.furigana.length > 10;
          
          if (isWordKana && (furiganaContainsPunctuation || furiganaIsTooLong)) {
            return { ...w, furigana: w.word };
          }
          return w;
        }).filter(w => w.furigana?.trim());
        const shuffled = shuffleArray(withReading);
        setAllWords(shuffled);
        setWords(shuffled);
        setLoading(false);
      });
    }
  }, [deckId, vocaSource, isUUID]);

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
    
    // Accept answer if it matches the reading OR the word itself (if word is kana)
    const isCorrect = 
      userInput === correctFurigana || 
      userAsHiragana === correctFurigana ||
      (userInput === correctWord && /^[\u3040-\u30FF]+$/.test(correctWord)) ||
      (userAsHiragana === correctWord && /^[\u3040-\u30FF]+$/.test(correctWord));
    
    setResult(isCorrect ? "correct" : "wrong");
    setShowAnswer(true);
    
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
  }, [card, input, result, isUUID, deckId, updateSrsItem, deckMetadata]);

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
    setResult("wrong");
    setShowAnswer(true);
    setScore(s => ({ ...s, wrong: s.wrong + 1 }));
  }, []);

  const resetGame = () => {
    setCurrentIdx(0); 
    setIsFinished(false); 
    setScore({ correct: 0, wrong: 0 }); 
    setInput(""); 
    setResult(null); 
    setShowAnswer(false); 
    setWords(shuffleArray(allWords));
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
    deckMetadata
  };
};

