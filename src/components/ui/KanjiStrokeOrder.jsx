import React, { useEffect, useRef, useState } from "react";

const COLORS = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#0ea5e9", // sky-500
  "#3b82f6", // blue-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
];

export const KanjiStrokeOrder = ({ kanji, size = 300 }) => {
  const [svgContent, setSvgContent] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!kanji) return;
    let isMounted = true;
    
    const fetchSvg = async () => {
      try {
        setTimeout(() => {
          setSvgContent(null);
          setError(false);
        }, 0);
        const hex = kanji.codePointAt(0).toString(16).padStart(5, '0');
        const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Not found");
        let text = await res.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        
        const paths = doc.querySelectorAll('path');
        paths.forEach((path, i) => {
          path.setAttribute('stroke', COLORS[i % COLORS.length]);
          path.setAttribute('stroke-width', '4');
        });
        
        const texts = doc.querySelectorAll('text');
        texts.forEach((txt, i) => {
          txt.setAttribute('fill', COLORS[i % COLORS.length]);
          txt.setAttribute('font-weight', 'bold');
          txt.setAttribute('font-size', '8');
        });
        
        const svgElement = doc.documentElement;
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        
        const modifiedSvg = new XMLSerializer().serializeToString(svgElement);
        if (isMounted) setSvgContent(modifiedSvg);
      } catch (err) {
        console.error("[KanjiStrokeOrder] error:", err);
        if (isMounted) setError(true);
      }
    };
    fetchSvg();
    
    return () => { isMounted = false; };
  }, [kanji]);

  if (error) {
    return (
      <div 
        className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 text-center"
        style={{ width: size, height: size }}
      >
        <span className="text-4xl mb-2">🤔</span>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
          Không có dữ liệu nét cho "{kanji}"
        </p>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div 
        className="flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl shadow-inner overflow-hidden"
        style={{ width: size, height: size }}
      >
        <div className="w-8 h-8 border-4 border-slate-200 dark:border-white/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div 
      className="relative bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl shadow-inner overflow-hidden transition-all"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[80%] h-[1px] border-t-[1px] border-dashed border-slate-300 dark:border-slate-700 absolute top-1/2"></div>
        <div className="h-[80%] w-[1px] border-l-[1px] border-dashed border-slate-300 dark:border-slate-700 absolute left-1/2"></div>
      </div>
      <div 
        className="relative z-10 w-full h-full p-4"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};
