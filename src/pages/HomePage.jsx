import React, { useState, useEffect, useMemo } from "react";
import { DeckCard } from "../components/home/DeckCard";
import {
  Book,
  GraduationCap,
  Languages,
  Sparkles,
  Bookmark,
  ChevronRight,
  Cpu,
  Award,
  Plus,
  FileSpreadsheet,
  FolderPlus,
  X,
  Zap,
  Trophy,
  Flame,
  ChevronDown,
  Calendar,
  Package,
  FileCode,
  Edit2,
  Trash2,
  Brain,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { getSeasonalEvent, getDailyQuote, checkLunarEvents } from "../services/seasonalService";
import { nhostService } from "../services/nhostService";
import { useBookmarkStore } from "../store/useBookmarkStore";
import { useUserStore } from "../store/useUserStore";
import { useSync } from "../components/SyncProvider";
import { calculateCurrentStreak } from "../utils/streakUtils";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CrudModal } from "../components/ui/CrudModal";
import { ExcelImportModal } from "../components/ui/ExcelImportModal";
import { getDueItems } from "../utils/srsUtils";
import { renderMarkdownFurigana as renderFurigana } from "../utils/furigana";
import { createCommunityRoot } from "../services/nhostService";
import { premiumDecks, japienceDecks, dungMoriDecks } from "../data/communityDecks";

const mainDecks = [
  {
    id: "N5",
    label: "JLPT N5",
    color: "bg-[#58CC02]",
    icon: GraduationCap,
    description: src => (src === "voca" ? "🎯 Cloud Data - Premium" : "Mimikara Oboeru"),
  },
  {
    id: "N4",
    label: "JLPT N4",
    color: "bg-[#FF9600]",
    icon: GraduationCap,
    description: src => (src === "voca" ? "🎯 Cloud Data - Premium" : "Mimikara Oboeru"),
  },
  {
    id: "N3",
    label: "JLPT N3",
    color: "bg-[#FF4B4B]",
    icon: GraduationCap,
    description: src => (src === "voca" ? "🎯 Cloud Data - Premium" : "Mimikara Oboeru"),
  },
  {
    id: "N2",
    label: "JLPT N2",
    color: "bg-[#A342FF]",
    icon: GraduationCap,
    description: src => (src === "voca" ? "🎯 Cloud Data - Premium" : "Mimikara Oboeru"),
  },
  {
    id: "N1",
    label: "JLPT N1",
    color: "bg-[#37464F]",
    icon: GraduationCap,
    description: src => (src === "voca" ? "🎯 Cloud Data - Premium" : "Mimikara Oboeru"),
  },
  {
    id: "ENG",
    label: "600 TOEIC PLUS+",
    color: "bg-[#1CB0F6]",
    icon: Languages,
    description: src => (src === "voca" ? "🎯 Cloud Data - Premium" : "600 Từ vựng TOEIC"),
  },
];

// No local default specialty decks here — IT specialty decks come from Nhost
const defaultSpecialtyDecks = [];

const JLPTCountdown = () => {
  const getFirstSunday = (year, month) => {
    const date = new Date(year, month, 1);
    const day = date.getDay();
    const diff = (7 - day) % 7;
    return new Date(year, month, 1 + diff);
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let currentYear = now.getFullYear();

  const getExamsForYear = year => [
    { label: `${year} Đợt 1`, date: getFirstSunday(year, 6) },
    { label: `${year} Đợt 2`, date: getFirstSunday(year, 11) },
  ];

  let potentialExams = getExamsForYear(currentYear);

  // If even the December exam of this year has passed, look at next year
  if (now > potentialExams[1].date) {
    potentialExams = getExamsForYear(currentYear + 1);
  }

  const nextExam = potentialExams.find(ex => ex.date >= now);
  if (!nextExam) return null;

  const diff = Math.round((nextExam.date - now) / 86400000);
  const pct = Math.max(5, Math.min(100, Math.round((1 - diff / 365) * 100)));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-800 p-3 shadow-sm group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-indigo-500" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
            JLPT {nextExam.label}
          </span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
            {diff}
          </span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">Ngày</span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-slate-50 dark:bg-slate-700/50 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          className="h-full bg-[#58CC02] rounded-full"
        />
      </div>
    </div>
  );
};

export const HomePage = () => {
  // State cho modal tạo danh mục gốc
  const [createRootOpen, setCreateRootOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newRootTitle, setNewRootTitle] = useState("");
  const [newRootDesc, setNewRootDesc] = useState("");
  const [createRootSaving, setCreateRootSaving] = useState(false);

  // Hàm tạo danh mục gốc mới
  const handleCreateRoot = async () => {
    if (!newRootTitle.trim()) return;
    setCreateRootSaving(true);
    try {
      await createCommunityRoot({ title: newRootTitle, description: newRootDesc });
      await fetchCommunityData(); // Refresh UI
      setCreateRootOpen(false);
      setNewRootTitle("");
      setNewRootDesc("");
    } catch (e) {
      console.error("Failed to create new category:", e);
      alert("Đã xảy ra lỗi khi tạo danh mục mới. Vui lòng thử lại.");
    } finally {
      setCreateRootSaving(false);
    }
  };
  const navigate = useNavigate();
  const [event, setEvent] = useState(getSeasonalEvent());
  const [quote, setQuote] = useState(getDailyQuote());
  const [communityTree, setCommunityTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [levelModal, setLevelModal] = useState(null);
  const [specialtyDecksState, setSpecialtyDecksState] = useState([]);
  const [vocaCounts, setVocaCounts] = useState({});
  const bookmarks = useBookmarkStore(state => state.bookmarks);
  const { account, vocaSource, setVocaSource } = useUserStore();
  const { syncing, forceRefresh } = useSync();
  const [showSrsBanner, setShowSrsBanner] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSrsBanner(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const [moveDeckTarget, setMoveDeckTarget] = useState(null);

  // Logic to filter communityTree based on Premium/Japience/Mori matches
  const matchedIds = useMemo(() => {
    const ids = new Set();
    communityTree.forEach(root => {
      const t = root.title.toUpperCase();
      const levelMatch = t.match(/N[1-5]/i)?.[0];
      
      // Check Premium match
      const isPremium = levelMatch && (
        (t.includes("8000") && t.includes("TỪ VỰNG")) ||
        (t.includes("TỪ VỰNG") && !t.includes("MONDAI") && !t.includes("ORIGINAL") && !t.includes("JAPAN") && !t.includes("MORI"))
      );
      if (isPremium) {
        ids.add(root.id);
        return;
      }

      // Check Japanience match
      const isJapience = levelMatch && (t.includes("JAPAN") || t.includes("ORIGINAL")) && !t.includes("MORI");
      if (isJapience) {
        ids.add(root.id);
        return;
      }

      // Check Mori match
      const isMori = t.includes("MORI");
      if (isMori) {
        ids.add(root.id);
        return;
      }
    });
    return ids;
  }, [communityTree]);

  // Calculate SRS Reviews
  const srsData = account?.srsData || {};
  // QA: Optimize dueItems calculation with useMemo and centralized logic
  const dueItems = useMemo(() => {
    return getDueItems(srsData);
  }, [srsData]);

  // Pick 2 random words from SRS for the "Quick Review" section
  const [randomSrsWords, setRandomSrsWords] = useState([]);

  useEffect(() => {
    const allSrsItems = Object.values(srsData);
    if (allSrsItems.length > 0) {
      const shuffled = [...allSrsItems].sort(() => 0.5 - Math.random());
      setRandomSrsWords(shuffled.slice(0, 2));
    }
  }, [account?.srsData]);

  useEffect(() => {
    // Refresh quote/event every mount
    setEvent(getSeasonalEvent());
    setQuote(getDailyQuote());

    // Accurate lunar check
    checkLunarEvents().then(lunarEvent => {
      if (lunarEvent) setEvent(lunarEvent);
    });
  }, []);

  // For collapsing/expanding levels on HomePage - Persist in session
  const [expandedLevelId, setExpandedLevelId] = useState(() => {
    return sessionStorage.getItem("home_expanded_level") || null;
  });

  useEffect(() => {
    if (expandedLevelId) {
      sessionStorage.setItem("home_expanded_level", expandedLevelId);
    } else {
      sessionStorage.removeItem("home_expanded_level");
    }
  }, [expandedLevelId]);

  // ─── CRUD & Excel Import state ────────────────────────────────────────────
  const [addVocabOpen, setAddVocabOpen] = useState(false);
  const [crudSaving, setCrudSaving] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelPickerOpen, setExcelPickerOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState("");

  // ─── Create Deck modal state ──────────────────────────────────────────────
  const [createDeckOpen, setCreateDeckOpen] = useState(false);
  const [createDeckFolder, setCreateDeckFolder] = useState(null);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [createDeckSaving, setCreateDeckSaving] = useState(false);
  const [importAfterCreate, setImportAfterCreate] = useState(false);
  const [activeMoriStage, setActiveMoriStage] = useState(0);
  const [expandedMoriCategory, setExpandedMoriCategory] = useState(null);

  // ─── Create Subfolder (Chương) modal state ─────────────────────────────────
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParent, setCreateFolderParent] = useState(null);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [createFolderSaving, setCreateFolderSaving] = useState(false);

  // Flatten all decks for the vocab picker, including deep nested ones
  const allDecks = useMemo(() => {
    const flattenDecks = (folders, rootTitle, parentTitle = "(Gốc)") => {
      let result = [];
      folders.forEach(f => {
        if (f.decks) {
          result.push(...f.decks.map(d => ({ ...d, rootTitle, subTitle: parentTitle })));
        }
        if (f.subfolders) {
          result.push(...flattenDecks(f.subfolders, rootTitle, f.title));
        }
      });
      return result;
    };

    const decks = communityTree.flatMap(root => {
      const rootDecks = (root.decks || []).map(d => ({
        ...d,
        rootTitle: root.title,
        subTitle: "(Gốc)",
      }));
      const subDecks = root.subfolders ? flattenDecks(root.subfolders, root.title) : [];
      return [...rootDecks, ...subDecks];
    });

    // Remove potential duplicates by ID
    const seen = new Set();
    return decks.filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [communityTree]);

  // Pre-compute SRS due counts per deck for fast lookup in timeline
  const dueCountsMap = useMemo(() => {
    const counts = {};
    const todayStr = new Date().toLocaleDateString("en-CA");
    Object.values(srsData).forEach(item => {
      const nextReview = item.nextReview
        ? new Date(item.nextReview).toLocaleDateString("en-CA")
        : "";
      const isDue = nextReview <= todayStr;
      if (isDue) {
        // Track by all possible identifiers
        if (item.deckName) counts[item.deckName] = (counts[item.deckName] || 0) + 1;
        if (item.deck) counts[item.deck] = (counts[item.deck] || 0) + 1;
        if (item.deckId) counts[item.deckId] = (counts[item.deckId] || 0) + 1;
      }
    });
    return counts;
  }, [srsData]);

  const allFolders = useMemo(() => {
    const flattenFolders = (folders, rootTitle) => {
      let result = [];
      folders.forEach(f => {
        result.push({ id: f.id, title: f.title, isRoot: false, rootTitle });
        if (f.subfolders) {
          result.push(...flattenFolders(f.subfolders, rootTitle));
        }
      });
      return result;
    };

    return communityTree.flatMap(root => {
      const roots = [{ id: root.id, title: root.title, isRoot: true, rootTitle: root.title }];
      const subfolders = root.subfolders ? flattenFolders(root.subfolders, root.title) : [];
      return [...roots, ...subfolders];
    });
  }, [communityTree]);

  const vocaFields = [
    {
      key: "deck_id",
      label: "Chọn bài",
      type: "select",
      required: true,
      options: allDecks.map(d => ({
        value: d.id,
        label: `${d.rootTitle} › ${d.subTitle} › ${d.title}`,
      })),
    },
    { key: "word", label: "Từ vựng / Kanji", placeholder: "例: 食べる / 日" },
    {
      key: "furigana",
      label: "Furigana / Reading",
      placeholder: "たべる (để trống nếu nhập Kanji)",
    },
    { key: "onyomi", label: "Onyomi (Âm Ôn)", placeholder: "VD: ニチ, ジツ" },
    { key: "kunyomi", label: "Kunyomi (Âm Cún)", placeholder: "VD: ひ, -び, -か" },
    { key: "meaning", label: "Nghĩa (VI)", placeholder: "Ăn / Ngày, mặt trời" },
    { key: "meaning_vi", label: "Nghĩa chi tiết", placeholder: "Ăn (thức ăn)" },
    { key: "han_viet", label: "Hán Việt", placeholder: "Thực / Nhật" },
    { key: "romaji", label: "Romaji", placeholder: "taberu" },
    { key: "example_jp", label: "Ví dụ (JP)", type: "textarea", placeholder: "毎日ご飯を食べます" },
    {
      key: "example_vi",
      label: "Ví dụ (VI)",
      type: "textarea",
      placeholder: "Mỗi ngày tôi ăn cơm",
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
      label: "Thêm thần tốc bằng JSON Array (Bỏ qua các ô trên)",
      type: "textarea",
      description:
        'Dán JSON mẫu (JP/EN đều được): [ { "word": "...", "meaning": "..." } ]. Toàn bộ các ô trên sẽ bị bỏ qua nếu ô này có dữ liệu.',
      placeholder:
        'VD JP: [ { "word": "食べる", "meaning": "Ăn" } ] | VD EN: [ { "word": "abandon", "meaning": "từ bỏ" } ]',
    },
  ];

  // Save single vocab OR bulk JSON array
  const handleSaveVocab = async formData => {
    setCrudSaving(true);
    try {
      const { deck_id, raw_json, ...vocabData } = formData;
      const deck = allDecks.find(d => d.id === deck_id);

      const generateUUID = () => {
        if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
          var r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      const finalLevel = deck?.title?.toUpperCase() || deck_id?.toUpperCase() || "UNKNOWN";

      // If user pasted a JSON array
      if (raw_json && raw_json.trim().startsWith("[")) {
        let parsed = JSON.parse(raw_json);
        if (Array.isArray(parsed)) {
          const bulkObjects = parsed.map(item => ({
            ...item,
            id: item.id || generateUUID(),
            level: finalLevel,
            deck_id: deck_id,
          }));
          const { data, errors } = await nhostService.bulkInsertMyVoca(bulkObjects);
          if (errors?.length) throw new Error(errors[0].message);
          alert(`Đã thêm thành công nhóm ${bulkObjects.length} từ vựng từ JSON!`);
        } else {
          throw new Error("JSON không phải là một danh sách hợp lệ (Array).");
        }
      } else {
        if (!vocabData.word?.trim() || !vocabData.meaning?.trim()) {
          throw new Error("Hãy nhập ít nhất 'Từ vựng' và 'Nghĩa' hoặc sử dụng ô nhập JSON.");
        }
        // Standard single row insert
        // Convert array string fields correctly if they are left as strings
        await nhostService.createRow("my_vocabulary", {
          ...vocabData,
          id: generateUUID(),
          level: finalLevel,
          deck_id: deck_id,
          type: vocabData.onyomi || vocabData.kunyomi || vocabData.related_voca ? "kanji" : "voca",
        });
        alert("Đã thêm từ vựng thành công!");
      }

      setAddVocabOpen(false);
    } catch (err) {
      console.error("Failed to add vocab:", err);
      alert("Lỗi khi thêm từ vựng: " + err.message);
    } finally {
      setCrudSaving(false);
    }
  };

  // Open create-deck modal for a subfolder
  const handleOpenCreateDeck = (subfolder, rootTitle) => {
    setSelectedDeckId(subfolder.id); // Pre-select for other pickers if needed
    setCreateDeckFolder({ id: subfolder.id, title: subfolder.title, rootTitle });
    setNewDeckTitle("");
    setNewDeckDesc("");
    setCreateDeckOpen(true);
  };

  // Open Excel picker for a specific folder
  const handleOpenImportToFolder = (folder, rootTitle) => {
    setSelectedDeckId(folder.id);
    setImportAfterCreate(true);
    setExcelPickerOpen("CREATE_DECK");
  };

  // Create a new deck inside a subfolder
  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim() || !createDeckFolder) return;
    setCreateDeckSaving(true);
    try {
      const { data, errors } = await nhostService.createDeck({
        title: newDeckTitle.trim(),
        description: newDeckDesc.trim(),
        community_folder_id: createDeckFolder.id,
      });
      if (errors?.length) {
        console.error("Create deck error:", errors);
        if (errors[0]?.message) alert("Lỗi tạo bài: " + errors[0].message);
      } else {
        const newDeck = data?.insert_decks_one;
        if (newDeck) {
          // Re-fetch the tree to reliably update ALL nested levels (like Mori curriculum)
          await fetchCommunityData();

          if (importAfterCreate) {
            setSelectedDeckId(newDeck.id);
            setExcelOpen(true);
            setImportAfterCreate(false);
          }
        }
        setCreateDeckOpen(false);
      }
    } catch (err) {
      console.error("Failed to create deck:", err);
    } finally {
      setCreateDeckSaving(false);
    }
  };

  // Create a new subfolder (Chương) inside a parent folder (Phần)
  const handleCreateFolder = async () => {
    if (!newFolderTitle.trim() || !createFolderParent) return;
    setCreateFolderSaving(true);
    try {
      const { data, errors } = await nhostService.createFolder({
        title: newFolderTitle.trim(),
        description: "",
        parent_id: createFolderParent.id,
      });
      if (errors?.length) {
        console.error("Create folder error:", errors);
        alert("Lỗi tạo chương: " + errors[0].message);
      } else {
        // Refresh community tree
        await fetchCommunityData();
        setCreateFolderOpen(false);
        setNewFolderTitle("");
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
    } finally {
      setCreateFolderSaving(false);
    }
  };

  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      const { folders, decks } = await nhostService.getCommunityTreeData();

      // 1. Map folders by ID for easy access
      const folderMap = {};
      folders.forEach(f => {
        folderMap[f.id] = { ...f, subfolders: [], decks: [] };
      });

      // 2. Build countMap and set voca counts state
      const countMap = {};
      decks.forEach(d => {
        countMap[d.id] = d.count;
      });
      setVocaCounts(countMap);

      const standardKeywords = ["JLPT", "N1", "N2", "N3", "N4", "N5", "TOEIC", "MORI", "JAPANIENCE", "ORIGINAL", "8000 TỪ VỰNG"];
      decks.forEach(d => {
        const deckObj = { ...d, count: d.count };
        if (d.community_folder_id && folderMap[d.community_folder_id]) {
          folderMap[d.community_folder_id].decks.push(deckObj);
        } else {
          // If it's orphaned, check if it's a redundant deck that's likely already shown in Premium/Specialized sections
          const isRedundant = standardKeywords.some(kw => d.title.toUpperCase().includes(kw));
          if (!isRedundant) {
            d.isOrphaned = true;
            d.count = deckObj.count;
          }
        }
      });

      // 3. Build the tree
      const roots = [];
      const orphanedDecks = decks.filter(d => d.isOrphaned);

      folders.forEach(f => {
        const folderObj = folderMap[f.id];
        if (!f.parent_id) {
          roots.push(folderObj);
        } else if (folderMap[f.parent_id]) {
          folderMap[f.parent_id].subfolders.push(folderObj);
        }
      });

      if (orphanedDecks.length > 0) {
        // Find if we already have an "Uncategorized" folder in the roots
        const existingOrphanedRoot = roots.find(r => r.title === "Chưa phân loại");
        if (existingOrphanedRoot) {
          existingOrphanedRoot.decks = [...(existingOrphanedRoot.decks || []), ...orphanedDecks];
        } else {
          roots.push({
            id: "orphaned_root",
            title: "Chưa phân loại",
            description: "Các bài học chưa được đưa vào danh mục",
            subfolders: [],
            decks: orphanedDecks
          });
        }
      }

      setCommunityTree(roots);
    } catch (e) {
      console.error("Failed to load community data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVars = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  const renderTreeContent = (root, isPremium = false) => {
    const hasSubfolders = root.subfolders && root.subfolders.length > 0;
    const hasDecksAtRoot = root.decks && root.decks.length > 0;

    if (!hasSubfolders && !hasDecksAtRoot) {
      return (
        <div
          className={`pt-8 border-t border-slate-100 dark:border-slate-800 ${isPremium ? "bg-white/50 dark:bg-slate-900/20 rounded-b-[40px] px-8 pb-10" : ""}`}
        >
          <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-400">
              Không tìm thấy chuyên mục hoặc bài học nào.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`pt-8 border-t border-slate-100 dark:border-slate-800 ${isPremium ? "bg-white/50 dark:bg-slate-900/20 rounded-b-[40px] px-8 pb-10" : ""}`}
      >
        {hasSubfolders ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            {root.subfolders.map(sub => (
              <div key={sub.id} className="space-y-5">
                <div className="flex flex-col gap-1 px-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-base font-black uppercase tracking-tight whitespace-nowrap ${isPremium ? "text-red-500" : "text-indigo-500"}`}
                    >
                      {sub.title}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenCreateDeck(sub, root.title);
                      }}
                      className={`p-1 rounded-lg transition-all shadow-sm ${isPremium ? "bg-red-50 text-red-400 hover:bg-red-500 hover:text-white" : "bg-indigo-50 text-indigo-400 hover:bg-indigo-500 hover:text-white"}`}
                      title="Thêm bài học mới vào chuyên mục này"
                    >
                      <Plus size={14} strokeWidth={3} />
                    </button>
                    <div
                      className={`h-[1px] flex-1 bg-gradient-to-r ${isPremium ? "from-red-100" : "from-indigo-100"} to-transparent`}
                    />
                  </div>
                  {isPremium && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Tài liệu chuyên sâu
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3.5">
                  {sub.decks?.map((deck, dIdx) => (
                    <motion.div
                      key={deck.id}
                      whileHover={{ x: 6 }}
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/deck/${deck.id}`);
                      }}
                      className="flex items-center justify-between group cursor-pointer py-1.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={`w-10 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white shrink-0 ${isPremium ? "bg-slate-600" : "bg-indigo-400"}`}
                        >
                          #{dIdx + 1}
                        </div>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 truncate transition-colors">
                          {deck.title}
                          {deck.count > 0 && (
                            <span className="ml-2 text-[10px] text-slate-400 font-medium">({deck.count} từ)</span>
                          )}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleEditDeck(deck);
                          }}
                          className="p-1.5 rounded-md text-slate-300 hover:text-amber-500 hover:bg-amber-50"
                          title="Đổi tên"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setMoveDeckTarget(deck);
                          }}
                          className="p-1.5 rounded-md text-slate-300 hover:text-indigo-500 hover:bg-indigo-50"
                          title="Di chuyển"
                        >
                          <FolderPlus size={12} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteDeck(deck);
                          }}
                          className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50"
                          title="Xóa"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-slate-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {root.decks?.map((deck, dIdx) => (
              <motion.div
                key={deck.id}
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={e => {
                  e.stopPropagation();
                  navigate(`/deck/${deck.id}`);
                }}
                className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white ${isPremium ? "bg-red-500" : "bg-indigo-500"}`}
                  >
                    {dIdx + 1}
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-500 transition-colors">
                    {deck.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleEditDeck(deck);
                      }}
                      className="p-1.5 rounded-md text-slate-300 hover:text-amber-500 hover:bg-amber-50"
                      title="Đổi tên"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setMoveDeckTarget(deck);
                      }}
                      className="p-1.5 rounded-md text-slate-300 hover:text-indigo-500 hover:bg-indigo-50"
                      title="Di chuyển"
                    >
                      <FolderPlus size={12} />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteDeck(deck);
                      }}
                      className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50"
                      title="Xóa"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-slate-200 group-hover:text-indigo-400 transition-all"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const [initializingMori, setInitializingMori] = useState(null);

  const handleInitializeMori = async deck => {
    setInitializingMori(deck.id);
    try {
      const levelMatch = deck.id.match(/N[1-5]/i)?.[0]?.toUpperCase();
      const rootTitle = `Giáo trình Dũng Mori ${levelMatch}`;

      // 1. Create Root Folder
      const { data: rootData, errors: rootErr } = await nhostService.createFolder({
        title: rootTitle,
        description: deck.description,
        parent_id: null,
      });

      if (rootErr) throw new Error(rootErr[0].message);
      const rootId = rootData.insert_folders_one.id;

      // 2. Create 3 Stages as Subfolders
      for (const stage of deck.stages) {
        const { data: stageData } = await nhostService.createFolder({
          title: stage.title,
          description: stage.subtitle,
          parent_id: rootId,
        });

        const stageId = stageData.insert_folders_one.id;

        // 3. Proactively create category folders based on Google Drive structure
        const categories = ["1. Chữ hán", "2. Ngữ pháp", "3. Từ vựng"];

        await Promise.all(
          categories.map(async cat => {
            const { data: catData } = await nhostService.createFolder({
              title: cat,
              description: `Chuyên mục ${cat}`,
              parent_id: stageId,
            });
            const catId = catData.insert_folders_one.id;

            // Create Chương 1
            const { data: chData } = await nhostService.createFolder({
              title: "Chương 1",
              description: "",
              parent_id: catId,
            });
            const chId = chData.insert_folders_one.id;

            // Create Decks inside Chương 1 concurrently
            await Promise.all([
              nhostService.createDeck({
                title: "Bài 1",
                description: "Kiến thức trọng tâm",
                community_folder_id: chId,
              }),
              nhostService.createDeck({
                title: "Ôn tập Chương 1",
                description: "Tổng hợp và kiểm tra",
                community_folder_id: chId,
              }),
            ]);
          })
        );
      }

      // 4. Refresh Community Tree
      await fetchCommunityData();
      setExpandedLevelId(rootId);
    } catch (err) {
      console.error("Mori Init Error:", err);
      alert(`Lỗi khởi tạo: ${err.message}`);
    } finally {
      setInitializingMori(null);
    }
  };

  const scrollToMoriStage = (levelId, stageIdx) => {
    setActiveMoriStage(stageIdx);
    setTimeout(() => {
      const el = document.getElementById(`mori-content-${levelId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);
  };

  const handleEditFolder = async folder => {
    const newTitle = prompt("Nhập tên mới cho danh mục:", folder.title);
    if (!newTitle || newTitle === folder.title) return;
    try {
      await nhostService.updateFolder(folder.id, newTitle);
      await fetchCommunityData();
    } catch (err) {
      alert("Lỗi đổi tên: " + err.message);
    }
  };

  const handleDeleteFolder = async folder => {
    if (
      !confirm(
        `Bạn có CHUYÊN TÂM muốn XÓA danh mục "${folder.title}" không? Toàn bộ bài học bên trong sẽ bị lỗi nếu xóa danh mục chứa chúng.`
      )
    )
      return;
    try {
      await nhostService.deleteFolder(folder.id);
      await fetchCommunityData();
    } catch (err) {
      alert("Lỗi xoá danh mục: " + err.message);
    }
  };

  const handleEditDeck = async deck => {
    const newTitle = prompt("Nhập tên mới cho bài học:", deck.title);
    if (!newTitle || newTitle === deck.title) return;
    try {
      await nhostService.updateDeck(deck.id, newTitle);
      await fetchCommunityData();
    } catch (err) {
      alert("Lỗi đổi tên: " + err.message);
    }
  };

  const handleMoveDeck = async (deck, targetFolderId) => {
    try {
      await nhostService.updateDeck(deck.id, { community_folder_id: targetFolderId });
      setMoveDeckTarget(null);
      await fetchCommunityData();
    } catch (err) {
      alert("Lỗi di chuyển: " + err.message);
    }
  };

  const handleDeleteDeck = async deck => {
    setDeleteConfirmTarget(deck);
  };

  const executeDeleteDeck = async () => {
    if (!deleteConfirmTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await nhostService.deleteDeck(deleteConfirmTarget.id);
      await fetchCommunityData();
      setDeleteConfirmTarget(null);
    } catch (err) {
      alert("Lỗi xoá bài học: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickAddChapter = async (category, chapters) => {
    try {
      const nextNum = chapters.length + 1;
      await nhostService.createFolder({
        title: `Chương ${nextNum}`,
        description: "",
        parent_id: category.id,
      });
      await fetchCommunityData();
    } catch (err) {
      alert("Lỗi tạo chương nhanh: " + err.message);
    }
  };

  const handleQuickAddDeck = async chapter => {
    try {
      const nextNum = (chapter.decks || []).length + 1;
      await nhostService.createDeck({
        title: `Bài ${nextNum}`,
        description: "",
        community_folder_id: chapter.id,
      });
      await fetchCommunityData();
    } catch (err) {
      alert("Lỗi tạo bài nhanh: " + err.message);
    }
  };

  const handleQuickAddReviewDeck = async chapter => {
    try {
      await nhostService.createDeck({
        title: `Ôn tập ${chapter.title}`,
        description: "Bài ôn tập cuối chương",
        community_folder_id: chapter.id,
        custom_columns: { type: "review_chapter" },
      });
      await fetchCommunityData();
    } catch (err) {
      alert("Lỗi tạo bài ôn tập: " + err.message);
    }
  };

  const renderMoriTimeline = (root, deck) => {
    const stage = deck.stages[activeMoriStage] || deck.stages[0];
    const stageFolder = root.subfolders?.find(f =>
      f.title.toLowerCase().includes(stage.title.toLowerCase())
    );

    return (
      <div
        id={`mori-content-${root.id}`}
        className="p-5 md:p-6 bg-slate-50/40 dark:bg-slate-900/40 relative"
      >
        {/* Close Button */}
        <button
          onClick={e => {
            e.stopPropagation();
            setExpandedLevelId(null);
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all z-20 shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <X size={16} />
        </button>

        {/* Stage Switcher Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-slate-100/50 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700 w-fit mx-auto shadow-inner">
          {deck.stages.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveMoriStage(idx);
                setExpandedMoriCategory(null);
              }}
              className={`px-5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeMoriStage === idx ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {stageFolder ? (
          <div className="space-y-3">
            {/* Phần (Category) Cards — clickable to expand */}
            {stageFolder.subfolders?.map(category => {
              const isKanji =
                category.title.includes("漢字") || category.title.toLowerCase().includes("kanji");
              const isExpCat = expandedMoriCategory === category.id;
              const chapters = category.subfolders || [];
              const directDecks = category.decks || [];
              const totalItems = chapters.length + directDecks.length;

              return (
                <div
                  key={category.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden transition-all duration-300 ${isKanji ? "border-amber-200" : "border-slate-100 dark:border-slate-700"}`}
                >
                  {/* Phần Header — Click to expand */}
                  <div
                    onClick={() => setExpandedMoriCategory(isExpCat ? null : category.id)}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-all group ${isExpCat ? "bg-slate-50 dark:bg-slate-700/50" : "hover:bg-slate-50/50 dark:hover:bg-slate-700/30"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${isKanji ? "bg-amber-50 text-amber-500" : "bg-indigo-50 text-indigo-500"}`}
                      >
                        {isKanji ? "漢" : category.title.charAt(0)}
                      </div>
                      <div>
                        <span
                          className={`text-sm font-black ${isKanji ? "text-amber-600" : "text-slate-700 dark:text-white"}`}
                        >
                          {category.title}
                        </span>
                        <span className="ml-2 text-[10px] font-bold text-slate-300">
                          {totalItems > 0
                            ? `${chapters.length} chương · ${directDecks.length} bài`
                            : "Trống"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleEditFolder(category);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Sửa tên phần"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteFolder(category);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Xóa phần học"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                      {/* Add Chapter */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleQuickAddChapter(category, chapters);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-indigo-50 hover:text-indigo-500 transition-all"
                        title="Thêm Chương nhanh"
                      >
                        <FolderPlus size={14} />
                      </button>
                      {/* Add Deck directly */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleQuickAddDeck(category);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-green-50 hover:text-green-500 transition-all"
                        title="Thêm bài lẻ nhanh"
                      >
                        <Plus size={14} />
                      </button>
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-transform duration-300 ${isExpCat ? "rotate-180 text-indigo-500" : "text-slate-300"}`}
                      >
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Chương + Bài */}
                  {isExpCat && (
                    <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Chương (Chapters = subfolders of category) */}
                      {chapters.map((chapter, cIdx) => (
                        <div
                          key={`${chapter.id}-${cIdx}`}
                          className="group bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center text-[10px] font-black">
                                {cIdx + 1}
                              </span>
                              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                                {chapter.title}
                              </span>
                              <span className="text-[10px] text-slate-300 font-bold">
                                {(chapter.decks || []).length} bài
                              </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditFolder(chapter)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all"
                                title="Sửa tên chương"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteFolder(chapter)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                title="Xóa chương này"
                              >
                                <Trash2 size={12} />
                              </button>
                              <button
                                onClick={() => handleQuickAddDeck(chapter)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-green-500 hover:bg-green-50 transition-all"
                                title="Thêm bài học nhanh"
                              >
                                <Plus size={12} />
                              </button>
                              <button
                                onClick={() => handleQuickAddReviewDeck(chapter)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-all"
                                title="Thêm bài Ôn tập nhanh"
                              >
                                <Award size={12} />
                              </button>
                              <button
                                onClick={() => handleOpenImportToFolder(chapter, root.title)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                                title="Import Excel vào chương này"
                              >
                                <FileSpreadsheet size={12} />
                              </button>
                            </div>
                          </div>
                          {/* Bài (Decks inside chapter) */}
                          {(chapter.decks || []).length > 0 && (
                            <div className="px-3 pb-2 space-y-0.5">
                              {chapter.decks.map(d => {
                                const isReview =
                                  d.title.toLowerCase().includes("ôn tập") ||
                                  (d.custom_columns && d.custom_columns.type === "review_chapter");
                                return (
                                  <div
                                    key={`${d.id}-chapter`}
                                    onClick={() => navigate(`/deck/${d.id}`)}
                                    className={`flex items-center justify-between group/deck cursor-pointer p-2 rounded-lg transition-all ml-8 ${isReview ? "bg-amber-50/40 dark:bg-amber-900/10 border border-amber-100/30 dark:border-amber-900/20" : "hover:bg-white dark:hover:bg-slate-800"}`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      {isReview && (
                                        <Award size={10} className="text-amber-500 shrink-0" />
                                      )}
                                      <span
                                        className={`text-[12px] font-medium truncate ${isReview ? "text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-slate-400 group-hover/deck:text-indigo-600"}`}
                                      >
                                        {d.title}
                                      </span>
                                      {(() => {
                                        const dueCount =
                                          dueCountsMap[d.title] || dueCountsMap[d.id];
                                        if (!dueCount) return null;
                                        return (
                                          <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-500/20 px-1.5 py-0.5 rounded-md animate-pulse">
                                            <Brain size={8} className="text-orange-500" />
                                            <span className="text-[8px] font-black text-orange-600 dark:text-orange-400">
                                              {dueCount}
                                            </span>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover/deck:opacity-100 transition-opacity">
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleEditDeck(d);
                                        }}
                                        className="p-1.5 rounded-md text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                                        title="Sửa bài học"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleDeleteDeck(d);
                                        }}
                                        className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        title="Xóa bài học"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          setMoveDeckTarget(d);
                                        }}
                                        className="p-1.5 rounded-md text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                                        title="Chuyển thư mục"
                                      >
                                        <FolderPlus size={12} />
                                      </button>
                                      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          setAddVocabOpen(d.id);
                                        }}
                                        className="p-1.5 rounded-md text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                                        title="Thêm từ vựng bằng JSON"
                                      >
                                        <FileCode size={14} />
                                      </button>
                                      <ChevronRight
                                        size={12}
                                        className="text-slate-200 group-hover/deck:text-indigo-500 shrink-0"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Direct Decks (Bài trực tiếp trong Phần, không thuộc chương nào) */}
                      {directDecks.length > 0 && (
                        <div className="space-y-0.5 pt-1">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2">
                            Bài lẻ
                          </span>
                          {directDecks.map(d => (
                            <div
                              key={`${d.id}-direct`}
                              onClick={() => navigate(`/deck/${d.id}`)}
                              className="flex items-center justify-between group/deck cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-all"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 group-hover/deck:text-indigo-600 truncate">
                                  {d.title}
                                </span>
                                {(() => {
                                  const dueCount = dueCountsMap[d.title] || dueCountsMap[d.id];
                                  if (!dueCount) return null;
                                  return (
                                    <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-500/20 px-1.5 py-0.5 rounded-md animate-pulse">
                                      <Brain size={8} className="text-orange-500" />
                                      <span className="text-[8px] font-black text-orange-600 dark:text-orange-400">
                                        {dueCount}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover/deck:opacity-100 transition-opacity">
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setAddVocabOpen(d.id);
                                  }}
                                  className="p-1.5 rounded-md text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                                  title="Thêm từ vựng bằng JSON"
                                >
                                  <FileCode size={14} />
                                </button>
                                <ChevronRight
                                  size={12}
                                  className="text-slate-200 group-hover/deck:text-indigo-500 shrink-0"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Empty state */}
                      {chapters.length === 0 && directDecks.length === 0 && (
                        <div className="py-6 text-center">
                          <p className="text-xs text-slate-300 mb-3">Chưa có chương hoặc bài nào</p>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleQuickAddChapter(category, chapters)}
                              className="px-4 py-1.5 text-[10px] font-black text-indigo-500 bg-indigo-50 rounded-lg uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
                            >
                              + Thêm Chương
                            </button>
                            <button
                              onClick={() => handleQuickAddDeck(category)}
                              className="px-4 py-1.5 text-[10px] font-black text-green-500 bg-green-50 rounded-lg uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all"
                            >
                              + Thêm Bài Lẻ
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thêm Phần mới (Category) */}
            <button
              onClick={() => {
                setCreateFolderParent({
                  id: stageFolder.id,
                  title: stageFolder.title,
                  rootTitle: root.title,
                });
                setNewFolderTitle("");
                setCreateFolderOpen(true);
              }}
              className="w-full py-3.5 mt-2 border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-2xl text-slate-400 hover:text-[#009245] hover:border-[#009245]/30 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all font-bold text-sm flex items-center justify-center gap-2"
            >
              <FolderPlus size={16} /> Thêm phần học mới vào {stage.title}
            </button>

            {/* If stage has no categories at all */}
            {(!stageFolder.subfolders || stageFolder.subfolders.length === 0) && (
              <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-400 mb-4">Chặng này chưa có phần nào</p>
                <button
                  onClick={() => {
                    setCreateFolderParent({
                      id: stageFolder.id,
                      title: stageFolder.title,
                      rootTitle: root.title,
                    });
                    setNewFolderTitle("");
                    setCreateFolderOpen(true);
                  }}
                  className="px-6 py-2.5 bg-indigo-500 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-lg hover:bg-indigo-600 transition-all"
                >
                  + Tạo phần mới
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-10 text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-700">
            <Package size={32} className="mx-auto text-slate-200 mb-4" />
            <p className="text-sm font-bold text-slate-400 mb-4">
              Lộ trình này chưa được tạo danh mục chuẩn
            </p>
            <button
              onClick={() => handleInitializeMori(deck)}
              className="px-6 py-2.5 bg-[#009245] text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-lg shadow-green-100"
            >
              Kích hoạt lộ trình
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      variants={containerVars}
      initial="hidden"
      animate="show"
      className="pb-20 space-y-8"
    >
      {/* 0. Mobile Quick Access Grid (JLPT Levels) */}
      <motion.div variants={itemVars} className="lg:hidden grid grid-cols-5 gap-2 px-2">
        {mainDecks.slice(0, 5).map(deck => (
          <button
            key={deck.id}
            onClick={() => {
              const source = deck.id.toUpperCase().includes("ENG") ? "sheet" : vocaSource;
              navigate(`/deck/${deck.id}?source=${source}`);
            }}
            className="flex flex-col items-center gap-1.5 p-2"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${deck.color}`}
            >
              <span className="text-[10px] font-black uppercase text-center leading-none">
                {deck.id}
              </span>
            </div>
          </button>
        ))}
      </motion.div>

      {/* 1. Combined SRS & Hero Banner */}
      <motion.div variants={itemVars} className="space-y-4">
        <AnimatePresence>
        {dueItems.length > 0 && showSrsBanner ? (
          <motion.div
            initial={{ opacity: 1, scale: 1, height: "auto" }}
            exit={{ opacity: 0, scale: 0.95, height: 0, overflow: "hidden" }}
            transition={{ duration: 0.5 }}
            onClick={() => navigate("/quiz/srs")}
            className="relative rounded-[32px] md:rounded-[40px] p-6 md:p-10 bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-2xl shadow-indigo-200/20 cursor-pointer group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-800/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800/20 backdrop-blur-md text-[8px] font-black uppercase tracking-widest">
                  <Brain size={12} />
                  Cần ôn tập
                </div>
                <h2 className="text-xl md:text-3xl font-black">
                  Bạn có <span className="text-amber-300">{dueItems.length}</span> từ cần học
                </h2>
              </div>
              <ChevronRight
                size={20}
                className="text-white/50 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </motion.div>
        ) : (
          event && (
            <div
              className="relative rounded-[32px] md:rounded-[42px] p-6 md:p-12 overflow-hidden bg-gradient-to-br from-[#58CC02] to-[#46A302] shadow-xl text-white"
              style={{ backgroundColor: event.color }}
            >
              <div className="relative z-10 space-y-2">
                <span className="bg-white dark:bg-slate-800/20 backdrop-blur-md text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  {event.decoration} {event.name}
                </span>
                <h2 className="text-xl md:text-4xl font-black leading-tight max-w-sm">
                  {event.greeting}
                </h2>
              </div>
              <div className="absolute bottom-[-10px] right-6 text-7xl opacity-20 transform rotate-12 select-none pointer-events-none">
                {event.icon}
              </div>
            </div>
          )
        )}
        </AnimatePresence>
      </motion.div>

      {/* 2. Compact Source Switcher */}
      <motion.div variants={itemVars} className="flex flex-col items-center gap-3">
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-full border border-slate-200/50 dark:border-slate-800 shadow-inner w-fit">
          <button
            onClick={() => setVocaSource("sheet")}
            className={`px-6 py-2 rounded-full text-[10px] font-black tracking-tight transition-all ${
              vocaSource === "sheet"
                ? "bg-white dark:bg-slate-700 text-[#1CB0F6] shadow-md"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            GIÁO TRÌNH
          </button>
          <button
            onClick={() => setVocaSource("voca")}
            className={`px-6 py-2 rounded-full text-[10px] font-black tracking-tight transition-all ${
              vocaSource === "voca"
                ? "bg-white dark:bg-slate-700 text-amber-500 shadow-md"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            PREMIUM
          </button>
        </div>
      </motion.div>

      {/* 3. Personalized Learning Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: SRS Flash Review & Countdown (4 units) */}
        <motion.div variants={itemVars} className="lg:col-span-4 flex flex-col gap-6">
          <JLPTCountdown />

          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Languages size={16} className="text-indigo-500" /> Ôn tập chớp nhoáng
            </h3>
            <button
              onClick={forceRefresh}
              disabled={syncing}
              className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-all ${syncing ? "animate-spin text-indigo-500" : ""}`}
              title="Cập nhật dữ liệu từ đám mây"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-4">
            {randomSrsWords.length > 0 ? (
              randomSrsWords.map((item, idx) => (
                <motion.div
                  key={item.word + idx}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all group cursor-pointer relative overflow-hidden"
                  onClick={() => navigate(`/quiz/srs`)}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Book size={64} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-black text-indigo-500 uppercase">
                        SRS
                      </span>
                      {item.level && !/^[0-9a-f-]{36}$/i.test(item.level) && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {item.level}
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white mb-1">
                      {item.word}
                    </p>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.meaning}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-[10px] font-black text-indigo-500 gap-1 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Học ngay <ChevronRight size={12} />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="h-full min-h-[200px] bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <Plus size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-400">
                  Xem từ vựng bất kỳ để bắt đầu bộ nhớ SRS
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Center/Right Column: Multi-Card Grid (8 units) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* Daily Quote - Modern Large Card */}
          {quote && (
            <motion.div
              variants={itemVars}
              className="md:col-span-2 bg-white dark:bg-slate-800 rounded-[32px] md:rounded-[40px] border-2 border-slate-100 dark:border-slate-800 p-6 md:p-10 flex flex-col justify-center shadow-xl shadow-slate-200/10 dark:shadow-none relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#58CC02]/5 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-amber-400 fill-amber-400" />
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Cảm hứng
                </h4>
              </div>
              <p className="text-lg md:text-3xl font-black text-slate-800 dark:text-white leading-tight mb-3">
                「{renderFurigana(quote.ja)}」
              </p>
              <p className="text-sm font-bold text-slate-400">{quote.vi}</p>
            </motion.div>
          )}

          {/* Arena Card */}
          <motion.div
            variants={itemVars}
            onClick={() => navigate("/game/speed-60s")}
            className="bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-[32px] md:rounded-[40px] p-6 text-white shadow-xl relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute -bottom-6 -right-6 text-7xl text-white/10 font-black pointer-events-none transform -rotate-12">
              <Zap size={80} />
            </div>
            <div className="relative z-10 space-y-4">
              <h3 className="text-2xl font-black leading-tight">
                ĐẤU TRƯỜNG <br /> TỐC ĐỘ 60S
              </h3>
              <div className="flex items-center gap-2">
                <div className="bg-white dark:bg-slate-800/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                  <span className="text-sm font-black text-amber-300">
                    {account?.arenaProgress?.totalCoins || 0} 🪙
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              variants={itemVars}
              className="bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 p-5 flex flex-col items-center justify-center text-center"
            >
              <Flame size={20} className="text-orange-500 mb-1" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Chuỗi
              </span>
              <span className="text-lg font-black text-slate-800 dark:text-white">
                {calculateCurrentStreak(account?.streak)} n
              </span>
            </motion.div>
            <motion.div
              variants={itemVars}
              className="bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 p-5 flex flex-col items-center justify-center text-center"
            >
              <Trophy size={20} className="text-indigo-500 mb-1" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                XP
              </span>
              <span className="text-lg font-black text-slate-800 dark:text-white">
                {(account?.totalQuizzes || 0) * 10}
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 4. Secondary Navigation (Show only on Desktop) */}
      <div className="hidden lg:block">
        <motion.div
          variants={itemVars}
          onClick={() => navigate("/grammar")}
          className="relative bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-600/5 dark:to-orange-500/5 border-2 border-amber-200/30 dark:border-amber-500/10 rounded-[40px] p-8 flex items-center justify-between cursor-pointer hover:border-amber-300/50 transition-all group overflow-hidden"
        >
          <div className="flex items-center gap-8 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FFC800] to-[#FF9600] rounded-[22px] flex items-center justify-center text-white shadow-xl shadow-amber-300/30 group-hover:rotate-6 transition-transform">
              <Book size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">Ngữ pháp JLPT</h3>
              <p className="text-md font-bold text-slate-400 mt-1">
                Phân loại N5 → N1 &middot; Cấu trúc &middot; Ví dụ minh họa chi tiết
              </p>
            </div>
          </div>
          <ChevronRight className="text-amber-500" size={24} />
        </motion.div>
      </div>

      {/* 5. Main Content Area */}
      {vocaSource === "voca" ? (
        <div className="space-y-16">
          {/* ─── Premium JLPT Section ──── */}
          <section className="space-y-6">
            <header className="flex flex-col gap-1">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                8000 Từ vựng JLPT (Mới)
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Hệ thống từ vựng chuyên sâu bám sát đề thi 2025
              </p>
            </header>

            <div className="space-y-4">
              {premiumDecks.map(deck => {
                const levelMatch = deck.id.match(/N[1-5]/i)?.[0]?.toUpperCase();
                // Match by exact title or flexible includes
                const root = communityTree.find(r => {
                  const t = r.title.toUpperCase();
                  if (!t.includes(levelMatch)) return false;
                  // Strictly Premium: prioritize '8000' and 'TỪ VỰNG', exclude others
                  return (
                    (t.includes("8000") && t.includes("TỪ VỰNG")) ||
                    (t.includes("TỪ VỰNG") && !t.includes("MONDAI") && !t.includes("ORIGINAL") && !t.includes("JAPAN") && !t.includes("MORI")) ||
                    t === deck.title.toUpperCase()
                  );
                });
                const isExpanded = root && expandedLevelId === root.id;

                const subfolderCount = root?.subfolders?.length || 0;

                return (
                  <section
                    key={deck.id}
                    className={`rounded-[40px] transition-all duration-300 ${isExpanded ? "bg-white dark:bg-slate-900/40 p-1 border-2 border-slate-100 dark:border-slate-800" : "bg-transparent"}`}
                  >
                    <motion.div
                      variants={itemVars}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        if (root) setExpandedLevelId(isExpanded ? null : root.id);
                        else setLevelModal({ id: deck.id, label: deck.title });
                      }}
                      className={`flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer group ${isExpanded ? "mb-4" : ""}`}
                    >
                      <div className="flex items-center gap-5">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={e => {
                            e.stopPropagation();
                            const idMatch = deck.id.match(/N[1-5]/i);
                            const id = idMatch ? idMatch[0].toUpperCase() : deck.id;
                            setLevelModal({ id, label: deck.title });
                          }}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg cursor-pointer ${deck.color}`}
                        >
                          {deck.icon ? (
                            <img 
                              src={deck.icon} 
                              alt={deck.shortTitle} 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement.innerHTML = deck.shortTitle;
                              }}
                            />
                          ) : (
                            deck.shortTitle
                          )}
                        </motion.div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 transition-colors">
                            {deck.title}
                          </h3>
                          <p className="text-xs font-bold text-slate-400">
                            {root ? (
                              subfolderCount > 0
                                ? `${subfolderCount} chuyên mục`
                                : `${root?.decks?.length || 0} bài học`
                            ) : (vocaCounts[deck.id] || deck.count) ? (
                              `${vocaCounts[deck.id] || deck.count} bài học`
                            ) : null}
                            { (root || deck.count) && " · " }
                            {deck.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setAddVocabOpen(root?.title || deck.id);
                            }}
                            className="p-2.5 bg-[#58CC02] hover:bg-[#46A302] text-white rounded-xl shadow-md transition-all hover:scale-105"
                            title="Thêm từ vựng mới"
                          >
                            <Plus size={18} />
                          </button>
                          {root && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setCreateDeckFolder({
                                  id: root.id,
                                  title: "Gốc",
                                  rootTitle: root.title,
                                });
                                setNewDeckTitle("");
                                setNewDeckDesc("");
                                setCreateDeckOpen(true);
                              }}
                              className="p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md transition-all hover:scale-105"
                              title="Tạo bài học mới"
                            >
                              <FolderPlus size={18} />
                            </button>
                          )}
                        </div>
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isExpanded ? "bg-slate-800 border-slate-800 text-white rotate-180" : "border-slate-100 dark:border-slate-700 text-slate-300 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500"}`}
                        >
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </div>
                    </motion.div>
                    <AnimatePresence>
                      {isExpanded && root && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          {renderTreeContent(root, true)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                );
              })}
            </div>
          </section>

          {/* ─── Japience Original Section ──── */}
          <section className="space-y-6">
            <header className="flex flex-col gap-1">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Từ vựng Original từ sách
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Dữ liệu từ vựng từ sách
              </p>
            </header>

            <div className="space-y-4">
              {japienceDecks.map(deck => {
                const levelMatch = deck.id.match(/N[1-5]/i)?.[0]?.toUpperCase();
                // Priority: match exact title or keywords
                const root = communityTree.find(r => {
                  const t = r.title.toUpperCase();
                  if (!t.includes(levelMatch)) return false;
                  // Japanience: match 'JAPANI' or 'ORIGINAL'
                  return (
                    (t.includes("JAPAN") ||
                      t.includes("ORIGINAL") ||
                      t === deck.title.toUpperCase()) &&
                    !t.includes("MORI")
                  );
                });
                const isExpanded = root && expandedLevelId === root.id;

                return (
                  <section
                    key={deck.id}
                    className={`rounded-[40px] transition-all duration-300 ${isExpanded ? "bg-white dark:bg-slate-900/40 p-1 border-2 border-slate-100 dark:border-slate-800" : "bg-transparent"}`}
                  >
                    <motion.div
                      variants={itemVars}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        if (root) setExpandedLevelId(isExpanded ? null : root.id);
                        else setLevelModal({ id: deck.id, label: deck.title });
                      }}
                      className={`flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer group ${isExpanded ? "mb-4" : ""}`}
                    >
                      <div className="flex items-center gap-5">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={e => {
                            e.stopPropagation();
                            setLevelModal({ id: deck.id, label: deck.title });
                          }}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg cursor-pointer ${deck.color}`}
                        >
                          {deck.icon ? (
                            <img 
                              src={deck.icon} 
                              alt={deck.shortTitle} 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement.innerHTML = deck.shortTitle;
                              }}
                            />
                          ) : (
                            deck.shortTitle
                          )}
                        </motion.div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 transition-colors">
                            {deck.title}
                          </h3>
                          <p className="text-xs font-bold text-slate-400">
                            {root?.decks?.length || 0} bài học &middot; {deck.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setAddVocabOpen(root?.title || deck.id);
                            }}
                            className="p-2.5 bg-[#58CC02] hover:bg-[#46A302] text-white rounded-xl shadow-md transition-all hover:scale-105"
                            title="Thêm từ vựng mới"
                          >
                            <Plus size={18} />
                          </button>
                          {root && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setCreateDeckFolder({
                                  id: root.id,
                                  title: "Gốc",
                                  rootTitle: root.title,
                                });
                                setNewDeckTitle("");
                                setNewDeckDesc("");
                                setCreateDeckOpen(true);
                              }}
                              className="p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md transition-all hover:scale-105"
                              title="Tạo bài học mới"
                            >
                              <FolderPlus size={18} />
                            </button>
                          )}
                        </div>
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-700 ${isExpanded ? "bg-[#009245] text-white rotate-180 border-[#009245] shadow-md shadow-green-200" : "border-slate-100 dark:border-slate-700 text-slate-300 group-hover:text-white group-hover:bg-[#009245] group-hover:border-[#009245]"}`}
                        >
                          <ChevronDown size={18} />
                        </div>
                      </div>
                    </motion.div>
                    <AnimatePresence>
                      {isExpanded && root && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white dark:bg-slate-800/40 rounded-[32px] mt-2 border-2 border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative"
                        >
                          {renderTreeContent(root, true)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                );
              })}
            </div>
          </section>

          {/* ─── Dũng Mori Curriculum Section ──── */}
          <section className="space-y-6">
            <header className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <img
                  src="https://dungmori.com/assets/img/logo-mori.png"
                  alt="Mori"
                  className="w-10 h-10 rounded-full object-contain bg-white dark:bg-slate-800 shadow-sm p-1"
                />
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                  Lộ trình giáo trình Dũng Mori
                </h2>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-[52px]">
                Phương pháp 3 chặng đột phá &middot; Kanji phân tích bộ thủ
              </p>
            </header>

            <div className="space-y-4">
              {dungMoriDecks.map(deck => {
                const levelMatch = deck.id.match(/N[1-5]/i)?.[0]?.toUpperCase();
                const root = communityTree.find(
                  r =>
                    r.title.toUpperCase().includes("MORI") &&
                    r.title.toUpperCase().includes(levelMatch || "")
                );
                const isExpanded = root && expandedLevelId === root.id;

                return (
                  <section
                    key={deck.id}
                    className={`rounded-[40px] transition-all duration-300 ${isExpanded ? "bg-white dark:bg-slate-900/40 p-1 border-2 border-[#009245]/20 shadow-xl shadow-green-100/30" : "bg-transparent"}`}
                  >
                    <motion.div
                      variants={itemVars}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        if (root) {
                          setExpandedLevelId(isExpanded ? null : root.id);
                        } else {
                          if (
                            confirm(
                              `Bạn chưa tạo lộ trình cho ${deck.title}. Bạn có muốn hệ thống tự động khởi tạo lộ trình 3 chặng chuẩn Dũng Mori ngay bây giờ không?`
                            )
                          ) {
                            handleInitializeMori(deck);
                          }
                        }
                      }}
                      className={`relative overflow-hidden group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-[32px] border-2 cursor-pointer transition-all duration-500 ${isExpanded ? "border-[#009245] mb-4" : "border-slate-100 dark:border-slate-800 hover:border-[#009245]/50 hover:shadow-lg"}`}
                    >
                      {initializingMori === deck.id && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-[32px]">
                          <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-8 h-8 border-4 border-slate-100 border-t-[#009245] rounded-full animate-spin shadow-lg" />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-5 z-10">
                        <div
                          className={`w-14 h-14 rounded-2xl ${deck.color} flex items-center justify-center text-white font-black text-xl shadow-lg cursor-pointer group-hover:rotate-6 transition-transform duration-500 shrink-0`}
                        >
                          {deck.icon ? (
                            <img 
                              src={deck.icon} 
                              alt={deck.shortTitle} 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement.innerHTML = deck.shortTitle;
                              }}
                            />
                          ) : (
                            deck.shortTitle
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 group-hover:text-[#009245] transition-colors">
                            {deck.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-[#009245] rounded-lg text-[8px] font-black uppercase tracking-widest border border-green-100 dark:border-green-800/30">
                              Standard Plan
                            </span>
                            <p className="text-xs font-bold text-slate-400">{deck.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 mt-4 sm:mt-0 bg-slate-50/80 dark:bg-slate-900/60 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-transparent border-slate-100 dark:border-slate-700/50 z-10">
                        <div className="flex -space-x-2.5">
                          {deck.stages.map((s, i) => (
                            <div
                              key={s.id}
                              onClick={e => {
                                e.stopPropagation();
                                if (root) {
                                  setExpandedLevelId(root.id);
                                  scrollToMoriStage(root.id, i);
                                }
                              }}
                              className={`relative w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-black text-white shadow-md transition-all hover:scale-125 hover:z-20 cursor-pointer ${i === 0 ? "bg-green-500" : i === 1 ? "bg-amber-500" : "bg-red-500"}`}
                            >
                              {i + 1}
                              {isExpanded && activeMoriStage === i && (
                                <motion.div
                                  layoutId="stage-active-indicator"
                                  className="absolute -bottom-1 w-4 h-1 bg-white dark:bg-slate-800 rounded-full shadow-sm"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          {root && (
                            <div className="hidden sm:flex items-center gap-2 mr-2">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setAddVocabOpen(root.title || deck.id);
                                }}
                                className="p-2.5 bg-[#009245] hover:bg-[#007436] text-white rounded-xl shadow-md transition-all hover:scale-105"
                                title="Thêm từ vựng bằng JSON"
                              >
                                <FileCode size={18} />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setCreateDeckFolder({
                                    id: root.id,
                                    title: "Gốc",
                                    rootTitle: root.title,
                                  });
                                  setNewDeckTitle("");
                                  setNewDeckDesc("");
                                  setCreateDeckOpen(true);
                                }}
                                className="p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md transition-all hover:scale-105"
                                title="Tạo bài học mới"
                              >
                                <FolderPlus size={18} />
                              </button>
                            </div>
                          )}
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-700 ${isExpanded ? "bg-[#009245] text-white rotate-180 border-[#009245] shadow-md shadow-green-200" : "border-slate-100 dark:border-slate-700 text-slate-300 group-hover:text-white group-hover:bg-[#009245] group-hover:border-[#009245]"}`}
                          >
                            <ChevronDown size={18} />
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {isExpanded && root && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white dark:bg-slate-800/40 rounded-[32px] mt-2 border-2 border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative"
                        >
                          {renderMoriTimeline(root, deck)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                );
              })}
            </div>
          </section>

          {/* ─── Community Tree Header & List ──── */}
          {loading ? (
            <div className="pt-8 border-t-2 border-slate-100 dark:border-slate-800 space-y-6">
              <header className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    Danh mục chi tiết
                  </h2>
                  <p className="text-xs font-bold text-[#1CB0F6] uppercase tracking-widest animate-pulse">
                    Đang đồng bộ thư viện cộng đồng...
                  </p>
                </div>
              </header>

              <div className="space-y-4">
                {[1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between shadow-sm animate-pulse"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-4 w-40 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-3 w-64 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-700 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-8 border-t-2 border-slate-100 dark:border-slate-800 space-y-8">
              <header className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    Danh mục chi tiết
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Khám phá thư viện từ vựng cộng đồng
                  </p>
                </div>
                <button
                  onClick={() => setCreateRootOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-200/30 transition-all hover:scale-105"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 5v14m7-7H5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Tạo danh mục mới
                </button>
              </header>
              {/* Modal tạo danh mục gốc mới */}
              {createRootOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                  onClick={() => setCreateRootOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-slate-100 dark:border-slate-700 w-full max-w-md mx-4 overflow-hidden"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center">
                          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M12 5v14m7-7H5"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-white">
                            Tạo danh mục mới
                          </h3>
                          <p className="text-xs text-slate-400 font-bold">
                            Thêm danh mục gốc cho cộng đồng
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setCreateRootOpen(false)}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                          <path
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
                          Tên danh mục *
                        </label>
                        <input
                          type="text"
                          value={newRootTitle}
                          onChange={e => setNewRootTitle(e.target.value)}
                          placeholder="VD: TIẾNG ANH - Khóa học cộng đồng"
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm outline-none focus:border-indigo-400 transition-colors"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
                          Mô tả (tùy chọn)
                        </label>
                        <input
                          type="text"
                          value={newRootDesc}
                          onChange={e => setNewRootDesc(e.target.value)}
                          placeholder="VD: Từ vựng cộng đồng cho tiếng Anh"
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm outline-none focus:border-indigo-400 transition-colors"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setCreateRootOpen(false)}
                          className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleCreateRoot}
                          disabled={!newRootTitle.trim() || createRootSaving}
                          className={`flex-1 px-4 py-3 font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                            newRootTitle.trim() && !createRootSaving
                              ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200/50"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {createRootSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                <path
                                  fill="currentColor"
                                  d="M12 5v14m7-7H5"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Tạo danh mục
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
              <motion.div
                variants={itemVars}
                className="flex items-center gap-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 shadow-sm"
              >
                <button
                  onClick={() => setAddVocabOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#58CC02] hover:bg-[#46A302] text-white text-xs font-black rounded-xl shadow-lg shadow-green-200/30 transition-all hover:scale-105"
                >
                  <Plus size={15} /> Thêm từ vựng
                </button>
                <button
                  onClick={() => {
                    // Default to a picker for create deck
                    setImportAfterCreate(true);
                    setExcelPickerOpen("CREATE_DECK");
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-200/30 transition-all hover:scale-105"
                >
                  <FolderPlus size={15} /> Tạo bài học
                </button>
                <button
                  onClick={() => {
                    setSelectedDeckId("");
                    setExcelPickerOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:border-green-300 hover:text-green-600 dark:hover:text-green-400 transition-all hover:scale-105"
                >
                  <FileSpreadsheet size={15} /> Import Excel
                </button>
              </motion.div>
              <div className="space-y-6">
                {(() => {
                  const filteredRoots = communityTree.filter(root => {
                    return !matchedIds.has(root.id);
                  });

                  if (filteredRoots.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/20 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                        Không còn danh mục cộng đồng nào khác.
                      </div>
                    );
                  }

                  return filteredRoots.map(root => {
                    const rootId = root.title.toUpperCase();
                    const isExpanded = expandedLevelId === root.id;
                    const rootColor = rootId.includes("N5")
                      ? "bg-[#58CC02]"
                      : rootId.includes("N4")
                        ? "bg-[#FF9600]"
                        : rootId.includes("N3")
                          ? "bg-[#FF4B4B]"
                          : rootId.includes("N2")
                            ? "bg-[#A342FF]"
                            : rootId.includes("N1")
                              ? "bg-[#37464F]"
                              : rootId.includes("TI")
                                ? "bg-[#1CB0F6]"
                                : "bg-indigo-500";

                    return (
                      <section
                        key={root.id}
                        className={`rounded-[40px] transition-all duration-300 ${isExpanded ? "bg-white dark:bg-slate-900/40 p-1 border-2 border-slate-100 dark:border-slate-800" : "bg-transparent"}`}
                      >
                        <header
                          onClick={() => setExpandedLevelId(isExpanded ? null : root.id)}
                          className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6 cursor-pointer rounded-[32px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isExpanded ? "mb-4" : ""}`}
                        >
                          <div className="flex items-center gap-5">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={e => {
                                e.stopPropagation();
                                const idMatch = root.title.match(/N[1-5]/i);
                                const id = idMatch ? idMatch[0].toUpperCase() : root.id;
                                setLevelModal({ id, label: root.title });
                              }}
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg cursor-pointer ${rootColor}`}
                            >
                              {root.title.toUpperCase().includes("TIẾNG NHẬT IT")
                                ? "Ti"
                                : root.title.substring(0, 2)}
                            </motion.div>
                            <div>
                              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                                {root.title}
                              </h2>
                              <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                                {root.subfolders?.length > 0
                                  ? `${root.subfolders.length} chuyên mục`
                                  : `${root.decks?.length || 0} bài học`}{" "}
                                &middot; {root.description || "Tài liệu học tập cộng đồng"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex gap-2">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setAddVocabOpen(root.title);
                                }}
                                className="p-2.5 bg-[#58CC02] hover:bg-[#46A302] text-white rounded-xl shadow-md transition-all hover:scale-105"
                                title="Thêm từ vựng"
                              >
                                <Plus size={18} />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setCreateDeckFolder({
                                    id: root.id,
                                    title: "Gốc",
                                    rootTitle: root.title,
                                  });
                                  setNewDeckTitle("");
                                  setNewDeckDesc("");
                                  setCreateDeckOpen(true);
                                }}
                                className="p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md transition-all hover:scale-105"
                                title="Tạo bài học mới trong danh mục này"
                              >
                                <FolderPlus size={18} />
                              </button>
                            </div>
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isExpanded ? "bg-slate-800 border-slate-800 text-white rotate-180" : "border-slate-100 dark:border-slate-700 text-slate-300 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500"}`}
                            >
                              <ChevronDown size={20} />
                            </div>
                          </div>
                        </header>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden px-6 pb-8"
                            >
                              {renderTreeContent(root)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Basic card view for Sheet mode
        <div className="space-y-12">
          <section className="space-y-8">
            <header className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600">
                <GraduationCap size={24} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Từ vựng JLPT{" "}
              </h2>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mainDecks.map(deck => (
                <DeckCard key={deck.id} {...deck} description={deck.description(vocaSource)} />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* 6. Bookmarks summary (Show only on Desktop) */}
      <div className="hidden lg:block">
        <motion.div
          variants={itemVars}
          className="bg-white dark:bg-slate-800 border-2 border-dashed border-[#FFC800]/50 rounded-[40px] p-10 flex items-center justify-between cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-all shadow-xl shadow-yellow-100/20 group"
          onClick={() => navigate("/bookmarks")}
        >
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-500/20 rounded-[22px] flex items-center justify-center text-yellow-600 shadow-lg shadow-yellow-200/50">
              <Bookmark size={32} fill="currentColor" />
            </div>
            <div>
              <p className="font-black text-slate-800 dark:text-white text-xl">
                Kho từ vựng của bạn
              </p>
              <p className="text-md font-bold text-slate-400 mt-1">
                Bạn đang lưu trữ {bookmarks.length} từ vựng quan trọng &middot; Hãy dành 5 phút ôn
                tập nhé!
              </p>
            </div>
          </div>
          <ChevronRight className="text-yellow-500" size={24} />
        </motion.div>
      </div>
      {/* Level modal (Quiz / Flashcards) */}
      {levelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setLevelModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-80 shadow-2xl border-2 border-slate-100 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="text-lg font-black text-slate-800 dark:text-white mb-4">
              {levelModal.label}
            </h4>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setLevelModal(null);
                  const filter = levelModal.id.includes("_KANJI") ? "?filter=kanji" : "";
                  navigate(`/quiz/${levelModal.id.split("_")[0]}${filter}`);
                }}
                className="w-full px-4 py-3 rounded-xl bg-[#58CC02] text-white font-bold"
              >
                Làm Quiz (Toàn trình độ)
              </button>
              <button
                onClick={() => {
                  setLevelModal(null);
                  const filter = levelModal.id.includes("_KANJI") ? "?filter=kanji" : "";
                  navigate(`/flashcards/${levelModal.id.split("_")[0]}${filter}`);
                }}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold"
              >
                Flashcards (Toàn trình độ)
              </button>
              <button
                onClick={() => setLevelModal(null)}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CrudModal for adding vocab (with deck select inside) ──────── */}

      <CrudModal
        open={!!addVocabOpen}
        onClose={() => setAddVocabOpen(false)}
        mode="create"
        title={
          addVocabOpen && typeof addVocabOpen === "string"
            ? `Thêm từ vựng — ${addVocabOpen}`
            : "Thêm từ vựng"
        }
        fields={(() => {
          if (!addVocabOpen) return vocaFields;
          // Filter decks based on addVocabOpen value
          const filteredDecks = allDecks.filter(d => {
            if (addVocabOpen === true) return true;
            const t = d.rootTitle.toUpperCase();
            const key = String(addVocabOpen).toUpperCase();

            // 1. Priority: Exact match
            if (t === key) return true;

            // 2. Strict matching for JLPT vs Non-JLPT (Original)
            const keyHasJLPT = key.includes("JLPT");
            const titleHasJLPT = t.includes("JLPT");

            if (keyHasJLPT !== titleHasJLPT) {
              const levelMatch = key.match(/N[1-5]/i)?.[0]?.toUpperCase();
              if (levelMatch && t.includes(levelMatch)) {
                if (!keyHasJLPT && titleHasJLPT) return false;
                if (keyHasJLPT && !titleHasJLPT) return false;
              }
            }

            // 3. Keyword based matching
            const levelMatch = key.match(/N[1-5]/i)?.[0]?.toUpperCase();
            if (levelMatch && t.includes(levelMatch)) {
              if (key.includes("ORIGINAL") || key.includes("JAPAN"))
                return t.includes("ORIGINAL") || t.includes("JAPAN");
              if (key.includes("PREMIUM") || key.includes("8000"))
                return t.includes("8000") || t.includes("TỪ VỰNG");
              return true;
            }
            return t.includes(key) || key.includes(t);
          });

          // Sort filtered decks to put exact matches first (if any)
          const sortedDecks = [...filteredDecks].sort((a, b) => {
            const aTitle = a.rootTitle.toUpperCase();
            const bTitle = b.rootTitle.toUpperCase();
            const key = String(addVocabOpen).toUpperCase();
            if (aTitle === key && bTitle !== key) return -1;
            if (bTitle === key && aTitle !== key) return 1;
            return 0;
          });

          return [
            {
              ...vocaFields[0],
              options: sortedDecks.map(d => {
                const isReview =
                  d.title.toLowerCase().includes("ôn tập") ||
                  (d.custom_columns && d.custom_columns.type === "review_chapter");
                return {
                  value: d.id,
                  label: `${isReview ? "⭐ " : ""}${d.rootTitle} › ${d.subTitle} › ${d.title}`,
                };
              }),
            },
            ...vocaFields.slice(1),
          ];
        })()}
        headerAddon={(() => {
          if (!addVocabOpen || typeof addVocabOpen !== "string") return null;
          const deck = allDecks.find(d => d.id === addVocabOpen);
          const isReview =
            deck?.title.toLowerCase().includes("ôn tập") ||
            (deck?.custom_columns && deck?.custom_columns.type === "review_chapter");
          if (!isReview) return null;
          return (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2">
              <Award size={14} className="text-amber-500" />
              <span className="text-[10px] font-bold text-amber-700">
                Đây là bài Ôn tập. Bạn có thể dán JSON chứa toàn bộ từ vựng của chương vào ô dưới
                cùng.
              </span>
            </div>
          );
        })()}
        initialData={{}}
        onSave={handleSaveVocab}
        saving={crudSaving}
      />

      {/* ─── Excel: pick deck then import ──────────────────────────────────── */}
      {excelPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setExcelPickerOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-slate-100 dark:border-slate-700 w-full max-w-sm mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  Import Excel
                </h3>
              </div>
              <button
                onClick={() => setExcelPickerOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Chọn bài
                </label>
                <select
                  value={selectedDeckId}
                  onChange={e => setSelectedDeckId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-[#1CB0F6] transition-all dark:text-white"
                >
                  <option value="">
                    -- Chọn {excelPickerOpen === "CREATE_DECK" ? "thư mục" : "bài học"} --
                  </option>
                  {(excelPickerOpen === "CREATE_DECK"
                    ? allFolders
                    : excelPickerOpen === true
                      ? allDecks
                      : allDecks.filter(d => {
                          const t = d.rootTitle.toUpperCase();
                          const key = String(excelPickerOpen).toUpperCase();
                          return t.includes(key) || key.includes(t);
                        })
                  ).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.rootTitle} › {item.title || item.rootTitle}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  if (excelPickerOpen === "CREATE_DECK") {
                    const folder = allFolders.find(f => f.id === selectedDeckId);
                    setCreateDeckFolder({
                      id: folder.id,
                      title: folder.title,
                      rootTitle: folder.rootTitle,
                    });
                    setNewDeckTitle("");
                    setNewDeckDesc("");
                    setExcelPickerOpen(false);
                    setCreateDeckOpen(true);
                  } else {
                    setExcelPickerOpen(false);
                    setExcelOpen(true);
                  }
                }}
                disabled={!selectedDeckId}
                className={`w-full px-4 py-3 font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                  selectedDeckId
                    ? "bg-[#58CC02] hover:bg-[#46A302] text-white shadow-lg shadow-green-200/50"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {excelPickerOpen === "CREATE_DECK" ? (
                  <FolderPlus size={16} />
                ) : (
                  <FileSpreadsheet size={16} />
                )}
                {excelPickerOpen === "CREATE_DECK" ? "Tiếp tục tạo bài" : "Tiếp tục Import"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ExcelImportModal
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        deckId={selectedDeckId}
        onImportDone={() => {
          setExcelOpen(false);
          if (selectedDeckId) {
            navigate(`/deck/${selectedDeckId}?source=voca`);
          }
        }}
      />

      {/* ─── Create Deck Modal ─────────────────────────────────────────────── */}
      {createDeckOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setCreateDeckOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-slate-100 dark:border-slate-700 w-full max-w-md mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <FolderPlus size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">
                    Thêm bài mới
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    {createDeckFolder?.rootTitle} → {createDeckFolder?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateDeckOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
                  Tên bài học *
                </label>
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={e => setNewDeckTitle(e.target.value)}
                  placeholder="VD: Bài 15 - Thể ý chí"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm outline-none focus:border-indigo-400 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
                  Mô tả (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newDeckDesc}
                  onChange={e => setNewDeckDesc(e.target.value)}
                  placeholder="VD: Từ vựng chương 15"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCreateDeckOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateDeck}
                  disabled={!newDeckTitle.trim() || createDeckSaving}
                  className={`flex-1 px-4 py-3 font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                    newDeckTitle.trim() && !createDeckSaving
                      ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200/50"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {createDeckSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FolderPlus size={16} /> Tạo bài
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── Create Folder (Chương) Modal ──────────────────────────────────── */}
      {createFolderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setCreateFolderOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-slate-100 dark:border-slate-700 w-full max-w-sm mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <FolderPlus size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {createFolderParent?.title?.includes("Chặng")
                      ? "Tạo phần mới"
                      : "Tạo chương mới"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {createFolderParent?.rootTitle} → {createFolderParent?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateFolderOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
                  {createFolderParent?.title?.includes("Chặng") ? "Tên phần *" : "Tên chương *"}
                </label>
                <input
                  type="text"
                  value={newFolderTitle}
                  onChange={e => setNewFolderTitle(e.target.value)}
                  placeholder={
                    createFolderParent?.title?.includes("Chặng")
                      ? "VD: 1. Chữ hán"
                      : "VD: Chương 1 - Cơ bản"
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm outline-none focus:border-indigo-400 transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setCreateFolderOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderTitle.trim() || createFolderSaving}
                  className={`flex-1 px-4 py-3 font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                    newFolderTitle.trim() && !createFolderSaving
                      ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200/50"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {createFolderSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FolderPlus size={16} />{" "}
                      {createFolderParent?.title?.includes("Chặng") ? "Tạo phần" : "Tạo chương"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Modal di chuyển bài học */}
      {moveDeckTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setMoveDeckTarget(null)}
        >
          {/* ... existing move modal code ... */}
        </div>
      )}

      {/* Modal xác nhận xóa bài học (Cascade) */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl border-2 border-red-100 dark:border-red-900/30 w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto text-red-500 animate-pulse">
                  <AlertTriangle size={40} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                    Xác nhận xóa bài học?
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 font-bold px-2">
                    Bạn có chắc chắn muốn xóa bài học <span className="text-red-500">"{deleteConfirmTarget.title}"</span>?
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/30 text-left">
                  <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Thông tin xóa tầng (Cascade):</p>
                  <ul className="text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                    <li>Toàn bộ từ vựng trong bài sẽ bị xóa</li>
                    <li>Các cấu trúc đề thi, mondai đi kèm sẽ bị xóa</li>
                    <li>Lịch sử làm bài (nếu có) có thể bị ảnh hưởng</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDeleteConfirmTarget(null)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={executeDeleteDeck}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-200/50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Xác nhận xóa
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
