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
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を", n: "ん", nn: "ん",
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  sha: "しゃ", shi: "し", shu: "しゅ", she: "しぇ", sho: "しょ",
  sya: "しゃ", syi: "し", syu: "しゅ", sye: "しぇ", syo: "しょ",
  ja: "じゃ", ji: "じ", ju: "じゅ", je: "じぇ", jo: "じょ",
  zya: "じゃ", zyi: "じ", zyu: "じゅ", zye: "じぇ", zyo: "じょ",
  cha: "ちゃ", chi: "ち", chu: "ちゅ", che: "ちぇ", cho: "ちょ",
  tya: "ちゃ", tyi: "ち", tyu: "ちゅ", tye: "ちぇ", tyo: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  // Small kana
  xa: "ぁ", xi: "ぃ", xu: "ぅ", xe: "ぇ", xo: "ぉ",
  la: "ぁ", li: "ぃ", lu: "ぅ", le: "ぇ", lo: "ぉ",
  xtu: "っ", xtsu: "っ", ltu: "っ", ltsu: "っ",
  xya: "ゃ", xyu: "ゅ", xyo: "ょ",
  lya: "ゃ", lyu: "ゅ", lyo: "ょ",
  // Additional variations
  tu: "つ", du: "づ", hu: "ふ",
  kwa: "くぁ", kwi: "くぃ", kwu: "くぅ", kwe: "くぇ", kwo: "くぉ",
  gwa: "ぐぁ", gwi: "ぐぃ", gwu: "ぐぅ", gwe: "ぐぇ", gwo: "ぐぉ",
  tsa: "つぁ", tsi: "つぃ", tse: "つぇ", tso: "つぉ",
  fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
  va: "ゔぁ", vi: "ゔぃ", vu: "ゔ", ve: "ゔぇ", vo: "ゔぉ",
};

export function romajiToHiragana(text) {
  if (!text) return text;
  let str = text.toLowerCase();
  let result = "";
  let i = 0;

  while (i < str.length) {
    let char = str[i];
    let next = str[i + 1];

    // Handle double consonants (っ)
    if (char === next && "kqstpbhgzrdm".includes(char) && char !== 'n') {
      result += "っ";
      i++;
      continue;
    }

    // Special handling for 'n'
    if (char === 'n') {
       if (!next) {
          result += "n";
          i++;
          continue;
       }
       if (next === 'n') {
          result += "ん";
          i += 2;
          continue;
       }
       if ("aeiouy".includes(next)) {
          // Fall through
       } else {
          result += "ん";
          i++;
          continue;
       }
    }

    // Try to match longest sequence (4, 3, 2, then 1)
    let matched = false;
    for (let len = 4; len >= 1; len--) {
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

  return result;
}
