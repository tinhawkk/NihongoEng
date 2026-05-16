const fs = require('fs');
const p = 'd:\\FPTU_LearningMaterial\\Semester 9\\DE THI N5-N1\\Voca\\vocab-quiz-react\\src\\components\\pomodoro\\PomodoroCat.jsx';
let c = fs.readFileSync(p, 'utf8');

// I'll look for everything from "const CatFaceBase" to "~Purr~" and replace it.
const startMarker = 'const CatFaceBase = ({ mode, isActive, isFeeding, happiness, idleAction }) => {';
const endMarker = '/* Purr Text Visual */';

// I'll rebuild the WHOLE CatFaceBase component logic correctly.
const fixedCatFaceBase = `const CatFaceBase = ({ mode, isActive, isFeeding, happiness, idleAction }) => {
  const isSleeping = !isActive && !isFeeding && idleAction === 1;
  const isBoxOrYarn = !isActive && !isFeeding && (idleAction === 2 || idleAction === 3);
  const happy = isFeeding || (mode === "longBreak" && isActive) || isBoxOrYarn;
  const exercise = mode === "shortBreak" && isActive;
  const squint = mode === "focus" && isActive;

  return (
    <>
      {/* Blush - Big, soft, positioned low */}
      <ellipse cx="38" cy="102" rx="14" ry="9" fill="#ff99a8" opacity="0.45" />
      <ellipse cx="122" cy="102" rx="14" ry="9" fill="#ff99a8" opacity="0.45" />

      {/* Eyes */}
      {isSleeping
        ? /* Sleeping (> < curved) eyes */
          [52, 108].map((cx) => (
            <path key={cx} d={\`M\${cx - 7} 95 Q\${cx} 100 \${cx + 7} 95\`} stroke="#432c23" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          ))
        : exercise
          ? /* Gym (> <) eyes */
            [52, 108].map((cx, i) => (
              <path
                key={cx}
                d={\`M\${cx - 6} 92 L\${cx} 97 L\${cx + 6} 92\`}
                stroke="#432c23"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))
          : happy
            ? /* Happy (^ ^) eyes */
              [52, 108].map(cx => (
                <g key={cx}>
                  <path
                    d={\`M\${cx - 8} 97 Q\${cx} 85 \${cx + 8} 97\`}
                    stroke="#432c23"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <circle cx={cx - 4} cy="90" r="1.5" fill="#ff99a8" opacity="0.7" />
                </g>
              ))
            : /* Normal (Big Anime Sparkling Eyes) */
              [52, 108].map(cx => (
                <g key={cx}>
                  {/* Outer Pupil */}
                  <ellipse cx={cx} cy="95" rx="7" ry="8.5" fill="#1a1a1a" />
                  {/* 3-Point Sparkle Highlights */}
                  <circle cx={cx - 3.5} cy="91.5" r="3.2" fill="white" />
                  <circle cx={cx + 3} cy="95" r="1.5" fill="white" opacity="0.8" />
                  <circle cx={cx} cy="99" r="2" fill="white" opacity="0.3" />

                  {/* Licking Squint */}
                  {!isActive && !isFeeding && idleAction === 0 && (
                    <motion.path
                      d={\`M\${cx - 10} 95 Q\${cx} 88 \${cx + 10} 95\`}
                      stroke="white"
                      strokeWidth="11"
                      fill="none"
                      animate={{ opacity: [0, 0.7, 0.7, 0, 0] }}
                      transition={{ duration: 5, repeat: Infinity, repeatDelay: 6, times: [0, 0.2, 0.6, 0.8, 1.0] }}
                    />
                  )}
                  {/* Blinking */}
                  <motion.rect
                    x={cx - 10} y="82" width="20" fill="white"
                    initial={{ height: 0 }}
                    animate={{ height: [0, 0, 22, 0, 0] }}
                    transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1, 1] }}
                  />
                  {/* Lashes */}
                  <path d={\`M\${cx+6} 91 L\${cx+10} 88\`} stroke="#1a1a1a" strokeWidth="1" opacity="0.6" />
                </g>
              ))}

      {/* Whiskers - left */}
      <line
        x1="16"
        y1="94"
        x2="57"
        y2="100"
        stroke="#c4b0a0"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.65"
      />
      <line
        x1="15"
        y1="101"
        x2="57"
        y2="103.5"
        stroke="#c4b0a0"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.65"
      />
      <line
        x1="18"
        y1="108"
        x2="57"
        y2="108"
        stroke="#c4b0a0"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Whiskers - right */}
      <line
        x1="144"
        y1="94"
        x2="103"
        y2="100"
        stroke="#c4b0a0"
        strokeWidth="1.8"
        opacity="0.65"
        strokeLinecap="round"
      />
      <line
        x1="145"
        y1="101"
        x2="103"
        y2="103.5"
        stroke="#c4b0a0"
        strokeWidth="1.8"
        opacity="0.65"
        strokeLinecap="round"
      />
      <line
        x1="142"
        y1="108"
        x2="103"
        y2="108"
        stroke="#c4b0a0"
        strokeWidth="1.6"
        opacity="0.5"
        strokeLinecap="round"
      />
      {/* Nose */}
      <ellipse cx="80" cy="99" rx="3" ry="2" fill="#ff8da1" stroke="#e87090" strokeWidth="0.8" />

      {/* Mouth and Licking Tongue */}
      <g>
        {/* Tongue - Slanted to lick the paw at (70, 110) */}
        {!isActive && !isFeeding && idleAction === 0 && (
          <motion.path
            initial={{ opacity: 0, d: "M72 104 Q80 108 88 104" }}
            animate={{
              opacity: [0, 1, 1, 1, 0, 1, 1, 1, 0, 0],
              d: [
                "M72 104 Q80 108 88 104",  // hidden
                "M72 104 Q62 120 72 114",  // rapid lap 1
                "M72 104 Q72 110 75 106",  // in
                "M72 104 Q62 120 72 114",  // rapid lap 2
                "M72 104 Q80 108 88 104",  // pause
                "M72 104 Q60 122 70 116",  // long draw lick
                "M72 104 Q60 122 70 116",  // dwell
                "M72 104 Q72 110 75 106",  // in
                "M72 104 Q80 108 88 104",  // hidden
                "M72 104 Q80 108 88 104"   // hidden (padded)
              ]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              times: [0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 0.7, 0.8, 1.0],
            }}
            fill="#ff4d6d"
            stroke="#432c23"
            strokeWidth="1.5"
          />
        )}
`;

// Find the index of startMarker
const startIndex = c.indexOf(startMarker);
const endIndex = c.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = c.substring(0, startIndex) + fixedCatFaceBase + '\n' + c.substring(endIndex);
  fs.writeFileSync(p, newContent);
  console.log('Successfully repaired PomodoroCat.jsx');
} else {
  console.error('Markers not found!');
  process.exit(1);
}
