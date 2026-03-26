import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculateNextSrs, getNextIntervalLabel } from "../utils/srsUtils";
import { useBookmarkStore } from "./useBookmarkStore";
import { collectSyncData, saveProgressToNhost } from "../services/syncService";

export const useUserStore = create(
  persist(
    (set, get) => ({
      account: null,
      isAuthenticated: false,

      setAccount: account => set({ account, isAuthenticated: true }),

      updateStreak: date =>
        set(state => {
          if (!state.account) return state;

          // Use provided date or local date to avoid timezone issues
          let activeDate = date;
          if (!date || typeof date !== "string") {
            activeDate = new Date().toLocaleDateString("en-CA");
          }

          const newStreak = [...new Set([...state.account.streak, activeDate])];
          return {
            account: {
              ...state.account,
              streak: newStreak,
              lastStudyDate: new Date().toISOString(),
            },
          };
        }),

      // Update flashcard progress for a specific deck
      updateFlashcardProgress: (deckId, progressData) =>
        set(state => {
          if (!state.account) return state;
          return {
            account: {
              ...state.account,
              flashcardProgress: {
                ...state.account.flashcardProgress,
                [deckId]: {
                  ...progressData,
                  lastStudied: new Date().toISOString(),
                },
              },
            },
          };
        }),

      // Add quiz result to history
      addQuizResult: result =>
        set(state => {
          if (!state.account) return state;
          const history = [
            ...(state.account.quizHistory || []),
            {
              ...result,
              date: new Date().toISOString(),
            },
          ].slice(-50); // Keep last 50 results
          return {
            account: {
              ...state.account,
              quizHistory: history,
              totalQuizzes: (state.account.totalQuizzes || 0) + 1,
            },
          };
        }),

      // Add arena result to history (e.g., 60s arena sessions)
      addArenaResult: result =>
        set(state => {
          if (!state.account) return state;
          const history = [
            ...(state.account.arenaHistory || []),
            {
              ...result,
              date: new Date().toISOString(),
            },
          ].slice(-100); // Keep last 100 arena runs
          return {
            account: {
              ...state.account,
              arenaHistory: history,
              arenaProgress: {
                ...(state.account.arenaProgress || {}),
                totalArenaRuns: (state.account.arenaProgress?.totalArenaRuns || 0) + 1,
              },
            },
          };
        }),

      // Update arena aggregated progress (best score, best streak, coins earned, etc.)
      updateArenaProgress: progressData =>
        set(state => {
          if (!state.account) return state;
          return {
            account: {
              ...state.account,
              arenaProgress: {
                ...(state.account.arenaProgress || {}),
                ...progressData,
                lastPlayed: new Date().toISOString(),
              },
            },
          };
        }),

      // Update Spaced Repetition (SRS) data for a word using refined SM-2 logic
      // meta: { source: 'flashcard'|'typing'|'quiz'|'search', deckName: string, deckId: string }
      updateSrsItem: (wordId, wordData, rating, meta) => {
        set(state => {
          if (!state.account) return state;
          const currentSrs = state.account.srsData || {};
          const stableId = wordId || wordData.id || wordData.word;

          const existing = currentSrs[stableId];
          const nextState = calculateNextSrs(existing, rating);

          // Clean deckName: if it's a UUID, don't use it as a display name
          const isUUID = val =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
          const providedName = meta?.deckName;
          const finalDeckName =
            providedName && !isUUID(providedName)
              ? providedName
              : existing?.deckName ||
                (wordData.deckName && !isUUID(wordData.deckName) ? wordData.deckName : "");

          return {
            account: {
              ...state.account,
              srsData: {
                ...currentSrs,
                [stableId]: {
                  ...wordData,
                  ...nextState,
                  id: wordData.id || stableId,
                  word: wordData.word || wordData.english || stableId,
                  meaning: wordData.meaning || wordData.hanViet || wordData.vietnamese || "",
                  furigana: wordData.furigana || wordData.hiragana || wordData.reading || "",
                  source: meta?.source || existing?.source || "unknown",
                  deck: meta?.deckId || wordData.deck || wordData.deckId || existing?.deck || "",
                  deckName: finalDeckName,
                },
              },
            },
          };
        });

        const state = get();
        if (state.isAuthenticated && state.account) {
          const data = collectSyncData(useUserStore, useBookmarkStore);
          if (data) {
            saveProgressToNhost(data);
          }
        }
      },

      // Helper to estimate next interval for UI display
      getNextInterval: (wordId, rating) => {
        const state = get();
        if (!state.account) return null;
        const currentSrs = state.account.srsData || {};
        return getNextIntervalLabel(currentSrs[wordId], rating);
      },

      // Sync bookmarks into account (for saving to sheet)
      syncBookmarksToAccount: bookmarks =>
        set(state => {
          if (!state.account) return state;
          return {
            account: {
              ...state.account,
              bookmarks,
            },
          };
        }),

      // Remove specific SRS item
      removeSrsItem: wordId => {
        set(state => {
          if (!state.account?.srsData) return state;
          const newSrsData = { ...state.account.srsData };
          delete newSrsData[wordId];
          return {
            account: {
              ...state.account,
              srsData: newSrsData,
            },
          };
        });

        const state = get();
        if (state.isAuthenticated && state.account) {
          const data = collectSyncData(useUserStore, useBookmarkStore);
          if (data) saveProgressToNhost(data);
        }
      },

      // Reset all SRS data and progress for testing
      resetSRS: () => {
        set(state => {
          if (!state.account) return state;
          return {
            account: {
              ...state.account,
              srsData: {},
              flashcardProgress: {},
              streak: [],
            },
          };
        });

        const state = get();
        if (state.isAuthenticated && state.account) {
          const data = collectSyncData(useUserStore, useBookmarkStore);
          if (data) saveProgressToNhost(data);
        }
      },

      theme: "light", // 'light' | 'dark'
      toggleTheme: () => set(state => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setTheme: theme => set({ theme }),

      vocaSource: "voca", // 'sheet' | 'voca'
      setVocaSource: source => set({ vocaSource: source }),

      // Update Pomodoro settings and stats
      updatePomodoroData: data =>
        set(state => {
          if (!state.account) return state;
          return {
            account: {
              ...state.account,
              pomodoro: {
                ...(state.account.pomodoro || {}),
                ...data,
              },
            },
          };
        }),

      logout: () => {
        // Clear sensitive local storage items
        localStorage.removeItem("pomodoro-timer-state");
        // Clear other stores to prevent pollution on next login
        import("./useBookmarkStore").then(m => m.useBookmarkStore.getState().clearBookmarks());

        set({ account: null, isAuthenticated: false });
      },
    }),
    {
      name: "user-auth",
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        account: state.account
          ? {
              id: state.account.id,
              username: state.account.username,
              name: state.account.name,
            }
          : null,
      }),
    }
  )
);
