import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { nhostService, MUTATIONS } from "../services/nhostService";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  BookOpen,
  ChevronRight,
  Plus,
  Zap,
} from "lucide-react";
import { CrudModal } from "../components/ui/CrudModal";
import { GrammarBreadcrumbs } from "../components/grammar/GrammarBreadcrumbs";
import { GrammarSidebar } from "../components/grammar/GrammarSidebar";
import { GrammarEntryCard } from "../components/grammar/GrammarEntryCard";

const LEVEL_COLORS = {
  n5: "#58CC02",
  n4: "#FF9600",
  n3: "#FF4B4B",
  n2: "#A342FF",
  n1: "#37464F",
};

export const GrammarPage = () => {
  const { view, id } = useParams(); // view: 'level', 'lesson'
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") || "";
  const setSearch = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set("q", val);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };
  
  const [selectedTag, setSelectedTag] = useState("All");
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
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  // Fetch all levels for dropdowns
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

  const openCrud = (table, mode, fields, title, item = null) => {
    setCrudTable(table);
    setCrudMode(mode);
    setCrudFields(fields);
    setCrudTitle(title);
    setCrudItem(item);
    setCrudOpen(true);
  };

  // Columns that actually exist in grammar_entries table (used to strip out sections/examples/sources from JSON editor)
  const ENTRY_COLUMNS = ["title", "meaning", "structure", "caution", "conjugation", "note", "url", "position", "full_html", "lesson_id"];
  // Keys that should never be sent to any table (nested data from JSON editor)
  const STRIP_KEYS = ["sections", "examples", "sources", "_all", "__typename"];

  const cleanFormData = (formData) => {
    if (crudTable === "grammar_entries") {
      // For grammar_entries: only pick known valid columns
      const obj = {};
      ENTRY_COLUMNS.forEach(col => {
        if (formData[col] !== undefined) obj[col] = formData[col];
      });
      return obj;
    }
    // For other tables: pass everything except known bad keys
    const obj = { ...formData };
    STRIP_KEYS.forEach(k => delete obj[k]);
    delete obj.id; // id is handled separately
    return obj;
  };

  const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const handleCrudSave = async (formData) => {
    setCrudSaving(true);
    try {
      // Separate nested arrays from entry-level columns
      const sections = formData.sections;
      const examples = formData.examples;

      console.log("[GrammarSave] formData keys:", Object.keys(formData));
      console.log("[GrammarSave] sections:", sections);
      console.log("[GrammarSave] examples:", examples);

      if (crudMode === "create") {
        const obj = cleanFormData(formData);
        obj.id = formData.id || `${crudTable}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await nhostService.createRow(crudTable, obj);
      } else {
        const setFields = cleanFormData(formData);
        console.log("[GrammarSave] updateRow setFields:", setFields);
        await nhostService.updateRow(crudTable, crudItem.id, setFields);
      }

      // Sync sections/examples for grammar_entries (only when arrays are explicitly provided)
      if (crudTable === "grammar_entries") {
        const entryId = crudMode === "create" 
          ? (formData.id || crudItem?.id) 
          : crudItem.id;

        if (Array.isArray(sections) && sections.length > 0) {
          try {
            // Clean section objects: only keep valid DB columns + generate id
            const cleanSections = sections.map((s, i) => ({
              id: s.id || genId(),
              entry_id: entryId,
              header: s.header || "",
              content_text: s.content_text || "",
              content_html: s.content_html || "",
              position: s.position ?? i,
            }));
            console.log("[GrammarSave] Deleting old sections for:", entryId);
            await nhostService.fetchGraphQL(
              MUTATIONS.DELETE_SECTIONS_BY_ENTRY, "DeleteSections", { entryId }
            );
            console.log("[GrammarSave] Inserting", cleanSections.length, "sections");
            const secRes = await nhostService.fetchGraphQL(
              MUTATIONS.INSERT_SECTIONS, "InsertSections", { objects: cleanSections }
            );
            if (secRes.errors) {
              console.error("[GrammarSave] Section insert errors:", secRes.errors);
              alert("⚠️ Lỗi khi chèn Sections: " + secRes.errors[0]?.message);
            } else {
              console.log("[GrammarSave] Sections inserted OK:", secRes.data);
            }
          } catch (secErr) {
            console.error("Sections sync error:", secErr);
            alert("⚠️ Lỗi khi đồng bộ Sections: " + secErr.message);
          }
        } else {
          console.log("[GrammarSave] No sections to sync (empty or not array)");
        }

        if (Array.isArray(examples) && examples.length > 0) {
          try {
            const cleanExamples = examples.map((ex, i) => ({
              id: ex.id || genId(),
              entry_id: entryId,
              japanese: ex.japanese || "",
              vietnamese: ex.vietnamese || "",
              position: ex.position ?? i,
            }));
            await nhostService.fetchGraphQL(
              MUTATIONS.DELETE_EXAMPLES_BY_ENTRY, "DeleteExamples", { entryId }
            );
            const exRes = await nhostService.fetchGraphQL(
              MUTATIONS.INSERT_EXAMPLES, "InsertExamples", { objects: cleanExamples }
            );
            if (exRes.errors) {
              console.error("[GrammarSave] Example insert errors:", exRes.errors);
              alert("⚠️ Lỗi khi chèn Examples: " + exRes.errors[0]?.message);
            }
          } catch (exErr) {
            console.error("Examples sync error:", exErr);
            alert("⚠️ Lỗi khi đồng bộ Examples: " + exErr.message);
          }
        }
      }

      setCrudOpen(false);
      fetchData();
    } catch (err) {
      console.error("CRUD Save error:", err);
      alert("Lỗi khi lưu dữ liệu: " + err.message);
    } finally {
      setCrudSaving(false);
    }
  };

  const handleCrudDelete = async () => {
    setCrudSaving(true);
    try {
      await nhostService.deleteRow(crudTable, crudItem.id);
      setCrudOpen(false);
      fetchData();
    } finally {
      setCrudSaving(false);
    }
  };

  const levelFields = [
    { key: "title", label: "Tên trình độ", required: true },
    { key: "description", label: "Mô tả" },
  ];

  const lessonFields = [
    { key: "title", label: "Tên bài học", required: true },
    {
      key: "level_id",
      label: "Trình độ",
      required: true,
      type: "select",
      options: allLevels.map((l) => ({ value: l.id, label: l.title })),
    },
  ];

  const lessonOptions =
    view === "lesson" && data?.id
      ? [{ value: data.id, label: data.title }]
      : allLevels.map((l) => ({ value: l.id, label: l.title }));

  const entryFields = [
    { key: "title", label: "Cấu trúc ngữ pháp", required: true },
    { key: "meaning", label: "Ý nghĩa", required: true, type: "textarea", rows: 4 },
    { key: "structure", label: "Cấu trúc", type: "textarea" },
    { key: "conjugation", label: "Cách chia", type: "textarea", rows: 3 },
    { key: "caution", label: "Lưu ý", type: "textarea" },
    { key: "note", label: "Ghi chú thêm", type: "textarea" },
    { key: "full_html", label: "Nội dung Markdown (Thay thế tự động)", type: "textarea", rows: 20 },
    { key: "_all", label: "Dữ liệu JSON thô (Nâng cao)", type: "json", rows: 15 },
    { key: "lesson_id", label: "Bài học", required: true, type: "select", options: lessonOptions },
  ];

  // JSON-only edit: just the raw JSON editor, full height
  const entryJsonFields = [
    { key: "_all", label: "Chỉnh sửa toàn bộ dữ liệu bằng JSON", type: "json", rows: 35 },
  ];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!view) {
        const q = `query GetGrammarHome {
          levels: grammar_levels(order_by: {title: asc}) { id title description source }
          lessons: grammar_lessons(limit: 5000) { id level_id }
          entries: grammar_entries(limit: 5000) { id lesson_id }
        }`;
        const { data: res } = await nhostService.fetchGraphQL(q, "GetGrammarHome", {});
        const lessons = res?.lessons || [];
        const entries = res?.entries || [];
        
        const counts = res?.levels.map(lvl => {
          const lCount = lessons.filter(l => l.level_id === lvl.id).length;
          const eCount = entries.filter(e => lessons.find(l => l.id === e.lesson_id && l.level_id === lvl.id)).length;
          return { ...lvl, lessonCount: lCount, entryCount: eCount };
        });
        setData(counts);
      } else if (view === "level") {
        // Step 1: fetch level + lessons
        const q1 = `query GetLevelData($lvlId: String!) {
          level: grammar_levels(where: {id: {_eq: $lvlId}}, limit: 1) { id title description source }
          lessons: grammar_lessons(where: {level_id: {_eq: $lvlId}}, order_by: {position: asc_nulls_last, created_at: asc}) {
            id title position
          }
        }`;
        const { data: res1 } = await nhostService.fetchGraphQL(q1, "GetLevelData", { lvlId: id });
        const levelItem = res1?.level?.[0];
        if (levelItem) {
          const lessonIds = (res1.lessons || []).map(l => l.id);
          // Step 2: count entries per lesson
          let entryCounts = {};
          if (lessonIds.length > 0) {
            const q2 = `query CountEntries($ids: [String!]!) { grammar_entries(where: {lesson_id: {_in: $ids}}) { lesson_id } }`;
            const { data: res2 } = await nhostService.fetchGraphQL(q2, "CountEntries", { ids: lessonIds });
            (res2?.grammar_entries || []).forEach(e => {
              entryCounts[e.lesson_id] = (entryCounts[e.lesson_id] || 0) + 1;
            });
          }
          const lessonsWithCount = (res1.lessons || []).map(lsn => ({
            ...lsn,
            entryCount: entryCounts[lsn.id] || 0
          }));
          setData({ ...levelItem, lessons: lessonsWithCount });
        }
      } else if (view === "lesson") {
        const q = `query GetLessonData($lsnId: String!) {
          lesson: grammar_lessons(where: {id: {_eq: $lsnId}}, limit: 1) { id title level_id }
          entries: grammar_entries(where: {lesson_id: {_eq: $lsnId}}, order_by: {position: asc_nulls_last, created_at: asc}) {
            id title meaning structure caution conjugation note url position full_html
          }
        }`;
        const { data: res } = await nhostService.fetchGraphQL(q, "GetLessonData", { lsnId: id });
        const lessonItem = res?.lesson?.[0];
        if (lessonItem) {
          const entryIds = res.entries.map(e => e.id);
          let extra = { sections: [], examples: [] };
          if (entryIds.length > 0) {
            const extraRes = await nhostService.fetchGraphQL(
              `query GetExtras($ids: [String!]!) {
                sections: grammar_sections(where: {entry_id: {_in: $ids}}, order_by: {position: asc}) { entry_id header content_text content_html }
                examples: grammar_examples(where: {entry_id: {_in: $ids}}, order_by: {position: asc}) { entry_id japanese vietnamese }
              }`, "GetExtras", { ids: entryIds }
            );
            extra = extraRes.data || extra;
          }
          
          const fullEntries = res.entries.map(e => ({
            ...e,
            sections: extra.sections.filter(s => s.entry_id === e.id),
            examples: extra.examples.filter(ex => ex.entry_id === e.id)
          }));

          const lvlRes = await nhostService.fetchGraphQL(
            `query GetLvl($lid: String!){ grammar_levels(where: {id: {_eq: $lid}}, limit: 1){ id title } }`, 
            "GetLvl", { lid: lessonItem.level_id }
          );
          setData({ 
            ...lessonItem, 
            level: lvlRes.data?.grammar_levels?.[0],
            entries: fullEntries 
          });
        }
      }
    } catch (err) {
      setError(err.message || "Lỗi tải liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [view, id]);

  const scrollToEntry = (entryId) => {
    setSelectedEntryId(entryId);
    const el = document.getElementById(`entry-${entryId}`);
    if (el) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 animate-pulse">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-[#58CC02] rounded-full animate-spin mb-4" />
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải học liệu...</span>
    </div>
  );

  if (error) return <div className="p-20 text-center font-bold text-red-400">{error}</div>;

  return (
    <div className="max-w-none w-full px-4 lg:px-6 py-8">
      <GrammarBreadcrumbs 
        currentLevel={view === "level" ? data : (view === "lesson" ? data?.level : null)} 
        currentLesson={view === "lesson" ? data : null} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10 min-w-0">
          {!view ? (
             // HOME VIEW
             <div className="space-y-10">
                <header className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">📖 Thư viện Ngữ pháp</h2>
                    <button onClick={() => openCrud("grammar_levels", "create", levelFields, "Thêm trình độ")} className="p-4 bg-[#58CC02] text-white rounded-2xl hover:scale-105 transition-all shadow-xl shadow-green-200/20 active:scale-95">
                      <Plus size={24} />
                    </button>
                  </div>
                  <p className="text-lg font-bold text-slate-400 max-w-2xl leading-relaxed">Khám phá kho tàng kiến thức ngữ pháp tiếng Nhật từ N5 đến N1 với hàng nghìn tình huống áp dụng thực tế.</p>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                   {[5,4,3,2,1].map(num => {
                      const lvl = Array.isArray(data) ? data.find(l => l.title.includes(`N${num}`)) : null;
                      return (
                        <motion.div key={num} whileHover={{ y: -5 }} onClick={() => lvl && navigate(`/grammar/level/${lvl.id}`)} className={`p-8 rounded-[40px] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col items-center gap-4 cursor-pointer shadow-sm ${!lvl ? "grayscale opacity-50" : ""}`}>
                           <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl" style={{ backgroundColor: LEVEL_COLORS[`n${num}`] }}>N{num}</div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lvl?.entryCount || 0} bài</span>
                        </motion.div>
                      );
                   })}
                </div>

                <div className="space-y-4">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Học liệu khác</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(data || []).filter(l => !l.title.match(/N[1-5]/)).map(lvl => (
                        <div key={lvl.id} onClick={() => navigate(`/grammar/level/${lvl.id}`)} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer group">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-[#58CC02]"><BookOpen size={20} /></div>
                              <h4 className="font-black text-slate-800 dark:text-white group-hover:text-[#58CC02] transition-colors">{lvl.title}</h4>
                           </div>
                           <ChevronRight size={20} className="text-slate-200" />
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          ) : view === "level" ? (
             // LEVEL VIEW
             <div className="space-y-8">
                <div className="flex items-end justify-between">
                   <h2 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">{data?.title}</h2>
                   <button onClick={() => openCrud("grammar_lessons", "create", lessonFields, "Thêm bài học", { level_id: id })} className="bg-[#58CC02] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-green-100/50">Thêm bài mới</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {data?.lessons?.map((lsn, i) => (
                      <motion.div key={lsn.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} onClick={() => navigate(`/grammar/lesson/${lsn.id}`)} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer group hover:border-[#58CC02]/30 transition-all">
                         <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-xs font-black text-slate-300 group-hover:bg-[#58CC02] group-hover:text-white transition-all">{i + 1}</div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{lsn.title}</h4>
                         </div>
                         <div className="text-right">
                           <span className="text-[10px] font-black text-slate-400 group-hover:text-[#58CC02] transition-colors">{lsn.entryCount || 0} bài</span>
                           <ChevronRight size={16} className="text-slate-200 ml-2 inline" />
                         </div>
                      </motion.div>
                   ))}
                </div>
             </div>
          ) : (
             // LESSON VIEW (CONTENT)
             <div className="space-y-12 pb-24">
                {data?.entries?.map((entry, idx) => (
                  <GrammarEntryCard 
                    key={entry.id} 
                    entry={entry} 
                    idx={idx} 
                    openCrud={openCrud}
                    entryFields={entryFields}
                    entryJsonFields={entryJsonFields}
                    structureOnlyFields={[]} // Optional refined fields
                    meaningOnlyFields={[]}
                    noteOnlyFields={[]}
                    id={id}
                  />
                ))}
                {data?.entries?.length === 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-12 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-lg font-bold text-slate-400">Nội dung này chưa được soạn thảo. ✍️</p>
                  </div>
                )}
             </div>
          )}
        </div>

        <div className="lg:col-span-4">
          <GrammarSidebar 
            view={view} 
            data={data} 
            id={id} 
            selectedEntryId={selectedEntryId} 
            onEntryClick={scrollToEntry} 
          />
        </div>
      </div>

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
    </div>
  );
};
