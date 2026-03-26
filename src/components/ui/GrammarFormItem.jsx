import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export const GRAMMAR_FORMS = {
  "Vる": { title: "Động từ thể từ điển", desc: "Động từ thể từ điển (Nguyên dạng).", examples: ["かう", "たべる"] },
  "Vない": { title: "Động từ thể phủ định (Nai)", desc: "Dùng để phủ định hành động.", examples: ["かかない", "たべない"] },
  "Vている": { title: "Động từ thể tiếp diễn (Te-iru)", desc: "Diễn tả hành động đang diễn ra.", examples: ["たべている", "よんでいる"] },
  "Vた": { title: "Động từ thể quá khứ (Ta)", desc: "Diễn tả hành động đã xảy ra.", examples: ["たべた", "いった"] },
  "Vて": { title: "Động từ thể て", desc: "Dùng để nối câu hoặc chuỗi hành động.", examples: ["たべて", "いって"] },
  "Aい": { title: "Tính từ đuôi い", desc: "Tính từ kết thúc bằng âm い.", examples: ["たかい", "あつい"] },
  "Aな": { title: "Tính từ đuôi な", desc: "Tính từ kết thúc bằng đuôi な.", examples: ["しずかな", "べんりな"] },
  "N": { title: "Danh từ (Noun)", desc: "Từ chỉ sự vật, hiện tượng, con người.", examples: ["学生", "本"] }
};

const parseToArrayFlexible = val => {
  if (Array.isArray(val)) return val[0] === "" ? [] : val;
  if (val == null) return [];
  const s = String(val).trim();
  if (!s) return [];
  
  // Detection for circle numbers (①-㉟) formatted as a block string
  if (s.includes('①') || s.includes('②')) {
     const circleRegex = /([①-⑳㉑-㉟])/;
     const parts = s.split(circleRegex).filter(Boolean);
     if (parts.length > 2) {
       const result = [];
       for (let i = 0; i < parts.length; i++) {
         if (parts[i].match(circleRegex)) {
           result.push((parts[i] + (parts[i+1] || "")).trim());
           i++;
         } else if (parts[i].trim()) {
           result.push(parts[i].trim());
         }
       }
       if (result.length > 1) return result;
     }
  }

  // JSON array check
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p;
    } catch (e) {}
  }
  // Delimiter check: prefer | then \n
  if (s.includes("|")) return s.split("|").map(x => x.trim()).filter(Boolean);
  if (s.includes("\n")) return s.split(/\n+/).map(x => x.trim()).filter(Boolean);
  return [s];
};

export const GrammarFormItem = ({ text }) => {
  const [show, setShow] = useState(false);
  const [isAbove, setIsAbove] = useState(true);
  const data = GRAMMAR_FORMS[text];
  
  // Custom styling based on token type
  const getTypeStyles = (txt) => {
    if (txt.startsWith('V')) return "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5";
    if (txt.startsWith('A')) return "text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/5";
    if (txt.startsWith('N')) return "text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/5";
    return "text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/30 bg-slate-50/50 dark:bg-slate-500/5";
  };

  if (!data) return <span className="text-[#E24A00] font-black">{text}</span>;

  return (
    <span 
      className="relative inline-block cursor-help group mx-0.5"
      onMouseEnter={(e) => {
         setShow(true);
         const rect = e.currentTarget.getBoundingClientRect();
         setIsAbove(rect.top > 250);
      }}
      onMouseLeave={() => setShow(false)}
    >
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border transition-all font-bold whitespace-nowrap ${getTypeStyles(text)}`}>
        {text.startsWith('V') && (
           <span className="opacity-60 font-black mr-0.5">{text[0]}</span>
        )}
        {text.startsWith('V') ? text.slice(1) : text}
      </span>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: isAbove ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: isAbove ? 5 : -5 }}
            className={`absolute ${isAbove ? 'bottom-full mb-3' : 'top-full mt-3'} left-1/2 -translate-x-1/2 w-64 p-5 bg-[#37464F] dark:bg-slate-900 text-white rounded-2xl shadow-2xl z-[999] text-left border border-white/10`}
          >
            <h6 className="text-sm font-black mb-1.5 border-b border-white/10 pb-1.5 flex items-center justify-between">
              <span>{data.title}</span> <span className="text-[10px] text-white/50">{text}</span>
            </h6>
            <div className="text-[11px] text-slate-300 leading-relaxed mb-3">{data.desc}</div>
            <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-black">Ví dụ:</p>
                {data.examples.map((ex, i) => (
                  <p key={i} className="text-xs font-medium text-slate-200 pl-2 border-l-2 border-[#00BCD4]/30">{ex}</p>
                ))}
            </div>
            <div className={`absolute ${isAbove ? 'top-full' : 'bottom-full'} left-1/2 -translate-x-1/2 border-[8px] border-transparent ${isAbove ? 'border-t-[#37464F] dark:border-t-slate-900' : 'border-b-[#37464F] dark:border-b-slate-900'}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

export const PedagogicalText = ({ text, mode = "formula", title = "" }) => {
  const navigate = useNavigate();
  if (!text) return null;

  const processText = (str) => {
    if (!str) return "";
    let cleaned = str.replace(/<a [^>]*>(.*?)<\/a>/gi, '$1').replace(/<[^>]*>?/gm, '');
    const parts = cleaned.split(/(～|~|[\u4E00-\u9FFF\u3005\u4E00-\u9FA5]+\([\u3040-\u309F\u30A0-\u30FF]+\))/);
    return parts.map((p, i) => {
      if (!p) return null;
      const fMatch = p.match(/([\u4E00-\u9FFF\u3005\u4E00-\u9FA5]+)\(([\u3040-\u309F\u30A0-\u30FF]+)\)/);
      if (fMatch) return <ruby key={i} className="mx-0.5">{fMatch[1]}<rt className="text-[0.61em] text-slate-400 font-bold tracking-normal">{fMatch[2]}</rt></ruby>;
      if (p === '~' || p === '～') {
        const next = parts[i+1];
        if (next && next.match(/^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/)) {
           const fullName = `~${next}`;
           parts[i+1] = ""; 
           return <button key={i} onClick={() => { navigate(`/grammar?q=${encodeURIComponent(fullName)}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-500/10 text-[#1CB0F6] border border-sky-100 dark:border-sky-500/20 hover:bg-[#1CB0F6] hover:text-white transition-all mx-0.5 text-[0.9em] font-bold shadow-sm">{fullName}</button>;
        }
      }
      return p;
    });
  };

  if (mode === "list") {
    const rawItems = parseToArrayFlexible(text);
    const listSegments = rawItems.map(item => {
      if (typeof item === 'object' && item !== null) return { num: null, text: `${item.japanese || item.jp || item.word || ""} → ${item.translation || item.vi || item.meaning || ""}` };
      const s = String(item);
      const m = s.match(/^([①-⑳㉑-㉟]|\d+\.)\s*(.*)$/);
      if (m) return { num: m[1], text: m[2] };
      return { num: null, text: s };
    });

    return (
      <div className="space-y-4 font-bold text-slate-700 dark:text-slate-200">
        {listSegments.map((m, mi) => (
          <div key={mi} className="flex gap-3 items-start group">
            {m.num ? (
              <span className="w-6 h-6 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black text-xs border border-emerald-500/20">
                {m.num}
              </span>
            ) : (
              <span className="w-1.5 h-1.5 mt-2.5 shrink-0 rounded-full bg-sky-400/50 group-hover:bg-sky-400 transition-colors" />
            )}
            <span className="flex-1 leading-relaxed text-[15px]">{processText(m.text.trim())}</span>
          </div>
        ))}
      </div>
    );
  }

  // Formula Parsing logic
  const targetWord = title.replace(/^[～~]/, '').replace(/\s*\(.*\)\s*$/, '').trim();
  
  // Cleanup descriptive labels but keep the tokens
  let rawTextCleaned = String(text)
    .replace(/(Động từ thể[^./+~～\d\[\]]*(\.|\s|$))|Tính từ đuôi[^./+~～\d\[\]]*(\.|\s|$)|(DANH TỪ\s*(\.|\s|$))|(Danh từ[^./+~～\d\[\]]*(\.|\s|$))|\[Thể Thường\]|\[Tính từ[^\]]*\]|\[Danh từ[^\]]*\]/gi, ' ')
    .replace(/＋/g, ' + ')
    .replace(/／/g, ' / ')
    .replace(/～/g, ' ~ ')
    .trim();

  // Lines are defined by explicit 4+ space gaps or →
  // We avoid splitting before suffixes like + or / to keep them with their prefix
  let processedFormula = rawTextCleaned
    .replace(/\s{4,}(?=[^\+\/\|\s])/g, '\n')
    // Split before → if it's in the middle of a line
    .replace(/(\S)\s?→/g, '$1\n→')
    .replace(/\n+/g, '\n')
    .trim();

  const rawSegments = processedFormula.split(/\n+/).filter(s => s.trim());

  return (
    <div className="bg-slate-50/80 dark:bg-slate-900/40 rounded-3xl p-7 border border-slate-100 dark:border-white/5 shadow-inner inline-block min-w-full lg:min-w-fit">
      <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-4 items-center">
        {rawSegments.map((line, li) => {
          const tokens = line.split(/(\s+|\+|→|／|\/|~|～|\(|\)|\|)/g).filter(Boolean);
          const lastPlusIndex = tokens.map(t => t.trim()).lastIndexOf('+');
          const prefixTokens = lastPlusIndex !== -1 ? tokens.slice(0, lastPlusIndex) : tokens;
          const suffixTokens = lastPlusIndex !== -1 ? tokens.slice(lastPlusIndex) : [];

          const renderToken = (t, ti, isAfterPlus) => {
            const token = t?.trim();
            if (!token) return <span key={ti} className="mx-0.5"></span>;
            
            if (token === '+') { 
              return (
                <div key={ti} className="flex items-center justify-center w-5 h-5 bg-orange-500/10 rounded-full mx-0.5 shrink-0">
                  <span className="text-orange-500 font-extrabold text-[10px]">{token}</span>
                </div>
              );
            }
            if (['/', '／', '|'].includes(token)) {
              return (
                  <span key={ti} className="text-slate-300 dark:text-slate-600 font-light mx-1 select-none text-lg shrink-0">|</span>
              );
            }
            if (['(', ')', '~', '～', '→'].includes(token)) {
              return <span key={ti} className="text-slate-400 font-bold px-0.5 select-none shrink-0">{token}</span>;
            }
            if (GRAMMAR_FORMS[token]) {
              return <GrammarFormItem key={ti} text={token} />;
            }
            
            const parts = processText(token);
            const isTarget = token.includes(targetWord) || (isAfterPlus && !GRAMMAR_FORMS[token] && token.length > 1);
            
            return (
              <span key={ti} className={`text-[16px] font-bold px-1.5 py-0.5 rounded-lg transition-all shrink-0 ${
                isTarget 
                ? "text-orange-500 bg-orange-50 dark:bg-orange-500/10" 
                : "text-slate-600 dark:text-slate-300 hover:text-[#1CB0F6]"
              }`}>
                {parts}
              </span>
            );
          };

          return (
            <React.Fragment key={li}>
              <div className="flex flex-wrap items-center gap-1 min-w-0">
                {prefixTokens.map((t, ti) => renderToken(t, ti, false))}
              </div>
              <div className="flex items-center gap-x-1 shrink-0">
                {suffixTokens.length > 0 ? (
                  suffixTokens.map((t, ti) => renderToken(t, ti, true))
                ) : (
                  <span className="invisible">.</span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
