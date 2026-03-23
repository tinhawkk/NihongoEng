import { WordCard, DeckId } from "../types/vocabulary";

// Helper to call Nhost from loader
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

export const loadDeck = async (
  deckId: DeckId,
  type: "sheet" | "voca" = "sheet"
): Promise<WordCard[]> => {
  const deckUpper = deckId.toUpperCase();
  // console.log(`[Loader] Loading ${deckId} (Source: ${type})`);

  try {
    // 1. Nhost Mode (voca source) or UUID check
    const isActuallyUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId);
    if (type === "voca" || deckUpper === "GRAMMAR" || isActuallyUUID) {
      // A. Standard JLPT / IT / ENG Decks
      const advancedLevels = ["N1", "N2", "N3", "N4", "N5", "IT", "ENG", "JLPT N1", "JLPT N2", "JLPT N3", "JLPT N4", "JLPT N5"];
      if (advancedLevels.includes(deckUpper)) {
        const q = `query GetAdvancedVoca($levels: [String!], $kanjiLevels: [String!]) { 
          jap_voca: japience_voca(where: {level: {_in: $levels}}, order_by: [{deck_id: asc}, {word: asc}]) {
            id word reading meaning example example_meaning mnemonic deck_id level
          }
          jap_kanji: japience_kanji(where: {level: {_in: $kanjiLevels}}, order_by: [{deck_id: asc}, {kanji: asc}]) {
            id kanji han_viet onyomi kunyomi meaning mnemonic deck_id level
          }
          userVoca: my_vocabulary(where: {level: {_in: $levels}}, order_by: {word: asc}) {
            id word furigana meaning han_viet example_jp example_vi romaji level mnemonic type onyomi kunyomi
          }
        }`;

        const baseLv = deckUpper.replace('JLPT ', '');
        const levels = [baseLv, `JLPT ${baseLv}`, deckUpper, deckId];

        const { data } = await fetchFromNhost(q, { 
          levels,
          kanjiLevels: levels
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
          type: uv.type || "voca",
          onyomi: uv.onyomi || "",
          kunyomi: uv.kunyomi || "",
          radicalAnalysis: "",
          relatedVoca: [],
          level: uv.level || deckUpper,
          deck: deckId,
        }));

        const japVoca = (data?.jap_voca || []).map((v: any) => ({
          id: v.id,
          word: v.word || v.english || v.word_en || "",
          reading: v.reading || "",
          meaning: v.meaning || v.meaning_en || v.meaning_vi || "",
          mnemonic: v.mnemonic || "",
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

        return [...japVoca, ...japKanji, ...userVocaModels].sort((a, b) => 
          (a.deck || "").localeCompare(b.deck || "", undefined, { numeric: true, sensitivity: 'base' })
        );
      }

      // B. Grammar Decks
      if (deckUpper === "GRAMMAR") {
        const q = `query GetGrammar {
          grammar_entries(order_by: {created_at: asc}, limit: 1000) {
            id title meaning structure examples conjugation caution note
          }
        }`;
        const { data } = await fetchFromNhost(q, {});
        if (data?.grammar_entries) {
          return data.grammar_entries.map((g: any) => {
            let ex = "";
            let exM = "";
            try {
              const parsed =
                typeof g.examples === "string" ? JSON.parse(g.examples || "[]") : g.examples;
              const examples = Array.isArray(parsed) ? parsed : [];
              if (examples.length > 0) {
                ex = examples[0].e || examples[0].example || "";
                exM = examples[0].v || examples[0].meaning || "";
              }
            } catch (e) {}

            return {
              id: g.id,
              word: g.title,
              reading: g.structure || "",
              meaning: g.meaning || "",
              example: ex,
              exampleMeaning: exM,
              conjugation: g.conjugation || "",
              caution: g.caution || "",
              note: g.note || "",
              examples: g.examples || [],
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
          decks_by_pk(id: $id) { id title original_deck_id }
        }`;
        const metaRes = await fetchFromNhost(qMeta, { id: deckId });
        const deck = metaRes.data?.decks_by_pk;
        if (!deck) console.warn(`[Loader] Deck not found in decks_by_pk: ${deckId}`);

        let targetId = deck?.original_deck_id || deckId;
        let targetTitle = deck?.title || "";

        const queryData = async (dId: string, title?: string) => {
          const isActuallyUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dId);
          const possibleIds = [dId, dId.toUpperCase(), dId.toLowerCase()];
          
          if (!isActuallyUUID) {
            if (dId.includes("-")) possibleIds.push(dId.replace(/-/g, " "));
            if (dId.includes("_")) possibleIds.push(dId.replace(/_/g, " "));
          }

          if (title) {
            const t = title.toLowerCase();
            possibleIds.push(title);
            possibleIds.push(title.toUpperCase());
            possibleIds.push(title.toLowerCase());
            
            if (t.includes("テクノロジ") || t.includes("technology")) possibleIds.push("IT Technology");
            if (t.includes("マネジメント") || t.includes("management")) possibleIds.push("IT Management");
            if (t.includes("ストラテジ") || t.includes("strategy")) possibleIds.push("IT Strategy");
          }

          const qCombined = `query GetDeckData($ids: [String!]) {
            vocaByDeck: japience_voca(where: {deck_id: {_in: $ids}}, order_by: {word: asc}) { id word reading meaning example example_meaning mnemonic level deck_id }
            kanjiByDeck: japience_kanji(where: {deck_id: {_in: $ids}}, order_by: {kanji: asc}) { id kanji han_viet onyomi kunyomi meaning mnemonic level deck_id }
            userVoca: my_vocabulary(where: {level: {_in: $ids}}, order_by: {word: asc}) { id word furigana meaning han_viet example_jp example_vi romaji level mnemonic type onyomi kunyomi }
          }`;

          const { data, errors } = await fetchFromNhost(qCombined, { 
            ids: possibleIds
          });

          if (errors) console.error("[Loader] queryData errors:", errors);
          const v = data?.vocaByDeck || [];
          const k = data?.kanjiByDeck || [];
          const uv = data?.userVoca || [];
          console.debug(`[Loader] Querying IDs: ${possibleIds.join(", ")} -> Found: Voca:${v.length}, Kanji:${k.length}, UserVoca:${uv.length}`);

          return {
            voca: v,
            kanji: k,
            userVoca: uv,
          };
        };

        let { voca, kanji, userVoca } = await queryData(targetId, targetTitle);

        if (voca.length === 0 && kanji.length === 0 && userVoca.length === 0 && targetTitle) {
          const qOthers = `query FindActiveDecks($title: String!) {
            decks(where: {title: {_eq: $title}, original_deck_id: {_is_null: true}}) { id title }
          }`;
          const othersRes = await fetchFromNhost(qOthers, { title: targetTitle });
          const otherDecks = othersRes.data?.decks || [];

          for (const other of otherDecks) {
            if (other.id === targetId) continue;
            const retry = await queryData(other.id, other.title);
            if (retry.voca.length > 0 || retry.kanji.length > 0 || retry.userVoca.length > 0) {
              voca = retry.voca;
              kanji = retry.kanji;
              userVoca = retry.userVoca;
              break;
            }
          }
        }

        if (voca.length > 0 || kanji.length > 0 || userVoca.length > 0) {
          const vocaModels = voca.map((v: any) => ({
            id: v.id,
            word: v.word || v.english || v.word_en || "",
            reading: v.reading || "",
            meaning: v.meaning || v.meaning_en || v.meaning_vi || "",
            example: v.example || "",
            exampleMeaning: v.example_meaning || "",
            mnemonic: v.mnemonic || "",
            type: "voca",
            level: v.level,
            deck: v.deck_id || deckId,
          }));
          const kanjiModels = kanji.map((k: any) => ({
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
            level: k.level,
            deck: k.deck_id || deckId,
          }));
          const userVocaModels = userVoca.map((uv: any) => ({
            id: uv.id,
            word: uv.word,
            reading: uv.furigana || "",
            meaning: uv.meaning || "",
            hanViet: uv.han_viet || "",
            romaji: uv.romaji || "",
            example: uv.example_jp || "",
            exampleMeaning: uv.example_vi || "",
            mnemonic: uv.mnemonic || "",
            type: uv.type || "voca",
            onyomi: uv.onyomi || "",
            kunyomi: uv.kunyomi || "",
            radicalAnalysis: "",
            relatedVoca: [],
            level: uv.level,
            deck: deckId,
          }));
          return [...vocaModels, ...kanjiModels, ...userVocaModels].sort((a, b) => 
            (a.deck || "").localeCompare(b.deck || "", undefined, { numeric: true, sensitivity: 'base' })
          );
        }
      }

      // If in voca mode and reached here without returning, we have no data
      return [];
    }

    // 2. Sheet Mode (local json source)
    if (type === "sheet") {
      const path = `/data/sheets/sheet_${deckId.toLowerCase()}.json`;
      const response = await fetch(path);
      if (!response.ok)
        throw new Error(`Failed to load sheet: ${deckId}. Status: ${response.status}`);

      const data = await response.json();
      return data.map((item: any, index: number) => ({
        id: `${deckId}_${index}`,
        word: item.english || item.kanji || item.word,
        reading: item.hiragana || "",
        meaning: item.vietnamese || item.meaning || "",
        hanViet: item.hanViet || "",
        partOfSpeech: item.hint || "",
        example: item.explanation || "",
        level: item.level || deckUpper,
        deck: deckId,
        mnemonic: item.mnemonic || "",
      }));
    }

    return [];
  } catch (error) {
    console.error(error);
    return [];
  }
};
