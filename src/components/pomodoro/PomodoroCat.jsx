import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PixelOfficeCanvas } from "../PixelOfficeCanvas";


// ─── Study Buddy — Cute White Cat (Upgraded Sticker Style) ───────────────────

const CatBody = () => (
  <>
    {/* Body - Pear shaped (Belly heavy) */}
    <ellipse cx="80" cy="155" rx="56" ry="46" fill="white" stroke="#432c23" strokeWidth="3.5" />
    {/* Floor shadow */}
    <ellipse cx="80" cy="195" rx="42" ry="7" fill="#cbd5e1" opacity="0.6" />
  </>
);

const CatHead = ({ showHachimaki, happiness, isActive }) => (
  <>
    {/* Left ear */}
    <motion.g
      animate={{ rotate: [0, -10, 0] }}
      transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 5 }}
    >
      <path
        d="M28 60 Q18 10 65 35"
        fill="white"
        stroke="#432c23"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M34 52 Q30 24 56 38" fill="#ffb8b8" />
    </motion.g>

    {/* Right ear */}
    <motion.g
      animate={{ rotate: [0, 10, 0] }}
      transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 6 }}
    >
      <path
        d="M132 60 Q142 10 95 35"
        fill="white"
        stroke="#432c23"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M126 52 Q130 24 104 38" fill="#ffb8b8" />
    </motion.g>

    {/* ── Dynamic Head Container (Bobs up and down when active) ── */}
    <motion.g
      animate={isActive ? { y: [0, -2, 0] } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Head - Extra wide (chubby cheeks) */}
      <ellipse cx="80" cy="84" rx="66" ry="54" fill="white" stroke="#432c23" strokeWidth="3.5" />

      {/* Bandana (Hachimaki) - Only in FOCUS mode */}
      {showHachimaki && (
        <g>
          {/* Flowing Tails (Animated) */}
          <motion.g 
            style={{ transformOrigin: "20px 65px" }}
            animate={{ rotate: [-5, 10, -5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <path
              d="M18 78 Q5 70 8 60"
              stroke="#ff4b4b"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
          </motion.g>
          <motion.g 
            style={{ transformOrigin: "142px 65px" }}
            animate={{ rotate: [5, -10, 5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          {/* Main stripe */}
          <path
            d="M16 82 Q80 74 144 82 L144 92 Q80 84 16 92 Z"
            fill="#ff4b4b"
            stroke="#432c23"
            strokeWidth="2"
          />
          <text
            x="80"
            y="88"
            fontSize="6"
            fontWeight="900"
            fill="white"
            textAnchor="middle"
            style={{ letterSpacing: "0.1em" }}
          >
            TEAM WORK
          </text>
        </g>
      )}
    </motion.g>
  </>
);

const CatFaceBase = ({ mode, isActive, isFeeding, happiness, idleAction }) => {
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
            <path key={cx} d={`M${cx - 7} 95 Q${cx} 100 ${cx + 7} 95`} stroke="#432c23" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          ))
        : exercise
          ? /* Gym (> <) eyes */
            [52, 108].map((cx, i) => (
              <path
                key={cx}
                d={`M${cx - 6} 92 L${cx} 97 L${cx + 6} 92`}
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
                    d={`M${cx - 8} 97 Q${cx} 85 ${cx + 8} 97`}
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
                      d={`M${cx - 10} 95 Q${cx} 88 ${cx + 10} 95`}
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
                  <path d={`M${cx+6} 91 L${cx+10} 88`} stroke="#1a1a1a" strokeWidth="1" opacity="0.6" />
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
            d="M72 104 Q80 108 88 104"
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
        {happiness > 85 && !isActive && (
          <motion.text
            x="115"
            y="135"
            fontSize="8"
            fontWeight="900"
            fill="#58CC02"
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 0.8], y: [135, 128] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ~Purr~
          </motion.text>
        )}

        {isSleeping ? (
          <ellipse cx="80" cy="106" rx="3" ry="2.5" fill="#ff8da1" stroke="#432c23" strokeWidth="1.5" />
        ) : happiness < 40 && !isActive && !isFeeding ? (
          /* Sad/Hungry Mouth */
          <path
            d="M74 108 Q80 102 86 108"
            stroke="#432c23"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        ) : happy ? (
          <path
            d="M72 104 Q80 114 88 104 Z"
            fill="#ff8da1"
            stroke="#432c23"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        ) : squint ? (
          <path
            d="M74 105 Q80 101 86 105"
            stroke="#432c23"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        ) : exercise ? (
          <path
            d="M74 105 Q80 108 86 105"
            stroke="#432c23"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          /* Normal Cat Mouth (W) */
          <path
            d="M72 104 Q76 108 80 104 Q84 108 88 104"
            stroke="#432c23"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </g>
    </>
  );
};

const SittingCatLegs = ({ leftLegNode, rightLegNode, animateBreathing }) => (
  <motion.g animate={animateBreathing ? { y: [0, 2, 0] } : {}} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
    {/* Hind Paws (Chân sau hình đám mây nhỏ xinh) */}
    <g transform="translate(0, 15)">
      {/* Left Hind Paw - Scaled Down */}
      <path 
        d="M 38 178 Q 36 173 41 172 Q 45 167 48 170 Q 51 167 55 172 Q 60 173 58 178 Q 58 184 48 184 Q 38 184 38 178 Z" 
        fill="white" stroke="#432c23" strokeWidth="3" strokeLinejoin="round" 
      />
      {/* Central Pad */}
      <circle cx="48" cy="178" r="3.5" fill="#ffb7b7" opacity="0.9" />
      {/* 4 Toes around */}
      <circle cx="42" cy="175" r="1.6" fill="#ffb7b7" />
      <circle cx="46" cy="172" r="1.8" fill="#ffb7b7" />
      <circle cx="50" cy="172" r="1.8" fill="#ffb7b7" />
      <circle cx="54" cy="175" r="1.6" fill="#ffb7b7" />
      
      {/* Right Hind Paw - Scaled Down (Mirrored) */}
      <path 
        d="M 102 178 Q 100 173 105 172 Q 109 167 112 170 Q 115 167 119 172 Q 124 173 122 178 Q 122 184 112 184 Q 102 184 102 178 Z" 
        fill="white" stroke="#432c23" strokeWidth="3" strokeLinejoin="round" 
      />
      {/* Central Pad */}
      <circle cx="112" cy="178" r="3.5" fill="#ffb7b7" opacity="0.9" />
      {/* 4 Toes around */}
      <circle cx="106" cy="175" r="1.6" fill="#ffb7b7" />
      <circle cx="110" cy="172" r="1.8" fill="#ffb7b7" />
      <circle cx="114" cy="172" r="1.8" fill="#ffb7b7" />
      <circle cx="118" cy="175" r="1.6" fill="#ffb7b7" />
    </g>

    {/* Minimalist Front Paws Only - Layered so right covers left */}
    <g transform="translate(0, 15)">
      {leftLegNode || (
        <g transform="rotate(-6, 80, 160)">
          {/* Paw Base with Fill to mask what's behind */}
          <path d="M 68 152 Q 68 182 78 182 Q 88 182 88 152" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          <line x1="78" y1="172" x2="78" y2="180" stroke="#432c23" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        </g>
      )}

      {rightLegNode || (
        <g transform="rotate(6, 80, 160)">
          {/* Paw Base with Fill to mask what's behind (Left Paw) */}
          <path d="M 72 152 Q 72 182 82 182 Q 92 182 92 142" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          <line x1="82" y1="172" x2="82" y2="180" stroke="#432c23" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        </g>
      )}
    </g>
  </motion.g>
);

const IdleProps = () => (
  <>
    <SittingCatLegs
      leftLegNode={
        <motion.g
          style={{ transformOrigin: "65px 145px", zIndex: 10 }}
          animate={{ 
            rotate: [0, -84, -78, -84, 0, 0, -82, -82, 0, 0], 
            scaleX: [1, 1, 1.05, 1, 1, 1, 1.05, 1, 1, 1] 
          }}
          transition={{ duration: 10, repeat: Infinity, times: [0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.5, 0.7, 0.8, 1.0] }}
        >
          <circle cx="65" cy="145" r="45" fill="transparent" pointerEvents="none" />
          {/* Licking paw - Morphing path with elastic feel */}
          <motion.path 
            d="M 65 145 Q 65 174 72 174 Q 75 174 78 174 Q 85 174 85 145"
            initial={{ d: "M 65 145 Q 65 174 72 174 Q 75 174 78 174 Q 85 174 85 145" }}
            animate={{ 
              d: [
                "M 65 145 Q 65 174 72 174 Q 75 174 78 174 Q 85 174 85 145", // Resting U
                "M 65 145 Q 60 130 80 120 Q 95 110 95 95 Q 85 92 82 105", // Reaching mouth (Stretched but U-tip)
                "M 65 145 Q 60 130 80 120 Q 92 112 92 102 Q 82 100 82 108", // Licking contact (Chubby tip)
                "M 65 145 Q 65 174 72 174 Q 75 174 78 174 Q 85 174 85 145", // Return to U
                "M 65 145 Q 65 174 72 174 Q 75 174 78 174 Q 85 174 85 145"  // Return to U (padded)
              ]
            }}
            transition={{ duration: 5, repeat: Infinity, repeatDelay: 6, times: [0, 0.2, 0.4, 0.8, 1.0] }}
            stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" 
          />
          <motion.g
            animate={{ 
              x: [0, 16, 14, 0, 0], 
              y: [0, -58, -52, 0, 0],
              rotate: [0, -30, -25, 0, 0] 
            }}
            transition={{ duration: 5, repeat: Infinity, repeatDelay: 6, times: [0, 0.2, 0.4, 0.8, 1.0] }}
          >
            <circle cx="75" cy="164" r="2.2" fill="#ffb7b7" />
            <line x1="75" y1="160" x2="75" y2="168" stroke="#432c23" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          </motion.g>
        </motion.g>
      }
    />
    {/* Tongue - synchronized with chubby paw contact */}
    <motion.circle 
       cx="80" cy="108" r="4.5" fill="#ffb7b7" 
       animate={{ opacity: [0, 0.4, 1, 1, 0, 0], scale: [0.5, 1, 1.3, 1, 0.5, 0.5] }}
       transition={{ duration: 5, repeat: Infinity, repeatDelay: 6, times: [0, 0.2, 0.3, 0.6, 0.8, 1.0] }}
    />
    <motion.g animate={{ opacity: [0, 1, 0], y: [-30, -55, -80], x: [80, 75, 90] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 8, delay: 0.2 }}>
      <text x="0" y="0" fontSize="18">💕</text>
    </motion.g>
  </>
);

const SleepProps = () => (
  <>
    <SittingCatLegs animateBreathing={true} />
    {/* Sleep Zzz Bubbles - animated */}
    <motion.g animate={{ opacity: [0, 1, 0], y: [-10, -50], x: [80, 85, 95], scale: [0.8, 1.2, 1.5] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
      <text x="0" y="0" fontSize="24" fontWeight="bold" fill="#60a5fa">Zz</text>
    </motion.g>
    {/* Snot bubble */}
    <motion.circle cx="83" cy="98" r="4.5" fill="#bae6fd" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" animate={{ scale: [1, 2.5, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "83px 98px" }} />
  </>
);

const BoxProps = () => (
  <>
    {/* The Box Front Flap (Rendered first so paws can hang OVER it) */}
    <g>
      <path d="M 10 138 L 150 138 L 158 215 L 2 215 Z" fill="#d97706" stroke="#b45309" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M 10 138 L -10 170 L 10 180 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M 150 138 L 170 170 L 150 180 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M 75 138 L 85 138 L 85 188 L 75 188 Z" fill="#fcd34d" opacity="0.6"/>
      <text x="80" y="180" fontSize="14" fontWeight="900" fill="#78350f" textAnchor="middle" style={{ letterSpacing: 4, transform: "rotate(-3deg)", transformOrigin: "80px 180px" }}>AMOMEOW</text>
    </g>
    {/* Left Arm hanging on box (Independent U) */}
    <g>
      <motion.g animate={{ rotate: [0, -5, 0] }} style={{ transformOrigin: "80px 145px" }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
        <circle cx="80" cy="145" r="45" fill="transparent" pointerEvents="none" />
        <path d="M 60 135 Q 60 160 70 160 Q 80 160 80 135" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
        <line x1="70" y1="150" x2="70" y2="160" stroke="#432c23" strokeWidth="2" strokeLinecap="round" />
      </motion.g>
    </g>
    {/* Right Arm hanging on box (Independent U) */}
    <g>
      <motion.g animate={{ rotate: [0, 5, 0] }} style={{ transformOrigin: "80px 145px" }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
        <circle cx="80" cy="145" r="45" fill="transparent" pointerEvents="none" />
        <path d="M 80 135 Q 80 160 90 160 Q 100 160 100 135" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
        <line x1="90" y1="150" x2="90" y2="160" stroke="#432c23" strokeWidth="2" strokeLinecap="round" />
      </motion.g>
    </g>
  </>
);

const YarnBallProps = () => (
  <>
    <SittingCatLegs 
      leftLegNode={
        <motion.g 
          style={{ transformOrigin: "65px 145px" }} 
          animate={{ 
            rotate: [0, 0, 0, 48, -5, 48, 0], 
            y: [0, 0, 0, 4, 0, 4, 0],
            x: [0, 0, 0, 10, 0, 10, 0] 
          }} 
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.5, 0.6, 0.7, 0.8, 1] }}
        >
          <circle cx="65" cy="145" r="45" fill="transparent" pointerEvents="none" />
          <path d="M 65 145 Q 65 174 74 168 Q 80 168 80 145" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          <circle cx="74" cy="164" r="2.2" fill="#ffb7b7" />
        </motion.g>
      }
      rightLegNode={
        <motion.g 
          style={{ transformOrigin: "95px 145px" }} 
          animate={{ 
            rotate: [10, -48, 15, -48, 15, -48, 10], 
            y: [0, 4, 0, 4, 0, 4, 0],
            x: [0, -10, 0, -10, 0, -10, 0] 
          }} 
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.4, 0.6, 0.75, 0.9, 1] }}
        >
          <circle cx="95" cy="145" r="45" fill="transparent" pointerEvents="none" />
          <path d="M 95 145 Q 95 174 86 168 Q 80 168 80 145" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          <circle cx="86" cy="164" r="2.2" fill="#ffb7b7" />
        </motion.g>
      }
    />
    {/* Yarn ball - Brought UP closer to hands */}
    <motion.g 
      animate={{ 
        x: [18, 12, 18, -18, 12, -18, 18], 
        y: [165, 158, 165, 158, 165, 158, 165], 
        rotate: [0, 90, 180, 270, 360, 450, 540] 
      }} 
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.4, 0.6, 0.75, 0.9, 1] }}
      style={{ transformOrigin: "80px 165px" }}
    >
       <circle cx="80" cy="168" r="14" fill="#f43f5e" stroke="#be123c" strokeWidth="2.5" />
       <path d="M 72 165 Q 80 158 88 165 M 72 171 Q 80 164 88 171" fill="none" stroke="#fda4af" strokeWidth="1.2" />
       <path d="M 66 168 L 60 160 M 94 168 L 100 175" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </motion.g>
  </>
);

const ScratchProps = () => (
  <>
    {/* Centered Scratching Post */}
    <motion.g animate={{ x: [-0.6, 0.6, -0.6], rotate: [-0.2, 0.2, -0.2] }} transition={{ duration: 0.1, repeat: Infinity }}>
      <rect x="68" y="110" width="24" height="90" rx="4" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="2" />
      <path d="M 68 120 L 92 125 M 68 140 L 92 145 M 68 160 L 92 165 M 68 180 L 92 185" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </motion.g>

    <SittingCatLegs 
      animateBreathing={false}
      leftLegNode={
        <motion.g 
          style={{ transformOrigin: "60px 145px" }} 
          animate={{ rotate: [-10, 20, -10] }} 
          transition={{ duration: 0.16, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="60" cy="145" r="45" fill="transparent" pointerEvents="none" />
          {/* Paw stretching from body side toward the center post */}
          <path d="M 60 145 Q 65 170 76 172 Q 82 172 82 155" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          <circle cx="76" cy="168" r="2.2" fill="#ffb7b7" />
          <line x1="74" y1="165" x2="74" y2="171" stroke="#432c23" strokeWidth="2" opacity="0.3" />
        </motion.g>
      }
      rightLegNode={
        <motion.g 
          style={{ transformOrigin: "100px 145px" }} 
          animate={{ rotate: [10, -20, 10] }} 
          transition={{ duration: 0.16, repeat: Infinity, ease: "linear", delay: 0.08 }}
        >
          <circle cx="100" cy="145" r="45" fill="transparent" pointerEvents="none" />
          {/* Paw stretching from body side toward the center post */}
          <path d="M 100 145 Q 95 170 84 172 Q 78 172 78 155" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          <circle cx="84" cy="168" r="2.2" fill="#ffb7b7" />
          <line x1="86" y1="165" x2="86" y2="171" stroke="#432c23" strokeWidth="2" opacity="0.3" />
        </motion.g>
      }
    />
    
    {/* Scratch sparks/particles */}
    <motion.text x="35" y="170" animate={{ opacity: [1, 0], scale: [1, 1.4] }} transition={{ duration: 0.2, repeat: Infinity }}>💢</motion.text>
    <motion.text x="115" y="130" animate={{ opacity: [1, 0], scale: [1, 1.4] }} transition={{ duration: 0.2, repeat: Infinity, delay: 0.1 }}>💢</motion.text>
  </>
);

const FocusProps = ({ isActive }) => (
  <>
    <SittingCatLegs 
      leftLegNode={
        <motion.g 
          style={{ transformOrigin: "80px 150px" }} 
          animate={isActive ? { x: -22, y: [0, -4, 2], scaleY: [1, 0.85, 1], rotate: -15 } : { x: -22, rotate: -10 }} 
          transition={{ duration: 0.15, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx="80" cy="150" r="45" fill="transparent" pointerEvents="none" />
          <path d="M 62 145 Q 62 170 72 170 Q 82 170 82 145" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          {/* Paw detail - Meatballs */}
          <circle cx="72" cy="166" r="2.2" fill="#ffb7b7" />
          <circle cx="67" cy="162" r="1.5" fill="#ffb7b7" />
          <circle cx="77" cy="162" r="1.5" fill="#ffb7b7" />
          <line x1="72" y1="162" x2="72" y2="170" stroke="#432c23" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
        </motion.g>
      }
      rightLegNode={
        <motion.g 
          style={{ transformOrigin: "80px 150px" }} 
          animate={isActive ? { x: 22, y: [-4, 2, -4], scaleY: [0.85, 1, 0.85], rotate: 15 } : { x: 22, rotate: 10 }} 
          transition={{ duration: 0.15, repeat: Infinity, delay: 0.05, ease: "easeInOut" }}
        >
          <circle cx="80" cy="150" r="45" fill="transparent" pointerEvents="none" />
          <path d="M 78 145 Q 78 170 88 170 Q 98 170 98 145" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          {/* Paw detail - Meatballs */}
          <circle cx="88" cy="166" r="2.2" fill="#ffb7b7" />
          <circle cx="83" cy="162" r="1.5" fill="#ffb7b7" />
          <circle cx="93" cy="162" r="1.5" fill="#ffb7b7" />
          <line x1="88" y1="162" x2="88" y2="170" stroke="#432c23" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
        </motion.g>
      }
    />

    {/* Laptop Screen placed OVER the paws - facing the cat */}
    <g transform="translate(0, 10)">
      {/* Base/Keyboard Area */}
      <rect x="34" y="164" width="92" height="10" rx="4" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
      <rect x="30" y="166" width="100" height="2" rx="1" fill="#4ade80" opacity="0.2" />

      {/* Screen Back - Facing USER (Cat is looking at the other side) */}
      <rect x="42" y="145" width="76" height="32" rx="4" fill="#334155" stroke="#0f172a" strokeWidth="1.5" transform="rotate(180, 80, 161)" />
      {/* Subtle Apple-style Logo */}
      <circle cx="80" cy="148" r="3" fill="#94a3b8" opacity="0.4" />
    </g>
  </>
);

const ExerciseProps = ({ isActive }) => (
  <>
    <SittingCatLegs 
      leftLegNode={
        <motion.g 
          style={{ transformOrigin: "45px 145px" }} 
          animate={isActive ? { rotate: [0, 65, 0] } : { rotate: 0 }} 
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx="45" cy="145" r="45" fill="transparent" pointerEvents="none" />
          {/* Left Dumbbell Arm - Outward Stance */}
          <path d="M 45 145 Q 45 174 35 174 Q 25 174 25 145" stroke="#432c23" strokeWidth="4" fill="white" strokeLinecap="round" />
          <line x1="35" y1="168" x2="35" y2="176" stroke="#432c23" strokeWidth="3" strokeLinecap="round" />
          {/* Dumbell Bar */}
          <line x1="15" y1="174" x2="55" y2="174" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
          <rect x="10" y="164" width="8" height="20" rx="3" fill="#475569" />
          <rect x="52" y="164" width="8" height="20" rx="3" fill="#475569" />
        </motion.g>
      }
      rightLegNode={
        <motion.g 
          style={{ transformOrigin: "115px 145px" }} 
          animate={isActive ? { rotate: [0, -65, 0] } : { rotate: 0 }} 
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        >
          <circle cx="115" cy="145" r="45" fill="transparent" pointerEvents="none" />
          {/* Right Dumbbell Arm - Outward Stance */}
          <path d="M 115 145 Q 115 174 125 174 Q 135 174 135 145" stroke="#432c23" strokeWidth="4" fill="white" strokeLinecap="round" />
          <line x1="125" y1="168" x2="125" y2="176" stroke="#432c23" strokeWidth="3" strokeLinecap="round" />
          {/* Dumbell Bar */}
          <line x1="105" y1="174" x2="145" y2="174" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
          <rect x="100" y="164" width="8" height="20" rx="3" fill="#475569" />
          <rect x="142" y="164" width="8" height="20" rx="3" fill="#475569" />
        </motion.g>
      }
    />
    {/* Sweat Band - Properly centered on forehead */}
    <motion.g
      animate={isActive ? { y: [0, -3, 0] } : {}}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M 32 75 Q 80 85 128 75" stroke="#3b82f6" strokeWidth="10" fill="none" opacity="0.8" />
      <path d="M 32 75 Q 80 85 128 75" stroke="#93c5fd" strokeWidth="5" fill="none" />
    </motion.g>
    <motion.text
      x="80"
      y="24"
      fontSize="12"
      fontWeight="900"
      fill="#3b82f6"
      textAnchor="middle"
      animate={{ y: [24, 14], opacity: [1, 0] }}
      transition={{ duration: 1.2, repeat: Infinity }}
    >
      1, 2, 1, 2!
    </motion.text>
  </>
);

const PlayProps = ({ isActive }) => (
  <>
    <SittingCatLegs 
      leftLegNode={
        <motion.g 
          style={{ transformOrigin: "75px 145px" }} 
          animate={isActive ? { rotate: [-20, 60, -20] } : {}} 
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx="75" cy="145" r="45" fill="transparent" pointerEvents="none" />
          <path d="M 55 145 Q 55 175 65 175 Q 75 175 75 145" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          <circle cx="65" cy="171" r="2.2" fill="#ffb7b7" />
        </motion.g>
      }
      rightLegNode={
        <motion.g 
          style={{ transformOrigin: "85px 145px" }} 
          animate={isActive ? { rotate: [20, -60, 20] } : {}} 
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        >
          <circle cx="85" cy="145" r="45" fill="transparent" pointerEvents="none" />
          <path d="M 85 145 Q 85 175 95 175 Q 105 175 105 145" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          <circle cx="95" cy="171" r="2.2" fill="#ffb7b7" />
        </motion.g>
      }
    />
    {/* Floating Balloon that reacts to paw taps */}
    <motion.g
      animate={isActive ? { 
        x: [20, -20, 20], 
        y: [0, -2, 0, -2, 0],
        rotate: [15, -15, 15] 
      } : {}}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <circle cx="80" cy="140" r="18" fill="#38bdf8" fillOpacity="0.4" stroke="#0ea5e9" strokeWidth="2" />
      <path d="M 80 158 Q 80 175 75 180" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="3 3" />
      <ellipse cx="74" cy="132" rx="4" ry="2" fill="white" opacity="0.6" transform="rotate(-30 74 132)" />
    </motion.g>
  </>
);

const EatingProps = () => (
  <>
    <SittingCatLegs 
      leftLegNode={
        <motion.g style={{ transformOrigin: "80px 160px" }} animate={{ rotate: [-20, 20, -20] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="80" cy="160" r="45" fill="transparent" pointerEvents="none" />
          <path d="M 62 145 Q 62 170 72 170 Q 82 170 82 145" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          <line x1="72" y1="162" x2="72" y2="170" stroke="#432c23" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
      }
      rightLegNode={
        <motion.g style={{ transformOrigin: "80px 160px" }} animate={{ rotate: [20, -20, 20] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="80" cy="160" r="45" fill="transparent" pointerEvents="none" />
          <path d="M 78 145 Q 78 170 88 170 Q 98 170 98 145" stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" />
          <line x1="88" y1="162" x2="88" y2="170" stroke="#432c23" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
      }
    />
    <motion.g
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <rect x="50" y="145" width="60" height="25" rx="3" fill="#fcd34d" stroke="#b45309" strokeWidth="2" />
      <circle cx="65" cy="155" r="6" fill="white" />
      <circle cx="95" cy="155" r="6" fill="#f87171" />
      <rect x="75" y="152" width="10" height="10" fill="#4ade80" />
    </motion.g>
    <motion.text
      x="80"
      y="52"
      fontSize="36"
      textAnchor="middle"
      animate={{ y: [52, 64, 52], rotate: [-8, 8, -8] }}
      transition={{ duration: 0.5, repeat: Infinity }}
    >
      🍱
    </motion.text>
    <motion.text
      x="80"
      y="20"
      fontSize="12"
      fontWeight="900"
      fill="#f87171"
      textAnchor="middle"
      animate={{ y: [20, 10], opacity: [1, 0] }}
      transition={{ duration: 1.0, repeat: Infinity }}
    >
      MĂM MĂM!
    </motion.text>
  </>
);

export const StudyBuddy = ({ mode, isActive, isFeeding, happiness }) => {
  const glow = mode === "focus" ? "#FF4B4B" : mode === "shortBreak" ? "#58CC02" : "#1CB0F6";

  const [idleAction, setIdleAction] = useState(0);

  useEffect(() => {
    if (!isActive && !isFeeding) {
      const interval = setInterval(() => {
        setIdleAction(prev => (prev + 1) % 5);
      }, 15000); // Change action every 15s
      return () => clearInterval(interval);
    } else {
      setIdleAction(0);
    }
  }, [isActive, isFeeding]);

  let catPropsElem;
  if (isFeeding) catPropsElem = <EatingProps />;
  else if (!isActive) {
    if (idleAction === 1) catPropsElem = <SleepProps />;
    else if (idleAction === 2) catPropsElem = <BoxProps />;
    else if (idleAction === 3) catPropsElem = <YarnBallProps />;
    else if (idleAction === 4) catPropsElem = <ScratchProps />;
    else catPropsElem = <IdleProps />;
  }
  else if (mode === "focus") catPropsElem = <FocusProps isActive />;
  else if (mode === "shortBreak") catPropsElem = <ExerciseProps isActive />;
  else catPropsElem = <PlayProps isActive />;

  return (
    <div className="relative flex flex-col items-center select-none">
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
            style={{ background: `radial-gradient(circle, ${glow}40 0%, transparent 65%)` }}
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          y: isActive ? [0, -5, 0] : [0, -3, 0, -1, 0],
          x: 0,
        }}
        transition={{
          y: {
            duration: isActive ? 0.75 : 3.8,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        className="relative"
      >
          <motion.div
            animate={{
              scaleX: isActive ? [1, 0.9, 1] : [0.85, 0.9, 0.85],
              opacity: isActive ? [0.12, 0.08, 0.12] : [0.05, 0.08, 0.05],
            }}
            transition={{ duration: isActive ? 0.75 : 3.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black blur-xl"
            style={{ width: "110px", height: "10px" }}
          />

        <motion.div
          animate={
            isActive && mode === "focus"
              ? { rotate: [-1, 1, -1] }
              : !isActive
                ? {
                    // Organic 10s head dip cycle for licking
                    rotate: idleAction === 0 
                      ? [0, 6, 4, 6, 2, 8, 8, 4, 0] 
                      : [0, 5, 3, 5, 0, 5, 3, 5, 0], 
                    y: idleAction === 0 
                      ? [0, 8, 5, 8, 2, 10, 10, 5, 0] 
                      : [0, 0, 0, 0, 0, 0, 0, 0, 0],
                    scale: happiness > 90 ? [1, 1.02, 1] : 1,
                  }
                : mode === "shortBreak" && isActive
                  ? { y: [0, -5, 0], rotate: [-3, 3, -3], scale: [1, 1.05, 1] }
                  : { rotate: 0 }
          }
          transition={{
            duration: isActive && mode === "focus" ? 1.4 : !isActive ? 10 : 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            times: !isActive ? [0, 0.1, 0.15, 0.2, 0.35, 0.5, 0.7, 0.8, 1] : undefined,
          }}
        >
          <svg
            viewBox="0 0 160 215"
            style={{ width: 240, height: 322 }}
            className="drop-shadow-2xl overflow-visible"
          >
            {/* 1. Long, Fluid S-Curve Tail */}
            <motion.g
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, 8, -4, 0] }}
              style={{ transformOrigin: "130px 165px" }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <path
                d="M130 165 C155 160 165 190 150 205 C145 210 155 215 165 212"
                stroke="#432c23"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            </motion.g>
            {/* 2. Body */}
            <CatBody />
            {/* 2.5 Collar and Bell */}
            <g>
              <path
                d="M45 130 Q80 144 115 130"
                stroke="#ff4b4b"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
              />
              <motion.g
                animate={isActive ? { rotate: [-15, 15, -15], scale: [1, 1.1, 1] } : { rotate: 0 }}
                transition={{ duration: 0.4, repeat: isActive ? Infinity : 0 }}
                style={{ transformOrigin: "80px 135px" }}
              >
                <circle cx="80" cy="144" r="8" fill="#ffd700" stroke="#432c23" strokeWidth="2.5" />
                <circle cx="80" cy="147" r="2.5" fill="#432c23" />
                <line
                  x1="80"
                  y1="147"
                  x2="80"
                  y2="151"
                  stroke="#432c23"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </motion.g>
            </g>

            {/* ── REORDERING: Arm Base then Head then Face Details ── */}
            <CatHead showHachimaki={mode === "focus" && isActive} happiness={happiness} isActive={isActive} />

            {/* Limbs (Arms/Legs) -> MUST be drawn OVER head so paws can reach the face (licking, eating) */}
            {catPropsElem}

            {/* 4. Face and Tongue -> Drawn OVER the paw for perfect lick sync */}
            <CatFaceBase
              mode={mode}
              isActive={isActive}
              isFeeding={isFeeding}
              happiness={happiness}
              idleAction={idleAction}
            />
          </svg>
        </motion.div>

        <AnimatePresence>
          {isActive && mode === "shortBreak" && (
            <motion.div
              className="absolute top-8 right-6 text-xl pointer-events-none drop-shadow-sm"
              animate={{ y: [0, 6, 12], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              💦
            </motion.div>
          )}
          {isActive &&
            mode === "focus" &&
            [
              { x: -35, d: 0, e: "⚡" },
              { x: 32, d: 0.8, e: "✨" },
            ].map(({ x, d, e }, i) => (
              <motion.div
                key={i}
                className="absolute top-0 text-2xl pointer-events-none drop-shadow-md"
                style={{ left: `calc(50% + ${x}px)` }}
                animate={{ y: [0, -40], opacity: [0, 1, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: d }}
              >
                {e}
              </motion.div>
            ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${mode}-${isActive}-${isFeeding}`}
          initial={{ opacity: 0, scale: 0.82, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.82, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-4 px-5 py-2 rounded-2xl shadow-lg border-2 border-white dark:border-slate-800 text-[11.5px] font-black uppercase tracking-widest"
          style={{ backgroundColor: isFeeding ? "#f87171" : glow, color: "white" }}
        >
          {isFeeding
            ? "😋 CHĂM CHỈ QUÁ!"
            : mode === "focus"
              ? isActive
                ? "🔥 CHẾ ĐỘ GÁNH TEAM"
                : "💤 CHUẨN BỊ NÀO..."
              : mode === "shortBreak"
                ? isActive
                  ? "💪 ĐANG TẬP GYMM!"
                  : "✨ NGHỈ NGƠI TÍ"
                : isActive
                  ? "🎈 ĐI DẠO + CHƠI!"
                  : "✨ NGHỈ NGƠI TÍ"}
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 flex items-center gap-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
        <span className="text-[10px] font-black text-slate-500 uppercase">{"❤️"} Mood</span>
        <div className="w-20 h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: happiness > 60 ? "#f43f5e" : happiness > 30 ? "#f97316" : "#94a3b8",
            }}
            animate={{ width: `${happiness}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <span className="text-[10px] font-black text-slate-400">{Math.round(happiness)}%</span>
      </div>
    </div>
  );
};
// ─── Pixel Sprite Component (Crops frames from spritesheet) ──────────────────
// Spritesheet layout: 112×96px (7 columns × 16px, 3 rows × 32px)
// Row 0: Down, Row 1: Up, Row 2: Right  (Left = flip Right via CSS)
// Frame order per row: walk1(0), walk2(1), walk3(2), type1(3), type2(4), read1(5), read2(6)
// Character is 24px tall, bottom-aligned within 32px frame (8px top padding)
const SPRITE_FRAME_W = 16;
const SPRITE_FRAME_H = 32; // full frame height (includes 8px padding)
const SPRITE_COLS = 7;
const SPRITE_ROWS = 3;
const SPRITE_SHEET_W = SPRITE_FRAME_W * SPRITE_COLS; // 112
const SPRITE_SHEET_H = SPRITE_FRAME_H * SPRITE_ROWS; // 96

// Walk cycle: frame indices [0,1,2,1] for smooth loop
const WALK_FRAMES = [0, 1, 2, 1];
// Type cycle: frame indices [3,4]
const TYPE_FRAMES = [3, 4];
// Idle: standing frame
const IDLE_FRAME = 1;

const PixelSprite = ({
  spriteId = 0,
  direction = "down",
  isMoving = false,
  isTyping = false,
  scale = 2.5,
  className = "",
}) => {
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    if (!isMoving && !isTyping) {
      const t = setTimeout(() => setFrameIdx(0), 0);
      return () => clearTimeout(t);
    }

    const frames = isMoving ? WALK_FRAMES : TYPE_FRAMES;
    const speed = isTyping ? 180 : 200; // ms per frame

    const interval = setInterval(() => {
      setFrameIdx(f => (f + 1) % frames.length);
    }, speed);

    return () => clearInterval(interval);
  }, [isMoving, isTyping]);

  // Determine which column (frame) to show
  let col;
  if (isMoving) {
    col = WALK_FRAMES[frameIdx % WALK_FRAMES.length];
  } else if (isTyping) {
    col = TYPE_FRAMES[frameIdx % TYPE_FRAMES.length];
  } else {
    col = IDLE_FRAME; // standing pose
  }

  // Row mapping: down=0, up=1, right=2. Left uses right row + CSS flip
  const isLeft = direction === "left";
  const dirRow = { down: 0, up: 1, right: 2, left: 2 };
  const row = dirRow[direction] ?? 0;

  const bgX = col * SPRITE_FRAME_W;
  const bgY = row * SPRITE_FRAME_H;

  return (
    <div
      className={`${className}`}
      style={{
        width: `${SPRITE_FRAME_W * scale}px`,
        height: `${SPRITE_FRAME_H * scale}px`,
        backgroundImage: `url(/pixel-office/characters/char_${spriteId}.png)`,
        backgroundSize: `${SPRITE_SHEET_W * scale}px ${SPRITE_SHEET_H * scale}px`,
        backgroundPosition: `-${bgX * scale}px -${bgY * scale}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        transform: isLeft ? "scaleX(-1)" : "none",
      }}
    />
  );
};

// ─── Pixel Office Buddy (Canvas-Based with z-sorting) ──────────────────────────
export const PixelOffice = ({ mode, isActive }) => {
  const isFocus = mode === "focus";
  const isBreak = mode === "shortBreak" || mode === "longBreak";
  const glow = isFocus ? "#FF4B4B" : isBreak ? "#58CC02" : "#1CB0F6";

  // Move everything down by 160px (10rem) and add even more left margin for visibility
  return (
    <div className="relative flex flex-col items-center select-none pt-40 ml-48">
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-full blur-[100px] pointer-events-none"
            style={{ background: `radial-gradient(circle, ${glow}15 0%, transparent 80%)` }}
          />
        )}
      </AnimatePresence>

      {/* Canvas Office Scene */}
      <PixelOfficeCanvas mode={mode} isActive={isActive} />

      {/* Status Bar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${mode}-${isActive}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 px-6 py-2.5 rounded-2xl bg-white/10 dark:bg-slate-800/40 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-2xl flex items-center gap-3"
        >
          <div className="flex gap-1.5">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                style={{ backgroundColor: glow }}
                animate={isActive ? { opacity: [1, 0.3, 1], scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
            {isActive
              ? isFocus
                ? "💻 Hard Coding (Focus)"
                : "☕ Coffee Break (Rest)"
              : "💤 Office Sleeping (Idle)"}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const FloatingBooks = ({ isActive }) => {
  const books = [
    { id: 1, x: "12%", y: "18%", color: "#5d4037", stroke: "#2e150d", rib: "#a52a2a", delay: 0 },
    { id: 2, x: "85%", y: "45%", color: "#4e342e", stroke: "#1b0000", rib: "#8b0000", delay: 1.5 },
    { id: 3, x: "15%", y: "75%", color: "#6d4c41", stroke: "#311b1b", rib: "#b71c1c", delay: 3.0 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {books.map((b) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, y: 50 }}
          animate={{
            opacity: 0.8, y: 0,
            y: [-25, 25, -25],
            rotateX: [15, 25, 15],
            rotateY: [-5, 5, -5]
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            y: { duration: 8 + b.id, repeat: Infinity, ease: "easeInOut", delay: b.delay },
            rotateX: { duration: 10 + b.id, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 1.5 }
          }}
          className="absolute"
          style={{ left: b.x, top: b.y, perspective: "1000px" }}
        >
          <svg width="120" height="110" viewBox="0 0 120 110" className="drop-shadow-2xl overflow-visible">
            <defs>
              <radialGradient id={`glow-${b.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="gold" stopOpacity="0.25" />
                <stop offset="100%" stopColor="gold" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="60" cy="55" r="50" fill={`url(#glow-${b.id})`} />

            <g transform="translate(10, 10)">
              {/* 1. Spine (Top-Back perspective) */}
              <path d="M 30 15 Q 50 10 70 15 L 75 20 Q 50 15 25 20 Z" fill={b.stroke} opacity="0.4" />
              {[42, 50, 58].map(rx => (
                <rect key={rx} x={rx} y="11" width="3" height="6" rx="1.5" fill={b.rib} transform="rotate(-15, 50, 15)" opacity="0.6" />
              ))}

              {/* 2. Main Leather Cover - Facing User */}
              <path d="M 25 20 L 75 20 L 95 70 L 5 70 Z" fill={b.color} stroke={b.stroke} strokeWidth="2" />
              <line x1="50" y1="20" x2="50" y2="70" stroke={b.stroke} strokeWidth="1.5" opacity="0.6" />

              {/* 3. Aged Page Stacks */}
              <path d="M 12 25 Q 30 22 48 25 L 48 65 Q 30 68 8 65 Z" fill="#fdf5e6" stroke={b.stroke} strokeWidth="1" />
              <path d="M 52 25 Q 70 22 88 25 L 92 65 Q 70 68 52 65 Z" fill="#fdf5e6" stroke={b.stroke} strokeWidth="1" />

              {/* 4. The "Liquid" Page Flip - Refined Morph */}
              {isActive && (
                <motion.g>
                   <motion.path
                      d="M 88 25 Q 70 22 52 25 L 52 65 Q 70 68 92 65 Z"
                      initial={{ d: "M 88 25 Q 70 22 52 25 L 52 65 Q 70 68 92 65 Z", opacity: 0 }}
                      animate={{
                        d: [
                            "M 88 25 Q 70 22 52 25 L 52 65 Q 70 68 92 65 Z", // Flat Right
                            "M 80 15 Q 70 5 60 15 L 60 70 Q 70 80 85 75 Z",    // Lift
                            "M 50 10 Q 52 0 50 10 L 52 70 Q 50 80 52 70 Z",    // Peak (S-curve feel)
                            "M 12 25 Q 30 22 48 25 L 48 65 Q 30 68 8 65 Z",   // Drop Left
                            "M 88 25 Q 70 22 52 25 L 52 65 Q 70 68 92 65 Z"   // Reset
                        ],
                        opacity: [0, 1, 1, 1, 0]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        times: [0, 0.25, 0.5, 0.75, 1],
                        ease: [0.4, 0, 0.2, 1],
                        delay: b.delay
                      }}
                      stroke={b.stroke} strokeWidth="0.8" fill="#fdf5e6"
                  />
                </motion.g>
              )}

              {/* Content / Ornaments (Facing user) */}
              <g opacity="0.4">
                  <path d="M 20 35 L 35 35 M 20 40 L 30 40" stroke={b.stroke} strokeWidth="0.6" />
                  <circle cx="70" cy="45" r="4" stroke={b.stroke} fill="none" strokeWidth="0.5" />
                  <path d="M 68 45 L 72 45 M 70 43 L 70 47" stroke={b.stroke} strokeWidth="0.5" />
              </g>

              {/* Magical Particles (Floating towards User) */}
              <motion.circle initial={{ opacity: 0, y: -10, scale: 0.5 }} animate={{ opacity: [0, 1, 0], y: [-10, -40], scale: [0.5, 1.5, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, delay: b.delay }}
                  cx="50" cy="40" r="1.5" fill="gold"
              />
            </g>
          </svg>
        </motion.div>
      ))}
    </div>
  );
};

