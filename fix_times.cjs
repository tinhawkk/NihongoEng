const fs = require('fs');
const p = 'd:\\FPTU_LearningMaterial\\Semester 9\\DE THI N5-N1\\Voca\\vocab-quiz-react\\src\\components\\pomodoro\\PomodoroCat.jsx';
let content = fs.readFileSync(p, 'utf8');

// Fix 1: Tongue animation times and values
content = content.replace(
  /times: \[0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 0.7, 0.8\],/g,
  'times: [0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 0.7, 0.8, 1.0],'
);
// Pading the d array for tongue (9 elements -> 10)
// Original d array has 9 lines. I need to find it and add one more.
content = content.replace(
    /"M72 104 Q80 108 88 104" {3}\/\/ hidden(\s+\]\}\s+transition)/,
    '"M72 104 Q80 108 88 104",\n                "M72 104 Q80 108 88 104"   // hidden (padded)\n              ]$1'
);
// Pading the opacity array for tongue (line 254)
content = content.replace(
    /opacity: \[0, 1, 1, 1, 0, 1, 1, 1, 0\],/g,
    'opacity: [0, 1, 1, 1, 0, 1, 1, 1, 0, 0],'
);

// Fix 2: Licking squint times and values (line 167)
content = content.replace(
  /times: \[0, 0.2, 0.6, 0.8\]/g,
  'times: [0, 0.2, 0.6, 0.8, 1.0]'
);
// Padding opacity for squint (4 elements -> 5)
content = content.replace(
  /opacity: \[0, 0.7, 0.7, 0\]/g,
  'opacity: [0, 0.7, 0.7, 0, 0]'
);

// Fix 3: Snot bubble or others?
// Wait, I already fixed snot bubble to use scale.
// But check any other times: [..., 0.8] matches.
content = content.replace(
    /times: \[0, 0.2, 0.3, 0.6, 0.8\]/g,
    'times: [0, 0.2, 0.3, 0.6, 0.8, 1.0]'
);
// Wait, I need to find what animate properties use this times.
// It was in EatingProps (paws/head).
// I'll just do a global search for any [..., 0.8] and add , 1.0 and fix the corresponding arrays.

fs.writeFileSync(p, content);
console.log('Fixed Framer Motion times in PomodoroCat.jsx');
