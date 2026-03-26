import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Volume2,
  X,
  Star,
  ChevronRight,
  BookOpen,
  Sparkles,
  Pencil,
  Plus,
  Trash2,
  PenTool,
  Brain,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useBookmarkStore } from "../store/useBookmarkStore";
import { nhostService } from "../services/nhostService";
import { CrudModal } from "../components/ui/CrudModal";
import { KanjiWriter } from "../components/ui/KanjiWriter";
import { KanjiWriterModal } from "../components/ui/KanjiWriterModal";
import { useUserStore } from "../store/useUserStore";

import { tts } from "../utils/tts";

const LEVEL_LABELS = { n5: "N5", n4: "N4", n3: "N3", n2: "N2", n1: "N1" };
const LEVEL_COLORS = { n5: "#58CC02", n4: "#FF9600", n3: "#FF4B4B", n2: "#A342FF", n1: "#37464F" };
const JA_LEVELS = ["n5", "n4", "n3", "n2", "n1"];

const levelTag = lv => {
  const code = (lv || "n5").toLowerCase();
  return (
    <span
      className="text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-wider"
      style={{ backgroundColor: LEVEL_COLORS[code] || "#94a3b8" }}
    >
      {LEVEL_LABELS[code] || code.toUpperCase()}
    </span>
  );
};

// ─── English dictionary ───────────────────────────────────────────────
const EnglishSearch = ({
  addBookmark,
  removeBookmark,
  isBookmarked,
  openCrud,
  vocaFields,
  dictFields,
  refreshKey,
  srsData,
  updateSrsItem,
}) => {
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem("en_search_term") || "");
  useEffect(() => {
    sessionStorage.setItem("en_search_term", searchTerm);
  }, [searchTerm]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await nhostService.searchDictionary(searchTerm);
        setResults(data);
      } catch (err) {
        console.error("Nhost search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const playAudio = (word, type = "us") => {
    tts.speak(word, { lang: type === "us" ? "en-US" : "en-GB" });
  };

  const handleBookmark = item => {
    const data = {
      word: item.word,
      reading: item.p || "",
      meaning: item.m_vi?.join(", ") || "",
      deck: "dictionary",
    };
    isBookmarked(item.word) ? removeBookmark(item.word) : addBookmark(data);
  };

  return (
    <div className="space-y-4">
      <div className="relative group">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1CB0F6] transition-colors"
          size={18}
        />
        <input
          type="text"
          placeholder="Nhập từ tiếng Anh..."
          className="w-full pl-11 pr-10 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-base font-medium focus:border-[#1CB0F6] focus:ring-4 focus:ring-[#1CB0F6]/10 outline-none transition-all dark:text-white dark:placeholder:text-slate-500"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              setResults([]);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <X size={16} className="text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        {results.map((item, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedWord(item)}
            className="w-full text-left px-4 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 rounded-xl flex items-center justify-between hover:border-[#1CB0F6]/40 hover:bg-sky-50/30 dark:hover:bg-sky-500/5 transition-all group shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-800 dark:text-slate-100 text-lg truncate">
                      {item.word}
                    </span>
                    {item.p && <span className="text-xs text-[#1CB0F6] font-bold">{item.p}</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 truncate">
                    {item.m_en?.[0] || item.m_vi?.[0] || ""}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {item.m_vi?.[0] ? item.m_vi?.[0] : ""}
                  </p>
                  {item.s?.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1 italic truncate">
                      Ví dụ: {item.s[0]}
                    </p>
                  )}
                </div>
              </div>
              {item.synonyms && item.synonyms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.synonyms.slice(0, 4).map((syn, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-full"
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <ChevronRight
              className="text-slate-200 group-hover:text-[#1CB0F6] transition-colors"
              size={18}
            />
          </motion.button>
        ))}
      </div>

      {!loading && searchTerm.length >= 2 && results.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">🔍</div>
          <p className="text-slate-400 font-bold">Không tìm thấy "{searchTerm}"</p>
        </div>
      )}
      {searchTerm.length < 2 && (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">📖</div>
          <p className="text-slate-400 font-bold">Nhập ít nhất 2 ký tự</p>
          <p className="text-slate-300 text-sm">Hỗ trợ tra từ Anh → Việt</p>
        </div>
      )}

      {/* English Detail Modal */}
      <AnimatePresence>
        {selectedWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm"
            onClick={() => setSelectedWord(null)}
          >
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              className="bg-white dark:bg-slate-900 w-full md:max-w-lg md:rounded-3xl rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto shadow-2xl"
              onClick={e => {
                e.stopPropagation();
              }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white">
                    {selectedWord.word}
                  </h2>
                  {selectedWord.p && (
                    <p className="text-[#1CB0F6] font-bold text-lg">{selectedWord.p}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => playAudio(selectedWord.word, "us")}
                    className="p-3 bg-blue-50 dark:bg-sky-500/10 rounded-2xl text-[#1CB0F6] hover:bg-blue-100 dark:hover:bg-sky-500/20 transition-all flex flex-col items-center border-b-2 border-blue-200 dark:border-sky-500/30 active:border-b-0 active:translate-y-0.5"
                  >
                    <Volume2 size={24} strokeWidth={2.5} />
                    <span className="text-[10px] font-black">US</span>
                  </button>
                  <button
                    onClick={() => playAudio(selectedWord.word, "uk")}
                    className="p-3 bg-green-50 dark:bg-emerald-500/10 rounded-2xl text-[#58CC02] hover:bg-green-100 dark:hover:bg-emerald-500/20 transition-all flex flex-col items-center border-b-2 border-green-200 dark:border-emerald-500/30 active:border-b-0 active:translate-y-0.5"
                  >
                    <Volume2 size={24} strokeWidth={2.5} />
                    <span className="text-[10px] font-black">UK</span>
                  </button>
                  {openCrud && (
                    <button
                      onClick={() => {
                        setSelectedWord(null);
                        openCrud("dictionary", "edit", dictFields, "Sửa từ điển EN", {
                          word: selectedWord.word,
                          phonetic: selectedWord.p || "",
                          meanings_vi: (selectedWord.m_vi || []).join(" | "),
                          meanings_en: (selectedWord.m_en || []).join(" | "),
                          examples: Array.isArray(selectedWord.s)
                            ? // if example entries are objects with `se`/`sv`, join english parts
                              selectedWord.s
                                .map(x => (typeof x === "string" ? x : x.se || ""))
                                .join(" | ")
                            : "",
                          synonyms: (selectedWord.synonyms || []).join(" | "),
                        });
                      }}
                      className="p-2.5 bg-sky-50 dark:bg-sky-500/10 rounded-xl text-[#1CB0F6] hover:bg-sky-100 transition-all flex items-center"
                      title="Sửa"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleBookmark(selectedWord)}
                    className={`p-2.5 rounded-xl transition-all ${isBookmarked(selectedWord.word) ? "text-[#FFC800] bg-[#FFF8D9] dark:bg-[#FFC800]/10" : "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 hover:text-[#FFC800] border border-transparent dark:border-slate-700"}`}
                  >
                    <Star size={20} fill={isBookmarked(selectedWord.word) ? "#FFC800" : "none"} />
                  </button>
                  <button
                    onClick={(e) => {
                       e.stopPropagation();
                       const wordId = selectedWord.word;
                       const isInSrs = srsData[wordId];
                       updateSrsItem(
                         wordId,
                         {
                           word: selectedWord.word,
                           reading: selectedWord.p || "",
                           meaning: selectedWord.m_vi?.[0] || selectedWord.m_en?.[0] || "",
                           type: "voca",
                           deck: "Từ điển Anh-Việt",
                           level: "ENG",
                         },
                         isInSrs ? 3 : 2, 
                         { source: "search", deckName: "Từ điển Anh-Việt" }
                       );
                    }}
                    className={`p-2.5 rounded-xl transition-all border-b-2 active:border-b-0 active:translate-y-0.5 ${srsData[selectedWord.word] ? "bg-orange-500 text-white border-orange-700 shadow-orange-200" : "bg-orange-50 dark:bg-orange-500/10 text-orange-500 border-orange-200 hover:bg-orange-100"}`}
                    title="Thêm vào SRS (Ôn tập)"
                  >
                    <Brain size={20} />
                  </button>
                  <button
                    onClick={() => setSelectedWord(null)}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 border border-transparent dark:border-slate-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="space-y-6">
                {selectedWord.m_vi?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest text-[10px] mb-3">
                      Nghĩa tiếng Việt
                    </h4>
                    <ul className="space-y-2">
                      {selectedWord.m_vi.map((m, i) => (
                        <li
                          key={i}
                          className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex gap-3 text-slate-700 dark:text-slate-200 font-bold border border-transparent dark:border-slate-700/50"
                        >
                          <span className="text-[#1CB0F6]">●</span> {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedWord.m_en?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest text-[10px] mb-3">
                      Nghĩa tiếng Anh
                    </h4>
                    <ul className="space-y-2">
                      {selectedWord.m_en.map((m, i) => (
                        <li
                          key={i}
                          className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex gap-3 text-slate-700 dark:text-slate-200 font-bold border border-transparent dark:border-slate-700/50"
                        >
                          <span className="text-[#1CB0F6]">●</span> {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedWord.synonyms?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest text-[10px] mb-3">
                      Từ đồng nghĩa
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedWord.synonyms.map((syn, i) => (
                        <span
                          key={i}
                          className="text-sm font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedWord.s?.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest text-[10px] mb-3">
                      Ví dụ
                    </h4>
                    <div className="space-y-3">
                      {selectedWord.s.map((ex, i) => {
                        if (typeof ex === "string") {
                          return (
                            <div
                              key={i}
                              className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700"
                            >
                              <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 leading-relaxed">
                                "{ex}"
                              </p>
                            </div>
                          );
                        }
                        // assume object with `se` (sentence english) and optional `sv` (viet)
                        return (
                          <div
                            key={i}
                            className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700"
                          >
                            <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 leading-relaxed">
                              "{ex.se || ex.en || ""}"
                            </p>
                            {(ex.sv || ex.vi || ex.vn) && (
                              <p className="text-sm text-slate-400 font-medium italic">
                                {ex.sv || ex.vi || ex.vn}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Japanese Search (Merged with Kanji) ─────────────────────────────
const JapaneseSearch = ({
  addBookmark,
  removeBookmark,
  isBookmarked,
  openCrud,
  vocaFields,
  dictFields,
  refreshKey,
  openWriting,
  srsData,
  updateSrsItem,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem("ja_search_term") || "");
  useEffect(() => {
    sessionStorage.setItem("ja_search_term", searchTerm);
  }, [searchTerm]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);

  const searchJapanese = useCallback(async term => {
    if (term.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const [voca, kanji] = await Promise.all([
        nhostService.searchJapanese(term),
        nhostService.searchGeneralKanji(term),
      ]);
      const merged = [
        ...kanji.map(k => ({
          ...k,
          type: "kanji",
          word: k.kanji,
          reading: k.han_viet,
          furigana: k.han_viet,
          meaning_vi: k.meanings,
        })),
        ...voca.map(v => ({ ...v, type: v.type || "word" })),
      ].sort((a, b) => {
        if (a.word === term && b.word !== term) return -1;
        if (b.word === term && a.word !== term) return 1;
        return 0;
      });
      setResults(merged);
    } catch (err) {
      console.error("Search Japanese failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => searchJapanese(searchTerm), 350);
    return () => clearTimeout(handler);
  }, [searchTerm, searchJapanese]);

  const handleBookmark = item => {
    const data = {
      word: item.word,
      reading: item.reading || item.furigana || "",
      meaning: item.meaning_vi || item.meaning || "",
      deck: item.type === "kanji" ? "kanji" : (item.level ? `ja-${item.level}` : "dict_ja"),
    };
    isBookmarked(item.word) ? removeBookmark(item.word) : addBookmark(data);
  };

  return (
    <div className="space-y-4">
      <div className="relative group">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF4B4B] transition-colors"
          size={18}
        />
        <input
          type="text"
          placeholder="Hán tự, Hiragana, romaji hoặc nghĩa Việt..."
          className="w-full pl-11 pr-10 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-base font-medium focus:border-[#FF4B4B] focus:ring-4 focus:ring-[#FF4B4B]/10 outline-none transition-all dark:text-white dark:placeholder:text-slate-500"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              setResults([]);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <X size={16} className="text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        {results.map((item, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setSelectedWord(item)}
            className="w-full text-left px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 rounded-xl flex items-center justify-between hover:border-[#FF4B4B]/40 transition-all group shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-black tracking-tighter break-all ${
                    item.type === "kanji"
                      ? "text-[#A342FF] text-2xl"
                      : item.type === "grammar"
                        ? "text-[#FF9600] text-lg"
                        : "text-slate-800 dark:text-slate-100 text-lg"
                  }`}
                >
                  {item.word}
                </span>
                {item.type === "word" && item.reading && (
                  <span className="text-sm text-slate-400 font-bold">({item.reading})</span>
                )}
                {item.type === "word" && item.level && levelTag(item.level)}
                {item.type === "kanji" && (
                  <span className="text-[10px] font-black bg-[#A342FF] text-white px-1.5 py-0.5 rounded uppercase">
                    Kanji
                  </span>
                )}
                {item.type === "grammar" && (
                  <span className="text-[10px] font-black bg-[#FFC800] text-white px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                    <BookOpen size={10} /> Ngữ pháp
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold truncate">
                {Array.isArray(item.meaning_vi || item.meaning) 
                  ? (item.meaning_vi || item.meaning).join(", ") 
                  : (item.meaning_vi || item.meaning)}
              </p>
            </div>
            <ChevronRight
              size={18}
              className="text-slate-200 transition-colors"
              style={{
                color:
                  item.type === "kanji"
                    ? "#A342FF"
                    : item.type === "grammar"
                      ? "#FFC800"
                      : "#FF4B4B",
              }}
            />
          </motion.button>
        ))}
      </div>

      {!loading && searchTerm.length >= 1 && results.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">🔍</div>
          <p className="text-slate-400 font-bold">Không tìm thấy "{searchTerm}"</p>
        </div>
      )}
      {searchTerm.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="text-6xl">🇯🇵</div>
          <p className="text-slate-600 dark:text-slate-200 font-black text-lg">
            Từ điển Nhật-Việt & Kanji
          </p>
          <div className="flex justify-center gap-2 flex-wrap max-w-xs mx-auto">
            {JA_LEVELS.map(lv => (
              <span
                key={lv}
                className="text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase"
                style={{ backgroundColor: LEVEL_COLORS[lv] }}
              >
                {lv.toUpperCase()}
              </span>
            ))}
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-[#A342FF] uppercase">
              KANJI
            </span>
          </div>
        </div>
      )}

      {/* Japanese Detail Modal */}
      <AnimatePresence>
        {selectedWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm"
            onClick={() => setSelectedWord(null)}
          >
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              className="bg-white dark:bg-slate-900 w-full md:max-w-lg md:rounded-[40px] rounded-t-[40px] p-8 max-h-[88vh] overflow-y-auto shadow-2xl"
              onClick={e => {
                e.stopPropagation();
              }}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                  <div
                    className={`min-w-[5rem] min-h-[5rem] md:min-w-[6rem] md:min-h-[6rem] px-4 rounded-3xl flex items-center justify-center font-black shadow-xl border-4 shrink-0 ${
                      selectedWord.type === "kanji"
                        ? "bg-purple-50 text-[#A342FF] border-purple-100"
                        : "bg-red-50 text-[#FF4B4B] border-red-50"
                    }`}
                  >
                    <span className={`text-center break-words ${
                      selectedWord.word?.length > 10 
                        ? "text-lg py-2" 
                        : selectedWord.word?.length > 4 
                          ? "text-2xl py-2" 
                          : selectedWord.type === "kanji" 
                            ? "text-6xl" 
                            : "text-5xl"
                    }`}>
                      {selectedWord.word}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center text-center md:text-left">
                    <h2
                      className={`text-2xl font-black uppercase tracking-tight ${selectedWord.type === "kanji" ? "text-slate-800 dark:text-white" : "text-[#FF4B4B]"}`}
                    >
                      {selectedWord.type === "kanji" ? selectedWord.reading : selectedWord.word}
                    </h2>
                    {selectedWord.type === "word" && selectedWord.reading && (
                      <p className="text-lg font-bold text-slate-400">{selectedWord.reading}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {selectedWord.level && levelTag(selectedWord.level)}
                      {selectedWord.type === "kanji" && selectedWord.strokes && (
                        <span className="text-xs font-black bg-[#A342FF] text-white px-2 py-0.5 rounded-md uppercase tracking-widest">
                          {selectedWord.strokes} nét
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {selectedWord.source === "personal" && openCrud && (
                    <button
                      onClick={() => {
                        setSelectedWord(null);
                        openCrud("my_vocabulary", "edit", vocaFields, "Sửa từ vựng", {
                          id: selectedWord.id,
                          word: selectedWord.word,
                          type: selectedWord.type || "voca",
                          furigana: selectedWord.reading || selectedWord.furigana || "",
                          meaning: selectedWord.meaning_vi || "",
                          han_viet: selectedWord.hanViet || selectedWord.han_viet || "",
                          onyomi: selectedWord.onyomi || "",
                          kunyomi: selectedWord.kunyomi || "",
                          example_jp: selectedWord.example || selectedWord.example_jp || "",
                          example_vi: selectedWord.example_meaning || selectedWord.example_vi || "",
                          mnemonic: selectedWord.mnemonic || "",
                          level: selectedWord.level || "",
                        });
                      }}
                      className="p-2.5 bg-sky-50 dark:bg-sky-500/10 rounded-2xl text-[#1CB0F6] hover:bg-sky-100 transition-all"
                      title="Sửa"
                    >
                      <Pencil size={24} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const text = selectedWord.type === "kanji" ? selectedWord.word : (selectedWord.word + " " + (selectedWord.reading || ""));
                      tts.speak(text, { lang: "ja-JP" });
                    }}
                    onMouseEnter={() => {
                      const text = selectedWord.type === "kanji" ? selectedWord.word : (selectedWord.word + " " + (selectedWord.reading || ""));
                      tts.speak(text, { lang: "ja-JP" });
                    }}
                    className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-500 hover:bg-blue-100 transition-all"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={24} />
                  </button>
                  <button
                    onClick={() => handleBookmark(selectedWord)}
                    className={`p-2.5 rounded-2xl transition-all shadow-sm ${isBookmarked(selectedWord.word) ? "text-[#FFC800] bg-[#FFF8D9]" : "text-slate-300 bg-slate-50 dark:bg-slate-800 hover:text-[#FFC800]"}`}
                  >
                    <Star size={24} fill={isBookmarked(selectedWord.word) ? "#FFC800" : "none"} />
                  </button>
                  {selectedWord.type === "kanji" && selectedWord.word?.length === 1 && (
                    <button
                      onClick={() =>
                        openWriting(
                          selectedWord.word,
                          selectedWord.meaning_vi || selectedWord.meaning
                        )
                      }
                      className="p-2.5 rounded-2xl text-white bg-[#A342FF] hover:bg-[#8B2BE2] transition-all shadow-sm"
                      title="Luyện viết"
                    >
                      <PenTool size={24} />
                    </button>
                  )}
                  {/* SRS Brain Button - single working version */}
                  <button
                    onClick={(e) => {
                       e.stopPropagation();
                       const wordId = selectedWord.word;
                       const isInSrs = !!srsData[wordId];
                       updateSrsItem(
                         wordId,
                         {
                           word: selectedWord.word,
                           reading: selectedWord.reading || selectedWord.furigana || "",
                           meaning: selectedWord.meaning_vi || selectedWord.meaning || "",
                           type: selectedWord.type || "voca",
                           deck: selectedWord.type === "kanji" ? "Từ điển Kanji" : "Từ điển Nhật",
                           level: selectedWord.level || "JA",
                         },
                         isInSrs ? 3 : 2, 
                         { source: "search", deckName: selectedWord.type === "kanji" ? "Từ điển Kanji" : "Từ điển Nhật" }
                       );
                    }}
                    className={`p-2.5 rounded-2xl transition-all border-b-2 active:border-b-0 active:translate-y-0.5 ${srsData[selectedWord.word] ? "bg-orange-500 text-white border-orange-700" : "bg-orange-50 dark:bg-orange-500/10 text-orange-500 border-orange-200 hover:bg-orange-100"}`}
                    title={srsData[selectedWord.word] ? "Đã thêm vào SRS ✓" : "Thêm vào SRS (Ôn tập)"}
                  >
                    <Brain size={24} />
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {selectedWord.meaning_vi && (
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-slate-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                      Ý nghĩa bản tiếng Việt
                    </h4>
                    <p className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                      {selectedWord.meaning_vi}
                    </p>
                  </div>
                )}

                {selectedWord.type === "kanji" && selectedWord.word?.length === 1 && (
                  <div className="flex justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] border-2 border-slate-100 dark:border-slate-800">
                    <KanjiWriter kanji={selectedWord.word} size={200} simple={true} />
                  </div>
                )}

                {selectedWord.type === "kanji" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">
                        Onyomi
                      </h4>
                      <p className="font-black text-slate-800 dark:text-slate-200">
                        {selectedWord.onyomi || "---"}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">
                        Kunyomi
                      </h4>
                      <p className="font-black text-slate-800 dark:text-slate-200">
                        {selectedWord.kunyomi || "---"}
                      </p>
                    </div>
                  </div>
                )}

                {selectedWord.mnemonic && (
                  <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[32px] border-2 border-amber-100 dark:border-amber-900/20">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase mb-2">
                      Mẹo nhớ Trí Tuệ
                    </h4>
                    <p className="text-slate-700 dark:text-slate-200 font-bold italic">
                      "{selectedWord.mnemonic}"
                    </p>
                  </div>
                )}

                {selectedWord.type === "grammar" && (
                  <div className="space-y-6">
                    <div className="p-6 bg-[#DDF4FF]/40 dark:bg-sky-900/10 rounded-[32px] border-2 border-[#84D8FF]/30">
                      <h4 className="text-[10px] font-black text-[#1899D6] uppercase mb-2 tracking-widest">
                        Cấu trúc
                      </h4>
                      <p className="text-xl font-black text-[#1899D6] dark:text-sky-400 tracking-tight">
                        {selectedWord.structure}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/grammar/lesson/${selectedWord.lesson_id}`)}
                      className="w-full py-4 bg-[#58CC02] text-white rounded-2xl font-black text-sm shadow-lg shadow-green-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <BookOpen size={18} /> XEM TRỌN BỘ BÀI HỌC
                    </button>

                    {selectedWord.examples && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase ml-4">
                          Ví dụ
                        </h4>
                        {(() => {
                          let examples = [];
                          try {
                            examples =
                              typeof selectedWord.examples === "string"
                                ? JSON.parse(selectedWord.examples)
                                : selectedWord.examples;
                          } catch (e) {
                            // ignore parse error
                          }
                          return (
                            Array.isArray(examples) &&
                            examples.map((ex, i) => {
                              const jpText = ex.e || ex.example || ex.jp || ex.ja || "";
                              return (
                                <div
                                  key={i}
                                  className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-bold text-slate-800 dark:text-white mb-1 leading-relaxed flex-1">
                                      {jpText}
                                    </p>
                                    {jpText && (
                                      <button
                                        onClick={() => {
                                          if (!window.speechSynthesis) return;
                                          window.speechSynthesis.cancel();
                                          const u = new SpeechSynthesisUtterance(jpText);
                                          u.lang = "ja-JP";
                                          u.rate = 0.9;
                                          window.speechSynthesis.speak(u);
                                        }}
                                        className="shrink-0 p-2.5 rounded-xl text-[#FF4B4B] bg-red-50 dark:bg-red-500/10 hover:bg-red-100 transition-all border-b-2 border-red-200 active:border-b-0 active:translate-y-0.5"
                                        title="Nghe phát âm"
                                      >
                                        <Volume2 size={18} strokeWidth={2.5} />
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 font-bold">
                                    {ex.v || ex.meaning || ex.vi || ""}
                                  </p>
                                </div>
                              );
                            })
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {selectedWord.type === "word" && selectedWord.example && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 ml-4">
                      Câu ví dụ điển hình
                    </h4>
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-700">
                      <p className="text-lg font-black text-slate-800 dark:text-white mb-2 leading-relaxed">
                        {selectedWord.example}
                      </p>
                      <p className="text-sm text-slate-400 font-bold">
                        — {selectedWord.example_meaning}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DictionaryScreen = () => {
  const [tab, setTab] = useState(() => sessionStorage.getItem("dict_tab") || "ja");

  useEffect(() => {
    sessionStorage.setItem("dict_tab", tab);
  }, [tab]);
  const { bookmarks, addBookmark, removeBookmark } = useBookmarkStore();
  const updateSrsItem = useUserStore(s => s.updateSrsItem);
  const srsData = useUserStore(s => s.account?.srsData || {});
  const isBookmarked = word => bookmarks.some(b => b.word === word);

  // CRUD state
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudMode, setCrudMode] = useState("create");
  const [crudTable, setCrudTable] = useState("my_vocabulary");
  const [crudItem, setCrudItem] = useState(null);
  const [crudSaving, setCrudSaving] = useState(false);
  const [crudFields, setCrudFields] = useState([]);
  const [crudTitle, setCrudTitle] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  // Writing modal state
  const [writingOpen, setWritingOpen] = useState(false);
  const [writingKanji, setWritingKanji] = useState(null);

  const vocaFields = [
    { key: "word", label: "Từ vựng / Hán tự", required: true, placeholder: "食べる" },
    {
      key: "type",
      label: "Loại học liệu",
      type: "select",
      options: [
        { value: "voca", label: "Từ vựng" },
        { value: "kanji", label: "Hán tự" },
      ],
    },
    { key: "furigana", label: "Furigana", placeholder: "たべる" },
    { key: "meaning", label: "Nghĩa", required: true, placeholder: "Ăn" },
    { key: "han_viet", label: "Hán Việt", placeholder: "Thực" },
    { key: "onyomi", label: "Onyomi", placeholder: "ショク (Dành cho Kanji)" },
    { key: "kunyomi", label: "Kunyomi", placeholder: "た.べる (Dành cho Kanji)" },
    { key: "example_jp", label: "Ví dụ (JP)", type: "textarea", placeholder: "" },
    { key: "example_vi", label: "Ví dụ (VI)", type: "textarea", placeholder: "" },
    {
      key: "mnemonic",
      label: "Mẹo nhớ (Mnemonic)",
      type: "textarea",
      placeholder: "Câu chuyện để nhớ từ này...",
    },
    { key: "level", label: "Level", placeholder: "N3" },
  ];

  const dictFields = [
    { key: "word", label: "Từ vựng (English)", required: true, placeholder: "example" },
    { key: "phonetic", label: "Phiên âm", placeholder: "/ɪɡˈzæm.pəl/" },
    {
      key: "meanings_en",
      label: "Nghĩa (EN)",
      type: "textarea",
      placeholder: "a thing that serves as a model",
    },
    { key: "meanings_vi", label: "Nghĩa (VI)", type: "textarea", placeholder: "ví dụ | thí dụ" },
    {
      key: "examples",
      label: "Ví dụ (examples)",
      type: "tags",
      placeholder: "Ví dụ: nhập enter để thêm",
    },
    {
      key: "synonyms",
      label: "Từ đồng nghĩa",
      type: "tags",
      placeholder: "Từ đồng nghĩa: nhập enter để thêm",
    },
  ];

  const openCrud = (table, mode, fields, title, item = {}) => {
    setCrudTable(table);
    setCrudMode(mode);
    setCrudFields(fields);
    setCrudTitle(title);
    setCrudItem(item);
    setCrudOpen(true);
  };

  const handleCrudSave = async formData => {
    setCrudSaving(true);
    try {
      function parsePossibleArray(val) {
        if (val == null) return null;
        if (Array.isArray(val)) return val;
        const s = String(val).trim();
        if (!s) return [];
        if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
          try {
            return JSON.parse(s);
          } catch (e) {
            /* continue */
          }
        }
        if (s.includes("|"))
          return s
            .split("|")
            .map(x => x.trim())
            .filter(Boolean);
        if (s.includes(","))
          return s
            .split(",")
            .map(x => x.trim())
            .filter(Boolean);
        return [s];
      }

      if (crudMode === "create") {
        const obj = { ...formData };
        if (crudTable === "dictionary") {
          if (obj.meanings_en !== undefined) obj.meanings_en = parsePossibleArray(obj.meanings_en);
          if (obj.meanings_vi !== undefined) obj.meanings_vi = parsePossibleArray(obj.meanings_vi);
          if (obj.examples !== undefined) obj.examples = parsePossibleArray(obj.examples);
          if (obj.synonyms !== undefined) obj.synonyms = parsePossibleArray(obj.synonyms);
        }
        if (crudTable === "my_vocabulary" && !obj.id) {
          obj.id = `dict_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
        const { errors } = await nhostService.createRow(crudTable, obj);
        if (errors?.length) throw new Error(errors[0].message);
      } else {
        const pk = crudTable === "dictionary" ? crudItem.word : crudItem.id;
        const { id, ...setFields } = formData;
        if (crudTable === "dictionary") {
          if (setFields.meanings_en !== undefined)
            setFields.meanings_en = parsePossibleArray(setFields.meanings_en);
          if (setFields.meanings_vi !== undefined)
            setFields.meanings_vi = parsePossibleArray(setFields.meanings_vi);
          if (setFields.examples !== undefined)
            setFields.examples = parsePossibleArray(setFields.examples);
          if (setFields.synonyms !== undefined)
            setFields.synonyms = parsePossibleArray(setFields.synonyms);
        }
        const { errors } = await nhostService.updateRow(crudTable, pk, setFields);
        if (errors?.length) throw new Error(errors[0].message);
      }
      setCrudOpen(false);
      setRefreshKey(k => k + 1);
    } finally {
      setCrudSaving(false);
    }
  };

  const handleCrudDelete = async () => {
    setCrudSaving(true);
    try {
      const pk = crudTable === "dictionary" ? crudItem.word : crudItem.id;
      const { errors } = await nhostService.deleteRow(crudTable, pk);
      if (errors?.length) throw new Error(errors[0].message);
      setCrudOpen(false);
      setRefreshKey(k => k + 1);
    } finally {
      setCrudSaving(false);
    }
  };

  const sharedProps = {
    addBookmark,
    removeBookmark,
    isBookmarked,
    openCrud,
    vocaFields,
    dictFields,
    refreshKey,
    srsData,
    updateSrsItem,
    openWriting: (kanji, meaning) => {
      setWritingKanji({ word: kanji, meaning });
      setWritingOpen(true);
    },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 shadow-sm flex-1">
          <button
            onClick={() => setTab("ja")}
            className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${tab === "ja" ? "bg-white dark:bg-slate-700 text-[#FF4B4B] shadow-md" : "text-slate-400"}`}
          >
            🇯🇵 NHẬT - VIỆT
          </button>
          <button
            onClick={() => setTab("en")}
            className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${tab === "en" ? "bg-white dark:bg-slate-700 text-[#1CB0F6] shadow-md" : "text-slate-400"}`}
          >
            🇬🇧 ANH - VIỆT
          </button>
        </div>
        <button
          onClick={() =>
            tab === "ja"
              ? openCrud("my_vocabulary", "create", vocaFields, "Thêm từ vựng JP")
              : openCrud("dictionary", "create", dictFields, "Thêm từ điển EN")
          }
          className="flex items-center gap-2 px-4 py-3 bg-[#58CC02] text-white text-sm font-black rounded-2xl hover:bg-[#46A302] transition-colors shadow-lg shadow-green-200/30 shrink-0"
        >
          <Plus size={16} />
        </button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab + refreshKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "ja" ? <JapaneseSearch {...sharedProps} /> : <EnglishSearch {...sharedProps} />}
        </motion.div>
      </AnimatePresence>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        mode={crudMode}
        title={crudTitle}
        fields={crudFields}
        initialData={crudItem || {}}
        onSave={handleCrudSave}
        onDelete={crudMode === "edit" ? handleCrudDelete : null}
        saving={crudSaving}
      />

      <KanjiWriterModal
        open={writingOpen}
        onClose={() => setWritingOpen(false)}
        kanji={writingKanji?.word}
        meaning={writingKanji?.meaning}
      />
    </div>
  );
};
