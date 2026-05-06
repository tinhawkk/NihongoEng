const fs = require('fs');

const filePath = 'src/pages/HomePage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = {
    // Mojibake patterns for Vietnamese (UTF-8 read as Latin-1)
    'á»ª': 'Ừ', 'á»°': 'Ự', 'á» ': 'ề', 'áº·': 'ặ', 'áº£': 'ả', 'áº¿': 'ế', 'á»‡': 'ệ', 'á»…': 'ễ', 'á»ƒ': 'ể', 'á» ': 'ơ',
    'á»›': 'ớ', 'á» ': 'ờ', 'á»Ÿ': 'ở', 'á»¡': 'ỡ', 'á»£': 'ợ', 'á»±': 'ự', 'á»©': 'ứ', 'á»«': 'ừ', 'á»­': 'ử', 'á»¯': 'ữ',
    'á»‹': 'ị', 'á» ': 'ọ', 'á» ': 'ỏ', 'á»§': 'ủ', 'Å©': 'ũ', 'á»¥': 'ụ', 'á» ': 'ồ', 'á»‘': 'ố', 'á»™': 'ộ', 'á»•': 'ổ', 'á»—': 'ỗ',
    'áº­': 'ậ', 'áº¥': 'ấ', 'áº§': 'ầ', 'áº©': 'ẩ', 'áº«': 'ẫ', 'áº¯': 'ắ', 'áº±': 'ằ', 'áº³': 'ẳ', 'áºµ': 'ẵ',
    'Ã ': 'à', 'Ã¡': 'á', 'Ã£': 'ã', 'áº¡': 'ạ', 'Ãª': 'ê', 'Ã­': 'í', 'Ã¬': 'ì', 'Ã´': 'ô', 'Ã²': 'ò', 'Ã³': 'ó', 'Ãµ': 'õ', 'Ã¹': 'ù', 'Ãº': 'ú', 'Ã¢': 'â', 'Ã¨': 'è', 'Ã©': 'é', 'áº¹': 'ẹ', 'áº½': 'ẽ', 'Ä‘': 'đ', 'Ä ': 'Đ', 'Äƒ': 'ă', 'Æ¡': 'ơ', 'Æ°': 'ư',
    'â€º': '›', 'â€”': '—', 'â€¢': '•', 'â€¦': '…',
    'há» c': 'học', 'đá» ': 'đề', 'bá» ': 'bỏ', 'Tá»ª Vá»°NG': 'TỪ VỰNG', 'Chá» n': 'Chọn', 'TIáº¾NG ANH': 'TIẾNG ANH',
    'Ã”n': 'Ôn', 'cháº·ng': 'chặng', 'Há» c': 'Học', 'Ä á»£t': 'Đợt', 'ngÃ y': 'ngày', 'nÃ o': 'nào', 'khÃ¡c': 'khác',
    'bÃ¢y giá» ': 'bây giờ', 'Ä á»™t': 'Đột', 'DÅ©ng': 'Dũng', 'giÃ¡o': 'giáo', 'trÃ¬nh': 'trình', 'tinh gá» n': 'tinh gọn',
    'Ná» n': 'Nền', 'ná»¯a': 'nữa', 'chÃ³p': 'chớp', 'nhoÃ¡ng': 'nhoáng', 'quan trá» ng': 'quan trọng',
    'há»  c': 'học', 'Ä‘áº¥u': 'đấu', 'trÆ°á» ng': 'trường', 'tá»‘c': 'tốc', 'chuá»—i': 'chuỗi', 'cháº·ng': 'chặng',
    'báº¯t': 'bắt', 'đáº§u': 'đầu', 'há» c': 'học'
};

for (const [old, newVal] of Object.entries(replacements)) {
    content = content.split(old).join(newVal);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Final encoding fix applied.');
