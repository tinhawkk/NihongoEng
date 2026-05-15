import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { vocabularyRepository } from "../data/repositories/NhostVocabularyRepository";
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
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { CrudModal } from "../components/ui/CrudModal";
import { ExcelImportModal } from "../components/ui/ExcelImportModal";
import { useBookmarkStore } from "../store/useBookmarkStore";
import { useUserStore } from "../store/useUserStore";
import { useToastStore } from "../store/useToastStore";
import { nhostService } from "../services/nhostService";
import { DECK_LABELS } from "../utils/constants";
import { tts } from "../utils/tts";
import { detectDeckLanguage } from "../utils/helpers";
import { KanjiWriter } from "../components/ui/KanjiWriter";
import { KanjiWriterModal } from "../components/ui/KanjiWriterModal";
import { examGeneratorService } from "../services/examGeneratorService";
import { examRepository } from "../data/repositories/NhostExamRepository";


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

const parseRelatedVoca = relatedVoca => {
  if (!relatedVoca) return [];
  if (typeof relatedVoca === "string") {
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

  const setCurrentPage = val => {
    const next = new URLSearchParams(searchParams);
    next.set("p", typeof val === "function" ? val(currentPage) : val);
    setSearchParams(next, { replace: true });
  };

  const setSearch = val => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set("q", val);
    else next.delete("q");
    next.delete("p"); // Reset page when searching
    setSearchParams(next, { replace: true });
  };

  const setFilterType = val => {
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

  // Exam generation state
  const [examGenerating, setExamGenerating] = useState(false);
  const [examProgress, setExamProgress] = useState({ step: 0, total: 12 });
  const [selectedLevel, setSelectedLevel] = useState(deckId.match(/n[1-5]/i)?.[0]?.toUpperCase() || "N3");
  const [radicals, setRadicals] = useState([]);
  const [spotlightRadical, setSpotlightRadical] = useState(null);
  const [spotlightAnchor, setSpotlightAnchor] = useState(null);

  // Bulk Edit JSON state
  const [bulkJsonOpen, setBulkJsonOpen] = useState(false);
  const [bulkJsonText, setBulkJsonText] = useState("");
  const [bulkJsonSaving, setBulkJsonSaving] = useState(false);

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
    {
      key: "furigana",
      label: "Furigana / Reading",
      placeholder: "たべる (hoặc để trống nếu là Kanji đơn)",
    },
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
      key: "definition_en",
      label: "Định nghĩa (EN)",
      type: "textarea",
      placeholder: "Giải nghĩa bằng tiếng anh...",
    },
    {
      key: "definition_vi",
      label: "Định nghĩa (VI)",
      type: "textarea",
      placeholder: "Giải nghĩa bằng tiếng việt...",
    },
    {
      key: "synonyms",
      label: "Từ đồng nghĩa",
      type: "textarea",
      placeholder: "VD: abandon, leave...",
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
    {
      key: "raw_json",
      label: "Nhập nhanh bằng JSON Array (Bỏ qua các ô trên)",
      type: "textarea",
      placeholder:
        'VD JP: [ { "word": "食べる", "meaning": "Ăn" } ] | VD EN: [ { "word": "abandon", "meaning": "từ bỏ" } ]',
    },
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
      definition_en: word.definitionEn || "",
      definition_vi: word.definitionVi || "",
      synonyms: word.synonyms || "",
      mnemonic: word.mnemonic || "",
      radical_analysis: word.radicalAnalysis || "",
      related_voca:
        typeof word.relatedVoca === "string"
          ? word.relatedVoca
          : JSON.stringify(word.relatedVoca || []),
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
              id: item.id || generateUUID(),
              level: finalLevel,
              deck_id: deckId,
            }));
            const { errors } = await nhostService.bulkInsertMyVoca(bucket);
            if (errors?.length) throw new Error(errors[0].message);
            // Refresh list after bulk
            vocabularyRepository.loadDeck(deckId, source).then(setWords);
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
            deck_id: deckId,
            type: fields.onyomi || fields.kunyomi || fields.related_voca ? "kanji" : "voca",
          };
          const { errors } = await nhostService.createRow(table, obj);
          if (errors?.length) throw new Error(errors[0].message);
          setWords(prev => [obj, ...prev]);
          addToast("Đã thêm thành công!", "success");
        }
      } else {
        const { id, ...setFields } = fields;
        const autoType =
          setFields.onyomi || setFields.kunyomi || setFields.related_voca ? "kanji" : "voca";
        const finalSet = { ...setFields, type: autoType };

        const { errors } = await nhostService.updateRow(table, crudItem.id, finalSet);
        if (errors?.length) throw new Error(errors[0].message);

        setWords(prev => prev.map(w => (w.id === crudItem.id ? { ...w, ...finalSet } : w)));
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
  const handleJsonTextChange = text => {
    const trimmed = text.trim();
    if (!trimmed) {
      setJsonPreview({ count: 0, valid: false, error: "" });
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        setJsonPreview({
          count: 0,
          valid: false,
          error: "JSON phải là một mảng (Array), bắt đầu bằng [ và kết thúc bằng ]",
        });
        return;
      }
      if (parsed.length === 0) {
        setJsonPreview({
          count: 0,
          valid: false,
          error: "Mảng JSON rỗng, hãy thêm ít nhất 1 từ vựng",
        });
        return;
      }
      // Validate each item has at least 'word' and 'meaning'
      const invalid = parsed.filter((item, i) => !item.word?.trim() || !item.meaning?.trim());
      if (invalid.length > 0) {
        setJsonPreview({
          count: 0,
          valid: false,
          error: `Có ${invalid.length} mục thiếu trường "word" hoặc "meaning"`,
        });
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

      const bucket = parsed.map(item => {
        const { radical_analysis, related_voca, ...rest } = item;
        return {
          ...rest,
          id: item.id || generateUUID(),
          level: finalLevel,
          deck_id: deckId,
          type: item.onyomi || item.kunyomi ? "kanji" : "voca",
        };
      });

      const { errors } = await nhostService.bulkInsertMyVoca(bucket);
      if (errors?.length) throw new Error(errors[0].message);

      // Refresh word list
      const data = await vocabularyRepository.loadDeck(deckId, source);
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
      const normalizedId = deckId.toLowerCase();
      nhostService.fetchGraphQL(q, "GetDeckTitle", { id: normalizedId }).then(res => {
        if (res.data?.decks_by_pk) {
          setDeckMetadata(res.data.decks_by_pk);
        } else {
          console.error("[DeckPage] GetDeckTitle failed or null:", res);
        }
      }).catch(err => {
        console.error("[DeckPage] GetDeckTitle exception:", err);
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

    vocabularyRepository.loadDeck(deckId, source).then(data => {
      setWords(data);
      setLoading(false);
    });

    // Fetch radicals for spotlighting
    nhostService.getRadicals().then(setRadicals);
  }, [deckId, source, isSrsDeck, srsDep]);

  // Create radical lookup maps
  const radicalMaps = useMemo(() => {
    const byChar = {};
    const byName = {};
    radicals.forEach(r => {
      if (r.character) byChar[r.character] = r;
      if (r.name_vi) byName[r.name_vi.toLowerCase()] = r;
    });
    return { byChar, byName };
  }, [radicals]);

  const renderRadicalAnalysis = text => {
    if (!text) return null;
    // Smart split: identify components in parentheses or separated by symbols
    // Format examples: "意 (Ý) = 立 (Lập) + 日 (Nhật) + 心 (Tâm)" OR "山 + 石"
    const parts = text.split(/([()=+\-\s])/);

    return parts.map((part, i) => {
      const trimmed = part.trim();
      if (!trimmed) return part;

      // Try matching by character first, then by name
      const match = radicalMaps.byChar[trimmed] || radicalMaps.byName[trimmed.toLowerCase()];

      if (match) {
        return (
          <span
            key={i}
            className="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline decoration-2 underline-offset-2 transition-all font-black px-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
            onClick={e => {
              e.stopPropagation();
              setSpotlightRadical(match);
              setSpotlightAnchor(e.currentTarget);
            }}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

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
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            {deckId === "srs"
              ? "Thư viện Ôn tập thông minh"
              : deckMetadata?.title 
                ? deckMetadata.title 
                : DECK_LABELS[deckId?.toLowerCase()] 
                  ? DECK_LABELS[deckId?.toLowerCase()] 
                  : (isUUID && !deckMetadata ? "Đang tải tên bài..." : deckId.toUpperCase())}
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

      {/* Action Toolbar */}
      <div className="space-y-6">
        {/* Luyện tập Group */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Luyện tập & Kiểm tra</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Button
              variant="primary"
              onClick={() => navigate(`/learn/${deckId}${filterType !== "all" ? "?filter=" + filterType : ""}`)}
              className="!h-14 !rounded-2xl !bg-[#1CB0F6] hover:!bg-[#1899D6] !border-b-4 !border-[#1899D6] shadow-lg shadow-sky-100 dark:shadow-none"
            >
              <GraduationCap size={20} strokeWidth={2.5} /> Học bài
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => navigate(`/flashcards/${deckId}${filterType !== "all" ? "?filter=" + filterType : ""}`)}
              className="!h-14 !rounded-2xl relative overflow-hidden group !bg-white dark:!bg-slate-800 !border-2 !border-slate-100 dark:!border-slate-700 hover:!border-[#1CB0F6]/30 shadow-sm"
            >
              <div className="relative z-10 flex items-center gap-2 text-[#1CB0F6] font-black">
                <BookOpen size={20} strokeWidth={2.5} /> Flashcard
              </div>
              {flashcardProgress && flashcardProgress.totalCards > 0 && (
                <div
                  className="absolute bottom-0 left-0 h-1.5 bg-[#1CB0F6]/30 transition-all group-hover:bg-[#1CB0F6]/50"
                  style={{ width: `${Math.round((flashcardProgress.studied / flashcardProgress.totalCards) * 100)}%` }}
                />
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate(`/quiz/${deckId}${filterType !== "all" ? "?filter=" + filterType : ""}`)}
              className="!h-14 !rounded-2xl !bg-white dark:!bg-slate-800 !border-2 !border-slate-100 dark:!border-slate-700 hover:!border-amber-400/30 shadow-sm"
            >
              <Zap size={20} strokeWidth={2.5} className="text-amber-500" /> <span className="text-amber-600 font-black">Quiz</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate(`/typing/${deckId}${filterType !== "all" ? "?filter=" + filterType : ""}`)}
              className="!h-14 !rounded-2xl !bg-white dark:!bg-slate-800 !border-2 !border-slate-100 dark:!border-slate-700 hover:!border-purple-400/30 shadow-sm"
            >
              <Keyboard size={20} strokeWidth={2.5} className="text-purple-500" /> <span className="text-purple-600 font-black">Gõ</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate(`/game/speed-60s?deckId=${deckId}&source=${source}&title=${encodeURIComponent(deckMetadata?.title || DECK_LABELS[deckId] || deckId)}`)}
              className="!h-14 !rounded-2xl !bg-white dark:!bg-slate-800 !border-2 !border-slate-100 dark:!border-slate-700 hover:!border-rose-400/30 shadow-sm"
            >
              <Zap size={20} strokeWidth={2.5} className="text-rose-500" /> <span className="text-rose-600 font-black">60s</span>
            </Button>

            {/* Exam Button with Level Picker */}
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 h-6">
                {(detectDeckLanguage(deckId, deckMetadata?.title || DECK_LABELS[deckId]) === "english" ? ['A1', 'A2', 'B1', 'B2', 'C1'] : ['N5', 'N4', 'N3', 'N2', 'N1']).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    disabled={examGenerating}
                    className={`flex-1 text-[9px] font-black rounded-lg transition-all ${
                      selectedLevel === lvl ? 'bg-white dark:bg-slate-700 text-[#1CB0F6] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                disabled={examGenerating || words.length === 0}
                onClick={async () => {
                  if (examGenerating) return;
                  setExamGenerating(true);
                  setExamProgress({ step: 0, total: 12 });
                  try {
                    const deckTitle = deckMetadata?.title || DECK_LABELS[deckId] || deckId;
                    const level = selectedLevel.toLowerCase();

                    const existing = await examRepository.getExamByDeckId(deckId);
                    if (existing?.id) {
                      const existingNums = existing.existingMondais || [];
                      const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                      const missing = ALL.filter(n => !existingNums.includes(n));
                      if (missing.length === 0) {
                        navigate(`/jlpt-exams/${existing.id}`);
                        return;
                      }
                      addToast(`🔧 Đề thi thiếu ${missing.length} phần. Đang bổ sung...`, "info");
                      setExamProgress({ step: 0, total: missing.length });
                      const newMondais = await examGeneratorService.generateMissingMondais(existingNums, words, { deckId, deckTitle, level }, (step, total) => setExamProgress({ step, total }));
                      if (newMondais.length > 0) {
                        await examRepository.addMondaisToExam(existing.id, newMondais);
                        addToast(`✅ Đã bổ sung ${newMondais.length} phần!`, "success");
                      }
                      navigate(`/jlpt-exams/${existing.id}`);
                      return;
                    }
                    const examData = await examGeneratorService.generateExam(words, { deckId, deckTitle, level }, (step, total) => setExamProgress({ step, total }));
                    const saved = await examRepository.saveGeneratedExam(examData);
                    if (saved?.id) {
                      addToast("Đề thi đã được tạo thành công!", "success");
                      navigate(`/jlpt-exams/${saved.id}`);
                    } else throw new Error("Không thể lưu đề thi.");
                  } catch (err) {
                    console.error("[ExamGen] Error:", err);
                    addToast("Lỗi: " + err.message, "error");
                  } finally {
                    setExamGenerating(false);
                    setExamProgress({ step: 0, total: 0 });
                  }
                }}
                className="!h-[2.1rem] !rounded-xl !bg-amber-50 !text-amber-600 hover:!bg-amber-100 !border-amber-200 dark:!bg-amber-500/10 dark:!text-amber-400 dark:!border-amber-500/30 relative text-xs font-black"
              >
                {examGenerating ? (
                  <><Loader2 size={14} className="animate-spin" /> {examProgress.step}/{examProgress.total}</>
                ) : (
                  <><ClipboardCheck size={14} strokeWidth={2.5} /> Đề thi {selectedLevel}</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Quản lý Group */}
        {canCrud && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quản lý dữ liệu</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="secondary"
                onClick={openCreate}
                className="!h-12 !rounded-2xl !bg-[#58CC02]/10 !text-[#58CC02] hover:!bg-[#58CC02]/20 !border-2 !border-[#58CC02]/20 font-black"
              >
                <Plus size={18} strokeWidth={3} /> Thêm từ
              </Button>

              <Button
                variant="secondary"
                onClick={() => setExcelOpen(true)}
                className="!h-12 !rounded-2xl !bg-indigo-50 !text-indigo-600 hover:!bg-indigo-100 !border-2 !border-indigo-100 font-black"
              >
                <FileSpreadsheet size={18} strokeWidth={2.5} /> Excel
              </Button>

              <Button
                variant="secondary"
                onClick={() => setJsonImportOpen(true)}
                className="!h-12 !rounded-2xl !bg-emerald-50 !text-emerald-600 hover:!bg-emerald-100 !border-2 !border-emerald-100 font-black"
              >
                <Code size={18} strokeWidth={2.5} /> JSON
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  const exportable = words.map(({ id, word, reading, furigana, meaning, hanViet, han_viet, romaji, example, example_jp, exampleMeaning, example_vi, mnemonic, onyomi, kunyomi, type, definitionEn, definitionVi, definition_en, definition_vi, synonyms }) => ({
                    id, word: word || "", reading: reading || furigana || "", meaning: meaning || "", han_viet: han_viet || hanViet || "", romaji: romaji || "", example_jp: example_jp || example || "", example_vi: example_vi || exampleMeaning || "", definition_en: definition_en || definitionEn || "", definition_vi: definition_vi || definitionVi || "", synonyms: synonyms || "", mnemonic: mnemonic || "", onyomi: onyomi || "", kunyomi: kunyomi || "", type: type || "voca"
                  }));
                  setBulkJsonText(JSON.stringify(exportable, null, 2));
                  setBulkJsonOpen(true);
                }}
                className="!h-12 !rounded-2xl !bg-slate-900 !text-white hover:!bg-black !border-none font-black shadow-lg shadow-slate-200"
              >
                <Pencil size={18} strokeWidth={2.5} /> Edit ALL (JSON)
              </Button>
            </div>
          </div>
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
                            <span className="text-slate-400 font-bold text-xs uppercase">
                              Nghĩa
                            </span>
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
                      {(word.definitionEn || word.definitionVi) && (
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 border-l-4 border-indigo-400 rounded-r-xl p-3">
                          {word.definitionEn && (
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                              {word.definitionEn}
                            </p>
                          )}
                          {word.definitionVi && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic mt-1">
                              {word.definitionVi}
                            </p>
                          )}
                        </div>
                      )}
                      {word.synonyms && (
                        <div className="bg-purple-50 dark:bg-purple-500/10 border-l-4 border-purple-400 rounded-r-xl p-3">
                          <p className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">
                            Từ đồng nghĩa
                          </p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {word.synonyms}
                          </p>
                        </div>
                      )}
                      {word.radicalAnalysis && (
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-3 relative">
                          <span className="text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase flex items-center gap-2">
                            <Layers size={12} /> Phân tích bộ thủ (Dũng Mori)
                          </span>
                          <div className="text-sm text-slate-700 dark:text-indigo-100 font-bold mt-1 leading-relaxed">
                            {renderRadicalAnalysis(word.radicalAnalysis)}
                          </div>
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
                          <span className="text-slate-400 font-bold text-xs uppercase px-1">
                            Từ vựng liên quan
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {parseRelatedVoca(word.relatedVoca).map((v, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 border-2 border-slate-50 dark:border-slate-600 rounded-xl hover:border-indigo-100 transition-all group/v"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                                    {v.w}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                                    {v.r}
                                  </p>
                                </div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover/v:text-indigo-500 truncate ml-2">
                                  {v.m}
                                </p>
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
            Hiển thị{" "}
            <span className="text-slate-600 dark:text-slate-200">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            -{" "}
            <span className="text-slate-600 dark:text-slate-200">
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
            </span>{" "}
            trong tổng số <span className="font-black text-[#1CB0F6]">{filtered.length}</span> mục
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
              const data = await vocabularyRepository.loadDeck(deckId, source);
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

      {/* Radical Spotlight Popover */}
      <AnimatePresence>
        {spotlightRadical && spotlightAnchor && (
          <>
            <div
              className="fixed inset-0 z-[250]"
              onClick={() => {
                setSpotlightRadical(null);
                setSpotlightAnchor(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="fixed z-[260] w-64 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-slate-100 dark:border-slate-700 p-5 overflow-hidden"
              style={{
                top: Math.min(
                  window.innerHeight - 300,
                  spotlightAnchor.getBoundingClientRect().bottom + 12
                ),
                left: Math.max(
                  12,
                  Math.min(
                    window.innerWidth - 268,
                    spotlightAnchor.getBoundingClientRect().left - 100
                  )
                ),
              }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Layers size={80} />
              </div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-3xl font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                  {spotlightRadical.character}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest block">
                    Bộ thủ #{spotlightRadical.radical_number}
                  </span>
                  <span className="text-xs font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg mt-1 inline-block">
                    {spotlightRadical.strokes} NÉT
                  </span>
                </div>
              </div>
              <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">
                {spotlightRadical.name_vi}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1 leading-relaxed">
                {spotlightRadical.meaning_vi}
              </p>
              <Button
                variant="primary"
                className="w-full mt-4 !py-2 !text-xs !bg-indigo-600"
                onClick={() => navigate(`/radicals?highlight=${spotlightRadical.character}`)}
              >
                Xem chi tiết 214 bộ thủ
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">
                      Nhập nhanh bằng JSON
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Giáo trình Dũng Mori / Bulk Import
                    </p>
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
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                      📋 Mẫu JSON
                    </span>
                    <button
                      onClick={() => {
                        const template = JSON.stringify(
                          [
                            {
                              word: "食べる",
                              furigana: "たべる",
                              meaning: "Ăn",
                              han_viet: "Thực",
                              example_jp: "毎日ご飯を食べます。",
                              example_vi: "Mỗi ngày ăn cơm.",
                              mnemonic: "Thực phẩm = Ăn",
                            },
                            {
                              word: "飲む",
                              furigana: "のむ",
                              meaning: "Uống",
                              han_viet: "Ẩm",
                              example_jp: "水を飲む。",
                              example_vi: "Uống nước.",
                              mnemonic: "Ẩm thực = Uống",
                            },
                            {
                              word: "abandon",
                              furigana: "əˈbæn.dən",
                              meaning: "từ bỏ",
                              example_jp: "He abandoned the plan.",
                              example_vi: "Anh ấy từ bỏ kế hoạch.",
                              definition_en: "To leave a place, thing, or person, usually for ever",
                              definition_vi: "Rời khỏi hoặc bỏ lại ai đó/vật gì đó, thường là mãi mãi",
                              synonyms: "leave, quit",
                              mnemonic: "a + bandon -> bỏ đi",
                            },
                          ],
                          null,
                          2
                        );
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
}, {
  "word": "abandon",
  "furigana": "əˈbæn.dən",
  "meaning": "từ bỏ",
  "example_jp": "He abandoned the plan.",
  "example_vi": "Anh ấy đã từ bỏ kế hoạch.",
  "definition_en": "To leave a place, thing, or person",
  "definition_vi": "rời khỏi hoặc bỏ lại ai đó/vật gì đó",
  "synonyms": "leave, quit"
}]`}
                  </pre>
                  <p className="text-[10px] text-slate-400 mt-2 font-bold">
                    Các trường hỗ trợ: <code className="text-emerald-500">word</code>,{" "}
                    <code className="text-emerald-500">furigana</code>,{" "}
                    <code className="text-emerald-500">meaning</code>,{" "}
                    <code className="text-emerald-500">han_viet</code>,{" "}
                    <code className="text-emerald-500">onyomi</code>,{" "}
                    <code className="text-emerald-500">kunyomi</code>,{" "}
                    <code className="text-emerald-500">example_jp</code>,{" "}
                    <code className="text-emerald-500">example_vi</code>,{" "}
                    <code className="text-emerald-500">definition_en</code>,{" "}
                    <code className="text-emerald-500">definition_vi</code>,{" "}
                    <code className="text-emerald-500">synonyms</code>,{" "}
                    <code className="text-emerald-500">mnemonic</code>,{" "}
                    <code className="text-emerald-500">radical_analysis</code>. Với tiếng Anh, dùng{" "}
                    <code className="text-emerald-500">furigana</code> cho phiên âm.
                  </p>
                </div>

                {/* Textarea */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Dán JSON Array vào đây
                  </label>
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
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                      jsonPreview.valid
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30"
                        : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30"
                    }`}
                  >
                    {jsonPreview.valid ? (
                      <>
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          ✅ Hợp lệ! Sẵn sàng nhập{" "}
                          <span className="text-emerald-500 font-black">{jsonPreview.count}</span>{" "}
                          từ vựng
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} className="text-red-500 shrink-0" />
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">
                          {jsonPreview.error}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-5 pt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <button
                  onClick={() => {
                    setJsonText("");
                    setJsonPreview({ count: 0, valid: false, error: "" });
                  }}
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

      {/* Bulk Edit JSON Modal */}
      <AnimatePresence>
        {bulkJsonOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 md:p-10"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border-8 border-slate-50 dark:border-slate-800"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                    Chỉnh sửa hàng loạt (JSON)
                  </h3>
                  <p className="text-sm text-slate-400 font-bold mt-1">
                    Cẩn thận: Toàn bộ từ vựng trong bài sẽ được cập nhật theo nội dung bên dưới.
                  </p>
                </div>
                <button
                  onClick={() => setBulkJsonOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 p-8 bg-slate-50 dark:bg-slate-950">
                <textarea
                  value={bulkJsonText}
                  onChange={e => setBulkJsonText(e.target.value)}
                  placeholder="[{ 'word': '...', 'meaning': '...' }]"
                  className="w-full h-full p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 font-mono text-sm outline-none focus:border-indigo-400 transition-all resize-none shadow-inner"
                />
              </div>

              <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setBulkJsonOpen(false)}
                  className="px-8"
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  loading={bulkJsonSaving}
                  onClick={async () => {
                    setBulkJsonSaving(true);
                    try {
                      const parsed = JSON.parse(bulkJsonText);
                      if (!Array.isArray(parsed)) throw new Error("JSON phải là một mảng!");

                      const currentTitle = deckMetadata?.title || DECK_LABELS[deckId] || deckId;
                      const finalLevel = currentTitle.toUpperCase();

                      // Phân loại: Update (có id và tồn tại) và Insert (tạo mới)
                      const updates = [];
                      const inserts = [];

                      parsed.forEach(item => {
                        const existing = words.find(w => w.id === item.id);
                        if (existing) {
                           // Xác định đúng table của từ này
                           let table = "my_vocabulary";
                           if (existing.source === "personal") {
                             table = "my_vocabulary";
                           } else if (existing.source === "grammar" || existing.level === "GRAMMAR") {
                             table = "grammar_entries";
                           } else {
                             table = existing.type === "kanji" ? "japience_kanji" : "japience_voca";
                           }
                           
                           // Lấy ra các trường có cập nhật
                           const setFields = {};
                           if (item.word !== undefined) setFields.word = item.word;
                           if (item.meaning !== undefined) setFields.meaning = item.meaning;
                           if (item.reading !== undefined) setFields.furigana = item.reading;
                           if (item.furigana !== undefined) setFields.furigana = item.furigana;
                           if (item.mnemonic !== undefined) setFields.mnemonic = item.mnemonic;
                           if (item.han_viet !== undefined) setFields.han_viet = item.han_viet;
                           if (item.hanViet !== undefined) setFields.han_viet = item.hanViet;
                           if (item.romaji !== undefined) setFields.romaji = item.romaji;
                           if (item.example_jp !== undefined) setFields.example_jp = item.example_jp;
                           if (item.example_vi !== undefined) setFields.example_vi = item.example_vi;
                           if (item.definition_en !== undefined) setFields.definition_en = item.definition_en;
                           if (item.definition_vi !== undefined) setFields.definition_vi = item.definition_vi;
                           if (item.synonyms !== undefined) setFields.synonyms = item.synonyms;
                           
                           // Map tên cột cho japience
                           if (table === "japience_voca") {
                              if (setFields.furigana !== undefined) {
                                setFields.reading = setFields.furigana;
                                delete setFields.furigana;
                              }
                              if (setFields.example_jp !== undefined) {
                                setFields.example = setFields.example_jp;
                                delete setFields.example_jp;
                              }
                              if (setFields.example_vi !== undefined) {
                                setFields.example_meaning = setFields.example_vi;
                                delete setFields.example_vi;
                              }
                           } else if (table === "japience_kanji") {
                              if (setFields.word !== undefined) {
                                setFields.kanji = setFields.word;
                                delete setFields.word;
                              }
                           }

                           if (Object.keys(setFields).length > 0) {
                             updates.push({ table, id: existing.id, setFields });
                           }
                        } else {
                           // Insert
                           inserts.push({
                             ...item,
                             id: item.id || generateUUID(),
                             level: item.level || finalLevel,
                             deck_id: deckId,
                             word: item.word || "",
                             meaning: item.meaning || "",
                             furigana: item.reading || item.furigana || "",
                           });
                        }
                      });

                      // Thực thi updates
                      if (updates.length > 0) {
                         const promises = updates.map(u => nhostService.updateRow(u.table, u.id, u.setFields));
                         const results = await Promise.all(promises);
                         // Kiểm tra xem có lỗi nào bị ẩn đi không
                         const errors = results.filter(r => r?.errors?.length > 0);
                         if (errors.length > 0) {
                            console.error("Chi tiết lỗi update:", errors[0].errors);
                            throw new Error("Lỗi DB khi cập nhật: " + errors[0].errors[0].message);
                         }
                      }

                      // Thực thi inserts
                      let affected = updates.length;
                      if (inserts.length > 0) {
                         const res = await nhostService.bulkInsertMyVoca(inserts);
                         if (res.errors?.length) throw new Error(res.errors[0].message);
                         affected += (res.data?.insert_my_vocabulary?.affected_rows || inserts.length);
                      }

                      addToast(`✅ Đã cập nhật thành công ${affected} mục!`, "success");
                      setBulkJsonOpen(false);
                      
                      // Refresh list
                      const data = await vocabularyRepository.loadDeck(deckId, source);
                      setWords([...data]);
                    } catch (err) {
                      console.error("[BulkEdit] Error:", err);
                      alert("Lỗi: " + err.message);
                    } finally {
                      setBulkJsonSaving(false);
                    }
                  }}
                  className="px-10 !bg-indigo-600 !border-indigo-700"
                >
                  Lưu thay đổi
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
