const fs = require('fs');
const p = 'd:\\FPTU_LearningMaterial\\Semester 9\\DE THI N5-N1\\Voca\\vocab-quiz-react\\src\\components\\pomodoro\\PomodoroCat.jsx';
let c = fs.readFileSync(p, 'utf8');

// Fix 1: Tongue/Paw complex times [0, ..., 0.8] -> [0, ..., 0.8, 1.0]
// And pad the corresponding property arrays.

// Squint/Licking times: [0, 0.2, 0.4, 0.8] -> 4 elements. Needs 5th.
c = c.replace(/times: \[0, 0.2, 0.4, 0.8\]/g, 'times: [0, 0.2, 0.4, 0.8, 1.0]');
// Opacity for squint: [0, 0.7, 0.7, 0] -> [0, 0.7, 0.7, 0, 0]
c = c.replace(/opacity: \[0, 0.7, 0.7, 0\]/g, 'opacity: [0, 0.7, 0.7, 0, 0]');

// Eating/Paws times: [0, 0.2, 0.3, 0.6, 0.8] -> 5 elements. Needs 6th.
c = c.replace(/times: \[0, 0.2, 0.3, 0.6, 0.8\]/g, 'times: [0, 0.2, 0.3, 0.6, 0.8, 1.0]');

// Tongue times: [0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 0.7, 0.8] -> 9 elements. Needs 10th.
c = c.replace(/times: \[0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 0.7, 0.8\]/g, 'times: [0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 0.7, 0.8, 1.0]');
// Handcrafted one with 0.5 instead of 0.45:
c = c.replace(/times: \[0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.5, 0.7, 0.8\]/g, 'times: [0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.5, 0.7, 0.8, 1.0]');

// Padding the specific arrays found in the file:
// 1. CatFaceBase Tongue Opacity
c = c.replace(/opacity: \[0, 1, 1, 1, 0, 1, 1, 1, 0\],/g, 'opacity: [0, 1, 1, 1, 0, 1, 1, 1, 0, 0],');
// 2. CatFaceBase Tongue d (Wait, this is tricky to replace via regex if multi-line)
// I'll use a more generic padding for arrays ending in ...Z"]
c = c.replace(/"M72 104 Q80 108 88 104"(\s+\]\})/g, '"M72 104 Q80 108 88 104", "M72 104 Q80 108 88 104"$1');

// 3. FocusProps arms?
// I'll look for other arrays with 0.8.

fs.writeFileSync(p, c);
console.log('Fixed Framer Motion times and padded arrays in PomodoroCat.jsx');
