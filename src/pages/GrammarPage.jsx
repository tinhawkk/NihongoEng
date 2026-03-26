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
import { PedagogicalText } from "../components/ui/GrammarFormItem";

const LEVEL_COLORS = {
  n5: "#58CC02",
  n4: "#FF9600",
  n3: "#FF4B4B",
  n2: "#A342FF",
  n1: "#37464F",
};

const GRAMMAR_FORMS = {
  "Vる": {
    title: "Động từ thể từ điển",
    desc: "Động từ thể từ điển là dạng nguyên bản của động từ, kết thúc bằng các âm u (u, tsu, ru, bu, mu, nu, ku, gu, su).",
    examples: ["かう (mua)", "たべる (ăn)", "いく (đi)"]
  },
  "Vない": {
    title: "Động từ thể ない",
    desc: "Động từ thể ない là những động từ được chia về thể ない.",
    hint: "(Tìm hiểu cách chia thể ない TẠI ĐÂY)",
    examples: ["かきます → かかない", "よみます → よまない", "たべます → たべない"]
  },
  "Vている": {
    title: "Động từ thể tiếp diễn (Te-iru)",
    desc: "Diễn tả hành động đang diễn ra hoặc trạng thái hiện tại.",
    examples: ["たべている (đang ăn)", "よんでいる (đang đọc)"]
  },
  "Vた": {
    title: "Động từ thể quá khứ (Ta)",
    desc: "Diễn tả hành động đã xảy ra trong quá khứ.",
    examples: ["たべた (đã ăn)", "いった (đã đi)"]
  },
  "Vて": {
    title: "Động từ thể て",
    desc: "Dùng để nối các câu hoặc diễn tả chuỗi hành động.",
    examples: ["たべて (ăn và...)", "いって (đi và...)"]
  },
  "Aい": {
    title: "Tính từ đuôi い",
    desc: "Tính từ kết thúc bằng âm い (không bao gồm các tính từ đuôi 'na' giả 'i' như 'kirei').",
    examples: ["たかい (cao/đắt)", "あつい (nóng)"]
  },
  "Aな": {
    title: "Tính từ đuôi な",
    desc: "Tính từ khi kết hợp với danh từ cần thêm 'na'.",
    examples: ["しずかな (yên tĩnh)", "べんりな (tiện lợi)"]
  },
  "N": {
    title: "Danh từ (Noun)",
    desc: "Các từ chỉ sự vật, hiện tượng, con người.",
    examples: ["がくせい (học sinh)", "ほん (sách)"]
  }
};

const GrammarFormItem = ({ text }) => {
  const [show, setShow] = useState(false);
  const data = GRAMMAR_FORMS[text];

  if (!data) return <span className="text-[#E24A00] font-black">{text}</span>;

  return (
    <span 
      className="relative inline-block cursor-help group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-[#00796B] dark:text-[#26C6DA] border-b-2 border-dotted border-[#00796B]/30 hover:bg-[#00796B]/5 px-0.5 rounded transition-colors font-bold">
        {text.startsWith('V') ? <span className="text-[#00796B] font-black mr-0.5">{text[0]}</span> : null}
        {text.startsWith('V') ? text.slice(1) : text}
      </span>
      
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-5 bg-[#37464F] dark:bg-slate-900 text-white rounded-2xl shadow-2xl z-50 text-left border border-white/10"
          >
            <h6 className="text-sm font-black mb-1.5 border-b border-white/10 pb-1.5 flex items-center justify-between">
              <span>{data.title}</span>
              <span className="text-[10px] text-white/50">{text}</span>
            </h6>
            <div className="text-[11px] text-slate-300 leading-relaxed mb-3">
              {data.desc}
              {data.hint && (
                <a 
                  href="#" 
                  className="block mt-1 text-[#4FC3F7] font-bold underline hover:text-[#81D4FA] transition-colors"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  {data.hint}
                </a>
              )}
            </div>
            {data.examples && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-black">Ví dụ:</p>
                {data.examples.map((ex, i) => (
                  <p key={i} className="text-xs font-medium text-slate-200 pl-2 border-l-2 border-[#00BCD4]/30">{ex}</p>
                ))}
              </div>
            )}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-[#37464F] dark:border-t-slate-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

const parseToArrayFlexible = val => {
  if (Array.isArray(val)) return val[0] === "" ? [] : val;
  if (val == null) return [];
  const s = String(val).trim();
  if (!s) return [];
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p;
    } catch (e) {}
  }
  if (s.includes("|")) return s.split("|").map(x => x.trim()).filter(Boolean);
  if (s.includes("\n")) return s.split(/\n+/).map(x => x.trim()).filter(Boolean);
  return [s];
};

const GrammarEntryCard = ({ entry, idx, openCrud, entryFields, structureOnlyFields, meaningOnlyFields, noteOnlyFields, id }) => {
  // Detect if this is a "Phân biệt" (comparison) lesson
  const isPhanBiet = (entry.title || '').includes('Phân biệt') || (entry.title || '').includes('So sánh');
  
  // For Phân biệt entries: skip structure if it's just the placeholder
  const isPlaceholderStructure = isPhanBiet && (
    !entry.structure || 
    entry.structure === 'Bài Phân biệt / Comparison' ||
    entry.structure.trim() === ''
  );
  
  // For Phân biệt entries: skip meaning if it duplicates first detail text
  const hasDuplicateMeaning = isPhanBiet && entry.meaning && 
    Array.isArray(entry.details) && entry.details.length > 0 && 
    entry.details[0]?.text && 
    entry.meaning.trim() === entry.details[0].text.trim();

  // Color themes for Phân biệt sections
  const sectionColors = [
    { bg: 'bg-violet-50/50 dark:bg-violet-500/5', border: 'border-violet-100 dark:border-violet-500/20', accent: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
    { bg: 'bg-sky-50/50 dark:bg-sky-500/5', border: 'border-sky-100 dark:border-sky-500/20', accent: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    { bg: 'bg-emerald-50/50 dark:bg-emerald-500/5', border: 'border-emerald-100 dark:border-emerald-500/20', accent: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    { bg: 'bg-amber-50/50 dark:bg-amber-500/5', border: 'border-amber-100 dark:border-amber-500/20', accent: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    { bg: 'bg-rose-50/50 dark:bg-rose-500/5', border: 'border-rose-100 dark:border-rose-500/20', accent: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className={`bg-white dark:bg-slate-800 rounded-3xl border-2 overflow-hidden shadow-sm ${
        isPhanBiet 
          ? 'border-violet-200/60 dark:border-violet-500/20' 
          : 'border-slate-100 dark:border-slate-800'
      }`}
    >
      <div className={`px-8 py-3 border-b flex items-center justify-between ${
        isPhanBiet
          ? 'bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-fuchsia-900/20 border-violet-100 dark:border-violet-500/20'
          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
      }`}>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            #{idx + 1}
          </span>
          <div className="flex gap-1.5">
            {isPhanBiet && (
              <span className="text-[9px] font-black px-2 py-0.5 bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/25 rounded-md flex items-center gap-1">
                <span className="text-[11px]">⚡</span> PHÂN BIỆT
              </span>
            )}
            {entry.shinkanzen && <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 border border-indigo-100 dark:border-indigo-500/20 rounded-md">SHINKANZEN</span>}
            {entry.mimikara && <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 border border-emerald-100 dark:border-emerald-500/20 rounded-md">MIMIKARA</span>}
            {entry.soumatome && <span className="text-[9px] font-black px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-500 border border-amber-100 dark:border-amber-500/20 rounded-md">SOUMATOME</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {entry.url && (
            <a href={entry.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-300 hover:text-[#58CC02] transition-colors"><BookOpen size={16} /></a>
          )}
          <button onClick={() => openCrud("grammar_entries", "edit", entryFields, "Sửa toàn bộ cấu trúc", { ...entry, lesson_id: id })} className="p-1.5 text-slate-300 hover:text-[#1CB0F6] transition-colors"><Pencil size={16} /></button>
          <button onClick={() => openCrud("grammar_entries", "delete", entryFields, "Xoá cấu trúc", { ...entry, lesson_id: id })} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
          <button className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors"><Star size={16} /></button>
        </div>
      </div>
      <div className="p-8 space-y-6">
        <h3 className="text-2xl font-black text-slate-800 dark:text-white">{entry.title}</h3>
        
        {/* Meaning - skip if it duplicates first detail for Phân biệt */}
        {entry.meaning && !hasDuplicateMeaning && (
          <div className="flex items-center justify-between">
            <PedagogicalText text={entry.meaning} mode="list" />
            <button 
              onClick={() => openCrud("grammar_entries", "edit", meaningOnlyFields, "Sửa ý nghĩa", { id: entry.id, meaning: entry.meaning })}
              className="p-2 rounded-xl text-slate-300 hover:text-[#1CB0F6] hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all opacity-0 group-hover:opacity-100"
            >
              <Pencil size={14} />
            </button>
          </div>
        )}
        
        {/* Structure - skip placeholder for Phân biệt */}
        {entry.structure && !isPlaceholderStructure && (
          <div className="bg-white dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="bg-[#F5F5F5] dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
              <span className="text-[#FF9600] text-sm">★</span>
              <span className="text-slate-400 text-xs">›</span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Cấu trúc</span>
            </div>
            <div className="p-5 relative group/struct">
              <PedagogicalText text={entry.structure} title={entry.title} />
              <button 
                onClick={() => openCrud("grammar_entries", "edit", structureOnlyFields, "Sửa cấu trúc", { id: entry.id, structure: entry.structure })}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 text-slate-400 hover:text-[#1CB0F6] opacity-0 group-hover/struct:opacity-100 transition-all shadow-sm border border-slate-100 dark:border-slate-700"
              >
                <Pencil size={12} />
              </button>
            </div>
          </div>
        )}

        {entry.conjugation && (
          <div className="bg-blue-50/50 dark:bg-blue-500/5 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
            <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2">Cách kết hợp</h5>
            <PedagogicalText text={entry.conjugation} mode="list" />
          </div>
        )}

        {/* Details - enhanced rendering for Phân biệt entries */}
        {entry.details && Array.isArray(entry.details) && entry.details.length > 0 && (
          <div className="space-y-6">
            {isPhanBiet && (
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-gradient-to-r from-violet-200 dark:from-violet-500/30 to-transparent" />
                <span className="text-[10px] font-black text-violet-400 dark:text-violet-500 uppercase tracking-[0.2em]">Nội dung Phân biệt</span>
                <div className="h-px flex-1 bg-gradient-to-l from-violet-200 dark:from-violet-500/30 to-transparent" />
              </div>
            )}
            {entry.details.map((section, si) => {
              const colorTheme = isPhanBiet ? sectionColors[si % sectionColors.length] : null;
              const hasHeader = section.header && section.header.trim().length > 0;
              
              // Generate auto-label for headerless sections in Phân biệt
              const autoLabel = isPhanBiet && !hasHeader ? `Mục ${si + 1}` : null;
              const displayHeader = hasHeader ? section.header : autoLabel;
              
              return (
                <div key={si} className="space-y-3 relative group/detail">
                  {displayHeader && (
                    <h5 className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-between ${
                      isPhanBiet && colorTheme ? colorTheme.accent : 'text-slate-400'
                    }`}>
                      <span className="flex items-center gap-2">
                         {isPhanBiet && colorTheme && (
                           <span className={`w-2 h-2 rounded-full ${colorTheme.dot} shrink-0`} />
                         )}
                         {displayHeader}
                         {(displayHeader.includes("Ví dụ") || displayHeader.includes("VÍ DỤ")) && <Volume2 size={12} className="text-slate-300" />}
                      </span>
                      <button 
                        onClick={() => openCrud("grammar_entries", "patch", detailItemFields, `Sửa mục: ${displayHeader}`, { ...section, _index: si, _field: "details" }, entry)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-[#1CB0F6] hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all opacity-0 group-hover/detail:opacity-100"
                      >
                        <Pencil size={12} />
                      </button>
                    </h5>
                  )}
                  <div className={`rounded-2xl p-5 border ${
                    isPhanBiet && colorTheme 
                      ? `${colorTheme.bg} ${colorTheme.border}` 
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'
                  }`}>
                    <PedagogicalText text={section.text} mode="list" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty details message for Phân biệt entries with no content */}
        {isPhanBiet && (!entry.details || !Array.isArray(entry.details) || entry.details.length === 0) && !entry.meaning && (
          <div className="bg-amber-50/50 dark:bg-amber-500/5 p-6 rounded-2xl border border-amber-100 dark:border-amber-500/20 text-center">
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">⚠️ Bài phân biệt này chưa có nội dung chi tiết</p>
            <p className="text-xs text-amber-500/70 mt-1">Dữ liệu đang được cập nhật, vui lòng quay lại sau.</p>
          </div>
        )}

        {(entry.examples || entry.caution || entry.note) && (
          <div className="space-y-5 pt-2">
            {entry.examples && (
              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Volume2 size={12} className="text-slate-300" /> Ví dụ tham khảo
                </h5>
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                  {parseToArrayFlexible(entry.examples).map((ex, ei) => (
                    <div key={ei} className="relative group/ex">
                      <PedagogicalText text={typeof ex === 'object' ? `${ex.japanese || ""} → ${ex.translation || ""}` : ex} mode="list" />
                      <button 
                        onClick={() => {
                          const initial = typeof ex === 'object' ? ex : { japanese: String(ex).split('→')[0].trim(), translation: String(ex).split('→')[1]?.trim() || "" };
                          openCrud("grammar_entries", "patch", exampleItemFields, `Sửa ví dụ #${ei+1}`, { ...initial, _index: ei, _field: "examples" }, entry);
                        }}
                        className="absolute top-0 right-0 p-1 rounded-md text-slate-300 hover:text-[#1CB0F6] opacity-0 group-hover/ex:opacity-100 transition-all"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {entry.caution && (
              <div className="bg-amber-50/50 dark:bg-amber-500/5 p-5 rounded-2xl border-l-4 border-amber-400 border-y border-r border-amber-100 dark:border-amber-500/20 relative group/caution">
                <h5 className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1 flex items-center justify-between">
                  <span>Lưu ý / Chú ý</span>
                  <button 
                    onClick={() => openCrud("grammar_entries", "edit", noteOnlyFields, "Sửa lưu ý & ghi chú", { id: entry.id, caution: entry.caution, note: entry.note })}
                    className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-500/10 text-amber-400 opacity-0 group-hover/caution:opacity-100 transition-all"
                  >
                    <Pencil size={10} />
                  </button>
                </h5>
                <PedagogicalText text={entry.caution} mode="list" />
              </div>
            )}
            {entry.note && (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 relative group/note">
                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center justify-between">
                  <span>Ghi chú</span>
                  <button 
                    onClick={() => openCrud("grammar_entries", "edit", noteOnlyFields, "Sửa lưu ý & ghi chú", { id: entry.id, caution: entry.caution, note: entry.note })}
                    className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-300 opacity-0 group-hover/note:opacity-100 transition-all"
                  >
                    <Pencil size={10} />
                  </button>
                </h5>
                <PedagogicalText text={entry.note} mode="list" />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
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
  const [crudParent, setCrudParent] = useState(null);
  const [crudSaving, setCrudSaving] = useState(false);
  const [crudFields, setCrudFields] = useState([]);
  const [crudTitle, setCrudTitle] = useState("");
  const [allLevels, setAllLevels] = useState([]);
  const [globalResults, setGlobalResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

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
  const openCrud = (table, mode, fields, title, item = null, parent = null) => {
    setCrudTable(table);
    setCrudMode(mode);
    setCrudFields(fields);
    setCrudTitle(title);
    setCrudItem(item);
    setCrudParent(parent);
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
        
        // Handle Patch Mode: if saving an individual item from an array (details or examples)
        if (crudMode === "patch") {
          const { _index, _field, ...itemData } = setFields;
          const targetEntry = crudParent || crudItem;
          const currentArray = [...(targetEntry?.[_field] || [])];
          currentArray[_index] = { ...currentArray[_index], ...itemData };
          
          await nhostService.updateRow(crudTable, targetEntry.id, { [_field]: currentArray });
        } else {
          const { errors } = await nhostService.updateRow(crudTable, crudItem.id, setFields);
          if (errors?.length) throw new Error(errors[0].message);
        }
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
    { key: "caution", label: "Lưu ý", type: "textarea" },
    { key: "note", label: "Ghi chú thêm", type: "textarea" },
    {
      key: "examples",
      label: "Ví dụ (Cũ)",
      type: "json-array",
      subFields: [
        { key: "japanese", label: "Câu tiếng Nhật" },
        { key: "translation", label: "Nghĩa tiếng Việt" }
      ]
    },
    {
      key: "details",
      label: "Chi tiết (Meanings/Examples)",
      type: "json-array",
      subFields: [
        { key: "header", label: "Tiêu đề mục" },
        { key: "text", label: "Nội dung văn bản", type: "textarea" },
        { key: "html", label: "Nội dung HTML", type: "textarea" }
      ]
    },
    { key: "lesson_id", label: "Bài học", required: true, type: "select", options: lessonOptions }
  ];

  // Specific subsets for safe patching (avoids wiping other fields)
  const structureOnlyFields = [
    { key: "structure", label: "Sửa Cấu trúc", type: "textarea", required: true }
  ];
  const meaningOnlyFields = [
    { key: "meaning", label: "Sửa Ý nghĩa", type: "textarea", required: true }
  ];
  const detailItemFields = [
    { key: "header", label: "Tiêu đề mục (Ví dụ: Cách kết hợp, Lưu ý...)", required: true },
    { key: "text", label: "Nội dung văn bản", type: "textarea", required: true, rows: 6 },
    { key: "html", label: "Nội dung HTML (Tuỳ chọn)", type: "textarea", rows: 4 }
  ];

  const exampleItemFields = [
    { key: "japanese", label: "Câu tiếng Nhật", required: true },
    { key: "translation", label: "Nghĩa tiếng Việt", required: true }
  ];

  const noteOnlyFields = [
    { key: "caution", label: "Sửa Lưu ý", type: "textarea" },
    { key: "note", label: "Sửa Ghi chú", type: "textarea" }
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
    setSelectedEntryId(null); // Reset when switching lessons/levels
  }, [view, id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!view) {
        // Main view: list all levels + lesson counts + entry counts
        const q = `query GetGrammarLevels {
          levels: grammar_levels(order_by: {title: asc}) {
            id title description source
          }
          lessons: grammar_lessons(limit: 5000) {
            id level_id
          }
          entries: grammar_entries(limit: 5000) {
            id lesson_id
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

        const levelsWithCounts = (data?.levels || []).map(lvl => {
          const lvlLessons = lessons.filter(l => l.level_id === lvl.id);
          return {
            ...lvl,
            lessonCount: lvlLessons.length,
            entryCount: entriesPerLevel[lvl.id] || 0,
            firstLessonId: lvlLessons[0]?.id
          };
        });
        setData(levelsWithCounts);
      } else if (view === "level") {
        // Level view: list lessons + count entries per lesson
        const q = `query GetLevelLessons($lvlId: String!) {
          level: grammar_levels_by_pk(id: $lvlId) { id title description source }
          lessons: grammar_lessons(where: {level_id: {_eq: $lvlId}}, order_by: {position: asc_nulls_last, created_at: asc}, limit: 5000) {
            id title position
          }
        }`;
        const { data } = await nhostService.fetchGraphQL(q, "GetLevelLessons", { lvlId: id });
        
        if (data?.level) {
          const lsnIds = (data.lessons || []).map(l => l.id);
          
          // Fetch entry metadata for these lessons (tags, etc.)
          let entryMeta = {};
          if (lsnIds.length > 0) {
            const entQ = `query GetEntMeta($ids: [String!]!) {
              grammar_entries(where: {lesson_id: {_in: $ids}}) {
                lesson_id shinkanzen mimikara soumatome
              }
            }`;
            const metaRes = await nhostService.fetchGraphQL(entQ, "GetEntMeta", { ids: lsnIds });
            (metaRes.data?.grammar_entries || []).forEach(e => {
              entryMeta[e.lesson_id] = e;
            });
          }

          const lessonsWithMeta = (data.lessons || []).map(lsn => ({
            ...lsn,
            meta: entryMeta[lsn.id] || {},
            entryCount: entryMeta[lsn.id] ? 1 : 0
          }));

          setData({ ...data.level, lessons: lessonsWithMeta });
        }
      } else if (view === "lesson") {
        // Lesson view: list all entries in this lesson
        const q = `query GetLessonEntries($lsnId: String!) {
          lesson: grammar_lessons_by_pk(id: $lsnId) {
            id title level_id
          }
          entries: grammar_entries(where: {lesson_id: {_eq: $lsnId}}, order_by: {position: asc_nulls_last, created_at: asc}) {
            id title meaning structure caution conjugation note examples url shinkanzen mimikara soumatome details full_html
          }
        }`;
        const { data } = await nhostService.fetchGraphQL(q, "GetLessonEntries", { lsnId: id });
        if (data?.lesson) {
          const entriesArr = Array.isArray(data.entries)
            ? data.entries
            : data.entries
              ? [data.entries]
              : [];
          
          // Fetch level info if not already known
          let source = "legacy";
          let levelTitle = "";
          if (data.lesson.level_id) {
            const lvlQ = `query GetLevelInfo($lvlId: String!) { grammar_levels_by_pk(id: $lvlId) { source title } }`;
            const lvlRes = await nhostService.fetchGraphQL(lvlQ, "GetLevelInfo", { lvlId: data.lesson.level_id });
            const lvlData = lvlRes.data?.grammar_levels_by_pk;
            source = lvlData?.source || "legacy";
            levelTitle = lvlData?.title || "";
          }
          
          setData({ ...data.lesson, source, levelTitle, entries: entriesArr });
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

        {/* 1. Tiếng Nhật Đơn Giản Section - 5 Big Icons as requested */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
                <Zap size={18} fill="currentColor" />
             </div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
               Ngữ pháp toàn tập (Tiếng Nhật Đơn Giản)
             </h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].reverse().map(num => {
               const lvl = (Array.isArray(data) ? data : []).find(l => 
                 (l.source === 'tiengnhatdongian' || l.title.includes('Tiếng Nhật Đơn Giản')) && 
                 l.title.includes(`N${num}`)
               );
               return (
                 <motion.div
                   key={num}
                   whileHover={{ scale: 1.05, y: -5 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={async () => {
                      if (!lvl) return;
                      // Direct navigation to single lesson
                      setLoading(true);
                      try {
                        const q = `query GetLessons($lvlId: String!) { grammar_lessons(where: {level_id: {_eq: $lvlId}}) { id } }`;
                        const res = await nhostService.fetchGraphQL(q, "GetLessons", { lvlId: lvl.id });
                        if (res.data?.grammar_lessons?.[0]) {
                           navigate(`/grammar/level/${lvl.id}`);
                        } else {
                           navigate(`/grammar/level/${lvl.id}`);
                        }
                      } finally {
                        setLoading(false);
                      }
                   }}
                   className={`relative overflow-hidden group p-6 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col items-center justify-center text-center cursor-pointer shadow-xl shadow-slate-200/5 ${!lvl ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                 >
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg mb-3"
                      style={{ backgroundColor: LEVEL_COLORS[`n${num}`] || "#58CC02" }}
                    >
                      N{num}
                    </div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      {lvl?.entryCount || 0} bài
                    </span>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <ChevronRight size={14} className="text-slate-300" />
                    </div>
                 </motion.div>
               );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-[#58CC02] rounded-xl flex items-center justify-center text-white">
                <BookOpen size={18} fill="currentColor" />
             </div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Học liệu khác</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {Array.isArray(data) && data.length > 0 ? (
              data
                .filter(lvl => {
                  // Filter out "Tiếng Nhật Đơn Giản" levels from the "Other Materials" list
                  if (lvl.source === 'tiengnhatdongian' || lvl.title.includes('Tiếng Nhật Đơn Giản')) return false; 
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
                            source: lvl.source || "legacy"
                          });
                        }}
                        className="p-2 rounded-xl text-slate-300 hover:text-[#1CB0F6] hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Sửa"
                      >
                        <Pencil size={16} />
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
              {data?.title || "Trình độ"}
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
                data.source === "tiengnhatdongian" ? (
                  <div className="bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/5 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                         Mách nhỏ: Chọn bài để xem chi tiết cấu trúc
                      </p>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(() => {
                        const levelMatch = (data?.title || "").match(/n[1-5]/i);
                        const levelKey = levelMatch ? levelMatch[0].toLowerCase() : "n5";
                        const themeColor = LEVEL_COLORS[levelKey] || "#58CC02";
                        
                        return data.lessons.map((lsn, i) => {
                          const isAdvanced = lsn.title.toLowerCase().includes("nâng cao");
                          const isPhanBietLesson = lsn.title.includes("Phân biệt") || lsn.title.includes("So sánh");
                          const meta = lsn.meta || {};
                          
                          // Clean title: remove suffixes like " Mimikara", " Shinkanzen", etc.
                          let displayTitle = lsn.title
                            .replace(/(Mimikara|Shinkanzen|Soumatome|Nâng cao|Bổ xung).*$/gi, "")
                            .replace(/\[Ngữ pháp N[1-5]\]/gi, "")
                            .replace(/\[Ngữ Pháp N[1-5]\]/gi, "")
                            .replace(/\[Phân biệt – So sánh\]\s*/gi, "")
                            .trim();

                          // Extract number if title starts with it (e.g., "167 ~")
                          const numMatch = displayTitle.match(/^(\d+)/);
                          const displayNum = numMatch ? numMatch[1] : String(i + 1).padStart(2, '0');
                          if (numMatch) displayTitle = displayTitle.replace(/^\d+\s*/, "").trim();

                          return (
                          <div
                            key={lsn.id}
                            onClick={() => navigate(`/grammar/lesson/${lsn.id}`)}
                            className="group p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer transition-all border-b border-slate-50 dark:border-white/5 last:border-0"
                          >
                            <div className="w-12 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[11px] font-black text-slate-400 group-hover:text-white transition-all overflow-hidden shrink-0">
                               <span className="group-hover:hidden">{displayNum}</span>
                               <span className="hidden group-hover:inline text-white">★</span>
                               <style jsx="true">{`
                                .group:hover .w-12 { background-color: ${themeColor} !important; border-color: ${themeColor} !important; }
                               `}</style>
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex flex-wrap items-center gap-2 mb-1">
                                  {isAdvanced && (
                                    <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-100 dark:border-red-500/20 rounded-md text-[8px] font-black uppercase tracking-wider">
                                       Nâng cao
                                    </span>
                                  )}
                                  {isPhanBietLesson && (
                                    <span className="px-1.5 py-0.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5">
                                       <span className="text-[9px]">⚡</span> Phân biệt
                                    </span>
                                  )}
                                  {meta.shinkanzen && <span className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 border border-indigo-100 dark:border-indigo-500/20 rounded-md uppercase tracking-wider">SHINKANZEN</span>}
                                  {meta.mimikara && <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 border border-emerald-100 dark:border-emerald-500/20 rounded-md uppercase tracking-wider">MIMIKARA</span>}
                                  {meta.soumatome && <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-500 border border-amber-100 dark:border-amber-500/20 rounded-md uppercase tracking-wider">SOUMATOME</span>}
                               </div>
                               <h4 
                                 className="text-sm md:text-md font-bold text-slate-700 dark:text-white transition-colors line-clamp-2"
                                 style={{ "--hover-text": themeColor }}
                               >
                                  <span className="group-hover:text-[var(--hover-text)] transition-colors">
                                    {displayTitle}
                                  </span>
                               </h4>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  openCrud("grammar_lessons", "edit", lessonFields, "Sửa bài học", {
                                    id: lsn.id,
                                    title: lsn.title,
                                    level_id: id,
                                  });
                                }}
                                className="p-2 rounded-xl text-slate-300 hover:text-[#1CB0F6] hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all font-bold text-xs"
                              >
                                <Pencil size={16} />
                              </button>
                            </div>
                            <ChevronRight size={16} className="text-slate-200 group-hover:translate-x-1 transition-all" style={{ "--hover-text": themeColor }} />
                            <style jsx>{`
                              .group:hover .text-slate-200 { color: ${themeColor} !important; }
                            `}</style>
                          </div>
                        );
                      });
                    })()}
                    </div>
                  </div>
                ) : (
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
                )
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

    const levelMatch = (data?.levelTitle || "").match(/n[1-5]/i);
    const levelKey = levelMatch ? levelMatch[0].toLowerCase() : "n5";
    const themeColor = LEVEL_COLORS[levelKey] || "#58CC02";

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
            <button
              onClick={() => (data?.level_id ? navigate(`/grammar/level/${data.level_id}`) : navigate("/grammar"))}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#58CC02] transition-colors"
            >
               {data?.levelTitle || "Trình độ"}
            </button>
            <ChevronRight size={12} className="text-slate-300" />
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
            </div>
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
            {filteredEntries.map((entry, idx) => (
              <GrammarEntryCard
                key={entry.id}
                entry={entry}
                idx={idx}
                openCrud={openCrud}
                entryFields={entryFields}
                structureOnlyFields={structureOnlyFields}
                meaningOnlyFields={meaningOnlyFields}
                noteOnlyFields={noteOnlyFields}
                id={id}
              />
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
