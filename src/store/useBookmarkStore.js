import { create } from "zustand";

/**
 * Bookmark store
 * Stores user-added vocabulary words for later review/flashcard study
 * Each bookmark: { id, word, reading, meaning, hanViet, partOfSpeech, example, deck, addedAt }
 */
export const useBookmarkStore = create((set, get) => ({
  bookmarks: [],

  addBookmark: word => {
    const exists = get().bookmarks.some(b => b.word === word.word);
    if (exists) return false;
    set(state => ({
      bookmarks: [...state.bookmarks, { ...word, addedAt: new Date().toISOString() }],
    }));
    return true;
  },

  removeBookmark: (word, deck) => {
    set(state => ({
      bookmarks: state.bookmarks.filter(b => {
        if (deck) return !(b.word === word && b.deck === deck);
        return b.word !== word;
      }),
    }));
  },

  isBookmarked: (word, deck) => {
    return get().bookmarks.some(b => {
      if (deck) return b.word === word && b.deck === deck;
      return b.word === word;
    });
  },

  clearBookmarks: () => set({ bookmarks: [] }),
}));
