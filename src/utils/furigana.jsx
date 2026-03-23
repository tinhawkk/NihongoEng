import React from "react";

/**
 * Removes furigana patterns from text (Supports: （）, (), [], <>)
 */
export function removeFurigana(text) {
  if (!text) return "";
  return text
    .replace(/（.*?）/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/<.*?>/g, "");
}

/**
 * Renders Japanese text with Furigana using <ruby> tags.
 * Supports patterns: Kanji（Reading）, Kanji(Reading), Kanji[Reading], Kanji<Reading>
 */
export function renderFurigana(text) {
  if (!text) return null;
  // Regex: matches Kanji blocks/Kanas/Latin blocks immediately followed by any parens/brackets
  const regex = /((?:[\u4E00-\u9FFF]+[\u3040-\u30FF]*)|[\u3040-\u30FF]+|[A-Za-z0-9]+)([（\(\[<])(.*?)([）\)\]>])/g;
  let lastIndex = 0;
  const result = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    result.push(
      <ruby key={match.index + match[1]}>
        {match[1]}
        <rt className="text-[0.45em] dark:text-slate-400 font-bold tracking-normal">{match[3]}</rt>
      </ruby>
    );
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  return result;
}

/**
 * Smartly combines word and reading into a ruby element.
 * If word contains parentheses or brackets, it uses renderFurigana to format parts.
 * If word and reading are separate, it creates a ruby wrap IF they differ and word has Kanji.
 */
export function combineFurigana(word, reading) {
  if (!word) return null;
  
  const hasBrackets = /[（\(\[<]/.test(word);
  if (hasBrackets) {
    return renderFurigana(word);
  }

  if (!reading || word === reading) {
    return word;
  }

  // If word is completely kana, don't wrap with redundant reading
  const isAllKana = /^[\u3040-\u30FF\s、。？！]+$/.test(word);
  if (isAllKana) {
    return word;
  }
  
  return (
    <ruby>
      {word}
      <rt className="text-[0.45em] dark:text-slate-400 font-bold tracking-normal">{reading}</rt>
    </ruby>
  );
}

/**
 * Formats Markdown-style [Kanji](Reading) into ruby tags
 */
export function renderMarkdownFurigana(text) {
  if (!text) return "";
  const parts = text.split(/\[([^\]]+)\]\(([^)]+)\)/g);
  const result = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) result.push(<span key={`t${i}`}>{parts[i]}</span>);
    if (parts[i + 1]) {
      result.push(
        <ruby key={`r${i}`}>
          {parts[i + 1]}
          <rt className="text-[0.4em] font-bold">{parts[i + 2]}</rt>
        </ruby>
      );
    }
  }
  return result;
}
