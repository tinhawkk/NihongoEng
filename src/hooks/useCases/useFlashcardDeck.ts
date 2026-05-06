import { useState, useEffect, useCallback } from "react";
import { vocabularyRepository } from "../../data/repositories/NhostVocabularyRepository";
import { nhostService } from "../../services/nhostService";
import { WordCard } from "../../types/vocabulary";
import { useUserStore } from "../../store/useUserStore";
import confetti from "canvas-confetti";

function shuffleArray(arr: any[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const useFlashcardDeck = (deckId: string, source: string, color: string) => {
  const [allWords, setAllWords] = useState<WordCard[]>([]);
  const [words, setWords] = useState<WordCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [deckMetadata, setDeckMetadata] = useState<any>(null);

  const updateFlashcardProgress = useUserStore(s => s.updateFlashcardProgress);
  const savedProgress = useUserStore(s => s.account?.flashcardProgress?.[deckId]);

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId);

  useEffect(() => {
    if (isUUID) {
      const q = `query GetDeckTitle($id: String!) {
        decks_by_pk(id: $id) {
          title
        }
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
    const filter = params.get("filter") || "all";

    vocabularyRepository.loadDeck(deckId, source as any).then(data => {
      let filtered = data;
      if (filter === "kanji") {
        filtered = data.filter(w => w.type === "kanji");
      } else if (filter === "voca") {
        filtered = data.filter(w => w.type === "voca" || !w.type);
      }
      setAllWords(filtered);

      if (isUUID && filtered.length > 0) {
        setWords(filtered);
        const progress = useUserStore.getState().account?.flashcardProgress?.[deckId];
        if (progress && progress.lastIndex && progress.lastIndex < filtered.length - 1) {
          setCurrentIdx(Math.min(progress.lastIndex, filtered.length - 1));
        } else {
          setCurrentIdx(0);
          useUserStore.getState().updateFlashcardProgress(deckId, {
            lastIndex: 0,
            totalCards: filtered.length,
            studied: 0,
          });
        }
        setShowSetup(false);
      }
      setLoading(false);
    });
  }, [deckId, source, isUUID]);

  const handleStart = (count: number, resume = false) => {
    let selectedWords = [...allWords];
    if (count < allWords.length) {
      selectedWords = selectedWords.slice(0, count);
    }

    setWords(selectedWords);

    if (resume && savedProgress?.lastIndex) {
      setCurrentIdx(Math.min(savedProgress.lastIndex, selectedWords.length - 1));
    } else {
      setCurrentIdx(0);
      updateFlashcardProgress(deckId, {
        lastIndex: 0,
        totalCards: selectedWords.length,
        studied: 0,
      });
    }

    setShowSetup(false);
    setIsFinished(false);
  };

  const triggerSuccess = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: [color, "#ffffff", "#ffd700"],
    });
  }, [color]);

  const goNext = useCallback(() => {
    if (currentIdx >= words.length - 1) {
      setIsFinished(true);
      return;
    }
    const nextIdx = currentIdx + 1;
    setDirection(1);
    setFlipped(false);
    setShowMnemonic(false);
    setCurrentIdx(nextIdx);

    updateFlashcardProgress(deckId, {
      lastIndex: nextIdx,
      totalCards: words.length,
      studied: nextIdx + 1,
    });

    if ((nextIdx + 1) % 10 === 0) triggerSuccess();
  }, [currentIdx, words, deckId, updateFlashcardProgress, triggerSuccess]);

  const goPrev = useCallback(() => {
    if (currentIdx <= 0) return;
    const prevIdx = currentIdx - 1;
    setDirection(-1);
    setFlipped(false);
    setShowMnemonic(false);
    setCurrentIdx(prevIdx);

    updateFlashcardProgress(deckId, {
      lastIndex: prevIdx,
      totalCards: words.length,
      studied: prevIdx + 1,
    });
  }, [currentIdx, words, deckId, updateFlashcardProgress]);

  const handleShuffle = () => {
    const shuffled = shuffleArray(allWords);
    setWords(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
    setShowMnemonic(false);
    updateFlashcardProgress(deckId, {
      lastIndex: 0,
      totalCards: shuffled.length,
      studied: 1,
    });
  };

  const handleReset = () => {
    setWords([...allWords]);
    setCurrentIdx(0);
    setFlipped(false);
    setShowMnemonic(false);
    updateFlashcardProgress(deckId, {
      lastIndex: 0,
      totalCards: allWords.length,
      studied: 1,
    });
  };

  return {
    allWords,
    words,
    card: words[currentIdx],
    currentIdx,
    loading,
    flipped,
    setFlipped,
    direction,
    showMnemonic,
    setShowMnemonic,
    showSetup,
    setShowSetup,
    isFinished,
    deckMetadata,
    handleStart,
    goNext,
    goPrev,
    handleShuffle,
    handleReset,
  };
};

