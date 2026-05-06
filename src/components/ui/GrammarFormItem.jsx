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
  if (val && typeof val === 'object') return [val];
  if (val == null) return [];
  const s = String(val).trim();
  if (!s) return [];
  
  if (/([①-⑳㉑-㉟])/.test(s)) {
     const circleRegex = /([①-⑳㉑-㉟])/;
     const parts = s.split(circleRegex).filter(Boolean);
     const result = [];
     let currentLine = "";
     for (let i = 0; i < parts.length; i++) {
       if (parts[i].match(circleRegex)) {
         if (currentLine.trim()) result.push(currentLine.trim());
         currentLine = parts[i];
       } else {
         currentLine += parts[i];
       }
     }
     if (currentLine.trim()) result.push(currentLine.trim());
     if (result.length > 1) return result;
  }

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

export const GrammarFormItem = ({ text }) => {
  const [show, setShow] = useState(false);
  const data = GRAMMAR_FORMS[text];
  const [isAbove, setIsAbove] = useState(true);
  
  const getTypeStyles = (txt) => {
    if (txt.startsWith('V')) return "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5";
    if (txt.startsWith('A')) return "text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/5";
    if (txt.startsWith('N')) return "text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/5";
    return "text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/30 bg-slate-50/50 dark:bg-slate-500/5";
  };

  if (!data) return <span className="text-[#E24A00] font-black">{text}</span>;

  return (
    <span className="relative inline-block cursor-help group mx-0.5" onMouseEnter={(e) => { setShow(true); const rect = e.currentTarget.getBoundingClientRect(); setIsAbove(rect.top > 250); }} onMouseLeave={() => setShow(false)}>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border transition-all font-bold whitespace-nowrap ${getTypeStyles(text)}`}>
        {text.startsWith('V') && <span className="opacity-60 font-black mr-0.5">{text[0]}</span>}
        {text.startsWith('V') ? text.slice(1) : text}
      </span>
      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: isAbove ? 10 : -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: isAbove ? 5 : -5 }} className={`absolute ${isAbove ? 'bottom-full mb-3' : 'top-full mt-3'} left-1/2 -translate-x-1/2 w-64 p-5 bg-[#37464F] dark:bg-slate-900 text-white rounded-2xl shadow-2xl z-[999] text-left border border-white/10`}>
            <h6 className="text-sm font-black mb-1.5 border-b border-white/10 pb-1.5 flex items-center justify-between"><span>{data.title}</span> <span className="text-[10px] text-white/50">{text}</span></h6>
            <div className="text-[11px] text-slate-300 leading-relaxed mb-3">{data.desc}</div>
            <div className="space-y-1.5"><p className="text-[10px] uppercase tracking-widest text-white/40 font-black">Ví dụ:</p>{data.examples.map((ex, i) => (<p key={i} className="text-xs font-medium text-slate-200 pl-2 border-l-2 border-[#00BCD4]/30">{ex}</p>))}</div>
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
    let s = String(str);
    
    // 1. Convert ruby tags to paren format
    s = s.replace(/<ruby[^>]*>(.*?)<rt[^>]*>(.*?)<\/rt><\/ruby>/gi, '$1($2)')
         .replace(/<rb[^>]*>(.*?)<\/rb><rt[^>]*>(.*?)<\/rt>/gi, '$1($2)');
         
    // 2. Formatting tags handling
    const patterns_to_highlight = [];
    const cleanTitle = title.replace(/^[～~]/, '').replace(/\s*\(.*\)\s*$/, '').trim();
    if (cleanTitle.length > 1) {
      patterns_to_highlight.push(cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const sym = cleanTitle.replace(/[\(\)（）\s]/g, '');
      if (sym.length > 1) patterns_to_highlight.push(sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }

    const rubyRegexStr = '(?:[\u4E00-\u9FAF\u3400-\u4DBF\u30A0-\u30FF])+[\(（][\u3040-\u309F\u30A0-\u30FF]+[\)）]';
    const tagRegex = /(<br\s*\/?>|<strong>.*?<\/strong>|<b>.*?<\/b>|<i>.*?<\/i>|<u>.*?<\/u>|<a [^>]*>.*?<\/a>)/gi;
    
    const parts = s.split(tagRegex);
    
    const processInner = (text, k) => {
      if (!text) return null;
      const regex = new RegExp(`(～|~|${rubyRegexStr}${patterns_to_highlight.length > 0 ? '|' + patterns_to_highlight.join('|') : ''})`, 'gi');
      const segments = text.split(regex);
      return segments.map((seg, si) => {
        if (!seg) return null;
        
        // Match Ruby from parenteral format: Kanji(Reading) or Kanji（Reading）
        // Handles both Western () and Japanese （） brackets
        const fMatch = seg.match(/^([\u4E00-\u9FAF\u3400-\u4DBF\u30A0-\u30FF]+)[\(（]([\u3040-\u309F\u30A0-\u30FF]+)[\)）]$/);
        if (fMatch) {
          const base = fMatch[1];
          const reading = fMatch[2];
          const isHigh = patterns_to_highlight.some(pat => new RegExp(pat, 'i').test(base)) || (cleanTitle && (base.includes(cleanTitle) || reading.includes(cleanTitle)));
          
          return (
            <span 
              key={`${k}-${si}`} 
              className={isHigh ? "text-red-600 dark:text-red-400 font-extrabold" : ""} 
              style={{ 
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                verticalAlign: 'bottom',
                lineHeight: '1',
                margin: '0 0.1em',
                transform: 'translateY(-0.1em)'
              }}
            >
              <span style={{ 
                fontSize: '0.5em', 
                lineHeight: '1.2', 
                color: isHigh ? 'inherit' : '#94a3b8',
                marginBottom: '0.1em',
                whiteSpace: 'nowrap'
              }}>
                {reading}
              </span>
              <span style={{ lineHeight: '1' }}>{base}</span>
            </span>
          );
        }
        
        // Match Patterns to highlight
        if (patterns_to_highlight.some(pat => new RegExp(`^${pat}$`, 'i').test(seg))) {
          return <span key={`${k}-${si}`} className="text-red-500 dark:text-red-400 font-extrabold underline underline-offset-2 decoration-red-500/30 whitespace-nowrap">{seg}</span>;
        }

        // Tilde handle
        if (seg === '~' || seg === '～') return <span key={`${k}-${si}`} className="mx-0.5 text-slate-400 font-bold">{seg}</span>;
        
        return <span key={`${k}-${si}`}>{seg}</span>;
      });
    };

    return parts.map((part, i) => {
      if (!part) return null;
      if (part.toLowerCase().startsWith('<br')) return <br key={i} />;
      
      const tagMatch = part.match(/<(\w+)[^>]*>(.*?)<\/\1>/i);
      if (tagMatch) {
         const tagName = tagMatch[1].toLowerCase();
         const inner = tagMatch[2];
         if (tagName === 'strong' || tagName === 'b') 
           return <strong key={i} className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{processInner(inner, i)}</strong>;
         if (tagName === 'i') return <i key={i} className="italic text-slate-600">{processInner(inner, i)}</i>;
         if (tagName === 'u') return <u key={i} className="underline decoration-slate-300">{processInner(inner, i)}</u>;
         if (tagName === 'a') return <span key={i} className="text-[#1CB0F6] underline cursor-pointer">{processInner(inner, i)}</span>;
      }

      // Final cleanup of any other tags that might have slipped through
      const textOnly = part.replace(/<[^>]*>?/gm, '');
      return processInner(textOnly, i);
    });
  };

  if (mode === "list") {
    const rawItems = parseToArrayFlexible(text);
    const listSegments = rawItems.flatMap(item => {
      const content = (typeof item === 'object' && item !== null) ? (item.html || item.text || item.jp || item.japanese || "") : String(item);
      const segments = parseToArrayFlexible(content);
      return segments.map(seg => {
        const s = String(seg).trim();
        const markerRegex = /([①-⑳㉑-㉟]|\d+\.|\(\d+\))/;
        const m = s.match(markerRegex);
        if (m && s.indexOf(m[1]) < 10) {
          let num = m[1].replace(/[\(\)\.]/g, '');
          const code = num.charCodeAt(0);
          if (code >= 0x2460 && code <= 0x2473) num = String(code - 0x2460 + 1);
          else if (code >= 0x3251 && code <= 0x325F) num = String(code - 0x3251 + 21);
          const textPart = s.replace(m[1], '').trim().replace(/^[\.\s•·\-]+/, '').trim();
          return { num, text: textPart };
        }
        return { num: null, text: s };
      });
    });

    return (
      <div className="space-y-8 font-bold text-slate-700 dark:text-slate-200">
        {listSegments.map((m, mi) => (
          <div key={mi} className="flex gap-5 items-start group">
            <div className="pt-0.5">
              {m.num ? (
                <span className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-[#58CC02] to-[#46A310] flex items-center justify-center text-white font-black text-[13px] shadow-sm shadow-[#58CC02]/30 border border-white/20 select-none">{m.num}</span>
              ) : (
                <div className="w-8 flex justify-center"><span className="w-2 h-2 mt-2.5 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-[#1CB0F6] group-hover:scale-125 transition-all shadow-sm" /></div>
              )}
            </div>
            <div className="flex-1 space-y-3">
               {m.text.includes('→') ? (
                 m.text.split('→').map((part, pi) => (
                   <div key={pi} className={pi === 0 ? "text-[20px] text-slate-800 dark:text-white font-medium" : "text-[15px] text-slate-400 dark:text-slate-500 font-medium pl-6 border-l-3 border-emerald-500/10 dark:border-emerald-500/5 italic leading-relaxed"}>{pi === 1 ? '→ ' : ''}{processText(part.trim())}</div>
                 ))
               ) : (
                 <div className="text-[20px] text-slate-800 dark:text-white font-medium">{processText(m.text.trim())}</div>
               )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const targetWord = title.replace(/^[～~]/, '').replace(/\s*\(.*\)\s*$/, '').trim();
  const normalized = String(text).replace(/＋/g, ' + ').replace(/／/g, ' / ').replace(/～/g, ' ~ ').replace(/｜/g, ' | ').replace(/．/g, ' . ').replace(/\s+/g, ' ');
  const rawTextCleaned = normalized.replace(/\s*(Động từ thể|Tính từ đuôi|Danh từ|DANH TỪ)[^+\/\|~～→]*/gi, ' ').replace(/\[Thể Thường\]|\[Tính từ[^\]]*\]|\[Danh từ[^\]]*\]/gi, '').replace(/\s+/g, ' ').trim();
  let processedFormula = rawTextCleaned.replace(/\s{3,}/g, '\n').split(/\s+/).reduce((acc, word, i, arr) => {
      const prevWord = i > 0 ? arr[i-1] : "";
      const isStructuralForm = /^[VAN][るないたているいなu]/.test(word) || /^N(\s|\+|$)/.test(word) || (word === "N" && arr[i+1] === "+");
      const isAfterSeparator = /[\/／~～|]/.test(prevWord);
      if (i > 0 && isStructuralForm && !isAfterSeparator) return acc + '\n' + word;
      return acc + (i === 0 ? '' : ' ') + word;
  }, "").replace(/\n+/g, '\n').trim();
  const rawSegments = processedFormula.split(/\n+/).filter(s => s.trim());
  return (
    <div className="bg-slate-50/80 dark:bg-slate-900/40 rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-inner inline-block min-w-full lg:min-w-fit">
      <div className="flex flex-col gap-y-4">
        {rawSegments.map((line, li) => {
          const tokens = line.split(/(\s+|\+|→|／|\/|~|～|\|)/g).filter(Boolean);
          const plusIndex = tokens.map(t => t.trim()).indexOf('+');
          const arrowIndex = tokens.map(t => t.trim()).indexOf('→');
          const firstSeparatorIndex = plusIndex !== -1 ? plusIndex : arrowIndex;
          const renderToken = (t, ti, isAfterSeparator) => {
            const token = t?.trim();
            if (!token) return <span key={ti} className="mx-0.5 select-none"> </span>;
            if (token === '+' || token === '→') return <div key={ti} className={`flex items-center justify-center min-w-[20px] h-5 ${token === '+' ? 'bg-orange-500/15' : 'bg-slate-500/10'} rounded-full mx-1 shrink-0`}><span className={`${token === '+' ? 'text-orange-600' : 'text-slate-500'} font-black text-[10px]`}>{token}</span></div>;
            if (['/', '／', '|'].includes(token)) return <span key={ti} className="text-slate-300 dark:text-slate-600 font-light mx-2 select-none text-lg">|</span>;
            if (['(', ')', '~', '～'].includes(token)) return <span key={ti} className="text-slate-400 font-bold px-0.5 select-none">{token}</span>;
            if (GRAMMAR_FORMS[token]) return <GrammarFormItem key={ti} text={token} />;
            const parts = processText(token);
            const isTarget = token.includes(targetWord) || (isAfterSeparator && !GRAMMAR_FORMS[token] && token.length > 1);
            return <span key={ti} className={`text-[16px] font-bold px-1.5 py-0.5 rounded-lg transition-all ${isTarget ? "text-orange-600 bg-orange-50 dark:bg-orange-500/10" : "text-slate-600 dark:text-slate-300"}`}>{parts}</span>;
          };
          return <div key={li} className="flex flex-wrap items-center gap-y-2 py-0.5">{tokens.map((t, ti) => renderToken(t, ti, firstSeparatorIndex !== -1 && ti > firstSeparatorIndex))}</div>;
        })}
      </div>
    </div>
  );
};
