const fs = require('fs');

const replacements = {
    // Mojibake patterns for Vietnamese (UTF-8 read as Latin-1)
    'á»ª': 'Ừ', 'á»°': 'Ự', 'á» ': 'ề', 'áº·': 'ặ', 'áº£': 'ả', 'áº¿': 'ế', 'á»‡': 'ệ', 'á»…': 'ễ', 'á»ƒ': 'ể', 'á» ': 'ơ',
    'á»›': 'ớ', 'á» ': 'ờ', 'á»Ÿ': 'ở', 'á»¡': 'ỡ', 'á»£': 'ợ', 'á»±': 'ự', 'á»©': 'ứ', 'á»«': 'ừ', 'á»­': 'ử', 'á»¯': 'ữ',
    'á»‹': 'ị', 'á» ': 'ọ', 'á» ': 'ỏ', 'á»§': 'ủ', 'Å©': 'ũ', 'á»¥': 'ụ', 'á» ': 'ồ', 'á»‘': 'ố', 'á»™': 'ộ', 'á»•': 'ổ', 'á»—': 'ỗ',
    'á» ': 'ổ', 'á» ': 'ỗ', 'áº­': 'ậ', 'áº¥': 'ấ', 'áº§': 'ầ', 'áº©': 'ẩ', 'áº«': 'ẫ', 'áº¯': 'ắ', 'áº±': 'ằ', 'áº³': 'ẳ', 'áºµ': 'ẵ',
    'Ã ': 'à', 'Ã¡': 'á', 'Ã£': 'ã', 'áº¡': 'ạ', 'Ãª': 'ê', 'Ã­': 'í', 'Ã¬': 'ì', 'Ã´': 'ô', 'Ã²': 'ò', 'Ã³': 'ó', 'Ãµ': 'õ', 'Ã¹': 'ù', 'Ãº': 'ú', 'Ã¢': 'â', 'Ã¨': 'è', 'Ã©': 'é', 'áº¹': 'ẹ', 'áº½': 'ẽ', 'Ä‘': 'đ', 'Ä ': 'Đ', 'Äƒ': 'ă', 'Æ¡': 'ơ', 'Æ°': 'ư',
    'â€º': '›', 'â€”': '—', 'â€¢': '•', 'â€¦': '…',
    'á» ': 'ề', 'áº ': 'ả', 'áº½': 'ẽ', 'áº¹': 'ẹ', 'áº±': 'ằ', 'áº·': 'ặ', 'á» ': 'ờ', 'á»‹': 'ị', 'á» ': 'ọ', 'á» ': 'ỏ', 'á» ': 'ồ', 'á»‘': 'ố', 'á»™': 'ộ', 'á»•': 'ổ', 'á»—': 'ỗ', 'á»›': 'ớ', 'á»Ÿ': 'ở', 'á»¡': 'ỡ', 'á»£': 'ợ', 'á»±': 'ự', 'á»©': 'ứ', 'á»«': 'ừ', 'á»­': 'ử', 'á»¯': 'ữ',
    'há» c': 'học', 'đá» ': 'đề',
    'Tá»ª Vá»°NG': 'TỪ VỰNG'
};

const filePath = 'src/pages/HomePage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix encoding
for (const [old, newVal] of Object.entries(replacements)) {
    const regex = new RegExp(old, 'g');
    content = content.replace(regex, newVal);
}

// Logic: Instead of loosening, let's make it STRICTLY exclude only what's already matched.
// We'll calculate matched IDs and then filter the communityTree.
// I'll do this by injecting a Set logic in the HomePage component.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Encoding fix applied.');
