import React from "react";

/**
 * Removes furigana patterns from text (Supports: （）, (), [], ［］, <>, ＜＞, 【】)
 */
export function removeFurigana(text) {
  if (!text) return "";
  // Only remove if it looks like furigana: follows Kanji
  return text.replace(/([\u4E00-\u9FFF])(?:[（\(\[<＜【].*?[）\)\]>＞】])/g, "$1").trim();
}

const renderRubyBlock = (base, rt, keyPrefix) => {
  const kanaRegex = /[\u3040-\u30FF]+/g;
  let match;
  const pieces = [];
  let lastBaseIdx = 0;
  let lastRtIdx = 0;

  while ((match = kanaRegex.exec(base)) !== null) {
    const kana = match[0];
    const baseIdx = match.index;
    
    // Look for this kana in the reading, ensuring there's space for preceding Kanji's reading
    // if there was Kanji before this kana.
    const minRtIdx = (baseIdx > lastBaseIdx) ? lastRtIdx + 1 : lastRtIdx;
    const rtIdx = rt.indexOf(kana, minRtIdx);

    if (rtIdx !== -1) {
      // We found a split point!
      const basePart = base.slice(lastBaseIdx, baseIdx);
      const rtPart = rt.slice(lastRtIdx, rtIdx);

      if (basePart) {
        pieces.push(
          <ruby key={`${keyPrefix}-b-${lastBaseIdx}`} style={{ rubyAlign: "center" }}>
            {basePart}
            <rt className="text-[0.42em] dark:text-slate-400 font-normal opacity-90 mb-[-0.1em] select-none text-center">
              {rtPart}
            </rt>
          </ruby>
        );
      }

      pieces.push(<span key={`${keyPrefix}-k-${baseIdx}`}>{kana}</span>);

      lastBaseIdx = baseIdx + kana.length;
      lastRtIdx = rtIdx + kana.length;
    }
  }

  const baseRemaining = base.slice(lastBaseIdx);
  const rtRemaining = rt.slice(lastRtIdx);
  if (baseRemaining) {
    pieces.push(
      <ruby key={`${keyPrefix}-r`} style={{ rubyAlign: "center" }}>
        {baseRemaining}
        <rt className="text-[0.42em] dark:text-slate-400 font-normal opacity-90 mb-[-0.1em] select-none text-center">
          {rtRemaining}
        </rt>
      </ruby>
    );
  }

  return pieces;
};

/**
 * Renders Japanese text with Furigana using <ruby> tags.
 * Supports patterns: Kanji（Reading）, Kanji(Reading), Kanji[Reading], Kanji<Reading>
 */
export function renderFurigana(text) {
  if (!text) return null;
  // Regex: matches a block that STARTS and ENDS with Kanji, optionally with kana in between.
  // e.g. "言い返" matches (starts with 言, ends with 返), but "は注意" does NOT match
  // because は at the start is kana. This prevents greedy capture of preceding particles.
  const regex = /([\u4E00-\u9FFF](?:[\u3040-\u30FF]*[\u4E00-\u9FFF])*)([（\(\[<＜【])(.*?)([）\)\]>＞】])/g;
  let lastIndex = 0;
  const result = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    
    // Use smart splitting for the matched block
    result.push(...renderRubyBlock(match[1], match[3], `m${match.index}`));
    
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
  
  // 1. Smart Suffix Alignment (Handle grammatical markers like <する>, [な])
  // If both word and reading end with the same bracketed suffix, preserve it outside ruby
  const suffixRegex = /([（\(\[<＜【][^）\)\]>＞】]+[）\)\]>＞])$/;
  const wordSuffix = word.match(suffixRegex);
  const readingSuffix = reading ? reading.match(suffixRegex) : null;

  if (wordSuffix && readingSuffix && wordSuffix[0] === readingSuffix[0]) {
    const baseWord = word.slice(0, -wordSuffix[0].length);
    const baseReading = reading.slice(0, -readingSuffix[0].length);
    return (
      <span className="inline-flex items-baseline whitespace-nowrap">
        {combineFurigana(baseWord, baseReading)}
        <span className="opacity-60 font-medium ml-0.5">{wordSuffix[0]}</span>
      </span>
    );
  }

  const hasBrackets = /[（\(\[<＜【]/.test(word);
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
  
  // Use smart splitting to handle mixed Kanji/Kana words correctly
  return renderRubyBlock(word, reading, "comb");
}

/**
 * Formats Markdown-style [Kanji](Reading) into ruby tags
 */
export function renderMarkdownFurigana(text) {
  if (!text) return "";
  const rubyRegex = /([\[［【<＜]([^\]］】>＞]+)[\]］】>＞])([(（<＜]([^)）>＞]+)[)）>＞])/g;
  const parts = text.split(rubyRegex);
  const result = [];
  
  for (let i = 0; i < parts.length; i += 5) {
    if (parts[i]) result.push(<span key={`t${i}`}>{parts[i]}</span>);
    if (parts[i + 2]) {
      result.push(
        <ruby key={`r${i}`} style={{ rubyAlign: 'center' }}>
          {parts[i + 2]}
          <rt className="text-[0.42em] font-normal opacity-90 mb-[-0.1em] select-none text-center">{parts[i + 4]}</rt>
        </ruby>
      );
    }
  }
  return result;
}
