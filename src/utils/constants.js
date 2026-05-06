export const LEVELS = {
  ENG: "ENG",
  N5: "N5",
  N4: "N4",
  N3: "N3",
  N2: "N2",
  N1: "N1",
  JLPT: "JLPT",
  GRAMMAR: "Grammar",
};

export const DECK_LABELS = {
  eng: "Tiếng Anh",
  n5: "JLPT N5",
  n4: "JLPT N4",
  n3: "JLPT N3",
  n2: "JLPT N2",
  n1: "JLPT N1",
  jlpt: "JLPT Tổng hợp",
  grammar: "Ngữ pháp",
  it: "IT Passport",
};

export const QUIZ_MODES = {
  RANDOM: "random",
  SEQUENTIAL: "sequential",
};

export const STORAGE_KEYS = {
  USER_STORAGE: "user-storage",
  THEME: "koto-theme",
};

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  QUIZ: "/quiz/:deckId",
  FLASHCARD: "/flashcards/:deckId",
  DICTIONARY: "/dictionary",
  GRAMMAR: "/grammar",
  LEADERBOARD: "/leaderboard",
  SETTINGS: "/settings",
};
