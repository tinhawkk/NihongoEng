const fs = require('fs');

const filePath = 'src/pages/HomePage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const finalManual = {
    'ĐẤU TRƯá»œNG': 'ĐẤU TRƯỜNG',
    'TỐC Đá»˜': 'TỐC ĐỘ',
    'ðŸª™': '💰',
    'â”€â”€â”€': '───',
    'đá» u': 'đều',
    'bá» ': 'bỏ',
    'há» c': 'học',
    'Láº­p': 'Lập',
    'Nháº­t': 'Nhật',
    'TÃ¢m': 'Tâm',
    'NghÄ©a': 'Nghĩa',
    'æ¼¢': '漢',
    'å­—': '字',
    'é£Ÿã ¹ã‚‹': '食べる',
    'Ä‚n': 'Ăn'
};

for (const [old, newVal] of Object.entries(finalManual)) {
    content = content.split(old).join(newVal);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Final manual encoding fix applied.');
