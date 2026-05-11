import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculateNextSrs, getNextIntervalLabel } from "../utils/srsUtils";
import { useBookmarkStore } from "./useBookmarkStore";
import { collectSyncData, saveProgressToNhost } from "../services/syncService";

export interface UserState {
  account: any;
  isAuthenticated: boolean;
  theme: "light" | "dark";
  vocaSource: "sheet" | "voca";
  setAccount: (account: any) => void;
  updateStreak: (date?: string) => void;
  updateFlashcardProgress: (deckId: string, progressData: any) => void;
  addQuizResult: (result: any) => void;
  addArenaResult: (result: any) => void;
  updateArenaProgress: (progressData: any) => void;
  updateSrsItem: (wordId: string, wordData: any, rating: number, meta?: any) => void;
  getNextInterval: (wordId: string, rating: number, wordStr?: string) => string | null;
  syncBookmarksToAccount: (bookmarks: any[]) => void;
  removeSrsItem: (wordId: string) => void;
  resetSRS: () => void;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setVocaSource: (source: "sheet" | "voca") => void;
  updatePomodoroData: (data: any) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      account: null,
      isAuthenticated: false,

      setAccount: (account) => set({ account, isAuthenticated: true }),

      updateStreak: (date) =>
        set((state) => {
          if (!state.account) return state;

          let activeDate = date;
          if (!date || typeof date !== "string") {
            activeDate = new Date().toLocaleDateString("en-CA");
          }

          const existingStreak = state.account.streak || [];
          if (existingStreak.includes(activeDate)) return state;

          const newStreak = [...new Set([...existingStreak, activeDate])];
          return {
            account: {
              ...state.account,
              streak: newStreak,
              lastStudyDate: new Date().toISOString(),
            },
          };
        }),

      updateFlashcardProgress: (deckId, progressData) =>
        set((state) => {
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

      addQuizResult: (result) =>
        set((state) => {
          if (!state.account) return state;
          const today = new Date().toLocaleDateString("en-CA");
          const history = [
            ...(state.account.quizHistory || []),
            {
              ...result,
              date: new Date().toISOString(),
            },
          ].slice(-50);

          const existingStreak = state.account.streak || [];
          const newStreak = existingStreak.includes(today)
            ? existingStreak
            : [...existingStreak, today];

          return {
            account: {
              ...state.account,
              streak: newStreak,
              quizHistory: history,
              totalQuizzes: (state.account.totalQuizzes || 0) + 1,
              lastStudyDate: new Date().toISOString(),
            },
          };
        }),

      addArenaResult: (result) =>
        set((state) => {
          if (!state.account) return state;
          const today = new Date().toLocaleDateString("en-CA");
          const history = [
            ...(state.account.arenaHistory || []),
            {
              ...result,
              date: new Date().toISOString(),
            },
          ].slice(-100);

          const existingStreak = state.account.streak || [];
          const newStreak = existingStreak.includes(today)
            ? existingStreak
            : [...existingStreak, today];

          return {
            account: {
              ...state.account,
              streak: newStreak,
              arenaHistory: history,
              arenaProgress: {
                ...(state.account.arenaProgress || {}),
                totalArenaRuns: (state.account.arenaProgress?.totalArenaRuns || 0) + 1,
              },
              lastStudyDate: new Date().toISOString(),
            },
          };
        }),

      updateArenaProgress: (progressData) =>
        set((state) => {
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

      updateSrsItem: (wordId, wordData, rating, meta) => {
        set((state) => {
          if (!state.account) return state;
          const currentSrs = state.account.srsData || {};
          const today = new Date().toLocaleDateString("en-CA");

          const wordStr = wordData.word || wordData.english || "";
          const stableId = wordId || wordData.id || wordStr;

          let existing = currentSrs[stableId];
          if (!existing && wordStr) {
            existing = Object.values(currentSrs).find((item: any) => item.word === wordStr);
          }

          const nextState = calculateNextSrs(existing, rating);

          const isUUID = (val: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ||
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

          const providedName = meta?.deckName;
          const finalDeckName =
            providedName && !isUUID(providedName)
              ? providedName
              : existing?.deckName ||
                (wordData.deckName && !isUUID(wordData.deckName) ? wordData.deckName : "");

          const existingStreak = state.account.streak || [];
          const newStreak = existingStreak.includes(today)
            ? existingStreak
            : [...existingStreak, today];

          return {
            account: {
              ...state.account,
              streak: newStreak,
              lastStudyDate: new Date().toISOString(),
              srsData: {
                ...currentSrs,
                [stableId]: {
                  ...wordData,
                  ...nextState,
                  id: wordData.id || stableId,
                  word: wordStr,
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

      getNextInterval: (wordId, rating, wordStr) => {
        const state = get();
        if (!state.account) return null;
        const currentSrs = state.account.srsData || {};
        
        let item = currentSrs[wordId];
        if (!item && wordStr) {
          item = Object.values(currentSrs).find((it: any) => it.word === wordStr);
        }
        
        return getNextIntervalLabel(item, rating);
      },

      syncBookmarksToAccount: (bookmarks) =>
        set((state) => {
          if (!state.account) return state;
          return {
            account: {
              ...state.account,
              bookmarks,
            },
          };
        }),

      removeSrsItem: (wordId) => {
        set((state) => {
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

      resetSRS: () => {
        set((state) => {
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

      theme: "light",
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setTheme: (theme) => set({ theme }),

      vocaSource: "voca",
      setVocaSource: (source) => set({ vocaSource: source }),

      updatePomodoroData: (data) =>
        set((state) => {
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
        localStorage.removeItem("pomodoro-timer-state");
        import("./useBookmarkStore").then((m) => m.useBookmarkStore.getState().clearBookmarks());
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
              streak: state.account.streak || [],
              srsData: state.account.srsData || {},
              flashcardProgress: state.account.flashcardProgress || {},
              totalQuizzes: state.account.totalQuizzes || 0,
              arenaProgress: state.account.arenaProgress || {},
              pomodoro: state.account.pomodoro || {},
            }
          : null,
      }),
    }
  )
);
