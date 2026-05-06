const fs = require('fs');

const filePath = 'src/pages/HomePage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix Mojibake with the regex trick
const mojibakeRegex = /[\xC2-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF][\x80-\xBF]/g;
content = content.replace(mojibakeRegex, (match) => {
    try {
        return decodeURIComponent(escape(match));
    } catch (e) {
        return match;
    }
});

// 2. Fix hijacking logic for Premium Decks
const oldPremiumMatch = /const root = communityTree\.find\(r => \{\s*const t = r\.title\.toUpperCase\(\);\s*if \(!t\.includes\(levelMatch\)\) return false;\s*\/\/ Strictly Premium: match '8000' or 'TỪ VỰNG' and EXCLUDE 'ORIGINAL' or 'JAPAN'\s*return \(\s*t\.includes\("8000"\) \|\|\s*\(t\.includes\("TỪ VỰNG"\) && !t\.includes\("ORIGINAL"\) && !t\.includes\("JAPAN"\)\) \|\|\s*t === deck\.title\.toUpperCase\(\)\s*\);\s*\}\);/;

const newPremiumMatch = `const root = communityTree.find(r => {
                  const t = r.title.toUpperCase();
                  if (!t.includes(levelMatch)) return false;
                  // Strictly Premium: must include '8000' and 'TỪ VỰNG', and NOT include 'MONDAI' or 'ORIGINAL' or 'JAPAN'
                  return (
                    (t.includes("8000") && t.includes("TỪ VỰNG")) ||
                    (t.includes("TỪ VỰNG") && !t.includes("MONDAI") && !t.includes("ORIGINAL") && !t.includes("JAPAN") && !t.includes("MORI")) ||
                    t === deck.title.toUpperCase()
                  );
                });`;

content = content.replace(oldPremiumMatch, newPremiumMatch);

// 3. Fix matchedIds calculation logic to match the new Premium criteria
const oldMatchedIdsLogic = /const isPremium = levelMatch && \(\s*t\.includes\("8000"\) \|\|\s*\(t\.includes\("TỪ VỰNG"\) && !t\.includes\("ORIGINAL"\) && !t\.includes\("JAPAN"\) && !t\.includes\("MORI"\)\)\s*\);/;

const newMatchedIdsLogic = `const isPremium = levelMatch && (
        (t.includes("8000") && t.includes("TỪ VỰNG")) ||
        (t.includes("TỪ VỰNG") && !t.includes("MONDAI") && !t.includes("ORIGINAL") && !t.includes("JAPAN") && !t.includes("MORI"))
      );`;

content = content.replace(oldMatchedIdsLogic, newMatchedIdsLogic);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Hijacking fix and automated encoding fix applied.');
