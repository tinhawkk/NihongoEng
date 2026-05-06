const fs = require('fs');

const filePath = 'src/pages/HomePage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Function to fix UTF-8 strings misread as Latin-1 (ISO-8859-1)
function fixEncoding(str) {
    try {
        // Try the escape/decodeURIComponent trick
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str;
    }
}

// Target strings that look like Mojibake
// In JS, UTF-8 bytes like 0xC3 0xA0 (à) are read as characters Ã and à
// We can use a regex to find these sequences.
// This regex targets common 2-byte and 3-byte UTF-8 sequences misread as Latin-1
const mojibakeRegex = /[\xC2-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF][\x80-\xBF]/g;

content = content.replace(mojibakeRegex, (match) => {
    return fixEncoding(match);
});

// Also handle specific Japanese sequences that the above might miss or if they are 4-byte
const manual = {
    'æ¼¢å­—': '漢字',
    'æ¼¢': '漢',
    'æ³¨æ„ ': '注意',
    'ã ¡ã‚…ã †ã „': 'ちゅうい',
    'é£Ÿã ¹ã‚‹': '食べる'
};

for (const [old, newVal] of Object.entries(manual)) {
    content = content.split(old).join(newVal);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Automated encoding fix applied.');
