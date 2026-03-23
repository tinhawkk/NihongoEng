const romajiMap = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  sa: "さ", shi: "し", su: "す", se: "せ", so: "そ",
  za: "ざ", ji: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  ta: "た", chi: "ち", tsu: "つ", te: "て", to: "と",
  da: "だ", di: "ぢ", du: "づ", de: "で", "do": "ど",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", fu: "ふ", he: "へ", ho: "ほ",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: " mo", // Fix space
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を", n: "ん", nn: "ん",
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ",
  ja: "じゃ", ju: "じゅ", jo: "じょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ"
};

// Fix mo
romajiMap.mo = "も";

export function romajiToHiragana(text) {
  if (!text) return text;
  let str = text.toLowerCase();
  let result = "";
  let i = 0;

  while (i < str.length) {
    let char = str[i];
    let next = str[i + 1];
    let third = str[i + 2];

    // Handle double consonants (っ)
    if (char === next && "kqstpbhgzrdm".includes(char) && char !== 'n') {
      result += "っ";
      i++;
      continue;
    }

    // Special handling for 'n'
    if (char === 'n') {
       if (!next) {
          // If it's the very last character, treat as n (don't convert to ん yet to allow 'na')
          result += "n";
          i++;
          continue;
       }
       // If it's 'nn', it's definitely 'ん'
       if (next === 'n') {
          result += "ん";
          i += 2;
          continue;
       }
       // If followed by vowel or y, it's a syllable (na, ni, nu, ne, no, nya, etc.)
       if ("aeiouy".includes(next)) {
          // Fall through to normal matching
       } else {
          // Is followed by any other char? It's 'ん'
          result += "ん";
          i++;
          continue;
       }
    }

    // Try to match longest sequence (3, then 2, then 1)
    let matched = false;
    for (let len = 3; len >= 1; len--) {
        let chunk = str.substring(i, i + len);
        if (romajiMap[chunk]) {
            result += romajiMap[chunk];
            i += len;
            matched = true;
            break;
        }
    }

    if (!matched) {
        result += char;
        i++;
    }
  }

  // Cleanup: if it ends with single 'n', we might want to convert if word ends?
  // But for typing, we leave it as 'n' to allow next vowels.
  // Actually, standard practice for typing: 'n' + space converts to 'ん'
  // But here we can just return it.

  return result;
}
