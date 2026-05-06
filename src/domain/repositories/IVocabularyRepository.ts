import { WordCard } from "../../types/vocabulary";

export interface IVocabularyRepository {
  /**
   * Load vocabulary words for a given deck.
   * @param deckId The ID or UUID of the deck.
   * @param source The source type ("sheet" or "voca").
   */
  loadDeck(deckId: string, source?: "sheet" | "voca"): Promise<WordCard[]>;

  /**
   * Save or update a mnemonic for a specific word.
   * @param word The WordCard object.
   * @param mnemonic The generated mnemonic text.
   */
  saveMnemonic(word: WordCard, mnemonic: string): Promise<boolean>;
}
