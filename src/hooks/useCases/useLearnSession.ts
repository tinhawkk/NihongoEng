import { useState, useEffect, useCallback, useMemo } from "react";
import { vocabularyRepository } from "../../data/repositories/NhostVocabularyRepository";
import { useUserStore } from "../../store/useUserStore";
import { examGeneratorService } from "../../services/examGeneratorService";
import { shuffleArray } from "../../utils/helpers";
import { romajiToHiragana } from "../../utils/kana";
import { isTypo } from "../../utils/textUtils";
import { DECK_LABELS } from "../../utils/constants";
import { nhostService } from "../../services/nhostService"; // Temporary for deck title, should be in repo later

const BATCH_SIZE = 15;

function generateLessonSteps(words: any[]) {
  const steps: any[] = [];
  const seenPool: any[] = [];
  const SUB_BATCH = 4;
  for (let i = 0; i < words.length; i += SUB_BATCH) {
    const batch = words.slice(i, i + SUB_BATCH);
    batch.forEach(w => {
      steps.push({ type: "intro", word: w });
      seenPool.push(w);
    });
    const practiceBatch = shuffleArray([...batch]);
    practiceBatch.forEach((w, idx) => {
      if (idx % 4 === 0) steps.push({ type: "choice", word: w });
      else if (idx % 4 === 1) steps.push({ type: "choice_kanji", word: w });
      else if (idx % 4 === 2) steps.push({ type: "listen", word: w });
      else steps.push({ type: "typing", word: w });
    });
    if (batch.length >= 3) {
      steps.push({ type: "matching", words: batch });
    }
    // New: Cloze Deletion step for words with examples
    batch.forEach(w => {
      if (w.example && w.example.includes(w.word)) {
        steps.push({ type: "cloze", word: w });
      }
      
      // Phase 4: Speaking step
      steps.push({ type: "speak", word: w });

      // Phase 5: Kanji breakdown if word contains Kanji
      const hasKanji = /[\u4e00-\u9faf]/.test(w.word);
      if (hasKanji) {
        steps.push({ type: "kanji_breakdown", word: w });
      }
    });
  }
  return steps;
}

export const useLearnSession = (deckId: string, filterType: string) => {
  const [loading, setLoading] = useState(true);
  const [allWords, setAllWords] = useState<any[]>([]);
  const [remainingWords, setRemainingWords] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [userAnswer, setUserAnswer] = useState<any>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");

  const updateSrsItem = useUserStore(s => s.updateSrsItem);
  const step = useMemo(() => steps[currentIdx], [steps, currentIdx]);

  useEffect(() => {
    const fetchDeck = async () => {
      setLoading(true);
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId);

        if (isUUID) {
          try {
            const q = `query GetDeckTitle($id: String!) { decks_by_pk(id: $id) { title } }`;
            const res = await nhostService.fetchGraphQL(q, "GetDeckTitle", { id: deckId });
            if (res.data?.decks_by_pk?.title) {
              setDeckTitle(res.data.decks_by_pk.title);
            }
          } catch (e) {}
        } else {
          setDeckTitle((DECK_LABELS as any)[deckId] || deckId.toUpperCase());
        }

        const data = await vocabularyRepository.loadDeck(
          deckId,
          isUUID ? "voca" : filterType === "sheet" ? "sheet" : "voca"
        );
        let list = Array.isArray(data) ? data : (data as any).vocabulary || [];
        if (filterType === "voca") list = list.filter(w => !w.isKanji);
        if (filterType === "kanji") list = list.filter(w => w.isKanji);

        const srsData = useUserStore.getState().account?.srsData || {};
        const getScore = (w: any) => {
          const stableId = w.id || w.word;
          const srs = srsData[stableId] || Object.values(srsData).find((it: any) => it.word === w.word);
          return srs?.level || 0;
        };

        const sortedList = [...list].sort((a, b) => {
          const diff = getScore(a) - getScore(b);
          return diff !== 0 ? diff : Math.random() - 0.5;
        });

        setAllWords(sortedList);
        startBatch(sortedList);
      } catch (err) {
        console.error("Learn fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeck();
  }, [deckId, filterType]);

  const startBatch = useCallback(
    (wordsList: any[]) => {
      const currentBatch = wordsList.slice(0, BATCH_SIZE);
      const rest = wordsList.slice(BATCH_SIZE);

      setRemainingWords(rest);
      setCurrentIdx(0);
      setIsFinished(false);
      setUserAnswer(null);
      setIsCorrect(null);
      setShowFeedback(false);

      const shuffledList = shuffleArray(currentBatch);
      setSteps(generateLessonSteps(shuffledList));

      const missing = shuffledList.filter(w => !w.mnemonic);
      if (false && missing.length > 0) { // Temporarily disabled AI mnemonics
        const levelOrTitle = deckTitle || deckId;
        examGeneratorService.generateMnemonics(missing, levelOrTitle).then(generated => {
          if (generated && generated.length > 0) {
            setAllWords(prev =>
              prev.map(w => {
                const gen = generated.find(g => g.word === w.word);
                if (gen && gen.mnemonic) {
                  if (w.id) {
                    vocabularyRepository.saveMnemonic(w, gen.mnemonic);
                  }
                  return { ...w, mnemonic: gen.mnemonic };
                }
                return w;
              })
            );
            setSteps(prev =>
              prev.map(s => {
                if (s.word) {
                  const gen = generated.find(g => g.word === s.word.word);
                  if (gen && gen.mnemonic) {
                    return { ...s, word: { ...s.word, mnemonic: gen.mnemonic } };
                  }
                }
                return s;
              })
            );
          }
        });
      }
    },
    [deckId, deckTitle]
  );

  const handleResult = useCallback(
    (success: boolean) => {
      setIsCorrect(success);
      setShowFeedback(true);
      if (success && step) {
        updateSrsItem(step.word.id || step.word.word, step.word, 2, {
          source: "learn",
          deckId: deckId,
          deckName: deckTitle,
        });
      } else if (step) {
        // Handle incorrect by pushing to end of steps array
        // ADAPTIVE SCAFFOLDING: Insert an extra listen step if failed on choice
        if (step.type === "choice" || step.type === "choice_kanji") {
          setSteps(prev => {
            const newSteps = [...prev];
            newSteps.splice(currentIdx + 1, 0, { type: "listen", word: step.word });
            return [...newSteps, step];
          });
        } else {
          setSteps(prev => [...prev, step]);
        }
      }
    },
    [step, currentIdx, deckId, deckTitle, updateSrsItem]
  );

  const checkAnswer = useCallback(
    (answer: any) => {
      if (!step) return;
      const finalAnswer = typeof answer === "string" ? romajiToHiragana(answer) : answer;
      setUserAnswer(finalAnswer);
      if (step.type === "choice" || step.type === "choice_kanji" || step.type === "listen") {
        handleResult(finalAnswer.word === step.word.word);
        return;
      }

      const cleanTarget = (t: string) => {
        if (!t) return "";
        // Strip all types of brackets and their content: (), （）, [], ［］, <>, ＜＞, 【】
        return t
          .replace(/\(.*?\)|（.*?）|\[.*?\]|［.*?］|<.*?>|＜.*?＞|【.*?】/g, "")
          .replace(/[〜\s・]/g, "")
          .toLowerCase()
          .trim();
      };

      const targetKana = cleanTarget(step.word.reading || "");
      const targetKanji = cleanTarget(step.word.word || "");
      const targetRomaji = cleanTarget(step.word.romaji || "");
      const given = cleanTarget(finalAnswer);

      if (
        given === targetKana ||
        given === targetKanji ||
        (targetRomaji && given === targetRomaji)
      ) {
        handleResult(true);
      } else {
        // TYPO DETECTION (Phase 2.2)
        if (
          isTypo(given, targetKanji) ||
          isTypo(given, targetKana) ||
          (targetRomaji && isTypo(given, targetRomaji))
        ) {
          return;
        }
        handleResult(false);
      }
    },
    [step, handleResult]
  );

  const goToNext = useCallback(() => {
    if (currentIdx < steps.length - 1) {
      setCurrentIdx(i => i + 1);
      setUserAnswer(null);
      setIsCorrect(null);
      setShowFeedback(false);
    } else {
      useUserStore.getState().updateStreak();
      setIsFinished(true);
    }
  }, [currentIdx, steps.length]);

  const disableSpeaking = useCallback(() => {
    setSteps(prev => {
      const pastAndCurrent = prev.slice(0, currentIdx + 1);
      const future = prev.slice(currentIdx + 1).filter(s => s.type !== "speak");
      return [...pastAndCurrent, ...future];
    });
  }, [currentIdx]);

  return {
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
    disableSpeaking,
  };
};

