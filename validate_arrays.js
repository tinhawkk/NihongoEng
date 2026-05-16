import fs from 'fs';
const content = fs.readFileSync('src/components/pomodoro/PomodoroCat.jsx', 'utf8');

const regex = /animate=\{\{\s*(.*?)\s*\}\}\s*transition=\{\{\s*(.*?)\s*\}\}/gs;
let match;
let count = 0;

while ((match = regex.exec(content)) !== null) {
    count++;
    const animateStr = match[1];
    const transStr = match[2];
    
    // very rudimentary check for arrays
    const timesMatch = transStr.match(/times:\s*\[(.*?)\]/);
    if (!timesMatch) continue;
    
    const timesArray = timesMatch[1].split(',').filter(x => x.trim().length > 0);
    const timesLen = timesArray.length;
    
    // find all arrays in animate object
    const animateArrays = animateStr.match(/\w+:\s*\[(.*?)\]/g);
    if (animateArrays) {
        animateArrays.forEach(arrStr => {
            const arrMatch = arrStr.match(/(\w+):\s*\[(.*?)\]/);
            if (arrMatch) {
                const propName = arrMatch[1];
                let propValuesStr = arrMatch[2];
                // basic split by comma, ignoring commas in strings? 
                // Since our strings don't have commas (e.g. M 1 2 Q 3 4), we can just split by comma
                // except if there are nested functions, but we only have string and number arrays.
                // a better split that respects quotes:
                let inString = false;
                let elemCount = 1; // start with 1 if there's anything
                if (propValuesStr.trim().length === 0) elemCount = 0;
                for (let i = 0; i < propValuesStr.length; i++) {
                    if (propValuesStr[i] === '"' || propValuesStr[i] === "'") inString = !inString;
                    if (propValuesStr[i] === ',' && !inString) elemCount++;
                }

                if (elemCount !== timesLen) {
                    console.log(`Mismatch found! Prop: ${propName} has ${elemCount} elements, but times has ${timesLen} elements.`);
                    console.log('Animate:', animateStr);
                    console.log('Transition:', transStr);
                    console.log('---');
                }
            }
        });
    }
}
console.log(`Checked ${count} animate/transition blocks.`);
