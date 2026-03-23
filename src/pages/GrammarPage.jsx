import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { nhostService } from "../services/nhostService";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  BookOpen,
  ChevronRight,
  Star,
  Zap,
  Volume2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { CrudModal } from "../components/ui/CrudModal";
import { tts } from "../utils/tts";

const LEVEL_COLORS = {
  n5: "#58CC02",
  n4: "#FF9600",
  n3: "#FF4B4B",
  n2: "#A342FF",
  n1: "#37464F",
};

export const GrammarPage = () => {
  const { view, id } = useParams(); // view: 'level', 'lesson', 'entry'
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") || "";
  const setSearch = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set("q", val);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // CRUD state
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudMode, setCrudMode] = useState("create");
  const [crudTable, setCrudTable] = useState("grammar_levels");
  const [crudItem, setCrudItem] = useState(null);
  const [crudSaving, setCrudSaving] = useState(false);
  const [crudFields, setCrudFields] = useState([]);
  const [crudTitle, setCrudTitle] = useState("");
  const [allLevels, setAllLevels] = useState([]);
  const [globalResults, setGlobalResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Fetch all grammar levels once (for lesson level_id dropdown)
  useEffect(() => {
    const fetchAllLevels = async () => {
      try {
        const q = `query GetAllLevels { grammar_levels(order_by: {title: asc}) { id title } }`;
        const { data } = await nhostService.fetchGraphQL(q, "GetAllLevels", {});
        if (data?.grammar_levels) setAllLevels(data.grammar_levels);
      } catch (err) {
        console.error("Fetch all levels failed:", err);
      }
    };
    fetchAllLevels();
  }, []);

  // CRUD helpers
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
      if (crudMode === "create") {
        const obj = { ...formData };
        if (!obj.id)
          obj.id = `${crudTable}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const { errors } = await nhostService.createRow(crudTable, obj);
        if (errors?.length) throw new Error(errors[0].message);
      } else {
        const { id, ...setFields } = formData;
        const { errors } = await nhostService.updateRow(crudTable, crudItem.id, setFields);
        if (errors?.length) throw new Error(errors[0].message);
      }
      setCrudOpen(false);
      fetchData(); // reload
    } finally {
      setCrudSaving(false);
    }
  };

  const handleCrudDelete = async () => {
    setCrudSaving(true);
    try {
      const { errors } = await nhostService.deleteRow(crudTable, crudItem.id);
      if (errors?.length) throw new Error(errors[0].message);
      setCrudOpen(false);
      fetchData(); // reload
    } finally {
      setCrudSaving(false);
    }
  };

  // Field definitions for each entity
  const levelFields = [
    { key: "title", label: "Tên trình độ", required: true, placeholder: "Ngữ pháp N5 - Minna I" },
    { key: "description", label: "Mô tả", placeholder: "Minna no Nihongo I" },
  ];

  const lessonFields = [
    { key: "title", label: "Tên bài học", required: true, placeholder: "Bài 1" },
    {
      key: "level_id",
      label: "Trình độ",
      required: true,
      type: "select",
      options: allLevels.map(l => ({ value: l.id, label: l.title })),
    },
  ];

  // Build lesson options for entryFields (only in lesson view)
  const lessonOptions =
    data && data.entries && data.id && data.title
      ? [{ value: data.id, label: data.title }]
      : Array.isArray(data?.lessons)
        ? data.lessons.map(lsn => ({ value: lsn.id, label: lsn.title }))
        : [];

  const entryFields = [
    { key: "title", label: "Cấu trúc ngữ pháp", required: true, placeholder: "〜てもいいですか" },
    { key: "meaning", label: "Ý nghĩa", required: true, placeholder: "Có thể ... được không?" },
    { key: "structure", label: "Cấu trúc", type: "textarea", placeholder: "V-ても いいですか" },
    { key: "conjugation", label: "Cách chia", type: "json-groups" },
    { key: "caution", label: "Lưu ý", type: "textarea", placeholder: "" },
    { key: "note", label: "Ghi chú thêm", type: "textarea", placeholder: "" },
    {
      key: "examples",
      label: "Ví dụ",
      type: "json-array",
      subFields: [
        { key: "japanese", label: "Câu tiếng Nhật", placeholder: "写真を撮ってもいいですか。" },
        {
          key: "translation",
          label: "Nghĩa tiếng Việt",
          placeholder: "Tôi có thể chụp ảnh được không?",
        },
      ],
    },
    {
      key: "lesson_id",
      label: "Bài học",
      required: true,
      type: "select",
      options: lessonOptions,
      placeholder: lessonOptions.length === 1 ? lessonOptions[0].label : "Chọn bài học",
    },
  ];

  // TTS: speak Japanese text using centralized tts utility
  const speakJapanese = text => {
    if (!text) return;
    tts.playWithFallback(null, text);
  };

  // Global Grammar Search
  useEffect(() => {
    if (!view && search.trim().length >= 2) {
      const timer = setTimeout(async () => {
        setSearching(true);
        try {
          const q = `query SearchGrammar($term: String!) {
            grammar_entries(where: {
              _or: [
                {title: {_ilike: $term}},
                {meaning: {_ilike: $term}},
                {structure: {_ilike: $term}}
              ]
            }, limit: 15) {
              id title meaning structure lesson_id
            }
          }`;
          const { data } = await nhostService.fetchGraphQL(q, "SearchGrammar", {
            term: `%${search}%`,
          });
          setGlobalResults(data?.grammar_entries || []);
        } catch (err) {
          console.error("Global search failed:", err);
        } finally {
          setSearching(false);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else if (search.trim() === "") {
      setGlobalResults([]);
    }
  }, [search, view]);

  useEffect(() => {
    fetchData();
  }, [view, id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!view) {
        // Main view: list all levels + lesson counts + entry counts
        const q = `query GetGrammarLevels {
          levels: grammar_levels(order_by: {title: asc}) {
            id title description
          }
          lessons: grammar_lessons {
            id level_id
          }
          entries: grammar_entries {
            lesson_id
          }
        }`;
        const { data } = await nhostService.fetchGraphQL(q, "GetGrammarLevels", {});

        const lessons = data?.lessons || [];
        const entries = data?.entries || [];

        // Build a map: lesson_id → level_id
        const lessonToLevel = {};
        lessons.forEach(l => {
          lessonToLevel[l.id] = l.level_id;
        });

        // Count entries per level
        const entriesPerLevel = {};
        entries.forEach(e => {
          const lvlId = lessonToLevel[e.lesson_id];
          if (lvlId) entriesPerLevel[lvlId] = (entriesPerLevel[lvlId] || 0) + 1;
        });

        const levelsWithCounts = (data?.levels || []).map(lvl => ({
          ...lvl,
          lessonCount: lessons.filter(l => l.level_id === lvl.id).length,
          entryCount: entriesPerLevel[lvl.id] || 0,
        }));
        setData(levelsWithCounts);
      } else if (view === "level") {
        // Level view: list lessons + count entries per lesson
        const q = `query GetLevelLessons($lvlId: String!) {
          level: grammar_levels_by_pk(id: $lvlId) {
            id title description
          }
          lessons: grammar_lessons(where: {level_id: {_eq: $lvlId}}, order_by: {created_at: asc}) {
            id title
          }
        }`;
        const { data } = await nhostService.fetchGraphQL(q, "GetLevelLessons", { lvlId: id });

        if (data?.level) {
          const lessonIds = (data.lessons || []).map(l => l.id);

          // Fetch entry counts for these lessons only
          let entryCountMap = {};
          if (lessonIds.length > 0) {
            const countQ = `query CountEntries($lessonIds: [String!]!) {
              grammar_entries(where: {lesson_id: {_in: $lessonIds}}) {
                lesson_id
              }
            }`;
            const countRes = await nhostService.fetchGraphQL(countQ, "CountEntries", { lessonIds });
            (countRes.data?.grammar_entries || []).forEach(e => {
              entryCountMap[e.lesson_id] = (entryCountMap[e.lesson_id] || 0) + 1;
            });
          }

          const lessonsWithCounts = (data.lessons || []).map(lsn => ({
            ...lsn,
            entryCount: entryCountMap[lsn.id] || 0,
          }));
          setData({ ...data.level, lessons: lessonsWithCounts });
        }
      } else if (view === "lesson") {
        // Lesson view: list all entries in this lesson
        const q = `query GetLessonEntries($lsnId: String!) {
          lesson: grammar_lessons_by_pk(id: $lsnId) {
            id title level_id
          }
          entries: grammar_entries(where: {lesson_id: {_eq: $lsnId}}, order_by: {created_at: asc}) {
            id title meaning structure caution conjugation note examples
          }
        }`;
        const { data } = await nhostService.fetchGraphQL(q, "GetLessonEntries", { lsnId: id });
        if (data?.lesson) {
          const entriesArr = Array.isArray(data.entries)
            ? data.entries
            : data.entries
              ? [data.entries]
              : [];
          setData({ ...data.lesson, entries: entriesArr });
        }
      }
    } catch (err) {
      console.error("[Grammar] Error fetching data:", err);
      setError(err.message || "Không thể tải dữ liệu ngữ pháp");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#58CC02] rounded-full animate-spin mb-4" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Đang tải học liệu...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white">
          Không thể tải nội dung
        </h2>
        <p className="text-sm text-slate-400 font-medium max-w-md">{error}</p>
        <button
          onClick={() => fetchData()}
          className="mt-4 px-6 py-3 bg-[#58CC02] text-white font-black rounded-2xl hover:bg-[#46a302] transition-colors shadow-lg shadow-[#58CC02]/20"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // CRUD modal (rendered in every view)
  const crudModal = (
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
  );

  // --- RENDERING ---

  // 1. Level List View
  if (!view) {
    return (
      <div className="space-y-8">
        <header className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">
              📖 Thư viện Ngữ pháp
            </h2>
            <button
              onClick={() => openCrud("grammar_levels", "create", levelFields, "Thêm trình độ")}
              className="flex items-center gap-2 px-6 py-3 bg-[#58CC02] text-white text-sm font-black rounded-2xl hover:bg-[#46A302] transition-all shadow-xl shadow-green-200/20 active:scale-95"
            >
              <Plus size={18} /> Thêm trình độ
            </button>
          </div>
          <p className="text-md font-bold text-slate-400 max-w-2xl">
            Hệ thống học tập ngữ pháp thông minh, phân bổ theo lộ trình N5 → N1 với hàng ngàn ví dụ
            ứng dụng thực tế.
          </p>
          <div className="relative group max-w-2xl">
            <div
              className={`absolute inset-0 bg-[#1CB0F6]/10 blur-2xl rounded-3xl transition-opacity ${search ? "opacity-100" : "opacity-0"}`}
            />
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Tìm cấu trúc (あいだ), ý nghĩa hoặc trình độ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-6 pr-14 py-5 bg-white dark:bg-slate-800/80 backdrop-blur-md border-2 border-slate-100 dark:border-slate-800 rounded-[28px] outline-none focus:border-[#1CB0F6] focus:ring-4 focus:ring-[#1CB0F6]/5 transition-all text-lg font-bold shadow-xl shadow-slate-200/10 dark:shadow-none"
              />
              <div className="absolute right-5 flex items-center gap-2">
                {searching && (
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-[#1CB0F6] rounded-full animate-spin" />
                )}
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <ChevronLeft size={20} className="rotate-45" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Global Search Results - Show when searching for entries */}
        <AnimatePresence>
          {search.trim().length >= 2 && (
            <motion.section
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest">
                  Kết quả cấu trúc & cấu trúc ({globalResults.length})
                </h3>
                {searching && (
                  <span className="text-[10px] font-bold text-indigo-500 animate-pulse">
                    Đang quét dữ liệu...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {globalResults.map(res => (
                  <motion.div
                    layout
                    key={res.id}
                    onClick={() => navigate(`/grammar/lesson/${res.lesson_id}`)}
                    className="bg-white dark:bg-slate-800/40 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-[#1CB0F6] hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <h5 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-[#1CB0F6] transition-colors">
                      {res.title}
                    </h5>
                    <p className="text-xs font-bold text-slate-400 mt-1 line-clamp-1">
                      {res.meaning}
                    </p>
                    {res.structure && (
                      <div className="mt-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-[11px] font-black text-indigo-500 border border-slate-100 dark:border-slate-700">
                        {res.structure}
                      </div>
                    )}
                  </motion.div>
                ))}
                {!searching && globalResults.length === 0 && (
                  <div className="col-span-full py-10 bg-slate-50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-slate-400 font-bold italic">
                      Không tìm thấy cấu trúc nào khớp với "{search}"
                    </p>
                  </div>
                )}
              </div>
              <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-8" />
            </motion.section>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl flex items-center justify-center">
              <BookOpen className="text-[#58CC02]" size={28} />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                {Array.isArray(data) ? data.length : 0}
              </p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                Trình độ
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-700/50 rounded-2xl flex items-center justify-center">
              <Zap className="text-amber-400" size={28} />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                {Array.isArray(data) ? data.reduce((acc, l) => acc + (l.entryCount || 0), 0) : 0}
              </p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                Cấu trúc
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="text-lg font-black text-slate-800 dark:text-white px-2">Chọn trình độ</h3>
          <div className="grid grid-cols-1 gap-4">
            {Array.isArray(data) && data.length > 0 ? (
              data
                .filter(lvl => {
                  if (!search.trim()) return true;
                  const q = search.toLowerCase();
                  return (
                    lvl.title.toLowerCase().includes(q) ||
                    (lvl.description || "").toLowerCase().includes(q)
                  );
                })
                .map(lvl => (
                  <motion.div
                    key={lvl.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => navigate(`/grammar/level/${lvl.id}`)}
                    className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg transition-transform group-hover:rotate-12"
                        style={{
                          backgroundColor:
                            LEVEL_COLORS[lvl.title.toLowerCase().match(/n[1-5]/)?.[0]] || "#58CC02",
                        }}
                      >
                        {lvl.title.match(/n[1-5]/i)?.[0] || "JLPT"}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800 dark:text-white">
                          {lvl.title}
                        </h4>
                        <div className="flex flex-wrap gap-3 mt-1.5 items-center">
                          <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                            <BookOpen size={14} /> {lvl.lessonCount || 0} bài học
                          </p>
                          <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                            <Zap size={14} /> {lvl.entryCount || 0} cấu trúc
                          </p>
                          {lvl.entryCount === 0 && (
                            <span className="text-[10px] font-black text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
                              Đang cập nhật
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          openCrud("grammar_levels", "edit", levelFields, "Sửa trình độ", {
                            id: lvl.id,
                            title: lvl.title,
                            description: lvl.description || "",
                          });
                        }}
                        className="p-2 rounded-xl text-slate-300 hover:text-[#1CB0F6] hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Sửa"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          openCrud("grammar_levels", "edit", levelFields, "Xoá trình độ", {
                            id: lvl.id,
                            title: lvl.title,
                            description: lvl.description || "",
                          });
                        }}
                        className="p-2 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Xoá"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight
                        className="text-slate-200 group-hover:text-[#58CC02] transition-colors"
                        size={24}
                      />
                    </div>
                  </motion.div>
                ))
            ) : (
              <div className="text-center text-slate-400 py-8">
                <p className="text-lg mb-2">📚</p>
                <p>Không có dữ liệu ngữ pháp hoặc không thể kết nối server.</p>
              </div>
            )}
          </div>
        </section>
        {crudModal}
      </div>
    );
  }

  // 2. Lesson List View (for a Level)
  if (view === "level") {
    return (
      <div className="space-y-6">
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => navigate("/grammar")}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#58CC02]"
            >
              Ngữ pháp
            </button>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-[10px] font-black text-[#58CC02] uppercase tracking-widest leading-none">
              Trình độ
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/grammar")}
              className="p-3 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-800 transition-colors shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1">
              <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">
                {data?.title}
              </h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                {data?.description}
              </p>
            </div>
            <button
              onClick={() =>
                openCrud("grammar_lessons", "create", lessonFields, "Thêm bài học", {
                  level_id: id,
                })
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-[#58CC02] text-white text-sm font-black rounded-2xl hover:bg-[#46A302] transition-colors shadow-lg shadow-green-200/30 shrink-0"
            >
              <Plus size={16} /> Thêm
            </button>
          </div>
        </header>

        {(() => {
          const totalEntries = (data?.lessons || []).reduce((s, l) => s + (l.entryCount || 0), 0);
          const hasAnyContent = totalEntries > 0;
          return (
            <>
              {/* Summary bar */}
              <div className="flex items-center gap-3 px-1 text-xs font-bold text-slate-400">
                <span>{data?.lessons?.length || 0} bài học</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>{totalEntries} cấu trúc</span>
              </div>

              {!hasAnyContent && data?.lessons?.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200/50 dark:border-amber-500/20 rounded-2xl p-5 flex items-start gap-3">
                  <span className="text-xl">🚧</span>
                  <div>
                    <p className="text-sm font-black text-amber-700 dark:text-amber-400">
                      Nội dung đang được cập nhật
                    </p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5">
                      Trình độ này đã có danh sách bài học nhưng chưa có cấu trúc ngữ pháp. Dữ liệu
                      sẽ được bổ sung sớm.
                    </p>
                  </div>
                </div>
              )}

              {data?.lessons?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.lessons.map((lsn, i) => (
                    <motion.div
                      key={lsn.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() =>
                        lsn.entryCount > 0 ? navigate(`/grammar/lesson/${lsn.id}`) : null
                      }
                      className={`bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all shadow-sm group ${
                        lsn.entryCount > 0
                          ? "cursor-pointer hover:border-[#1CB0F6]/30"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div>
                        <h4
                          className={`font-black mb-0.5 transition-colors ${
                            lsn.entryCount > 0
                              ? "text-slate-800 dark:text-white group-hover:text-[#1CB0F6]"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {lsn.title}
                        </h4>
                        <p className="text-xs font-bold text-slate-400">
                          {lsn.entryCount > 0 ? `${lsn.entryCount} cấu trúc` : "Chưa có nội dung"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openCrud("grammar_lessons", "edit", lessonFields, "Sửa bài học", {
                                id: lsn.id,
                                title: lsn.title,
                                level_id: id,
                              });
                            }}
                            className="p-2 rounded-xl text-slate-300 hover:text-[#1CB0F6] hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all"
                            title="Sửa"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openCrud("grammar_lessons", "edit", lessonFields, "Xoá bài học", {
                                id: lsn.id,
                                title: lsn.title,
                                level_id: id,
                              });
                            }}
                            className="p-2 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                            title="Xoá"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            lsn.entryCount > 0
                              ? "bg-slate-50 dark:bg-slate-700/50 text-slate-300 group-hover:text-[#1CB0F6] group-hover:scale-110"
                              : "bg-slate-50 dark:bg-slate-700/50 text-slate-200"
                          }`}
                        >
                          {lsn.entryCount > 0 ? (
                            <ChevronRight size={20} />
                          ) : (
                            <span className="text-xs">🔒</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="text-4xl">📭</div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">
                    Chưa có bài học nào
                  </h3>
                  <p className="text-sm text-slate-400">
                    Trình độ này chưa có bài học. Hãy quay lại sau!
                  </p>
                </div>
              )}
            </>
          );
        })()}
        {crudModal}
      </div>
    );
  }

  // 3. Entry View (for a Lesson)
  if (view === "lesson") {
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    const filteredEntries = entries.filter(e => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const hay = [
        e.title,
        e.meaning,
        e.structure,
        e.conjugation,
        e.caution,
        e.note,
        typeof e.examples === "string" ? e.examples : JSON.stringify(e.examples || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    return (
      <div className="space-y-6">
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => navigate("/grammar")}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#58CC02] transition-colors"
            >
              Ngữ pháp
            </button>
            <ChevronRight size={12} className="text-slate-300" />
            {data?.level_id && (
              <>
                <button
                  onClick={() => navigate(`/grammar/level/${data.level_id}`)}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#58CC02] transition-colors"
                >
                  Trình độ
                </button>
                <ChevronRight size={12} className="text-slate-300" />
              </>
            )}
            <span className="text-[10px] font-black text-[#58CC02] uppercase tracking-widest leading-none">
              {data?.title || "Bài học"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                data?.level_id ? navigate(`/grammar/level/${data.level_id}`) : navigate("/grammar")
              }
              className="p-3 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                {data?.title || "Bài học"}
              </h2>
              <p className="text-xs font-bold text-slate-400 mt-1">
                {entries.length > 0
                  ? `${entries.length} cấu trúc ngữ pháp`
                  : "Chưa có cấu trúc nào"}
              </p>
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Tìm trong bài học này..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full max-w-md pl-5 pr-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-[#1CB0F6] transition-all text-sm font-bold shadow-sm"
                />
              </div>
            </div>
            <button
              onClick={() =>
                openCrud("grammar_entries", "create", entryFields, "Thêm cấu trúc", {
                  lesson_id: id,
                })
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-[#58CC02] text-white text-sm font-black rounded-2xl hover:bg-[#46A302] transition-colors shadow-lg shadow-green-200/30 shrink-0"
            >
              <Plus size={16} /> Thêm
            </button>
          </div>
        </header>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center">
              <BookOpen className="text-slate-300 dark:text-slate-600" size={36} />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Chưa có nội dung</h3>
            <p className="text-sm text-slate-400 max-w-sm">
              Bài học này chưa có cấu trúc ngữ pháp nào. Dữ liệu có thể đang được cập nhật.
            </p>
            <button
              onClick={() => fetchData()}
              className="px-5 py-2.5 bg-[#1CB0F6] text-white font-bold rounded-xl hover:bg-[#1899D6] transition-colors text-sm"
            >
              Tải lại
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {entries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                {/* Entry Number Badge */}
                <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    #{idx + 1}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        openCrud("grammar_entries", "edit", entryFields, "Sửa cấu trúc", {
                          id: entry.id,
                          title: entry.title,
                          meaning: entry.meaning || "",
                          structure: entry.structure || "",
                          conjugation: entry.conjugation || "",
                          caution: entry.caution || "",
                          note: entry.note || "",
                          examples: entry.examples,
                          lesson_id: id,
                        })
                      }
                      className="p-1.5 text-slate-300 hover:text-[#1CB0F6] transition-colors"
                      title="Sửa"
                    >
                      <Pencil size={16} />
                    </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          openCrud("grammar_entries", "edit", entryFields, "Xoá cấu trúc", {
                            id: entry.id,
                            title: entry.title,
                            meaning: entry.meaning || "",
                            structure: entry.structure || "",
                            conjugation: entry.conjugation || "",
                            caution: entry.caution || "",
                            note: entry.note || "",
                            examples: entry.examples,
                            lesson_id: id,
                          });
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                        title="Xoá"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors">
                        <Star size={16} />
                      </button>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  {/* Title */}
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                    {entry.title}
                  </h3>

                  {/* Meaning */}
                  {entry.meaning && (
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                        Ý nghĩa
                      </h5>
                      <p className="text-base font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                        {entry.meaning}
                      </p>
                    </div>
                  )}

                  {/* Structure */}
                  {entry.structure && (
                    <div className="bg-[#58CC02]/5 dark:bg-[#58CC02]/10 p-5 rounded-2xl border border-[#58CC02]/20">
                      <h5 className="text-[10px] font-black text-[#58CC02] uppercase tracking-[0.2em] mb-3">
                        Cấu trúc
                      </h5>
                      <p className="text-xl font-black text-[#58CC02]">{entry.structure}</p>
                    </div>
                  )}

                  {/* Conjugation */}
                  {entry.conjugation &&
                    (() => {
                      let groups = [];
                      const tryParseConjugation = raw => {
                        try {
                          return JSON.parse(raw);
                        } catch {
                          // Fix unescaped inner quotes around Japanese/short chars, e.g. "い" → 「い」
                          try {
                            const sanitized = raw
                              .replace(/"([\u3000-\u9fff\uff00-\uffef]{1,4})"/g, "「$1」")
                              .replace(
                                /"([A-Za-z](?:い|な|の|で|を|に|が|は)?)"(?=\s*[→:,])/g,
                                "「$1」"
                              );
                            return JSON.parse(sanitized);
                          } catch {
                            return null;
                          }
                        }
                      };
                      try {
                        const raw =
                          typeof entry.conjugation === "string"
                            ? entry.conjugation
                            : JSON.stringify(entry.conjugation);
                        const parsed = tryParseConjugation(raw);
                        if (Array.isArray(parsed)) groups = parsed;
                        else throw new Error("not array");
                      } catch {
                        // plain text fallback
                        return (
                          <div className="bg-blue-50/50 dark:bg-blue-500/5 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                            <h5 className="text-[10px] font-black text-[#1CB0F6] uppercase tracking-[0.2em] mb-2">
                              Cách chia
                            </h5>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                              {entry.conjugation}
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="bg-blue-50/50 dark:bg-blue-500/5 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/10 space-y-4">
                          <h5 className="text-[10px] font-black text-[#1CB0F6] uppercase tracking-[0.2em]">
                            Cách chia
                          </h5>
                          {groups.map((grp, gi) => (
                            <div key={gi}>
                              {grp.groupName && (
                                <p className="text-xs font-black text-[#1CB0F6]/80 mb-2">
                                  {grp.groupName}
                                </p>
                              )}
                              <div className="space-y-2">
                                {(grp.rules || []).map((rule, ri) => (
                                  <div
                                    key={ri}
                                    className="flex items-start gap-3 bg-white/60 dark:bg-slate-800/60 rounded-xl px-4 py-2.5"
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {rule.label}
                                      </p>
                                      {rule.example && (
                                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                          {rule.example}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                  {/* Caution */}
                  {entry.caution && (
                    <div className="bg-amber-50/50 dark:bg-amber-500/5 p-5 rounded-2xl border border-amber-200 dark:border-amber-500/10">
                      <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">
                        ⚠️ Lưu ý
                      </h5>
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        {entry.caution}
                      </p>
                    </div>
                  )}

                  {/* Note */}
                  {entry.note && (
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                        💡 Ghi chú
                      </h5>
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                        {entry.note}
                      </p>
                    </div>
                  )}

                  {/* Examples */}
                  {(() => {
                    let examples = [];
                    try {
                      examples =
                        typeof entry.examples === "string"
                          ? JSON.parse(entry.examples || "[]")
                          : Array.isArray(entry.examples)
                            ? entry.examples
                            : [];
                    } catch (e) {
                      // If examples is a plain string, show it as-is
                      if (typeof entry.examples === "string" && entry.examples.trim()) {
                        return (
                          <div>
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                              Ví dụ
                            </h5>
                            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                              {entry.examples}
                            </p>
                          </div>
                        );
                      }
                    }

                    if (!Array.isArray(examples) || examples.length === 0) return null;

                    return (
                      <div>
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                          Ví dụ minh họa
                          <Volume2 size={14} className="text-slate-300" />
                        </h5>
                        <div className="space-y-3">
                          {examples.map((ex, i) => {
                            const jpText =
                              ex.japanese || ex.e || ex.jp || ex.ja || ex.example || "";
                            const vnText =
                              ex.translation || ex.v || ex.vi || ex.meaning || ex.en || "";
                            return (
                              <div
                                key={i}
                                className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-black text-slate-800 dark:text-white mb-1 flex-1">
                                    {jpText}
                                  </p>
                                  {jpText && (
                                    <button
                                      onClick={() => tts.playWithFallback(null, jpText)}
                                      onMouseEnter={() => tts.playWithFallback(null, jpText)}
                                      className="shrink-0 p-2 rounded-lg text-slate-300 hover:text-[#1CB0F6] hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all"
                                      title="Nghe phát âm"
                                    >
                                      <Volume2 size={16} />
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-slate-400">{vnText}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {crudModal}
      </div>
    );
  }

  return (
    <>
      <div className="py-10 text-center text-slate-400">Không tìm thấy nội dung yêu cầu.</div>
      {crudModal}
    </>
  );
};
