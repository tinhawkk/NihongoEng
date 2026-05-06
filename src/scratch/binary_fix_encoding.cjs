const fs = require('fs');

const filePath = 'src/pages/HomePage.jsx';
// Read as raw bytes (buffer)
const buffer = fs.readFileSync(filePath);

// If the file was saved as UTF-8 but the content is actually UTF-8-encoded-as-Latin1
// We can treat it as Latin-1 and then convert to UTF-8
const content = buffer.toString('binary');
const fixedContent = Buffer.from(content, 'binary').toString('utf8');

fs.writeFileSync(filePath, fixedContent, 'utf8');
console.log('Binary-to-UTF8 conversion fix applied.');
