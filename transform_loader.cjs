const fs = require('fs');
const path = require('path');

const loaderPath = path.join(__dirname, 'src', 'api', 'loader.ts');
const repoPath = path.join(__dirname, 'src', 'data', 'repositories', 'NhostVocabularyRepository.ts');

let loaderContent = fs.readFileSync(loaderPath, 'utf8');

// We need to extract fetchFromNhost, checkHasGrammarEntries, and loadDeck from loader.ts
// And wrap them or put them alongside the class in NhostVocabularyRepository.ts

const fetchFromNhostMatch = loaderContent.match(/const fetchFromNhost = async \([\s\S]*?^};/m);
const checkHasGrammarEntriesMatch = loaderContent.match(/let _hasGrammarEntries[\s\S]*?^};/m);
const loadDeckMatch = loaderContent.match(/export const loadDeck = async \([\s\S]*?^};/m);

if (!fetchFromNhostMatch || !checkHasGrammarEntriesMatch || !loadDeckMatch) {
  console.error("Could not find required functions in loader.ts");
  process.exit(1);
}

const imports = `import { IVocabularyRepository } from "../../domain/repositories/IVocabularyRepository";
import { WordCard, DeckId } from "../../types/vocabulary";
import { nhostService } from "../../services/nhostService";
import { buildDetailsFromFields } from "../dto/VocabularyMapper";
`;

const classDef = `
export class NhostVocabularyRepository implements IVocabularyRepository {
  async loadDeck(deckId: string, type: "sheet" | "voca" = "sheet"): Promise<WordCard[]> {
    return loadDeckInternal(deckId as DeckId, type);
  }

  async saveMnemonic(word: WordCard, mnemonic: string): Promise<boolean> {
    if (!word.id) return false;
    try {
      const table =
        word.source === "personal"
          ? "my_vocabulary"
          : word.type === "kanji"
            ? "japience_kanji"
            : "japience_voca";

      await nhostService.updateRow(table, word.id, { mnemonic });
      return true;
    } catch (error) {
      console.error("[NhostVocabularyRepository] Failed to save mnemonic:", error);
      return false;
    }
  }
}

export const vocabularyRepository = new NhostVocabularyRepository();
`;

let internalLoadDeck = loadDeckMatch[0].replace('export const loadDeck = async', 'const loadDeckInternal = async');

// We need to replace all instances of DeckId with string in loadDeck if it conflicts, but we casted it in the class method.

const finalContent = imports + "\n" + fetchFromNhostMatch[0] + "\n\n" + checkHasGrammarEntriesMatch[0] + "\n\n" + internalLoadDeck + "\n" + classDef;

fs.writeFileSync(repoPath, finalContent);
console.log("Successfully transformed NhostVocabularyRepository.ts");
