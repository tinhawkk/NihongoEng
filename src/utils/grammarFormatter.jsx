import React from "react";

/**
 * Parses text with parentheses furigana: 漢字(かんじ) 
 * and returns a list of Ruby/Text nodes.
 */
export const parseFurigana = (text) => {
  if (!text) return "";
  
  // Regex matches: Kanji(Furigana) 
  // Pattern: Any sequence of characters before ( , followed by (...)
  // Note: Japanese brackets （ ） are also common
  const regex = /([^\s()（）]+)[(（]([^)）]+)[)）]/g;
  
  const result = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      result.push(text.substring(lastIndex, match.index));
    }

    // Add the ruby tag
    const [fullMatch, kanji, furigana] = match;
    result.push(
      <ruby key={match.index}>
        {kanji}
        <rt className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">
          {furigana}
        </rt>
      </ruby>
    );

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return <span>{result}</span>;
};

/**
 * Higher order component/helper to render pedagogical text
 * Supports both raw markup and furigana parsing.
 */
export const SmartText = ({ text, className = "" }) => {
  if (!text) return null;
  // If it contains ruby-like markers, parse it
  if (text.includes("(") || text.includes("（")) {
    return <span className={className}>{parseFurigana(text)}</span>;
  }
  // Otherwise render plain
  return <span className={className}>{text}</span>;
};
