const fs = require('fs');

const code = fs.readFileSync('src/pages/PomodoroPage.jsx', 'utf8');

const startIndex = code.indexOf('\n// ─── Study Buddy — Cute White Cat');
const endIndex = code.indexOf('\n// ─── Main Page');

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find start or end index');
  process.exit(1);
}

const extractedCode = code.substring(startIndex, endIndex);

const importsForExtracted = `import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PixelOfficeCanvas } from "../PixelOfficeCanvas";

`;

fs.writeFileSync('src/components/pomodoro/PomodoroCat.jsx', importsForExtracted + extractedCode);

// Add export keywords
let catCode = fs.readFileSync('src/components/pomodoro/PomodoroCat.jsx', 'utf8');
catCode = catCode.replace(/const StudyBuddy = /g, 'export const StudyBuddy = ');
catCode = catCode.replace(/const PixelOffice = /g, 'export const PixelOffice = ');
catCode = catCode.replace(/const FloatingBooks = /g, 'export const FloatingBooks = ');
fs.writeFileSync('src/components/pomodoro/PomodoroCat.jsx', catCode);

// Now patch PomodoroPage.jsx
const remainingCode = code.substring(0, startIndex) + '\n\n' + code.substring(endIndex);

// Add import
const importToAdd = 'import { StudyBuddy, PixelOffice, FloatingBooks } from "../components/pomodoro/PomodoroCat";\n';
let finalCode = remainingCode.replace(
  'import { PixelOfficeCanvas } from "../components/PixelOfficeCanvas";',
  importToAdd
);

fs.writeFileSync('src/pages/PomodoroPage.jsx', finalCode);
console.log('Extraction complete');
