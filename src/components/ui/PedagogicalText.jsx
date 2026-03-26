import React from "react";
import { GrammarFormItem, GRAMMAR_FORMS } from "./GrammarFormItem";

/**
 * PedagogicalText Component
 * Enriches raw Nhost text with:
 * 1. Smart Split (line breaks before V, A, N forms)
 * 2. Smart Cleansing (hiding redundant Vietnamese explanations)
 * 3. Interactive Grammar Tooltips
 * 4. Pedagogical Coloring (Teal for forms, Orange for connectors)
 * 5. Numbered List Support (①, ②, 1., etc.)
 */
export const PedagogicalText = ({ text, mode = "formula" }) => {
  if (!text) return null;

  // MODE 1: Meaning / Description (List breakdown)
  if (mode === "list") {
    const listSegments = text.split(/([①②③④⑤⑥⑦⑧⑨⑩]|\d+\.)/).reduce((acc, part, i, arr) => {
      const isMarker = part.match(/[①②③④⑤⑥⑦⑧⑨⑩]|\d+\./);
      if (isMarker) {
        acc.push({ num: part, text: arr[i+1] || "" });
      } else if (i === 0 && part.trim() && !arr[1]?.match(/[①②③④⑤⑥⑦⑧⑨⑩]|\d+\./)) {
        acc.push({ text: part });
      }
      return acc;
    }, []);

    return (
      <div className="space-y-3 font-bold text-slate-700 dark:text-slate-200">
        {listSegments.map((m, mi) => (
          <div key={mi} className="flex gap-2.5 items-start">
            {m.num && <span className="text-[#58CC02] shrink-0 font-black">{m.num}</span>}
            <span className="flex-1 leading-relaxed">{m.text.trim()}</span>
          </div>
        ))}
      </div>
    );
  }

  // MODE 2: Formula / Structure (Parsing symbols)
  // Normalize symbols
  let cleaned = text
    .replace(/＋/g, '+').replace(/／/g, '/').replace(/～/g, '~')
    // Remove redundant Vietnamese markers
    .replace(/(Động từ thể[^./+~～]*(\.|\s|$)|Tính từ đuôi[^./+~～]*(\.|\s|$)|DANH TỪ[^./+~～]*(\.|\s|$)|Danh từ[^./+~～]*(\.|\s|$))/g, '')
    .trim();

  // Smart Split before forms
  const segments = cleaned.split(/(?=[VAN][るないたているいな]|N\s?\+)/g).filter(s => s.trim());

  return (
    <div className="space-y-2">
      {segments.map((line, li) => {
        const tokens = line.trim().split(/(\+|\/|\(|\)|~|～)/);
        let hasReachedPlus = false;
        return (
          <div key={li} className="text-[17px] font-semibold flex flex-wrap items-center gap-x-1.5 leading-relaxed py-0.5">
            {tokens.map((t, ti) => {
              const token = t.trim();
              if (!token) return null;
              if (token === '+') {
                hasReachedPlus = true;
                return <span key={ti} className="text-[#E24A00] font-black">{token}</span>;
              }
              if (['/', '(', ')', '~', '～'].includes(token)) {
                return <span key={ti} className="text-slate-400 font-medium">{token}</span>;
              }
              if (GRAMMAR_FORMS[token]) {
                return <GrammarFormItem key={ti} text={token} />;
              }
              return (
                <span 
                  key={ti} 
                  className={hasReachedPlus ? "text-[#E24A00] font-black" : "text-[#00796B] dark:text-[#26C6DA]"}
                >
                  {token}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
