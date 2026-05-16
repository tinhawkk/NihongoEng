import React from "react";

/**
 * Removes furigana patterns from text (Supports: （）, (), [], ［］, <>, ＜＞, 【】)
 */
export function removeFurigana(text) {
  if (!text) return "";
  // 1. Remove standard furigana (Reading) following Kanji
  let cleaned = text.replace(/([\u4E00-\u9FFF])(?:[（\(\[［【].*?[）\)\]］】])/g, "$1");
  // 2. Remove angle bracket suffixes like <する> as they are usually for metadata/sorting
  cleaned = cleaned.replace(/[<＜].*?[>＞]/g, "");
  return cleaned.trim();
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
          <ruby key={`${keyPrefix}-b-${lastBaseIdx}`} style={{ rubyAlign: "center" }} className="whitespace-nowrap">
            {basePart}
            <rt className="text-[0.55em] dark:text-slate-400 font-bold opacity-90 mb-[-0.05em] select-none text-center whitespace-nowrap">
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
        <rt className="text-[0.55em] dark:text-slate-400 font-bold opacity-90 mb-[-0.05em] select-none text-center">
          {rtRemaining}
        </rt>
      </ruby>
    );
  }

  return (
    <span className="inline-flex items-baseline whitespace-nowrap">
      {pieces}
    </span>
  );
};

/**
 * Renders Japanese text with Furigana using <ruby> tags.
 * Supports patterns: Kanji（Reading）, Kanji(Reading), Kanji[Reading], Kanji<Reading>
 */
export function renderFurigana(text) {
  if (!text) return null;
  
  // Regex matches:
  // 1. Kanji block followed by reading in brackets: (Kanji)(Bracket)(Reading)(Bracket)
  // 2. Angle bracket suffixes: (<...>)
  const regex = /([\u4E00-\u9FFF](?:[\u3040-\u30FF]*[\u4E00-\u9FFF])*)[（\(\[［【](.*?)[）\)\]］】]|([<＜][^>＞]+[>＞])/g;
  
  let lastIndex = 0;
  const result = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      result.push(<span key={`txt-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    
    if (match[3]) {
      // It's an angle bracket suffix like <する>
      result.push(
        <span key={`s${match.index}`} className="opacity-40 text-[0.7em] ml-0.5 font-medium">
          {match[3]}
        </span>
      );
    } else {
      // It's a standard Furigana block
      result.push(renderRubyBlock(match[1], match[2], `m${match.index}`));
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    result.push(<span key={`txt-end-${lastIndex}`}>{text.slice(lastIndex)}</span>);
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

  const hasBrackets = /[（\(\[［【].*?[）\)\]］】]|[<＜][^>＞]+[>＞]/.test(word);
  if (hasBrackets) {
    return <>{renderFurigana(word)}</>;
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
          <rt className="text-[0.55em] font-bold opacity-90 mb-[-0.05em] select-none text-center">{parts[i + 4]}</rt>
        </ruby>
      );
    }
  }
  return result;
}
/**
 * Renders Japanese text with Furigana using <ruby> tags as a STRING.
 * Useful for pre-processing text that will be passed to dangerousSetInnerHTML or a Markdown parser.
 */
export function renderFuriganaAsHTML(text) {
  if (!text) return "";
  
  const regex = /([\u4E00-\u9FFF](?:[\u3040-\u30FF]*[\u4E00-\u9FFF])*)[（\(\[［【](.*?)[）\)\]］】]|([<＜][^>＞]+[>＞])/g;
  
  return text.replace(regex, (match, kanji, reading, suffix) => {
    if (suffix) {
      return `<span class="opacity-40 text-[0.7em] ml-0.5 font-medium">${suffix}</span>`;
    }
    
    // Simple version of ruby split for HTML string
    // We can't easily do the smart split here without complex logic, 
    // so we just do a basic ruby wrap.
    return `<ruby style="ruby-align: center;">${kanji}<rt class="text-[0.6em] font-bold opacity-90">${reading}</rt></ruby>`;
  });
}
