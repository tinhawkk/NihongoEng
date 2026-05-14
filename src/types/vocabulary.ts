export type DeckId = 'eng' | 'n5' | 'n4' | 'n3' | 'n2' | 'n1' | 'jlpt' | 'grammar';

export interface WordCard {
  id: string; // e.g. "n5_42" or UUID
  word: string; // The main term (Kanji or English)
  reading?: string; // Hiragana/Katakana
  meaning: string; // Vietnamese definition
  hanViet?: string; // Sino-Vietnamese
  romaji?: string; // Romaji
  partOfSpeech?: string; // (N), (V), etc.
  example?: string; // Example sentence
  exampleMeaning?: string; // Vietnamese translation of example
  level?: string; // N5, N4...
  deck: string | DeckId;
  mnemonic?: string;
  type?: "voca" | "kanji" | "GRAMMAR" | string;
  source?: "personal" | "system";
  onyomi?: string;
  kunyomi?: string;
  radicalAnalysis?: string;
  relatedVoca?: any; // Consider typing this further later
  audio?: string; // Optional TTS audio URL
  details?: any[]; // Grammar details array
  sections?: any[]; // Grammar sections array
  definitionEn?: string; // English definition
  definitionVi?: string; // Vietnamese definition
  synonyms?: string; // Synonyms
}

export interface QuizQuestion {
  id: string;
  word: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  type: 'ja-vi' | 'vi-ja' | 'en-vi' | 'vi-en' | 'kanji-kana';
}

export interface UserAccount {
  id: number;
  username: string;
  name: string;
  streak: string[]; // List of dates "YYYY-MM-DD"
  lastStudyDate: string;
  flashcardProgress: Record<string, any>;
  quizHistory: any[];
  totalQuizzes: number;
  bookmarks: any[];
}
