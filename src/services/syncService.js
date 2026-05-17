/**
 * Sync Service (Nhost Edition)
 * Handles syncing user progress (bookmarks, flashcard progress, quiz history, streak, SRS, Arena)
 * ONLY to Nhost GraphQL. Google Sheets sync has been retired as per user request.
 */

import localforage from "localforage";

let syncTimeout = null;
let isSyncing = false;
const SYNC_DEBOUNCE_MS = 20000;
const OFFLINE_SYNC_QUEUE = "offline_sync_queue";

/**
 * Build the payload for Nhost update
 */
function buildNhostMutation(data) {
  return {
    query: `
      mutation UpdateAccount(
        $username: String!, 
        $bookmark: jsonb, 
        $flashcard_progress: jsonb, 
        $quiz_history: jsonb, 
        $streak: jsonb, 
        $total_quizzes: Int, 
        $arena: jsonb, 
        $srs_data: jsonb,
        $pomodoro: jsonb,
        $last_study_date: timestamptz
      ) {
        update_accounts(
          where: {username: {_eq: $username}},
          _set: {
            bookmark: $bookmark,
            flashcard_progress: $flashcard_progress,
            quiz_history: $quiz_history,
            streak: $streak,
            total_quizzes: $total_quizzes,
            arena: $arena,
            srs_data: $srs_data,
            pomodoro: $pomodoro,
            last_study_date: $last_study_date
          }
        ) {
          affected_rows
        }
      }
    `,
    variables: {
      username: data.username,
      bookmark: data.bookmarks || [],
      flashcard_progress: data.flashcardProgress || {},
      quiz_history: (data.quizHistory || []).slice(-50),
      streak: data.streak || [],
      total_quizzes: data.totalQuizzes || 0,
      arena: {
        history: data.arenaHistory || [],
        progress: data.arenaProgress || {},
      },
      srs_data: data.srsData || {},
      pomodoro: data.pomodoro || {},
      last_study_date: new Date().toISOString(),
    },
  };
}

// Helper to push to offline queue
async function enqueueFailedSync(data) {
  try {
    const queue = (await localforage.getItem(OFFLINE_SYNC_QUEUE)) || [];
    // Only keeping the latest state for a specific user to prevent duplicate large payloads
    const updatedQueue = queue.filter(
      (item) => item.username !== data.username,
    );
    updatedQueue.push(data);
    await localforage.setItem(OFFLINE_SYNC_QUEUE, updatedQueue);
    console.log(
      `[Sync] Saved progress offline for ${data.username}. Will retry when online.`,
    );
  } catch (err) {
    console.warn("[Sync] Failed to enqueue sync offline:", err);
  }
}

// Helper to process queue
export async function processOfflineQueue() {
  if (!navigator.onLine || isSyncing) return;

  try {
    const queue = await localforage.getItem(OFFLINE_SYNC_QUEUE);
    if (!queue || queue.length === 0) return;

    console.log(`[Sync] Processing ${queue.length} offline sync items...`);

    const failedItems = [];
    for (const data of queue) {
      const success = await attemptSyncToNhost(data);
      if (!success) {
        failedItems.push(data);
      }
    }

    if (failedItems.length > 0) {
      await localforage.setItem(OFFLINE_SYNC_QUEUE, failedItems);
    } else {
      await localforage.removeItem(OFFLINE_SYNC_QUEUE);
      console.log("[Sync] Offline queue processed successfully.");
    }
  } catch (err) {
    console.warn("[Sync] Error processing offline queue:", err);
  }
}

// Add event listener for when the app comes back online
if (typeof window !== "undefined") {
  window.addEventListener("online", processOfflineQueue);
}

/**
 * Save user progress to Nhost
 */
export async function saveProgressToNhost(data) {
  if (!data?.username) return false;

  if (!navigator.onLine) {
    await enqueueFailedSync(data);
    return false;
  }

  if (isSyncing) {
    console.log("[Sync] Sync already in progress, skipping this update (data will be captured by next sync)");
    return false;
  }

  isSyncing = true;
  try {
    const success = await attemptSyncToNhost(data, false);
    if (!success) {
      await enqueueFailedSync(data);
    }
    return success;
  } finally {
    isSyncing = false;
  }
}

async function attemptSyncToNhost(data, isKeepAlive = false) {
  try {
    const payload = buildNhostMutation(data);
    const response = await fetch(import.meta.env.VITE_NHOST_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": import.meta.env.VITE_HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify(payload),
      ...(isKeepAlive ? { keepalive: true } : {}),
    });

    if (!response.ok) {
      console.warn("[Sync] Nhost Server Error:", response.status);
      return false;
    }

    const result = await response.json();
    if (result.errors) {
      console.warn("[Sync] Nhost GraphQL Error:", result.errors);
      return false;
    }

    const affected = result.data?.update_accounts?.affected_rows;
    if (affected) {
      console.log(
        `[Sync] ✅ Đã lưu dữ liệu lên Nhost cho user: ${data.username}`,
      );
    }
    return !!affected;
  } catch (err) {
    if (isKeepAlive) {
      console.warn("[Sync] keepalive fetch failed (likely >64KB). Falling back to standard fetch.");
      return attemptSyncToNhost(data, false);
    }
    console.warn("[Sync] connection to Nhost failed:", err.message);
    return false;
  }
}

/**
 * Debounced sync — waits 5s after last call before actually syncing.
 */
export function debouncedSync(data) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    saveProgressToNhost(data).catch(() => {});
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Immediate sync on page close
 */
export function immediateSync(data) {
  if (!data?.username) return false;
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  // On unload, we bypass isSyncing guard but only if data is not already being synced
  // However, keep it simple for now as unload fetch is risky anyway.
  // On unload, use keepalive so the request isn't cancelled
  attemptSyncToNhost(data, true).catch(() => {});
  console.log("[Sync] Immediate sync (Nhost) triggered on unload");
}

/**
 * Collect all progress data from Zustand stores for syncing.
 */
export function collectSyncData(userStore, bookmarkStore) {
  const account = userStore.getState().account;
  if (!account) return null;

  return {
    username: account.username,
    bookmarks: bookmarkStore.getState().bookmarks,
    flashcardProgress: account.flashcardProgress || {},
    quizHistory: account.quizHistory || [],
    streak: account.streak || [],
    totalQuizzes: account.totalQuizzes || 0,
    arenaHistory: account.arenaHistory || [],
    arenaProgress: account.arenaProgress || {},
    srsData: account.srsData || {},
    pomodoro: account.pomodoro || {},
  };
}
