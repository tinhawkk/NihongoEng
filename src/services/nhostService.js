/**
 * Simple Nhost Service using Fetch API for GraphQL queries.
 * This avoids adding heavy dependencies while providing full access to our new database.
 */

import { isDevtoolsBlocked, registerRequest } from "../utils/devtoolsGuard";
import { romajiToHiragana } from "../utils/kana";

// Use direct Hasura endpoint for reliability; fallback to standard Nhost URL
const NHOST_URL =
  import.meta.env.VITE_NHOST_GRAPHQL_URL ||
  (import.meta.env.VITE_NHOST_BACKEND_URL
    ? import.meta.env.VITE_NHOST_BACKEND_URL + "/v1/graphql"
    : null);
const ADMIN_SECRET = import.meta.env.VITE_HASURA_ADMIN_SECRET;
const searchCache = new Map();

function getCached(key) {
  const entry = searchCache.get(key);
  if (entry && Date.now() - entry.time < 300000) return entry.data; // 5 min cache
  return null;
}

function setCached(key, data) {
  searchCache.set(key, { data, time: Date.now() });
}

function clearAllCaches() {
  searchCache.clear();
}

async function fetchGraphQL(operationsDoc, operationName, variables) {
  // Blocking check removed to allow debugging with DevTools open

  if (!NHOST_URL) {
    console.error(
      "[Nhost] No GraphQL URL configured. Check VITE_NHOST_GRAPHQL_URL or VITE_NHOST_BACKEND_URL env vars."
    );
    return { data: null, errors: [{ message: "No GraphQL URL configured" }] };
  }
  try {
    const controller = new AbortController();
    const unregister = registerRequest(controller);

    const result = await fetch(NHOST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": ADMIN_SECRET,
      },
      signal: controller.signal,
      body: JSON.stringify({
        query: operationsDoc,
        variables: variables,
        operationName: operationName,
      }),
    });
    const json = await result.json();
    unregister();
    return json;
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("[Nhost] Request aborted due to DevTools block.");
      return { data: null, errors: [{ message: "Aborted due to DevTools" }] };
    }
    console.error("[Nhost] fetchGraphQL error:", err);
    return { data: null, errors: [{ message: err.message }] };
  }
}

const QUERIES = {
  SEARCH_DICTIONARY: `
    query SearchDictionary($term: String!) {
      dictionary(where: {word: {_ilike: $term}}, limit: 50, order_by: {word: asc}) {
        word
        phonetic
        meanings_en
        meanings_vi
        examples
        synonyms
      }
    }
  `,
  SEARCH_GENERAL_KANJI: `
    query SearchGeneralKanji($term: String!, $termLike: String!, $kanaLike: String!) {
      general_kanji(where: {
        _or: [
          {kanji: {_eq: $term}},
          {han_viet: {_ilike: $termLike}},
          {onyomi: {_ilike: $kanaLike}},
          {kunyomi: {_ilike: $kanaLike}},
          {meanings: {_ilike: $termLike}}
        ]
      }, limit: 100) {
        kanji
        han_viet
        onyomi
        kunyomi
        meanings
        strokes
        radical
        unicode
      }
    }
  `,
  SEARCH_JAPANESE: `
    query SearchJapanese($termLike: String!, $kanaLike: String!) {
      my_voca: my_vocabulary(where: {
        _or: [
          {word: {_ilike: $termLike}},
          {furigana: {_ilike: $termLike}},
          {furigana: {_ilike: $kanaLike}},
          {meaning: {_ilike: $termLike}},
          {han_viet: {_ilike: $termLike}}
        ]
      }, limit: 50) {
        id word furigana meaning han_viet example_jp example_vi level mnemonic type onyomi kunyomi radical_analysis related_voca
      }
      jap_voca: japience_voca(where: {
        _or: [
          {word: {_ilike: $termLike}},
          {reading: {_ilike: $termLike}},
          {reading: {_ilike: $kanaLike}},
          {meaning: {_ilike: $termLike}}
        ]
      }, limit: 30) {
        id word reading meaning example example_meaning mnemonic level
      }
      jap_kanji: japience_kanji(where: {
        _or: [
          {kanji: {_ilike: $termLike}},
          {han_viet: {_ilike: $termLike}},
          {onyomi: {_ilike: $kanaLike}},
          {kunyomi: {_ilike: $kanaLike}},
          {meaning: {_ilike: $termLike}}
        ]
      }, limit: 30) {
        id kanji han_viet onyomi kunyomi meaning mnemonic level radical_analysis related_voca
      }
      grammar: grammar_entries(where: {
        _or: [
          {title: {_ilike: $termLike}},
          {title: {_ilike: $kanaLike}},
          {meaning: {_ilike: $termLike}},
          {structure: {_ilike: $termLike}}
        ]
      }, limit: 20) {
        id title meaning structure examples lesson_id
      }
    }
  `,
  LIST_SPECIALTY_DECKS: `
    query ListSpecialtyDecks($level: String!) {
      japience_voca(where: {level: {_eq: $level}}, distinct_on: deck_id, order_by: [{deck_id: asc}, {word: asc}]) {
        deck_id
        word
        meaning
      }
    }
  `,
  LIST_COMMUNITY_FOLDERS: `
    query ListCommunityFolders {
      folders(order_by: {created_at: asc}) {
        id title description parent_id
      }
    }
  `,
  LIST_COMMUNITY_DECKS: `
    query ListCommunityDecks {
      decks(order_by: {created_at: asc}) {
        id title description community_folder_id
      }
    }
  `,
  LIST_RADICALS: `
    query ListRadicals {
      radicals(order_by: {radical_number: asc}) {
        radical_number
        character
        strokes
        name_vi
        meaning_vi
      }
    }
  `,
};

// Utility: remove diacritics and normalize for comparisons
function normalizeTermForCompare(t) {
  if (!t) return "";
  return t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
// ── CRUD Mutations ──────────────────────────────────────────────────

const MUTATIONS = {
  // ─ my_vocabulary ─
  INSERT_MY_VOCA: `mutation InsertMY_VOCA($obj: my_vocabulary_insert_input!) {
    insert_my_vocabulary_one(object: $obj) { id word }
  }`,
  BULK_INSERT_MY_VOCA: `mutation BulkInsertMyVoca($objects: [my_vocabulary_insert_input!]!) {
    insert_my_vocabulary(objects: $objects, on_conflict: {constraint: my_vocabulary_pkey, update_columns: [word, furigana, meaning, han_viet, romaji, example_jp, example_vi, level, mnemonic, type, onyomi, kunyomi, radical_analysis, related_voca]}) {
      affected_rows
      returning { id word }
    }
  }`,
  UPDATE_MY_VOCA: `mutation UpdateMY_VOCA($id: String!, $set: my_vocabulary_set_input!) {
    update_my_vocabulary_by_pk(pk_columns: {id: $id}, _set: $set) { id word }
  }`,
  DELETE_MY_VOCA: `mutation DeleteMY_VOCA($id: String!) {
    delete_my_vocabulary_by_pk(id: $id) { id }
  }`,

  // ─ japience_voca ─
  INSERT_JAP_VOCA: `mutation InsertJAP_VOCA($obj: japience_voca_insert_input!) {
    insert_japience_voca_one(object: $obj) { id word }
  }`,
  UPDATE_JAP_VOCA: `mutation UpdateJAP_VOCA($id: String!, $set: japience_voca_set_input!) {
    update_japience_voca_by_pk(pk_columns: {id: $id}, _set: $set) { id word }
  }`,
  DELETE_JAP_VOCA: `mutation DeleteJAP_VOCA($id: String!) {
    delete_japience_voca_by_pk(id: $id) { id }
  }`,

  // ─ japience_kanji ─
  INSERT_JAP_KANJI: `mutation InsertJAP_KANJI($obj: japience_kanji_insert_input!) {
    insert_japience_kanji_one(object: $obj) { id kanji }
  }`,
  UPDATE_JAP_KANJI: `mutation UpdateJAP_KANJI($id: String!, $set: japience_kanji_set_input!) {
    update_japience_kanji_by_pk(pk_columns: {id: $id}, _set: $set) { id kanji }
  }`,
  DELETE_JAP_KANJI: `mutation DeleteJAP_KANJI($id: String!) {
    delete_japience_kanji_by_pk(id: $id) { id }
  }`,

  // ─ grammar_levels ─
  INSERT_GRAMMAR_LEVEL: `mutation InsertGRAMMAR_LEVEL($obj: grammar_levels_insert_input!) {
    insert_grammar_levels_one(object: $obj) { id title }
  }`,
  UPDATE_GRAMMAR_LEVEL: `mutation UpdateGRAMMAR_LEVEL($id: String!, $set: grammar_levels_set_input!) {
    update_grammar_levels_by_pk(pk_columns: {id: $id}, _set: $set) { id title }
  }`,
  DELETE_GRAMMAR_LEVEL: `mutation DeleteGRAMMAR_LEVEL($id: String!) {
    delete_grammar_levels_by_pk(id: $id) { id }
  }`,

  // ─ grammar_lessons ─
  INSERT_GRAMMAR_LESSON: `mutation InsertGRAMMAR_LESSON($obj: grammar_lessons_insert_input!) {
    insert_grammar_lessons_one(object: $obj) { id title }
  }`,
  UPDATE_GRAMMAR_LESSON: `mutation UpdateGRAMMAR_LESSON($id: String!, $set: grammar_lessons_set_input!) {
    update_grammar_lessons_by_pk(pk_columns: {id: $id}, _set: $set) { id title }
  }`,
  DELETE_GRAMMAR_LESSON: `mutation DeleteGRAMMAR_LESSON($id: String!) {
    delete_grammar_lessons_by_pk(id: $id) { id }
  }`,

  // ─ grammar_entries ─
  INSERT_GRAMMAR_ENTRY: `mutation InsertGRAMMAR_ENTRY($obj: grammar_entries_insert_input!) {
    insert_grammar_entries_one(object: $obj) { id title }
  }`,
  UPDATE_GRAMMAR_ENTRY: `mutation UpdateGRAMMAR_ENTRY($id: String!, $set: grammar_entries_set_input!) {
    update_grammar_entries_by_pk(pk_columns: {id: $id}, _set: $set) { id title }
  }`,
  DELETE_GRAMMAR_ENTRY: `mutation DeleteGRAMMAR_ENTRY($id: String!) {
    delete_grammar_entries_by_pk(id: $id) { id }
  }`,

  // ─ dictionary ─
  INSERT_DICTIONARY: `mutation InsertDICTIONARY($obj: dictionary_insert_input!) {
    insert_dictionary_one(object: $obj) { word }
  }`,
  UPDATE_DICTIONARY: `mutation UpdateDICTIONARY($word: String!, $set: dictionary_set_input!) {
    update_dictionary_by_pk(pk_columns: {word: $word}, _set: $set) { word }
  }`,
  DELETE_DICTIONARY: `mutation DeleteDICTIONARY($word: String!) {
    delete_dictionary_by_pk(word: $word) { word }
  }`,

  // ─ general_kanji ─
  INSERT_GENERAL_KANJI: `mutation InsertGENERAL_KANJI($obj: general_kanji_insert_input!) {
    insert_general_kanji_one(object: $obj) { kanji }
  }`,
  UPDATE_GENERAL_KANJI: `mutation UpdateGENERAL_KANJI($kanji: String!, $set: general_kanji_set_input!) {
    update_general_kanji_by_pk(pk_columns: {kanji: $kanji}, _set: $set) { kanji }
  }`,
  DELETE_GENERAL_KANJI: `mutation DeleteGENERAL_KANJI($kanji: String!) {
    delete_general_kanji_by_pk(kanji: $kanji) { kanji }
  }`,

  // ─ decks (community decks) ─
  INSERT_DECK: `mutation InsertDeck($obj: decks_insert_input!) {
    insert_decks_one(object: $obj) { id title description community_folder_id custom_columns }
  }`,
  UPDATE_DECK: `mutation UpdateDeck($id: String!, $title: String!) {
    update_decks_by_pk(pk_columns: {id: $id}, _set: {title: $title}) { id title }
  }`,
  DELETE_DECK: `mutation DeleteDeck($id: String!) {
    delete_decks_by_pk(id: $id) { id }
  }`,
  
  // ─ community_folders ─
  INSERT_FOLDER: `mutation InsertFolder($obj: folders_insert_input!) {
    insert_folders_one(object: $obj) { id title parent_id }
  }`,
  UPDATE_FOLDER: `mutation UpdateFolder($id: String!, $title: String!) {
    update_folders_by_pk(pk_columns: {id: $id}, _set: {title: $title}) { id title }
  }`,
  DELETE_FOLDER: `mutation DeleteFolder($id: String!) {
    delete_folders_by_pk(id: $id) { id }
  }`,
  
  // ─ radicals ─
  BULK_INSERT_RADICALS: `mutation BulkInsertRadicals($objects: [radicals_insert_input!]!) {
    insert_radicals(objects: $objects) {
      affected_rows
    }
  }`,
};

export const nhostService = {
  fetchGraphQL, // Export the base fetch function for custom queries
  
  async searchDictionary(term) {
    const raw = (term || "").trim();
    if (!raw) return [];
    
    const cacheKey = `dict_${raw}`;
    if (getCached(cacheKey)) return getCached(cacheKey);

    const prefixPattern = `${raw}%`;
    const subPattern = `%${raw}%`;

    // 1) fetch prefix matches first (words starting with the term)
    const { data: pData, errors: pErr } = await fetchGraphQL(
      QUERIES.SEARCH_DICTIONARY,
      "SearchDictionary",
      {
        term: prefixPattern,
      }
    );
    if (pErr) {
      console.error("[Nhost] Dictionary prefix error:", pErr);
      return [];
    }

    const prefixResults = (pData?.dictionary || []).map(item => ({
      word: item.word,
      p: item.phonetic || "",
      m_vi: Array.isArray(item.meanings_vi)
        ? item.meanings_vi
        : typeof item.meanings_vi === "string"
          ? item.meanings_vi
              .split("|")
              .map(s => s.trim())
              .filter(Boolean)
          : [],
      m_en: Array.isArray(item.meanings_en)
        ? item.meanings_en
        : typeof item.meanings_en === "string"
          ? item.meanings_en
              .split("|")
              .map(s => s.trim())
              .filter(Boolean)
          : [],
      s: Array.isArray(item.examples)
        ? item.examples
        : typeof item.examples === "string"
          ? item.examples
              .split("|")
              .map(s => s.trim())
              .filter(Boolean)
          : [],
      synonyms: Array.isArray(item.synonyms)
        ? item.synonyms
        : typeof item.synonyms === "string"
          ? item.synonyms
              .split(/[|,]/)
              .map(s => s.trim())
              .filter(Boolean)
          : [],
    }));

    // If we already have enough prefix results, return them (after ranking)
    const desired = 50;
    if (prefixResults.length >= desired) {
      const ranked = prefixResults.slice(0, desired);
      // ranking still applies (exact/prefix/suffix/substring), keep current behavior
      const norm = normalizeTermForCompare(raw);
      function rankItem(it) {
        const w = normalizeTermForCompare(it.word || "");
        if (w === norm) return 0;
        if (w.endsWith(norm)) return 1;
        if (w.startsWith(norm)) return 2;
        if (w.includes(norm)) return 3;
        return 4;
      }
      ranked.sort((a, b) => {
        const ra = rankItem(a);
        const rb = rankItem(b);
        if (ra !== rb) return ra - rb;
        return a.word.localeCompare(b.word);
      });
      return ranked;
    }

    // 2) fetch substring matches and merge, keeping prefix matches first
    const { data: sData, errors: sErr } = await fetchGraphQL(
      QUERIES.SEARCH_DICTIONARY,
      "SearchDictionary",
      {
        term: subPattern,
      }
    );
    if (sErr) {
      console.error("[Nhost] Dictionary substring error:", sErr);
      return prefixResults;
    }

    const subResults = (sData?.dictionary || []).map(item => ({
      word: item.word,
      p: item.phonetic || "",
      m_vi: Array.isArray(item.meanings_vi)
        ? item.meanings_vi
        : typeof item.meanings_vi === "string"
          ? item.meanings_vi
              .split("|")
              .map(s => s.trim())
              .filter(Boolean)
          : [],
      m_en: Array.isArray(item.meanings_en)
        ? item.meanings_en
        : typeof item.meanings_en === "string"
          ? item.meanings_en
              .split("|")
              .map(s => s.trim())
              .filter(Boolean)
          : [],
      s: Array.isArray(item.examples)
        ? item.examples
        : typeof item.examples === "string"
          ? item.examples
              .split("|")
              .map(s => s.trim())
              .filter(Boolean)
          : [],
      synonyms: Array.isArray(item.synonyms)
        ? item.synonyms
        : typeof item.synonyms === "string"
          ? item.synonyms
              .split(/[|,]/)
              .map(s => s.trim())
              .filter(Boolean)
          : [],
    }));

    const seen = new Set(prefixResults.map(r => r.word));
    const merged = prefixResults.concat(subResults.filter(r => !seen.has(r.word)));

    // Rank merged results: exact > suffix > prefix > substring
    const norm = normalizeTermForCompare(raw);
    function rankItem(it) {
      const w = normalizeTermForCompare(it.word || "");
      if (w === norm) return 0;
      if (w.endsWith(norm)) return 1;
      if (w.startsWith(norm)) return 2;
      if (w.includes(norm)) return 3;
      return 4;
    }

    merged.sort((a, b) => {
      const ra = rankItem(a);
      const rb = rankItem(b);
      if (ra !== rb) return ra - rb;
      return a.word.localeCompare(b.word);
    });

    const finalResults = merged.slice(0, desired);
    setCached(cacheKey, finalResults);
    return finalResults;
  },

  async searchGeneralKanji(term) {
    const raw = (term || "").trim();
    if (!raw) return [];
    
    const kanaTerm = romajiToHiragana(raw);
    const cacheKey = `kanji_${raw}`;
    if (getCached(cacheKey)) return getCached(cacheKey);

    const { data } = await fetchGraphQL(QUERIES.SEARCH_GENERAL_KANJI, "SearchGeneralKanji", {
      term: raw,
      termLike: `%${raw}%`,
      kanaLike: `%${kanaTerm}%`,
    });
    const items = data?.general_kanji || [];
    const norm = normalizeTermForCompare(raw);

    function rankKanji(k) {
      const kanji = (k.kanji || "").toLowerCase();
      const han = normalizeTermForCompare(k.han_viet || "");
      const mean = normalizeTermForCompare(k.meanings || "");
      if (kanji === raw.toLowerCase()) return 0;
      if (han === norm) return 0;
      if (han.startsWith(norm)) return 1;
      if (mean.includes(norm)) return 2;
      return 3;
    }

    items.sort((a, b) => {
      const ra = rankKanji(a);
      const rb = rankKanji(b);
      if (ra !== rb) return ra - rb;
      return (a.kanji || "").localeCompare(b.kanji || "");
    });
    
    setCached(cacheKey, items);
    return items;
  },

  async searchJapanese(term) {
    const raw = (term || "").trim();
    if (!raw) return [];

    const kanaTerm = romajiToHiragana(raw);
    const cacheKey = `ja_${raw}`;
    if (getCached(cacheKey)) return getCached(cacheKey);

    const { data } = await fetchGraphQL(QUERIES.SEARCH_JAPANESE, "SearchJapanese", {
      termLike: `%${raw}%`,
      kanaLike: `%${kanaTerm}%`,
    });
    
    console.debug(`[Search] term: ${raw}, kana: ${kanaTerm}, results:`, data);

    // Normalize and merge results
    const myVoca = (data?.my_voca || []).map(v => ({
      ...v,
      hanViet: v.han_viet, // Normalize for UI
      meaning_vi: v.meaning,
      example: v.example_jp,
      example_meaning: v.example_vi,
      type: v.type || "voca",
      mnemonic: v.mnemonic,
      onyomi: v.onyomi,
      kunyomi: v.kunyomi,
      source: "personal",
    }));

    const japVoca = (data?.jap_voca || []).map(v => ({
      ...v,
      furigana: v.reading,
      meaning_vi: v.meaning,
      type: "voca",
      source: "japience",
    }));

    const japKanji = (data?.jap_kanji || []).map(k => ({
      ...k,
      word: k.kanji,
      hanViet: k.han_viet, // Normalize for UI
      furigana: k.han_viet, // Hán Việt acts as reading for Kanji search
      meaning_vi: k.meaning,
      type: "kanji",
      source: "japience",
    }));

    const grammar = (data?.grammar || []).map(g => ({
      ...g,
      word: g.title,
      furigana: "",
      meaning_vi: g.meaning,
      type: "grammar",
      source: "grammar",
    }));

    const result = [...myVoca, ...japVoca, ...japKanji, ...grammar];
    
    // Deduplicate by word and type to prevent redundant results
    const seen = new Set();
    const finalResult = result.filter(item => {
      const key = `${item.type}-${item.word}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setCached(cacheKey, finalResult);
    return finalResult;
  },

  /** List specialty deck ids for a given level (e.g. 'IT') */
  async listSpecialtyDecks(level) {
    if (!level) return [];
    const { data, errors } = await fetchGraphQL(
      QUERIES.LIST_SPECIALTY_DECKS,
      "ListSpecialtyDecks",
      { level }
    );
    if (errors) {
      console.error("[Nhost] listSpecialtyDecks error:", errors);
      return [];
    }
    return data?.japience_voca || [];
  },
  async getCommunityFolders() {
    const { data, errors } = await fetchGraphQL(
      QUERIES.LIST_COMMUNITY_FOLDERS,
      "ListCommunityFolders",
      {}
    );
    if (errors) {
      console.error("[Nhost] getCommunityFolders error:", errors);
      return [];
    }
    return data?.folders || [];
  },
  async getCommunityDecks() {
    const { data, errors } = await fetchGraphQL(
      QUERIES.LIST_COMMUNITY_DECKS,
      "ListCommunityDecks",
      {}
    );
    if (errors) {
      console.error("[Nhost] getCommunityDecks error:", errors);
      return [];
    }
    return data?.decks || [];
  },

  async getRadicals() {
    const cacheKey = "radicals_all";
    if (getCached(cacheKey)) return getCached(cacheKey);

    const { data, errors } = await fetchGraphQL(
      QUERIES.LIST_RADICALS,
      "ListRadicals",
      {}
    );
    if (errors) {
      console.error("[Nhost] getRadicals error:", errors);
      return [];
    }
    const result = data?.radicals || [];
    setCached(cacheKey, result);
    return result;
  },

  /** Create a new community deck inside a folder */
  async createDeck({ title, description, community_folder_id, custom_columns = {} }) {
    // Always generate a UUID for id (required by Hasura)
    let uuid = "";
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      uuid = crypto.randomUUID();
    } else {
      // fallback: simple uuid v4 polyfill
      uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    const res = await fetchGraphQL(MUTATIONS.INSERT_DECK, "InsertDeck", {
      obj: { id: uuid, title, description: description || "", community_folder_id, custom_columns },
    });
    if (!res.errors) clearAllCaches();
    return res;
  },

  async deleteDeck(id) {
    const res = await fetchGraphQL(MUTATIONS.DELETE_DECK, "DeleteDeck", { id });
    if (!res.errors) clearAllCaches();
    return res;
  },

  async updateDeck(id, title) {
    const res = await fetchGraphQL(MUTATIONS.UPDATE_DECK, "UpdateDeck", { id, title });
    if (!res.errors) clearAllCaches();
    return res;
  },

  /** Create a new community folder */
  async createFolder({ title, description, parent_id }) {
    let uuid = "";
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      uuid = crypto.randomUUID();
    } else {
      uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    const res = await fetchGraphQL(MUTATIONS.INSERT_FOLDER, "InsertFolder", {
      obj: { id: uuid, title, description: description || "", parent_id },
    });
    if (!res.errors) clearAllCaches();
    return res;
  },

  async updateFolder(id, title) {
    const res = await fetchGraphQL(MUTATIONS.UPDATE_FOLDER, "UpdateFolder", { id, title });
    if (!res.errors) clearAllCaches();
    return res;
  },

  async deleteFolder(id) {
    const res = await fetchGraphQL(MUTATIONS.DELETE_FOLDER, "DeleteFolder", { id });
    if (!res.errors) clearAllCaches();
    return res;
  },

  /**
   * Trigger a server-side crawl/action to fetch examples for `word` if available.
   * This calls a GraphQL mutation named `CrawlExamples` (Hasura action) if present,
   * then re-fetches the dictionary entry via `searchDictionary`.
   */
  async fetchExamples(word) {
    if (!word) return null;
    // Try to call a Hasura action/mutation named `crawl_examples` or `crawlExamples`.
    const MUTATION_CRAWL = `mutation CrawlExamples($word: String!) { crawl_examples(word: $word) }`;
    try {
      // Fire and forget; server may return errors if action not defined.
      await fetchGraphQL(MUTATION_CRAWL, "CrawlExamples", { word });
    } catch (e) {
      // ignore — action may not exist
      console.debug("crawl examples action failed or not present:", e.message);
    }
    // Re-query the dictionary for this word (exact match)
    const results = await this.searchDictionary(word);
    // Return first exact match if present
    return results.find(r => r.word.toLowerCase() === word.toLowerCase()) || results[0] || null;
  },

  // ── Generic CRUD helpers ──────────────────────────────────────────

  /** Create a row. Returns { data, errors } */
  async createRow(table, obj) {
    const mutMap = {
      my_vocabulary: "INSERT_MY_VOCA",
      japience_voca: "INSERT_JAP_VOCA",
      japience_kanji: "INSERT_JAP_KANJI",
      grammar_levels: "INSERT_GRAMMAR_LEVEL",
      grammar_lessons: "INSERT_GRAMMAR_LESSON",
      grammar_entries: "INSERT_GRAMMAR_ENTRY",
      dictionary: "INSERT_DICTIONARY",
      general_kanji: "INSERT_GENERAL_KANJI",
    };
    const key = mutMap[table];
    if (!key) return { data: null, errors: [{ message: `Unknown table: ${table}` }] };
    return fetchGraphQL(MUTATIONS[key], key.replace("INSERT_", "Insert"), { obj });
  },

  /** Update a row by primary key. Returns { data, errors } */
  async updateRow(table, pk, setFields) {
    const mutMap = {
      my_vocabulary: { key: "UPDATE_MY_VOCA", pkName: "id" },
      japience_voca: { key: "UPDATE_JAP_VOCA", pkName: "id" },
      japience_kanji: { key: "UPDATE_JAP_KANJI", pkName: "id" },
      grammar_levels: { key: "UPDATE_GRAMMAR_LEVEL", pkName: "id" },
      grammar_lessons: { key: "UPDATE_GRAMMAR_LESSON", pkName: "id" },
      grammar_entries: { key: "UPDATE_GRAMMAR_ENTRY", pkName: "id" },
      dictionary: { key: "UPDATE_DICTIONARY", pkName: "word" },
      general_kanji: { key: "UPDATE_GENERAL_KANJI", pkName: "kanji" },
    };
    const cfg = mutMap[table];
    if (!cfg) return { data: null, errors: [{ message: `Unknown table: ${table}` }] };
    return fetchGraphQL(MUTATIONS[cfg.key], cfg.key.replace("UPDATE_", "Update"), {
      [cfg.pkName]: pk,
      set: setFields,
    });
  },

  /** Bulk insert rows. Returns { data, errors } */
  async bulkInsertMyVoca(objects) {
    return fetchGraphQL(MUTATIONS.BULK_INSERT_MY_VOCA, "BulkInsertMyVoca", { objects });
  },

  async bulkInsertRadicals(objects) {
    return fetchGraphQL(MUTATIONS.BULK_INSERT_RADICALS, "BulkInsertRadicals", { objects });
  },

  /** Delete a row by primary key. Returns { data, errors } */
  async deleteRow(table, pk) {
    const mutMap = {
      my_vocabulary: { key: "DELETE_MY_VOCA", pkName: "id" },
      japience_voca: { key: "DELETE_JAP_VOCA", pkName: "id" },
      japience_kanji: { key: "DELETE_JAP_KANJI", pkName: "id" },
      grammar_levels: { key: "DELETE_GRAMMAR_LEVEL", pkName: "id" },
      grammar_lessons: { key: "DELETE_GRAMMAR_LESSON", pkName: "id" },
      grammar_entries: { key: "DELETE_GRAMMAR_ENTRY", pkName: "id" },
      dictionary: { key: "DELETE_DICTIONARY", pkName: "word" },
      general_kanji: { key: "DELETE_GENERAL_KANJI", pkName: "kanji" },
    };
    const cfg = mutMap[table];
    if (!cfg) return { data: null, errors: [{ message: `Unknown table: ${table}` }] };
    return fetchGraphQL(MUTATIONS[cfg.key], cfg.key.replace("DELETE_", "Delete"), {
      [cfg.pkName]: pk,
    });
  },
};
