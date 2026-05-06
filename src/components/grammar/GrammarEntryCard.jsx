import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Pencil, Trash2, Star, Volume2 } from "lucide-react";
import { tts } from "../../utils/tts";
import { PedagogicalText } from "../ui/GrammarFormItem";
import { SmartText } from "../../utils/grammarFormatter";

const sectionColors = [
  {
    bg: "bg-violet-50/50 dark:bg-violet-500/5",
    border: "border-violet-100 dark:border-violet-500/20",
    accent: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  {
    bg: "bg-sky-50/50 dark:bg-sky-500/5",
    border: "border-sky-100 dark:border-sky-500/20",
    accent: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  {
    bg: "bg-emerald-50/50 dark:bg-emerald-500/5",
    border: "border-emerald-100 dark:border-emerald-500/20",
    accent: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-amber-50/50 dark:bg-amber-500/5",
    border: "border-amber-100 dark:border-amber-500/20",
    accent: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-rose-50/50 dark:bg-rose-500/5",
    border: "border-rose-100 dark:border-rose-500/20",
    accent: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
];

export const GrammarEntryCard = ({
  entry,
  idx,
  openCrud,
  entryFields,
  structureOnlyFields,
  meaningOnlyFields,
  noteOnlyFields,
  id,
}) => {
  const isPhanBiet =
    (entry.title || "").includes("Phân biệt") || (entry.title || "").includes("So sánh");

  const isPlaceholderStructure =
    isPhanBiet &&
    (!entry.structure ||
      entry.structure === "Bài Phân biệt / Comparison" ||
      entry.structure.trim() === "");

  const hasDuplicateMeaning =
    isPhanBiet &&
    entry.meaning &&
    Array.isArray(entry.sections) &&
    entry.sections.length > 0 &&
    (entry.sections[0]?.content_text || entry.sections[0]?.content_html) &&
    entry.meaning.trim() ===
      (entry.sections[0].content_text || entry.sections[0].content_html).trim();

  const handleSpeak = (text) => {
    tts.playWithFallback(null, text);
  };

  return (
    <motion.div
      id={`entry-${entry.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className={`bg-white dark:bg-slate-800 rounded-[32px] border-2 shadow-sm relative group overflow-hidden ${
        isPhanBiet
          ? "border-violet-200/60 dark:border-violet-500/20"
          : "border-slate-100 dark:border-slate-800"
      }`}
    >
      <div
        className={`px-8 py-3 border-b flex items-center justify-between ${
          isPhanBiet
            ? "bg-gradient-to-r from-violet-50/50 via-purple-50/50 to-fuchsia-50/50 dark:from-violet-900/10 dark:via-purple-900/10 dark:to-fuchsia-900/10 border-violet-100 dark:border-violet-500/20"
            : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800"
        }`}
      >
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
            #{idx + 1}
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {isPhanBiet && (
              <span className="text-[9px] font-black px-2 py-0.5 bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/25 rounded-md flex items-center gap-1">
                <span className="text-[11px]">⚡</span> PHÂN BIỆT
              </span>
            )}
            {entry.sources &&
              entry.sources.map((src) => (
                <span
                  key={src.source_name}
                  className="text-[9px] font-black px-2 py-0.5 bg-slate-50 dark:bg-slate-500/10 text-slate-500 border border-slate-100 dark:border-slate-500/20 rounded-md"
                >
                  {src.source_name.toUpperCase()}
                </span>
              ))}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() =>
              openCrud("grammar_entries", "edit", entryFields, "Sửa toàn bộ cấu trúc", {
                ...entry,
                lesson_id: id,
              })
            }
            className="p-1.5 text-slate-300 hover:text-[#1CB0F6] transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() =>
              openCrud("grammar_entries", "delete", entryFields, "Xoá cấu trúc", {
                ...entry,
                lesson_id: id,
              })
            }
            className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
          <button className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors">
            <Star size={16} />
          </button>
        </div>
      </div>
      
      <div className="p-8 space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-[1.6]">
              <SmartText text={entry.title} />
            </h3>
            {entry.meaning && !hasDuplicateMeaning && (
              <div className="text-lg font-bold text-[#1CB0F6] dark:text-[#4FC3F7]">
                <PedagogicalText text={entry.meaning} mode="list" />
              </div>
            )}
          </div>
          <button 
            onClick={() => handleSpeak(entry.title)}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-[#58CC02] hover:bg-[#58CC02]/10 transition-all active:scale-90 shadow-sm"
          >
            <Volume2 size={24} />
          </button>
        </header>

        {entry.structure && !isPlaceholderStructure && (
          <div className="relative group/struct overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#FF9600] rounded-full" />
            <div className="pl-6 bg-slate-50/50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
               <span className="text-[10px] font-black text-[#FF9600] uppercase tracking-[0.2em] mb-3 block">Cấu trúc</span>
               <div 
                className="text-xl md:text-2xl font-black text-slate-700 dark:text-slate-100 tracking-tight"
                dangerouslySetInnerHTML={{ __html: entry.structure }}
              />
            </div>
          </div>
        )}

        {entry.conjugation && (
          <div className="bg-blue-50/50 dark:bg-blue-500/5 p-6 rounded-[32px] border border-blue-100 dark:border-blue-500/20">
            <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Cách kết hợp
            </h5>
            <div className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
              {entry.conjugation.includes('<') && entry.conjugation.includes('>') ? (
                <div 
                  className="prose-html-formula"
                  dangerouslySetInnerHTML={{ __html: entry.conjugation }} 
                />
              ) : (
                <PedagogicalText text={entry.conjugation} mode="list" />
              )}
            </div>
          </div>
        )}

        {entry.sections && entry.sections.length > 0 && (
          <div className="space-y-8">
            {entry.sections.map((section, si) => {
              const colorTheme = isPhanBiet ? sectionColors[si % sectionColors.length] : null;
              const hasHeader = section.header && section.header.trim().length > 0;
              const displayHeader = hasHeader ? section.header : (isPhanBiet ? `Mục ${si + 1}` : null);

              return (
                <div key={si} className="space-y-4">
                  {displayHeader && (
                    <h5 className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${
                      isPhanBiet && colorTheme ? colorTheme.accent : "text-slate-400"
                    }`}>
                       {isPhanBiet && colorTheme && <div className={`w-2 h-2 rounded-full ${colorTheme.dot}`} />}
                       {displayHeader}
                    </h5>
                  )}
                  <div className={`rounded-3xl p-7 border transition-all ${
                    isPhanBiet && colorTheme
                      ? `${colorTheme.bg} ${colorTheme.border} shadow-sm`
                      : "bg-white dark:bg-slate-900/20 border-slate-100 dark:border-slate-800"
                  }`}>
                    {section.content_html ? (
                      <div 
                        className="prose-html-section max-w-none text-slate-800 dark:text-slate-100 font-medium"
                        dangerouslySetInnerHTML={{ __html: section.content_html }} 
                      />
                    ) : (
                      <div className="text-slate-700 dark:text-slate-200 font-bold leading-relaxed">
                        <PedagogicalText text={section.content_text || ""} mode="list" title={entry.title} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(entry.examples || entry.caution || entry.note) && (
          <div className="pt-4 border-t border-slate-50 dark:border-slate-800 space-y-8">
            {entry.examples && entry.examples.length > 0 && (
              <div className="space-y-4">
                 <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   Ví dụ tham khảo
                 </h5>
                 <div className="space-y-3">
                   {entry.examples.map((ex, ei) => (
                     <div key={ei} className="bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 group/ex relative">
                        <div className="absolute top-1/2 -left-1 hidden group-hover:block w-2 h-2 bg-[#58CC02] rounded-full -translate-y-1/2" />
                        <div className="flex flex-col gap-1">
                          <SmartText text={ex.japanese} className="text-lg font-bold text-slate-700 dark:text-slate-200 leading-[1.8]" />
                          {ex.vietnamese && <p className="text-sm font-bold text-slate-400">{ex.vietnamese}</p>}
                        </div>
                        <button 
                          onClick={() => handleSpeak(ex.japanese)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-[#58CC02]/10 text-slate-300 hover:text-[#58CC02] opacity-0 group-hover/ex:opacity-100 transition-all font-bold"
                        >
                          <Volume2 size={16} />
                        </button>
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {entry.caution && (
              <div className="bg-amber-50/50 dark:bg-amber-500/5 p-6 rounded-3xl border-l-4 border-amber-400 border-y border-r border-amber-100 dark:border-amber-500/20">
                <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2 underline underline-offset-4 decoration-2 decoration-amber-200">
                  ⚡ Chú ý Cẩn trọng
                </h5>
                <div className="text-slate-700 dark:text-slate-200 font-bold">
                  <PedagogicalText text={entry.caution} mode="list" />
                </div>
              </div>
            )}

             {entry.note && (
              <div className="bg-slate-50/80 dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">💡 Ghi chú thêm</h5>
                <div className="text-slate-600 dark:text-slate-400 font-bold text-sm leading-relaxed">
                  <PedagogicalText text={entry.note} mode="list" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
