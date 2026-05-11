import React, { useEffect, useRef, createContext, useContext, useState } from "react";
import { useUserStore } from "../store/useUserStore";
import { useBookmarkStore } from "../store/useBookmarkStore";
import { nhostService } from "../services/nhostService";
import { debouncedSync, immediateSync, collectSyncData, saveProgressToNhost } from "../services/syncService";

const SyncContext = createContext({
  syncing: false,
  forceRefresh: () => Promise.resolve(),
});

export const useSync = () => useContext(SyncContext);

/**
 * SyncProvider
 * Wraps the app and handles:
 * 1. Auto-sync when bookmarks or account data change (debounced 3s)
 * 2. Sync on page close (beforeunload) via sendBeacon
 * 3. Load bookmarks from account on login
 */
export const SyncProvider = ({ children }) => {
  const account = useUserStore(s => s.account);
  const isAuthenticated = useUserStore(s => s.isAuthenticated);
  const bookmarks = useBookmarkStore(s => s.bookmarks);
  const prevBookmarksRef = useRef(bookmarks);
  const prevAccountRef = useRef(account);
  const hasLoadedRef = useRef(false);
  const [syncing, setSyncing] = useState(false);

  const fetchAccountFromServer = async username => {
    const query = `query GetAccount($username: String!) {
      accounts(where: {username: {_eq: $username}}) {
        id
        username
        name
        streak
        last_study_date
        flashcard_progress
        quiz_history
        total_quizzes
        arena
        srs_data
        bookmark
        pomodoro
      }
    }`;

    try {
      const res = await nhostService.fetchGraphQL(query, "GetAccount", { username });
      const user = res.data?.accounts?.[0];
      if (!user) return null;
      const arenaData = user.arena || { history: [], progress: {} };

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        streak: user.streak || [],
        lastStudyDate: user.last_study_date,
        flashcardProgress: user.flashcard_progress || {},
        quizHistory: user.quiz_history || [],
        totalQuizzes: parseInt(user.total_quizzes) || 0,
        bookmarks: user.bookmark || [],
        srsData: user.srs_data || {},
        pomodoro: user.pomodoro || {},
        arenaHistory: arenaData.history || [],
        arenaProgress: arenaData.progress || {},
      };
    } catch (e) {
      console.error("[Sync] Fetch failed:", e);
      return null;
    }
  };

  const forceRefresh = async () => {
    if (!isAuthenticated || !account?.username || syncing) return;
    setSyncing(true);
    try {
      const serverAccount = await fetchAccountFromServer(account.username);
      if (serverAccount) {
        useUserStore.getState().setAccount(serverAccount);
        useBookmarkStore.setState({ bookmarks: serverAccount.bookmarks || [] });
        console.log("[Sync] Data restored from Nhost.");
      }
    } finally {
      setSyncing(false);
    }
  };

  // On login: load fresh account data from Nhost only
  useEffect(() => {
    if (isAuthenticated && account && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      forceRefresh();
    }
    if (!isAuthenticated) {
      hasLoadedRef.current = false;
    }
  }, [isAuthenticated, account]);

  // Auto-sync when bookmarks change
  useEffect(() => {
    if (!isAuthenticated || syncing || !hasLoadedRef.current) return;
    // Skip initial render
    if (prevBookmarksRef.current === bookmarks) return;
    prevBookmarksRef.current = bookmarks;

    // 1. Update the account state (local only, very fast)
    useUserStore.getState().syncBookmarksToAccount(bookmarks);

    // 2. Schedule background sync to Nhost
    const data = collectSyncData(useUserStore, useBookmarkStore);
    if (data) {
      debouncedSync(data);
    }
  }, [bookmarks, isAuthenticated]);

  // Auto-sync when account data changes (streak, quiz, flashcard, SRS)
  useEffect(() => {
    if (!isAuthenticated || !account || syncing || !hasLoadedRef.current) return;

    // QA: Deep check for meaningful changes to avoid unnecessary syncs
    const prev = prevAccountRef.current;
    if (prev === account) return;
    prevAccountRef.current = account;

    // We only sync if these specific fields changed
    const hasMeaningfulChange =
      !prev ||
      JSON.stringify(prev.streak) !== JSON.stringify(account.streak) ||
      JSON.stringify(prev.srsData) !== JSON.stringify(account.srsData) ||
      JSON.stringify(prev.arenaHistory) !== JSON.stringify(account.arenaHistory) ||
      JSON.stringify(prev.arenaProgress) !== JSON.stringify(account.arenaProgress) ||
      prev.totalQuizzes !== account.totalQuizzes ||
      prev.pomodoro !== account.pomodoro;

    if (hasMeaningfulChange) {
      const data = collectSyncData(useUserStore, useBookmarkStore);
      if (data) {
        debouncedSync(data);
      }
    }
  }, [account, isAuthenticated]);

  // Sync on page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const data = collectSyncData(useUserStore, useBookmarkStore);
      if (data) {
        immediateSync(data);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <SyncContext.Provider value={{ syncing, forceRefresh }}>
      {children}
    </SyncContext.Provider>
  );
};
