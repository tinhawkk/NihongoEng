import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { loadDeck } from "../api/loader";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Star,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  X,
  Book,
  Volume2,
  PenTool,
  Code,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Keyboard,
  GraduationCap,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { CrudModal } from "../components/ui/CrudModal";
import { ExcelImportModal } from "../components/ui/ExcelImportModal";
import { useBookmarkStore } from "../store/useBookmarkStore";
import { useUserStore } from "../store/useUserStore";
import { useToastStore } from "../store/useToastStore";
import { nhostService } from "../services/nhostService";
import { tts } from "../utils/tts";
import { KanjiWriter } from "../components/ui/KanjiWriter";
import { KanjiWriterModal } from "../components/ui/KanjiWriterModal";

const DECK_LABELS = {
  eng: "Tiếng Anh 600",
  n5: "JLPT N5",
  n4: "JLPT N4",
  n3: "JLPT N3",
  n2: "JLPT N2",
  n1: "JLPT N1",
  jlpt: "JLPT Tổng hợp",
  grammar: "Ngữ pháp",
  it: "IT Passport",
  "it-strategy": "IT Strategy",
  "it-management": "IT Management",
  "it-technology": "IT Technology",
};

const DECK_COLORS = {
  eng: "#CE82FF",
  n5: "#58CC02",
  n4: "#FF9600",
  n3: "#FF4B4B",
  n2: "#A342FF",
  n1: "#37464F",
  jlpt: "#CE82FF",
  grammar: "#FFC800",
  it: "#6366f1",
};

const parseRelatedVoca = (relatedVoca) => {
  if (!relatedVoca) return [];
  if (typeof relatedVoca === 'string') {
    try {
      return JSON.parse(relatedVoca);
    } catch {
      return [];
    }
  }
  return relatedVoca;
};

export const DeckPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const currentPage = parseInt(searchParams.get("p")) || 1;
  const search = searchParams.get("q") || "";
  const filterType = searchParams.get("filter") || "all";

  const setCurrentPage = (val) => {
    const next = new URLSearchParams(searchParams);
    next.set("p", typeof val === 'function' ? val(currentPage) : val);
    setSearchParams(next, { replace: true });
  };

  const setSearch = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set("q", val);
    else next.delete("q");
    next.delete("p"); // Reset page when searching
    setSearchParams(next, { replace: true });
  };

  const setFilterType = (val) => {
    const next = new URLSearchParams(searchParams);
    next.set("filter", val);
    next.delete("p"); // Reset page when filtering
    setSearchParams(next, { replace: true });
  };

  const ITEMS_PER_PAGE = 50;

  // Detect if this is a UUID (Nhost deck) - Define early to avoid ReferenceError
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId);

  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const bookmarks = useBookmarkStore(s => s.bookmarks);
  const addBookmark = useBookmarkStore(s => s.addBookmark);
  const removeBookmark = useBookmarkStore(s => s.removeBookmark);
  const vocaSource = useUserStore(s => s.vocaSource);
  const account = useUserStore(s => s.account);
  const flashcardProgress = useUserStore(s => s.account?.flashcardProgress?.[deckId]);
  const srsData = useUserStore(s => s.account?.srsData);
  const updateSrsItem = useUserStore(s => s.updateSrsItem);
  const deckUpper = deckId?.toUpperCase();

  const addToast = useToastStore(s => s.addToast);
  const [deckMetadata, setDeckMetadata] = useState(null);

  // CRUD state
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudMode, setCrudMode] = useState("create");
  const [crudItem, setCrudItem] = useState(null);
  const [crudSaving, setCrudSaving] = useState(false);
  // Excel import state
  const [excelOpen, setExcelOpen] = useState(false);
  // JSON import state
  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonPreview, setJsonPreview] = useState({ count: 0, valid: false, error: "" });
  const [jsonImporting, setJsonImporting] = useState(false);
  // Writing modal state
  const [writingOpen, setWritingOpen] = useState(false);
  const [writingKanji, setWritingKanji] = useState(null);

  // Determine if this deck is from Nhost (CRUD-capable)
  const isNhostDeck =
    isUUID ||
    /^n[1-5]$/i.test(deckId) ||
    ["IT", "ENG"].includes(deckId.toUpperCase()) ||
    deckId.toLowerCase().includes("it-");
  const isAdvancedMode = vocaSource === "voca";
  const canCrud = isNhostDeck && isAdvancedMode;

  // Helper for generating UUID v4
  const generateUUID = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const vocaFields = [
    { key: "word", label: "Từ vựng / Hán tự", placeholder: "例: 食べる / 日" },
    { key: "furigana", label: "Furigana / Reading", placeholder: "たべる (hoặc để trống nếu là Kanji đơn)" },
    { key: "meaning", label: "Nghĩa", placeholder: "Ăn / Ngày" },
    { key: "han_viet", label: "Hán Việt", placeholder: "Thực / Nhật" },
    { key: "onyomi", label: "Onyomi", placeholder: "ショK, ニチ (Âm Ôn)" },
    { key: "kunyomi", label: "Kunyomi", placeholder: "た.べる, ひ (Âm Cún)" },
    { key: "romaji", label: "Romaji", placeholder: "taberu" },
    { key: "example_jp", label: "Ví dụ (JP)", type: "textarea", placeholder: "毎日ご飯を食べます" },
    {
      key: "example_vi",
      label: "Ví dụ (VI)",
      type: "textarea",
      placeholder: "Mỗi ngày tôi ăn cơm",
    },
    {
      key: "mnemonic",
      label: "Mẹo nhớ (Mnemonic)",
      type: "textarea",
      placeholder: "Câu chuyện để nhớ từ này...",
    },
    {
      key: "radical_analysis",
      label: "Phân tích bộ thủ (Dũng Mori)",
      placeholder: "VD: Ý = Lập + Nhật + Tâm",
    },
    {
      key: "related_voca",
      label: "Từ vựng liên quan",
      type: "json-array",
      subFields: [
        { key: "w", label: "Từ vựng", placeholder: "注意" },
        { key: "r", label: "Cách đọc", placeholder: "ちゅうい" },
        { key: "m", label: "Nghĩa", placeholder: "chú ý" },
      ],
    },
    { key: "raw_json", label: "Nhập nhanh bằng JSON Array (Bỏ qua các ô trên)", type: "textarea", placeholder: "[ { \"word\": \"...\", \"meaning\": \"...\" }, ... ]" },
  ];

  const openCreate = () => {
    setCrudMode("create");
    const currentTitle = deckMetadata?.title || DECK_LABELS[deckId] || deckId;
    setCrudItem({ level: currentTitle.toUpperCase(), type: "voca" });
    setCrudOpen(true);
  };

  const openEdit = word => {
    setCrudMode("edit");
    setCrudItem({
      id: word.id,
      word: word.word,
      type: word.type || "voca",
      furigana: word.reading || "",
      meaning: word.meaning || "",
      han_viet: word.hanViet || "",
      onyomi: word.onyomi || "",
      kunyomi: word.kunyomi || "",
      romaji: word.romaji || "",
      example_jp: word.example || "",
      example_vi: word.exampleMeaning || "",
      mnemonic: word.mnemonic || "",
      radical_analysis: word.radicalAnalysis || "",
      related_voca: typeof word.relatedVoca === 'string' ? word.relatedVoca : JSON.stringify(word.relatedVoca || []),
      level: word.level || deckId.toUpperCase(),
    });
    setCrudOpen(true);
  };

  const handleCrudSave = async formData => {
    setCrudSaving(true);
    try {
      const table = "my_vocabulary";
      const currentTitle = deckMetadata?.title || DECK_LABELS[deckId] || deckId;
      const finalLevel = currentTitle.toUpperCase();

      const { raw_json, ...fields } = formData;

      if (crudMode === "create") {
         if (raw_json && raw_json.trim().startsWith("[")) {
            const parsed = JSON.parse(raw_json);
            if (Array.isArray(parsed)) {
               const bucket = parsed.map(item => ({
                  ...item,
                  id: generateUUID(),
                  level: finalLevel
               }));
               const { errors } = await nhostService.bulkInsertMyVoca(bucket);
               if (errors?.length) throw new Error(errors[0].message);
               // Refresh list after bulk
               loadDeck(deckId, source).then(setWords);
               alert(`Đã thêm thành công ${bucket.length} từ vựng!`);
            }
         } else {
            if (!fields.word?.trim() || !fields.meaning?.trim()) {
               throw new Error("Hãy nhập ít nhất 'Từ vựng' và 'Nghĩa' hoặc sử dụng ô nhập JSON.");
            }
            const obj = { 
               ...fields, 
               id: generateUUID(), 
               level: finalLevel,
               type: fields.onyomi || fields.kunyomi || fields.related_voca ? "kanji" : "voca"
            };
            const { errors } = await nhostService.createRow(table, obj);
            if (errors?.length) throw new Error(errors[0].message);
            setWords(prev => [obj, ...prev]);
            addToast("Đã thêm thành công!", "success");
         }
      } else {
        const { id, ...setFields } = fields;
        const autoType = setFields.onyomi || setFields.kunyomi || setFields.related_voca ? "kanji" : "voca";
        const finalSet = { ...setFields, type: autoType };

        const { errors } = await nhostService.updateRow(table, crudItem.id, finalSet);
        if (errors?.length) throw new Error(errors[0].message);

        setWords(prev => prev.map(w => w.id === crudItem.id ? { ...w, ...finalSet } : w));
        addToast("Đã cập nhật!", "success");
      }
      setCrudOpen(false);
    } catch (err) {
      console.error("[CRUD] Save error:", err);
      addToast("Lỗi: " + err.message, "error");
    } finally {
      setCrudSaving(false);
    }
  };

  const handleCrudDelete = async () => {
    setCrudSaving(true);
    try {
      const { errors } = await nhostService.deleteRow("my_vocabulary", crudItem.id);
      if (errors?.length) throw new Error(errors[0].message);
      setCrudOpen(false);
      setWords(prev => prev.filter(w => w.id !== crudItem.id));
    } catch (err) {
      console.error("[CRUD] Delete error:", err);
      addToast("Lỗi khi xóa từ vựng: " + err.message, "error");
    } finally {
      setCrudSaving(false);
    }
  };

  // Define isBookmarked locally so it's reactive to the bookmarks array
  const isBookmarked = word => bookmarks.some(b => b.word === word);

  // JSON Import helper functions
  const handleJsonTextChange = (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setJsonPreview({ count: 0, valid: false, error: "" });
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        setJsonPreview({ count: 0, valid: false, error: "JSON phải là một mảng (Array), bắt đầu bằng [ và kết thúc bằng ]" });
        return;
      }
      if (parsed.length === 0) {
        setJsonPreview({ count: 0, valid: false, error: "Mảng JSON rỗng, hãy thêm ít nhất 1 từ vựng" });
        return;
      }
      // Validate each item has at least 'word' and 'meaning'
      const invalid = parsed.filter((item, i) => !item.word?.trim() || !item.meaning?.trim());
      if (invalid.length > 0) {
        setJsonPreview({ count: 0, valid: false, error: `Có ${invalid.length} mục thiếu trường "word" hoặc "meaning"` });
        return;
      }
      setJsonPreview({ count: parsed.length, valid: true, error: "" });
    } catch (e) {
      setJsonPreview({ count: 0, valid: false, error: `Lỗi cú pháp JSON: ${e.message}` });
    }
  };

  const handleJsonImport = async () => {
    if (!jsonPreview.valid) return;
    setJsonImporting(true);
    try {
      const parsed = JSON.parse(jsonText.trim());
      const currentTitle = deckMetadata?.title || DECK_LABELS[deckId] || deckId;
      const finalLevel = currentTitle.toUpperCase();
      
      const bucket = parsed.map(item => ({
        ...item,
        id: generateUUID(),
        level: finalLevel,
        type: item.onyomi || item.kunyomi || item.radical_analysis ? "kanji" : "voca",
      }));
      
      const { errors } = await nhostService.bulkInsertMyVoca(bucket);
      if (errors?.length) throw new Error(errors[0].message);
      
      // Refresh word list
      const data = await loadDeck(deckId, source);
      setWords(data);
      
      setJsonImportOpen(false);
      setJsonText("");
      setJsonPreview({ count: 0, valid: false, error: "" });
      addToast(`✅ Đã thêm thành công ${bucket.length} từ vựng!`, "success");
    } catch (err) {
      console.error("[JSON Import] Error:", err);
      addToast("❌ Lỗi khi nhập JSON: " + err.message, "error");
    } finally {
      setJsonImporting(false);
    }
  };

  const isAdvancedDecks = isNhostDeck;
  const source = isAdvancedDecks ? vocaSource : "sheet";

  // Fetch Metadata for Nhost decks
  useEffect(() => {
    if (isUUID) {
      const q = `query GetDeckTitle($id: String!) {
        decks_by_pk(id: $id) {
          title
        }
      }`;
      nhostService.fetchGraphQL(q, "GetDeckTitle", { id: deckId }).then(res => {
        if (res.data?.decks_by_pk) {
          setDeckMetadata(res.data.decks_by_pk);
        }
      });
    }
  }, [deckId, isUUID]);

  const isSrsDeck = deckId === "srs";
  const srsDep = isSrsDeck ? srsData : null;

  useEffect(() => {
    setLoading(true);

    if (isSrsDeck) {
      const allItems = Object.values(srsData || {});
      // Sort by due date (nextReview) so due items appear first
      const sorted = allItems.sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
      setWords(sorted);
      setLoading(false);
      return;
    }

    loadDeck(deckId, source).then(data => {
      setWords(data);
      setLoading(false);
    });
  }, [deckId, source, isSrsDeck, srsDep]);

  const filtered = useMemo(() => {
    let result = words;

    // 1. Filter by Type
    if (filterType !== "all") {
      result = result.filter(w => {
        if (filterType === "voca") return w.type === "voca" || !w.type;
        return w.type === "kanji";
      });
    }

    // 2. Filter by Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        w =>
          w.word?.toLowerCase().includes(q) ||
          w.reading?.toLowerCase().includes(q) ||
          w.meaning?.toLowerCase().includes(q) ||
          w.hanViet?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [words, search, filterType]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Handle pagination reset
  useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
  }, [search, filterType, deckId]);

  // Defensive check for current page out of bounds (e.g. after deletion)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);
  const { totalCount, vocaCount, kanjiCount } = useMemo(() => {
    const vocaCount = words.filter(w => w.type === "voca" || !w.type).length;
    const kanjiCount = words.filter(w => w.type === "kanji").length;
    return {
      totalCount: words.length,
      vocaCount,
      kanjiCount,
    };
  }, [words]);

  const color = DECK_COLORS[deckId] || "#58CC02";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1CB0F6] rounded-full animate-spin" />
        <p className="text-slate-400 font-bold">Đang tải học liệu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-slate-400" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">
            {deckId === "srs"
              ? "Thư viện Ôn tập thông minh"
              : deckMetadata?.title || DECK_LABELS[deckId] || deckId.toUpperCase()}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-400 font-bold">
                {kanjiCount > 0 ? (
                  <>
                    <span className="text-slate-600">{vocaCount}</span> từ vựng
                    <span className="mx-1.5 text-slate-300">|</span>
                    <span className="text-slate-600">{kanjiCount}</span> hán tự
                  </>
                ) : (
                  `${totalCount} từ vựng`
                )}
              </p>
            </div>
            {deckId === "srs" && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                🧠 SRS ENABLED
              </span>
            )}
            {vocaSource === "voca" &&
              deckId !== "srs" &&
              (isUUID ||
                /^n[1-5]$/i.test(deckId) ||
                ["IT", "ENG"].includes(deckId.toUpperCase())) && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  ✨ CLOUD DATA
                </span>
              )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:flex gap-2 lg:gap-3">
        <Button
          variant="primary"
          onClick={() =>
            navigate(`/learn/${deckId}${filterType !== "all" ? "?filter=" + filterType : ""}`)
          }
          className="lg:flex-1 !bg-indigo-600 !border-indigo-700 shadow-indigo-100 py-3 lg:py-2.5"
        >
          <GraduationCap size={18} /> Học bài
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            navigate(`/quiz/${deckId}${filterType !== "all" ? "?filter=" + filterType : ""}`)
          }
          className="lg:flex-1 py-3 lg:py-2.5"
        >
          <Zap size={18} /> Quiz
        </Button>
        <div className="flex-1 flex flex-col gap-1 relative">
          <Button
            variant="secondary"
            onClick={() =>
              navigate(`/flashcards/${deckId}${filterType !== "all" ? "?filter=" + filterType : ""}`)
            }
            className="w-full h-full relative overflow-hidden group py-3 lg:py-2.5"
          >
            <div className="relative z-10 flex items-center gap-2">
              <BookOpen size={18} /> Flashcard
            </div>
            {flashcardProgress && flashcardProgress.totalCards > 0 && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-[#1CB0F6]/50 transition-all group-hover:bg-[#1CB0F6]" 
                style={{ width: `${Math.round((flashcardProgress.studied / flashcardProgress.totalCards) * 100)}%` }}
              />
            )}
          </Button>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            navigate(`/typing/${deckId}${filterType !== "all" ? "?filter=" + filterType : ""}`)
          }
          className="!bg-purple-50 !text-purple-600 hover:!bg-purple-100 !border-purple-200 dark:!bg-purple-500/10 dark:!text-purple-400 dark:!border-purple-500/30 py-3 lg:py-2.5"
        >
          <Keyboard size={18} /> Gõ
        </Button>
        
        {canCrud && (
          <Button
            variant="secondary"
            onClick={openCreate}
            className="lg:shrink-0 !bg-[#58CC02]/10 !text-[#58CC02] hover:!bg-[#58CC02]/20 !border-[#58CC02]/30 py-3 lg:py-2.5"
          >
            <Plus size={18} /> Thêm từ
          </Button>
        )}
        {canCrud && (
          <Button
            variant="secondary"
            onClick={() => setExcelOpen(true)}
            className="lg:shrink-0 !bg-indigo-50 !text-indigo-600 hover:!bg-indigo-100 !border-indigo-200 dark:!bg-indigo-500/10 dark:!text-indigo-400 dark:!border-indigo-500/30 py-3 lg:py-2.5"
          >
            <FileSpreadsheet size={18} /> Excel
          </Button>
        )}
        {canCrud && (
          <Button
            variant="secondary"
            onClick={() => setJsonImportOpen(true)}
            className="lg:shrink-0 !bg-emerald-50 !text-emerald-600 hover:!bg-emerald-100 !border-emerald-200 dark:!bg-emerald-500/10 dark:!text-emerald-400 dark:!border-emerald-500/30 py-3 lg:py-2.5"
          >
            <Code size={18} /> JSON
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm từ vựng, hán tự..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-[22px] outline-none focus:border-[#1CB0F6] focus:ring-4 focus:ring-[#1CB0F6]/5 transition-all font-medium text-sm shadow-sm"
          />
        </div>

        <div className="flex bg-slate-100/50 p-1 rounded-[18px] w-fit">
          {[
            { id: "all", label: "Tất cả", count: totalCount },
            {
              id: "voca",
              label: "Từ vựng",
              count: vocaCount,
            },
            { id: "kanji", label: "Hán tự", count: kanjiCount },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-4 py-2 rounded-[14px] text-xs font-black transition-all flex items-center gap-2 ${
                filterType === btn.id
                  ? "bg-white text-[#1CB0F6] shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {btn.label}
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  filterType === btn.id ? "bg-[#1CB0F6]/10" : "bg-slate-200/50"
                }`}
              >
                {btn.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Pagination Top */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-sm font-black text-slate-500 dark:text-slate-400 px-2">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                    currentPage === pageNum
                      ? "bg-[#1CB0F6] text-white shadow-md shadow-sky-200"
                      : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-2">
        {paginatedRows.map((word, idx) => {
          const i = (currentPage - 1) * ITEMS_PER_PAGE + idx;
          return (
            <div
              key={`${word.id || word.word}-${i}`}
              className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[24px] overflow-hidden hover:border-[#1CB0F6]/30 hover:shadow-sm transition-all"
            >
            <div
              className="w-full p-4 flex items-center justify-between text-left group cursor-pointer"
              onClick={() => {
                const isExpanding = expandedId !== word.id;
                setExpandedId(isExpanding ? word.id : null);
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold text-slate-800 leading-tight group-hover:text-[#1CB0F6] transition-colors">
                      {word.word}
                    </p>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        tts.playWithFallback(word.audio, word.word);
                      }}
                      onMouseEnter={() => tts.playWithFallback(word.audio, word.word)}
                      className="p-2.5 rounded-full text-[#1CB0F6] bg-sky-50 hover:bg-[#1CB0F6] hover:text-white transition-all shadow-sm border-b-2 border-sky-200 active:border-b-0 active:translate-y-0.5 flex items-center justify-center"
                      title="Nghe"
                    >
                      <Volume2 size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                  {word.reading && (
                    <p className="text-sm text-slate-400 font-medium leading-tight mt-1">
                      {word.reading}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="text-sm text-slate-400 font-bold text-right max-w-[120px] sm:max-w-[200px] truncate">
                  {word.meaning}
                </span>
                {canCrud && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      openEdit(word);
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-[#1CB0F6] hover:bg-sky-50 transition-colors"
                    title="Sửa từ này"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                <div
                  className={`p-1 rounded-lg transition-colors ${expandedId === word.id ? "bg-slate-100 text-[#1CB0F6]" : "text-slate-300 group-hover:text-slate-400"}`}
                >
                  {expandedId === word.id ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedId === word.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-0 border-t-2 border-slate-100 space-y-2">
                    <div className="flex items-center justify-between pt-3">
                      <div className="grid grid-cols-2 gap-2 text-sm flex-1">
                        <div>
                          <span className="text-slate-400 font-bold text-xs uppercase">Nghĩa</span>
                          <p className="font-bold text-slate-700">{word.meaning}</p>
                        </div>
                        {word.hanViet && (
                          <div>
                            <span className="text-slate-400 font-bold text-xs uppercase">
                              Hán Việt
                            </span>
                            <p className="font-bold text-slate-700">{word.hanViet}</p>
                          </div>
                        )}
                        {word.partOfSpeech && (
                          <div>
                            <span className="text-slate-400 font-bold text-xs uppercase">
                              Loại từ
                            </span>
                            <p className="font-medium text-slate-600">{word.partOfSpeech}</p>
                          </div>
                        )}
                        {word.onyomi && (
                          <div>
                            <span className="text-slate-400 font-bold text-xs uppercase">
                              Âm On
                            </span>
                            <p className="font-bold text-indigo-500">{word.onyomi}</p>
                          </div>
                        )}
                        {word.kunyomi && (
                          <div>
                            <span className="text-slate-400 font-bold text-xs uppercase">
                              Âm Kun
                            </span>
                            <p className="font-bold text-emerald-500">{word.kunyomi}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            tts.playWithFallback(word.audio, word.word);
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1CB0F6] text-white font-black text-xs hover:bg-[#1899D6] transition-all shadow-md active:scale-95 border-b-4 border-[#1899D6] active:border-b-0"
                        >
                          <Volume2 size={18} strokeWidth={3} />
                          NGHE
                        </button>
                        {word.type === "kanji" && word.word?.length === 1 && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setWritingKanji(word);
                              setWritingOpen(true);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#A342FF] text-white font-black text-xs hover:bg-[#8B2BE2] transition-all shadow-md active:scale-95 border-b-4 border-[#8B2BE2] active:border-b-0"
                          >
                            <PenTool size={18} strokeWidth={3} />
                            VIẾT
                          </button>
                        )}
                        {canCrud && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openEdit(word);
                            }}
                            className="p-2.5 rounded-2xl text-slate-400 bg-slate-50 hover:text-[#1CB0F6] hover:bg-sky-50 transition-all border border-slate-100"
                            title="Sửa"
                          >
                            <Pencil size={20} />
                          </button>
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (isBookmarked(word.word)) {
                              removeBookmark(word.word);
                            } else {
                              addBookmark({ ...word, deck: word.deck || deckId });
                            }
                          }}
                          className={`p-2.5 rounded-2xl transition-all border ${
                            isBookmarked(word.word)
                              ? "text-[#FFC800] bg-[#FFF8D9] border-[#FFC800]/20"
                              : "text-slate-400 bg-slate-50 hover:text-[#FFC800] border-slate-100"
                          }`}
                          title={isBookmarked(word.word) ? "Bỏ bookmark" : "Thêm bookmark"}
                        >
                          <Star size={24} fill={isBookmarked(word.word) ? "#FFC800" : "none"} />
                        </button>
                      </div>
                    </div>
                    {word.type === "kanji" && word.word?.length === 1 && (
                      <div className="flex justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 mb-4">
                        <KanjiWriter kanji={word.word} size={150} simple={true} />
                      </div>
                    )}
                    {word.example && (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                        <span className="text-slate-400 font-bold text-xs uppercase">
                          Ví dụ / Cấu trúc
                        </span>
                        <p className="text-sm text-slate-600 dark:text-slate-200 font-medium mt-1">
                          {word.example}
                        </p>
                        {word.exampleMeaning && (
                          <p className="text-xs text-slate-400 font-medium mt-1 italic">
                            {word.exampleMeaning}
                          </p>
                        )}
                      </div>
                    )}
                    {word.radicalAnalysis && (
                      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl p-3">
                        <span className="text-blue-700 dark:text-blue-400 font-bold text-xs uppercase">
                          Phân tích bộ thủ (Dũng Mori)
                        </span>
                        <p className="text-sm text-slate-700 dark:text-blue-100 font-bold mt-1">
                          {word.radicalAnalysis}
                        </p>
                      </div>
                    )}
                    {word.mnemonic && (
                      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl p-3">
                        <span className="text-amber-700 dark:text-amber-400 font-bold text-xs uppercase">
                          Mẹo nhớ (Japience / Dũng Mori)
                        </span>
                        <p className="text-sm text-slate-700 dark:text-amber-100 font-medium mt-1 italic leading-relaxed">
                          {word.mnemonic}
                        </p>
                      </div>
                    )}
                    {word.relatedVoca && parseRelatedVoca(word.relatedVoca).length > 0 && (
                      <div className="space-y-2">
                         <span className="text-slate-400 font-bold text-xs uppercase px-1">Từ vựng liên quan</span>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {parseRelatedVoca(word.relatedVoca).map((v, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 border-2 border-slate-50 dark:border-slate-600 rounded-xl hover:border-indigo-100 transition-all group/v">
                                 <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{v.w}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{v.r}</p>
                                 </div>
                                 <p className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover/v:text-indigo-500 truncate ml-2">{v.m}</p>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Pagination Bottom */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white dark:bg-slate-800 p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-sm font-bold text-slate-400">
            Hiển thị <span className="text-slate-600 dark:text-slate-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="text-slate-600 dark:text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> trong tổng số <span className="font-black text-[#1CB0F6]">{filtered.length}</span> mục
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="!px-4"
            >
              <ChevronLeft size={18} /> Trước
            </Button>
            
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl font-black text-[#1CB0F6]">
              {currentPage} / {totalPages}
            </div>

            <Button
              variant="primary"
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="!px-4"
            >
              Sau <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Book size={40} className="text-slate-300" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-black text-xl">
            {deckId === "srs"
              ? "Bạn chưa có từ vựng nào trong danh sách ôn tập"
              : "Không tìm thấy từ nào 😢"}
          </p>
          {deckId === "srs" && (
            <p className="text-slate-400 font-bold mt-2 max-w-sm mx-auto">
              Hãy mở xem chi tiết các từ vựng trong các bộ bài học khác để hệ thống tự động thêm vào
              lịch ôn tập thông minh (SRS)!
            </p>
          )}
        </div>
      )}

      {/* CRUD Modal */}
      {canCrud && (
        <CrudModal
          open={crudOpen}
          onClose={() => setCrudOpen(false)}
          mode={crudMode}
          title={crudMode === "create" ? "Thêm từ vựng mới" : "Sửa từ vựng"}
          fields={vocaFields}
          initialData={crudItem || {}}
          onSave={handleCrudSave}
          onDelete={crudMode === "edit" ? handleCrudDelete : null}
          saving={crudSaving}
        />
      )}

      {/* Excel Import Modal */}
      {canCrud && (
        <ExcelImportModal
          open={excelOpen}
          onClose={() => setExcelOpen(false)}
          deckId={deckId}
          onImportDone={async () => {
            setLoading(true);
            try {
              const data = await loadDeck(deckId, source);
              setWords(data);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {/* Kanji Writing Modal */}
      <KanjiWriterModal
        open={writingOpen}
        onClose={() => setWritingOpen(false)}
        kanji={writingKanji?.word}
        meaning={writingKanji?.meaning}
      />

      {/* JSON Import Modal - Dũng Mori Style */}
      <AnimatePresence>
        {jsonImportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={() => setJsonImportOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-slate-100 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-emerald-500">
                    <Code size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">Nhập nhanh bằng JSON</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giáo trình Dũng Mori / Bulk Import</p>
                  </div>
                </div>
                <button
                  onClick={() => setJsonImportOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Template */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">📋 Mẫu JSON</span>
                    <button
                      onClick={() => {
                        const template = JSON.stringify([
                          { word: "食べる", furigana: "たべる", meaning: "Ăn", han_viet: "Thực", example_jp: "毎日ご飯を食べます。", example_vi: "Mỗi ngày ăn cơm.", mnemonic: "Thực phẩm = Ăn" },
                          { word: "飲む", furigana: "のむ", meaning: "Uống", han_viet: "Ẩm", example_jp: "水を飲む。", example_vi: "Uống nước.", mnemonic: "Ẩm thực = Uống" }
                        ], null, 2);
                        setJsonText(template);
                        handleJsonTextChange(template);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black hover:bg-emerald-200 transition-colors"
                    >
                      <Copy size={12} /> Dán mẫu
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
{`[{
  "word": "漢字",
  "furigana": "かんじ",
  "meaning": "Chữ Hán",
  "han_viet": "Hán Tự",
  "mnemonic": "Mẹo nhớ...",
  "example_jp": "漢字を書く。",
  "example_vi": "Viết chữ Hán."
}]`}
                  </pre>
                  <p className="text-[10px] text-slate-400 mt-2 font-bold">
                    Các trường hỗ trợ: <code className="text-emerald-500">word</code>, <code className="text-emerald-500">furigana</code>, <code className="text-emerald-500">meaning</code>, <code className="text-emerald-500">han_viet</code>, <code className="text-emerald-500">onyomi</code>, <code className="text-emerald-500">kunyomi</code>, <code className="text-emerald-500">example_jp</code>, <code className="text-emerald-500">example_vi</code>, <code className="text-emerald-500">mnemonic</code>, <code className="text-emerald-500">radical_analysis</code>
                  </p>
                </div>

                {/* Textarea */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Dán JSON Array vào đây</label>
                  <textarea
                    value={jsonText}
                    onChange={e => {
                      setJsonText(e.target.value);
                      handleJsonTextChange(e.target.value);
                    }}
                    placeholder='[\n  { "word": "...", "meaning": "..." },\n  ...\n]'
                    rows={10}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:border-emerald-400 transition-all resize-none dark:text-white dark:placeholder:text-slate-500"
                    spellCheck={false}
                  />
                </div>

                {/* Preview / Validation */}
                {jsonText.trim() && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                    jsonPreview.valid
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30"
                      : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30"
                  }`}>
                    {jsonPreview.valid ? (
                      <>
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          ✅ Hợp lệ! Sẵn sàng nhập <span className="text-emerald-500 font-black">{jsonPreview.count}</span> từ vựng
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} className="text-red-500 shrink-0" />
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{jsonPreview.error}</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-5 pt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <button
                  onClick={() => { setJsonText(""); setJsonPreview({ count: 0, valid: false, error: "" }); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Xóa tất cả
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setJsonImportOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleJsonImport}
                    disabled={!jsonPreview.valid || jsonImporting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {jsonImporting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    Nhập {jsonPreview.count} từ
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
