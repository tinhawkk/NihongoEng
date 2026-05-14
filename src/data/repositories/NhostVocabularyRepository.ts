import { IVocabularyRepository } from "../../domain/repositories/IVocabularyRepository";
import { WordCard, DeckId } from "../../types/vocabulary";
import { nhostService } from "../../services/nhostService";
import { 
  buildDetailsFromFields, 
  sanitizeHtmlString, 
  extractTitleFromHtml, 
  parseExamplesField 
} from "../dto/VocabularyMapper";

const fetchFromNhost = async (query: string, variables: any) => {
  const url = (import.meta as any).env.VITE_NHOST_GRAPHQL_URL || "";
  const secret = (import.meta as any).env.VITE_HASURA_ADMIN_SECRET || "";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hasura-admin-secret": secret },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Nhost] HTTP Error ${res.status}:`, text);
      return { data: null, errors: [{ message: `HTTP ${res.status}` }] };
    }

    const result = await res.json();
    if (result.errors) console.error("[Nhost] GraphQL Errors:", result.errors);
    return result;
  } catch (err) {
    console.error("[Nhost] Fetch Exception:", err);
    return { data: null, errors: [{ message: (err as Error).message }] };
  }
};

let _hasGrammarEntries: boolean | null = null;
const checkHasGrammarEntries = async () => {
  if (_hasGrammarEntries !== null) return _hasGrammarEntries;
  try {
    const probeQ = `query ProbeGrammarEntries { grammar_entries(limit: 1) { id } }`;
    const r = await fetchFromNhost(probeQ, {});
    _hasGrammarEntries = !!(r && r.data && Array.isArray(r.data.grammar_entries));
  } catch (e) {
    _hasGrammarEntries = false;
  }
  return _hasGrammarEntries;
};

const loadDeckInternal = async (
  deckId: DeckId,
  type: "sheet" | "voca" = "sheet"
): Promise<WordCard[]> => {
  const deckUpper = deckId.toUpperCase();

  try {
    // 1. Nhost Mode (voca source) or UUID check
    const isActuallyUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      deckId
    );
    if (type === "voca" || deckUpper === "GRAMMAR" || isActuallyUUID) {
      const advancedLevels = [
        "N1", "N2", "N3", "N4", "N5", "IT", "ENG",
        "JLPT N1", "JLPT N2", "JLPT N3", "JLPT N5",
      ];
      if (advancedLevels.includes(deckUpper)) {
        const q = `query GetAdvancedVoca($levels: [String!], $kanjiLevels: [String!]) { 
          jap_voca: japience_voca(where: {level: {_in: $levels}}, order_by: [{deck_id: asc}, {word: asc}]) {
            id word reading meaning example example_meaning mnemonic deck_id level
          }
          jap_kanji: japience_kanji(where: {level: {_in: $kanjiLevels}}, order_by: [{deck_id: asc}, {kanji: asc}]) {
            id kanji han_viet onyomi kunyomi meaning mnemonic deck_id level
          }
          userVoca: my_vocabulary(where: {_or: [{level: {_in: $levels}}, {deck_id: {_in: $levels}}]}, order_by: {word: asc}) {
            id word furigana meaning han_viet example_jp example_vi romaji level mnemonic type onyomi kunyomi deck_id definition_en definition_vi synonyms
          }
        }`;

        const baseLv = deckUpper.replace("JLPT ", "");
        const levels = [baseLv, `JLPT ${baseLv}`, deckUpper, deckId];

        const { data } = await fetchFromNhost(q, {
          levels,
          kanjiLevels: levels,
        });

        const userVocaModels = (data?.userVoca || []).map((uv: any) => ({
          id: uv.id,
          word: uv.word,
          reading: uv.furigana || "",
          meaning: uv.meaning || "",
          hanViet: uv.han_viet || "",
          romaji: uv.romaji || "",
          example: uv.example_jp || "",
          exampleMeaning: uv.example_vi || "",
          mnemonic: uv.mnemonic || "",
          definitionEn: uv.definition_en || "",
          definitionVi: uv.definition_vi || "",
          synonyms: uv.synonyms || "",
          type: uv.type || "voca",
          onyomi: uv.onyomi || "",
          kunyomi: uv.kunyomi || "",
          radicalAnalysis: "",
          relatedVoca: [],
          level: uv.level || deckUpper,
          deck: deckId,
          source: "personal",
        }));

        const japVoca = (data?.jap_voca || []).map((v: any) => ({
          id: v.id,
          word: v.word || v.word_en || v.english || v.kanji || "",
          reading: v.reading || v.furigana || v.kana || "",
          meaning: v.meaning || v.meaning_en || v.meaning_vi || v.vietnamese || "",
          mnemonic: v.mnemonic || "",
          definitionEn: "",
          definitionVi: "",
          synonyms: "",
          example: v.example || "",
          exampleMeaning: v.example_meaning || "",
          type: "voca",
          level: v.level || deckUpper,
          deck: v.deck_id || deckId,
        }));

        const japKanji = (data?.jap_kanji || []).map((k: any) => ({
          id: k.id,
          word: k.kanji,
          reading: k.han_viet || "",
          meaning: k.meaning || "",
          hanViet: k.han_viet || "",
          onyomi: k.onyomi || "",
          kunyomi: k.kunyomi || "",
          mnemonic: k.mnemonic || "",
          radicalAnalysis: "",
          relatedVoca: [],
          type: "kanji",
          level: k.level || deckUpper,
          deck: k.deck_id || deckId,
        }));

        const combined = [...japVoca, ...japKanji, ...userVocaModels];
        const uniqueMap = new Map();
        
        combined.forEach(item => {
          const key = `${item.type}_${item.word}_${item.reading}`;
          const existing = uniqueMap.get(key);
          // If we see a duplicate, prioritize personal edit (source === 'personal')
          if (!existing || (item.source === "personal" && existing.source !== "personal")) {
            uniqueMap.set(key, item);
          }
        });

        return Array.from(uniqueMap.values()).sort((a, b) =>
          (a.deck || "").localeCompare(b.deck || "", undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );
      }

      // B. Grammar Decks
      if (deckUpper === "GRAMMAR") {
        const useNew = await checkHasGrammarEntries();
        let grammarData: any[] = [];
        if (useNew) {
          const qEntries = `query GetGrammarEntries { grammar_entries(order_by: {created_at: asc}, limit: 2000) { id title meaning structure conjugation caution note details full_html examples level url } }`;
          try {
            const res = await fetchFromNhost(qEntries, {});
            grammarData = res?.data?.grammar_entries || [];
          } catch (e) {
            grammarData = [];
          }
        }

        if (!grammarData || grammarData.length === 0) {
          const qLegacy = `query GetGrammarLegacy { grammar_points(order_by: {created_at: asc}, limit: 1000) { id title meaning structure conjugation caution note examples { japanese vietnamese } sections { header content_text content_html } sources { source_name } details full_html } }`;
          const { data } = await fetchFromNhost(qLegacy, {});
          grammarData = data?.grammar_points || [];
        }

        if (grammarData && grammarData.length > 0) {
          return grammarData.map((g: any, idx: number) => {
            const cleanedFullHtml = g.full_html || g.html ? sanitizeHtmlString(g.full_html || g.html) : "";
            const titleVal = g.title || extractTitleFromHtml(cleanedFullHtml) || g.word || g.name || "";
            const exs = parseExamplesField(Array.isArray(g.examples) ? g.examples : g.examples?.data || g.examples);
            const firstEx = exs?.[0] || {};

            return {
              id: g.id || `local-grammar-${idx}`,
              word: titleVal,
              reading: g.structure || g.reading || "",
              meaning: g.meaning || g.note || "",
              example: firstEx?.japanese || "",
              exampleMeaning: firstEx?.vietnamese || "",
              conjugation: g.conjugation || "",
              caution: g.caution || "",
              note: g.note || "",
              examples: exs || [],
              details: buildDetailsFromFields({ ...g, full_html: cleanedFullHtml }),
              sections: buildDetailsFromFields({ ...g, full_html: cleanedFullHtml }),
              level: "GRAMMAR",
              deck: deckId,
            };
          });
        }
      }

      // C. Japience Specialty / Community Decks
      const standardDecks = ["N1", "N2", "N3", "N4", "N5", "IT", "ENG", "GRAMMAR", "JLPT"];
      if (!standardDecks.includes(deckUpper)) {
        const qMeta = `query GetDeckMeta($id: String!) {
          decks_by_pk(id: $id) { id title original_deck_id community_folder_id }
        }`;
        const metaRes = await fetchFromNhost(qMeta, { id: deckId });
        const deck = metaRes.data?.decks_by_pk;
        
        let targetId = deck?.original_deck_id || deckId;
        let targetTitle = deck?.title || "";
        const uuidLevelHints: string[] = [];

        if (isActuallyUUID && deck?.community_folder_id) {
          const qFolder = `query GetFolderTitle($id: String!) {
            folders_by_pk(id: $id) { id title parent_id }
          }`;
          const folderRes = await fetchFromNhost(qFolder, { id: deck.community_folder_id });
          const folder = folderRes.data?.folders_by_pk;
          if (folder?.title) uuidLevelHints.push(folder.title, folder.title.toUpperCase());
        }

        const queryData = async (dId: string, title?: string, levelHints: string[] = []) => {
          const possibleIds = [dId, dId.toUpperCase(), dId.toLowerCase()];
          const legacyLevels: string[] = [...levelHints];
          if (title) {
            possibleIds.push(title, title.toUpperCase(), title.toLowerCase());
            legacyLevels.push(title, title.toUpperCase(), title.toLowerCase());
          }

          const useNewGrammar = await checkHasGrammarEntries();
          const grammarSelection = useNewGrammar
            ? `grammarByDeck: grammar_entries(where: {lesson_id: {_in: $ids}}, order_by: {created_at: asc}) { id title meaning structure conjugation caution note lesson_id examples details full_html }`
            : `grammarByDeck: grammar_points(where: {lesson_id: {_in: $ids}}, order_by: {created_at: asc}) { id title meaning structure conjugation caution note lesson_id examples { japanese vietnamese } sections { header content_text content_html } sources { source_name } }`;

          const qCombined = `query GetDeckData($ids: [String!], $legacyLevels: [String!]) {
            vocaByDeck: japience_voca(where: {deck_id: {_in: $ids}}, order_by: {word: asc}) { id word reading meaning example example_meaning mnemonic level deck_id }
            kanjiByDeck: japience_kanji(where: {deck_id: {_in: $ids}}, order_by: {kanji: asc}) { id kanji han_viet onyomi kunyomi meaning mnemonic level deck_id }
            ${grammarSelection}
            userVocaByLevel: my_vocabulary(where: {_or: [{level: {_in: $legacyLevels}}, {deck_id: {_in: $ids}}]}, order_by: {word: asc}) { id word furigana meaning han_viet example_jp example_vi romaji level mnemonic type onyomi kunyomi deck_id definition_en definition_vi synonyms }
          }`;

          const { data } = await fetchFromNhost(qCombined, {
            ids: possibleIds,
            legacyLevels: [...new Set(legacyLevels)],
          });

          const v = data?.vocaByDeck || [];
          const k = data?.kanjiByDeck || [];
          const uv = data?.userVocaByLevel || [];
          let g = (data?.grammarByDeck || []).map((gr: any) => ({
            id: gr.id, word: gr.title, reading: gr.structure || "", meaning: gr.meaning || "", 
            example: gr.examples?.[0]?.japanese || "", exampleMeaning: gr.examples?.[0]?.vietnamese || "",
            level: "GRAMMAR", deck: dId, type: "GRAMMAR", details: buildDetailsFromFields(gr), sections: buildDetailsFromFields(gr)
          }));

          return { voca: [...v, ...g], kanji: k, userVoca: uv };
        };

        let { voca, kanji, userVoca } = await queryData(targetId, targetTitle, uuidLevelHints);

        const vocaModels = voca.map((v: any) => ({
          id: v.id, word: v.word || v.kanji || "", reading: v.reading || v.furigana || "",
          meaning: v.meaning || "", example: v.example || "", exampleMeaning: v.example_meaning || "",
          definitionEn: "", definitionVi: "", synonyms: "",
          mnemonic: v.mnemonic || "", type: "voca", level: v.level, deck: v.deck_id || deckId
        }));
        const kanjiModels = kanji.map((k: any) => ({
          id: k.id, word: k.kanji, reading: k.han_viet || "", meaning: k.meaning || "",
          hanViet: k.han_viet || "", onyomi: k.onyomi || "", kunyomi: k.kunyomi || "",
          mnemonic: k.mnemonic || "", type: "kanji", level: k.level, deck: k.deck_id || deckId
        }));
        const userVocaModels = userVoca.map((uv: any) => ({
          id: uv.id, word: uv.word, reading: uv.furigana || "", meaning: uv.meaning || "",
          hanViet: uv.han_viet || "", romaji: uv.romaji || "", example: uv.example_jp || "",
          exampleMeaning: uv.example_vi || "", mnemonic: uv.mnemonic || "",
          definitionEn: uv.definition_en || "", definitionVi: uv.definition_vi || "", synonyms: uv.synonyms || "",
          type: uv.type || "voca", onyomi: uv.onyomi || "", kunyomi: uv.kunyomi || "",
          level: uv.level, deck: deckId, source: "personal"
        }));

        const combined = [...vocaModels, ...kanjiModels, ...userVocaModels];
        const uniqueMap = new Map();
        combined.forEach(item => {
          const key = `${item.type}_${item.word}_${item.reading}`;
          const existing = uniqueMap.get(key);
          if (!existing || (item.source === "personal" && existing.source !== "personal")) {
            uniqueMap.set(key, item);
          }
        });

        return Array.from(uniqueMap.values()).sort((a, b) =>
          (a.deck || "").localeCompare(b.deck || "", undefined, { numeric: true, sensitivity: "base" })
        );
      }
      return [];
    }

    // 2. Sheet Mode (local json source)
    if (type === "sheet") {
      const path = `/data/sheets/sheet_${deckId.toLowerCase()}.json`;
      let sheetData = [];
      try {
        const response = await fetch(path);
        if (response.ok) {
          const data = await response.json();
          sheetData = data.map((item: any, index: number) => ({
            id: `${deckId}_${index}`,
            word: item.english || item.kanji || item.word,
            reading: item.hiragana || "",
            meaning: item.vietnamese || item.meaning || "",
            hanViet: item.hanViet || "",
            partOfSpeech: item.hint || "",
            example: item.explanation || item.example_jp || item.example || "",
            exampleMeaning: item.example_vi || item.exampleMeaning || "",
            definitionEn: item.definition_en || item.definitionEn || "",
            definitionVi: item.definition_vi || item.definitionVi || "",
            synonyms: item.synonyms || "",
            level: item.level || deckUpper,
            deck: deckId,
            mnemonic: item.mnemonic || "",
          }));
        }
      } catch (e) {
        console.warn("[Loader] Local sheet not found:", path);
      }

      // Merge with user edits from Nhost for this deck
      try {
        const qUser = `query GetUserVocaByDeck($deckId: String!) {
          my_vocabulary(where: {deck_id: {_eq: $deckId}}) {
            id word furigana meaning han_viet example_jp example_vi romaji level mnemonic type onyomi kunyomi deck_id definition_en definition_vi synonyms
          }
        }`;
        const { data } = await fetchFromNhost(qUser, { deckId });
        const userVoca = (data?.my_vocabulary || []).map((uv: any) => ({
          id: uv.id, word: uv.word, reading: uv.furigana || "", meaning: uv.meaning || "",
          hanViet: uv.han_viet || "", romaji: uv.romaji || "", example: uv.example_jp || "",
          exampleMeaning: uv.example_vi || "", mnemonic: uv.mnemonic || "",
          definitionEn: uv.definition_en || "", definitionVi: uv.definition_vi || "", synonyms: uv.synonyms || "",
          type: uv.type || "voca", onyomi: uv.onyomi || "", kunyomi: uv.kunyomi || "",
          level: uv.level || deckUpper, deck: deckId, source: "personal"
        }));

        const merged = [...sheetData, ...userVoca];
        const uniqueMap = new Map();
        merged.forEach(item => {
          const key = `${item.type || 'voca'}_${item.word}_${item.reading}`;
          const existing = uniqueMap.get(key);
          if (!existing || (item.source === "personal" && existing.source !== "personal")) {
            uniqueMap.set(key, item);
          }
        });
        return Array.from(uniqueMap.values());
      } catch (e) {
        return sheetData;
      }
    }

    return [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

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
