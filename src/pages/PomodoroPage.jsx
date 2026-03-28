import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Volume2,
  VolumeX,
  Wind,
  CloudRain,
  Waves,
  Trees,
  Music,
  Youtube,
  Plus,
  Target,
  Trophy,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useUserStore } from "../store/useUserStore";
import { useBookmarkStore } from "../store/useBookmarkStore";
import { debouncedSync, collectSyncData } from "../services/syncService";
import { PixelOfficeCanvas } from "../components/PixelOfficeCanvas";
import { sounds } from "../utils/sounds";

// ─── Constants ────────────────────────────────────────────────────────────────
const MODES = {
  focus: { label: "Tập trung", time: 25 * 60, color: "#FF4B4B", icon: Brain },
  shortBreak: { label: "Nghỉ ngắn", time: 5 * 60, color: "#58CC02", icon: Coffee },
  longBreak: { label: "Nghỉ dài", time: 15 * 60, color: "#1CB0F6", icon: Coffee },
};

const AMBIENT_SOUNDS = [
  { id: "rain", label: "Mưa rơi", icon: CloudRain, youtubeId: "Jvgx5HHJ0qw" },
  { id: "wind", label: "Gió thổi", icon: Wind, youtubeId: "sT5f1jBJHng" },
  { id: "waves", label: "Sóng biển", icon: Waves, youtubeId: "QR3lp0ptpy8" },
  { id: "forest", label: "Rừng xanh", icon: Trees, youtubeId: "_u95mLIAxvg" },
];

const YOUTUBE_TRACKS = [
  { id: "jfKfPfyJRdk", label: "Lofi Study", sub: "Chilled Lofi" },
  { id: "WPni755-Krg", label: "Deep Focus", sub: "Concentration" },
  { id: "3ufUj_wehg0", label: "Rainy Woods", sub: "Nature Ambience" },
  { id: "BW1T2MZVQIo", label: "Piano Học Tập", sub: "Soft Piano" },
];

const FOCUS_QUOTES = [
  { icon: "🧠", text: "25 phút tập trung giúp não ghi nhớ sâu hơn 40%!" },
  { icon: "🔕", text: "Tắt thông báo đi — não cần yên tĩnh để học!" },
  { icon: "🎯", text: "Một Pomodoro = 25 phút tiến gần hơn mục tiêu!" },
  { icon: "💪", text: "Deep work > Multitasking. Một việc thôi, đi nào!" },
  { icon: "🐱", text: "Buddy đang cổ vũ bạn! Cố lên nào! ✨" },
  { icon: "⚡", text: "Khó khăn nhất là bắt đầu — bạn đã vượt qua rồi!" },
  { icon: "📚", text: "Mỗi phút tập trung là một viên gạch xây tương lai!" },
  { icon: "🌙", text: "Sau 4 Pomodoro sẽ có nghỉ dài — giữ vững nhé!" },
  { icon: "🎮", text: "Tưởng tượng đây là quest, hoàn thành để nhận reward!" },
  { icon: "🚀", text: "Bắt đầu thôi — 5 phút đầu là khó nhất, rồi sẽ flow!" },
  { icon: "🧘", text: "Thở đều, ngồi thẳng, tập trung — bạn làm được!" },
  { icon: "🏅", text: "Mỗi session là một huy chương nhỏ cho bản thân!" },
  { icon: "💡", text: "Não bộ cần 10-15 phút để vào trạng thái deep work." },
  { icon: "🎯", text: "Viết ra 1 mục tiêu cụ thể cho session này!" },
  { icon: "🔥", text: "Consistency > Intensity. Mỗi ngày một chút thôi!" },

  // 👇 Thêm mới nè
  { icon: "☕", text: "Uống ngụm nước rồi vào trạng thái flow nào!" },
  { icon: "🌱", text: "Mỗi Pomodoro là một hạt giống cho thói quen tốt!" },
  { icon: "👑", text: "Không cần hoàn hảo, chỉ cần tiến bộ hơn hôm qua!" },
  { icon: "💎", text: "Tập trung là kỹ năng hiếm — bạn đang luyện nó đấy!" },
  { icon: "🚧", text: "Đừng phân tâm, công trình tương lai đang xây dở!" },
  { icon: "🎵", text: "Một chút nhạc nền nhẹ sẽ giúp não flow hơn!" },
  { icon: "🕹️", text: "Coi việc học như game — càng kiên trì, càng level up!" },
  { icon: "🌞", text: "Focus hôm nay = kết quả rực rỡ ngày mai!" },
  { icon: "📈", text: "Mỗi Pomodoro là một bước tiến nhỏ nhưng chắc!" },
  { icon: "🧩", text: "Từng mảnh thời gian ghép lại sẽ thành thành tựu lớn!" },
  { icon: "🖥️", text: "Code chất lượng không nằm ở số dòng, mà ở sự tập trung!" },
  { icon: "🍏", text: "Một session này đáng giá hơn cả ngày ngồi thẩn thờ!" },
  { icon: "⏳", text: "Thời gian trôi nhanh lắm, tận dụng nốt 25 phút này nha!" },
  { icon: "🦄", text: "Bạn là phiên bản duy nhất — hãy để sự tập trung tỏa sáng!" },
  { icon: "🛠️", text: "Kỹ năng học sâu là superpower lớn nhất của bạn!" },
  { icon: "🎈", text: "Cố lên, sắp đến giờ giải lao rồi, gồng thêm chút thôi!" },
  { icon: "⛰️", text: "Đỉnh núi nào cũng bắt đầu từ những bước chân nhỏ đầu tiên." },
  { icon: "⚡", text: "Flow state là trạng thái mạnh nhất của con người đấy!" },
  { icon: "🗝️", text: "Kỷ luật là chìa khóa mở cánh cửa tự do." },
  { icon: "🎋", text: "Bạn đang như măng non, mỗi session này là một đốt tre mới!" },
  { icon: "🧮", text: "Tính toán thời gian hợp lý là bước đầu của thành công." },
  { icon: "🌈", text: "Cơn mưa khó khăn sẽ tạo nên cầu vồng kết quả!" },
  { icon: "🔋", text: "Focus cạn kiệt? Nghỉ ngơi sẽ giúp bạn sạc lại đầy nhanh thôi!" },
  { icon: "⚓", text: "Giữ tâm trí kiên định như chiếc neo giữa biển thông báo!" },
  { icon: "💎", text: "Tài năng là bẩm sinh, nhưng tập trung là do rèn luyện!" },
];

const BREAK_QUOTES = [
  { icon: "👀", text: "Nhìn xa 20 giây để mắt nghỉ ngơi nhé!" },
  { icon: "🌬️", text: "Hít thở sâu 3 lần — não được nạp oxy là học tốt hơn!" },
  { icon: "💧", text: "Uống nước đi! Não cần đủ nước để hoạt động tốt." },
  { icon: "🚶", text: "Đứng dậy đi lại vài bước, máu lưu thông tốt hơn!" },
  { icon: "😸", text: "Buddy cũng đang nghỉ — cùng thư giãn một chút!" },
  { icon: "🙆", text: "Vươn vai duỗi cổ giúp giảm căng thẳng cực kỳ!" },
  { icon: "🎵", text: "Nghỉ ngơi đúng cách giúp bạn tập trung tốt hơn lần sau!" },
  { icon: "😴", text: "Nhắm mắt 30 giây — não sẽ cảm ơn bạn đấy!" },
  { icon: "🌿", text: "Nhìn qua cửa sổ ngắm cây xanh giảm stress ngay!" },
  { icon: "🍵", text: "Cốc trà/cà phê ấm sẽ tiếp thêm năng lượng nhé!" },
  { icon: "🎶", text: "Nghe 1 bài nhạc yêu thích trong lúc nghỉ thôi!" },
  { icon: "📱", text: "Tạm cất điện thoại đi, nghỉ ngơi thật sự nào!" },
  { icon: "🤸", text: "10 cái squat nhỏ sẽ đánh thức cả người đấy!" },
  { icon: "😊", text: "Mỉm cười đi — não sẽ tiết ra endorphin giúp bạn vui hơn!" },
  { icon: "🌸", text: "Nghỉ ngơi không phải lãng phí — đó là đầu tư!" },
  { icon: "🌤️", text: "Ra ban công hít khí trời tí, Buddy chờ bạn quay lại nha!" },
  { icon: "🦋", text: "Tắt màn hình, nhìn ra xa — cho não reset lại chút nào!" },
  { icon: "💤", text: "Đừng cố gắng liên tục — nghỉ để quay lại mạnh mẽ hơn!" },
  { icon: "🐾", text: "Buddy vừa duỗi chân, bạn cũng nên thế nha!" },
  { icon: "🌻", text: "Một hơi thở sâu = một reset nhỏ cho tâm trí." },
  { icon: "🍏", text: "Ăn một miếng trái cây để nạp nhanh năng lượng cơ thể!" },
  { icon: "🧘", text: "Thả lỏng đôi vai, nãy giờ bạn đang hơi gồng đấy!" },
  { icon: "🧦", text: "Đi lại vài bước cho chân đỡ mỏi, Buddy đi cùng nha!" },
  { icon: "🥛", text: "Kiểm tra xem bình nước còn đầy không nhé!" },
  { icon: "🌥️", text: "Nhìn bầu trời một chút, mắt sẽ rất cảm ơn bạn đấy!" },
  { icon: "✨", text: "Nghỉ ngơi chất lượng là bí quyết của sự bền bỉ!" },
  { icon: "🎸", text: "Ngân nga một giai điệu yêu thích để xả stress nào!" },
  { icon: "🧼", text: "Rửa mặt bằng nước mát sẽ tỉnh táo cực kỳ!" },
  { icon: "🕰️", text: "Cứ yên tâm nghỉ, Buddy đang canh đồng hồ cho bạn!" },
  { icon: "🕊️", text: "Để tâm trí tự do bay bổng một chút, đừng nghĩ về task!" },
  { icon: "🌞", text: "Vươn vai thật cao, hít một hơi thật sâu nào!" },
];

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
          {/* The ribbon tails (flowing) */}
          <motion.path
            d="M18 78 Q5 70 8 60"
            stroke="#ff4b4b"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [-5, 10, -5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.path
            d="M142 78 Q155 70 152 60"
            stroke="#ff4b4b"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
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
                      animate={{ opacity: [0, 0.7, 0.7, 0] }}
                      transition={{ duration: 5, repeat: Infinity, repeatDelay: 6, times: [0, 0.2, 0.6, 0.8] }}
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
            initial={{ opacity: 0, d: "M72 104 Q80 108 88 104" }}
            animate={{
              opacity: [0, 1, 1, 1, 0, 1, 1, 1, 0],
              d: [
                "M72 104 Q80 108 88 104",  // hidden
                "M72 104 Q62 120 72 114",  // rapid lap 1
                "M72 104 Q72 110 75 106",  // in
                "M72 104 Q62 120 72 114",  // rapid lap 2
                "M72 104 Q80 108 88 104",  // pause
                "M72 104 Q60 122 70 116",  // long draw lick
                "M72 104 Q60 122 70 116",  // dwell
                "M72 104 Q72 110 75 106",  // in
                "M72 104 Q80 108 88 104"   // hidden
              ]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              times: [0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 0.7, 0.8],
            }}
            fill="#ff4d6d"
            stroke="#432c23"
            strokeWidth="1.5"
          />
        )}

        {/* Purr Text Visual */}
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
            rotate: [0, -84, -78, -84, 0, 0, -82, -82, 0], 
            scaleX: [1, 1, 1.05, 1, 1, 1, 1.05, 1, 1] 
          }}
          transition={{ duration: 10, repeat: Infinity, times: [0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.5, 0.7, 0.8] }}
        >
          <circle cx="65" cy="145" r="45" fill="transparent" pointerEvents="none" />
          {/* Licking paw - Morphing path with elastic feel */}
          <motion.path 
            initial={{ d: "M 65 145 Q 65 174 75 174 Q 85 174 85 145" }}
            animate={{ 
              d: [
                "M 65 145 Q 65 174 75 174 Q 85 174 85 145", // Resting U
                "M 65 145 Q 60 130 80 120 Q 95 110 95 95 Q 85 92 82 105", // Reaching mouth (Stretched but U-tip)
                "M 65 145 Q 60 130 80 120 Q 92 112 92 102 Q 82 100 82 108", // Licking contact (Chubby tip)
                "M 65 145 Q 65 174 75 174 Q 85 174 85 145"  // Return to U
              ]
            }}
            transition={{ duration: 5, repeat: Infinity, repeatDelay: 6, times: [0, 0.2, 0.4, 0.8] }}
            stroke="#432c23" strokeWidth="3.5" fill="white" strokeLinecap="round" 
          />
          <motion.g
            animate={{ 
              x: [0, 16, 14, 0], 
              y: [0, -58, -52, 0],
              rotate: [0, -30, -25, 0] 
            }}
            transition={{ duration: 5, repeat: Infinity, repeatDelay: 6, times: [0, 0.2, 0.4, 0.8] }}
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
       animate={{ opacity: [0, 0.4, 1, 1, 0], scale: [0.5, 1, 1.3, 1, 0.5] }}
       transition={{ duration: 5, repeat: Infinity, repeatDelay: 6, times: [0, 0.2, 0.3, 0.6, 0.8] }}
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
    <motion.circle cx="83" cy="98" fill="#bae6fd" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" animate={{ r: [3, 9, 3] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
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

const StudyBuddy = ({ mode, isActive, isFeeding, happiness }) => {
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
            <motion.path
              d="M130 165 C155 160 165 190 150 205 C145 210 155 215 165 212"
              stroke="#432c23"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              animate={{ 
                d: [
                  "M130 165 C155 160 165 190 150 205 C145 210 155 215 165 212",
                  "M130 165 C165 170 175 185 155 200 C145 205 165 212 175 215",
                  "M130 165 C165 170 175 185 155 200 C145 205 165 212 175 215",
                  "M130 165 C155 160 165 190 150 205 C145 210 155 215 165 212"
                ],
                rotate: [0, 5, -5, 0]
              }}
              style={{ transformOrigin: "130px 165px" }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
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
const PixelOffice = ({ mode, isActive }) => {
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

const FloatingBooks = ({ isActive }) => {
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
                      initial={{ d: "M 88 25 Q 70 22 52 25 L 52 65 Q 70 68 92 65 Z", opacity: 0 }}
                      animate={{
                        d: [
                            "M 88 25 Q 70 22 52 25 L 52 65 Q 70 68 92 65 Z", // Flat Right
                            "M 80 15 Q 70 5 60 15 L 60 70 Q 70 80 85 75 Z",    // Lift
                            "M 50 10 Q 50 0 50 10 L 50 70 Q 50 80 50 70 Z",    // Peak (S-curve feel)
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
              <motion.circle 
                  animate={{ opacity: [0, 1, 0], z: [0, 100], y: [-10, -40], scale: [0.5, 1.5, 0.5] }}
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const PomodoroPage = () => {
  // Global Store Access - MOVED TO TOP to fix ReferenceError
  const updatePomodoroData = useUserStore(s => s.updatePomodoroData);
  const account = useUserStore(s => s.account);

  const initialPomodoro = account?.pomodoro || {};

  // Hiệu ứng visual chuông rung khi bắt đầu
  const [showBell, setShowBell] = useState(false);
  // Restore values from global store (Sync behavior)
  const [mode, setMode] = useState(initialPomodoro.mode || "focus");
  const [isActive, setIsActive] = useState(initialPomodoro.isActive || false);
  const [turnTimeLeft, setTurnTimeLeft] = useState(initialPomodoro.timeLeft || 25 * 60);

  // Sync with global store (PomodoroMini does the background work)
  useEffect(() => {
    if (account?.pomodoro) {
      const p = account.pomodoro;
      if (p.mode) setMode(p.mode);
      if (p.isActive !== undefined) setIsActive(p.isActive);
      
      // Critical: Only sync timeLeft if there is a running session or significant difference
      // to avoid 'jumpy' UI, but ALWAYS trust the store if isActive is true
      if (p.timeLeft !== undefined) {
         setTurnTimeLeft(p.timeLeft);
      }
    }
  }, [account?.pomodoro?.isActive, account?.pomodoro?.mode]); // Only re-sync on core state changes post-init

  // Removed redundant 'timeLeft' state - using 'turnTimeLeft' universally
  const [soundConfig, setSoundConfig] = useState({ type: null, id: null });
  const [customYtUrl, setCustomYtUrl] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [activeTrackTitle, setActiveTrackTitle] = useState("");
  const [turns, setTurns] = useState([]); // [{duration: 50*60}, ...]
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);

  // Gamification & Target - MERGED STATE (from Nhost if possible)
  const [sessions, setSessions] = useState(initialPomodoro.totalSessions ?? 0);
  // Focus Today chỉ tăng khi hoàn thành Pomodoro
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(
    initialPomodoro.totalFocusMinutes ?? 0
  );
  const [targetGoal, setTargetGoal] = useState(initialPomodoro.targetGoal ?? 120); // Default 2h
  // Tính toán mặc định turnDuration theo targetGoal
  const getDefaultTurnDuration = goal => (goal > 180 ? 50 * 60 : 25 * 60);
  const [turnDuration, setTurnDuration] = useState(
    getDefaultTurnDuration(initialPomodoro.targetGoal ?? 120)
  );
  const [autoCycle, setAutoCycle] = useState(initialPomodoro.autoCycle ?? true);
  const [happiness, setHappiness] = useState(initialPomodoro.happiness ?? 80);
  const [isFeeding, setIsFeeding] = useState(false);
  const [foodStock, setFoodStock] = useState(initialPomodoro.foodStock ?? 0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [buddyType, setBuddyType] = useState(initialPomodoro.buddyType ?? "cat");
  const [showMini, setShowMini] = useState(initialPomodoro.showMini ?? true);

  // Smart System Analysis for Session Durations
  const getSmartDuration = m => {
    // If goal is long (>3h), use deep work blocks (50/10)
    // If goal is short, use standard blocks (25/5)
    const isLongGoal = targetGoal >= 180;
    if (m === "focus") return turnDuration;
    if (m === "shortBreak") return (isLongGoal ? 10 : 5) * 60;
    if (m === "longBreak") return (isLongGoal ? 30 : 15) * 60;
    return turnDuration;
  };
  // Update turns when targetGoal or turnDuration changes
  useEffect(() => {
    const totalSeconds = targetGoal * 60;
    const numTurns = Math.max(1, Math.ceil(totalSeconds / turnDuration));
    const turnsArr = Array.from({ length: numTurns }, (_, i) => {
      const remain = totalSeconds - i * turnDuration;
      return { duration: remain >= turnDuration ? turnDuration : remain };
    });
    setTurns(turnsArr);
    
    // Nếu số lượng turn thay đổi mà turn hiện tại vượt quá, reset về cuối
    if (currentTurnIdx >= numTurns) {
        setCurrentTurnIdx(numTurns - 1);
    }
  }, [targetGoal, turnDuration]);

  // Sync state from account when it loads from server the first time
  const hasInitedRef = useRef(false);
  useEffect(() => {
    if (account?.pomodoro && !hasInitedRef.current) {
      const p = account.pomodoro;
      if (p.totalSessions !== undefined) setSessions(p.totalSessions);
      if (p.totalFocusMinutes !== undefined) setTotalFocusMinutes(p.totalFocusMinutes);
      if (p.targetGoal !== undefined) setTargetGoal(p.targetGoal);
      if (p.happiness !== undefined) setHappiness(p.happiness);
      if (p.foodStock !== undefined) setFoodStock(p.foodStock);
      if (p.buddyType !== undefined) setBuddyType(p.buddyType);
      if (p.autoCycle !== undefined) setAutoCycle(p.autoCycle);
      if (p.showMini !== undefined) setShowMini(p.showMini);
      if (p.currentTurnIdx !== undefined) setCurrentTurnIdx(p.currentTurnIdx);
      
      // We don't auto-resume timer from Nhost to avoid jumpy behavior if synced from another tab
      // But we set proper initial time if it exists
      if (p.timeLeft !== undefined) setTurnTimeLeft(p.timeLeft);
      else setTurnTimeLeft(p.targetGoal ? (p.targetGoal > 180 ? 50 * 60 : 25 * 60) : 25 * 60);
      
      hasInitedRef.current = true;
    }
  }, [account?.pomodoro]);

  // Tự động cập nhật turnDuration mặc định khi targetGoal thay đổi
  useEffect(() => {
    setTimeout(() => setTurnDuration(getDefaultTurnDuration(targetGoal)), 0);
  }, [targetGoal]);

  // Water reminder
  const [waterReminderOn, setWaterReminderOn] = useState(true);
  const [waterIntervalMin, setWaterIntervalMin] = useState(20);
  const [showWaterAlert, setShowWaterAlert] = useState(false);

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytLoadRef = useRef(false);
  const waterTimerRef = useRef(null);
  // Keep latest timer snapshot for the floating mini widget
  const timerSyncRef = useRef({ mode, isActive, turnTimeLeft });

  // Init audio object and Daily Reset check
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    audioRef.current.volume = volume;

    // QA: Daily Reset for "Focus Today" stats
    const today = new Date().toDateString();
    const lastSessionDate = initialPomodoro.lastSessionDate
      ? new Date(initialPomodoro.lastSessionDate).toDateString()
      : "";

    if (lastSessionDate && lastSessionDate !== today) {
      setTotalFocusMinutes(0);
      updatePomodoroData({
        totalFocusMinutes: 0,
        // We keep totalSessions as it's a lifetime stat
      });
    }

    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Sync essential timer state to global store so PomodoroMini stays updated across tabs/routes
  useEffect(() => {
    timerSyncRef.current = { mode, isActive, turnTimeLeft };
  }, [mode, isActive, turnTimeLeft]);

  // ─── Bidirectional Instant Sync (Storage Event) ───
  // Removed bidirectional Storage Event sync as per "no storage" request


  useEffect(() => {
    const sync = () => {
      const { mode: m, isActive: active, turnTimeLeft: t } = timerSyncRef.current;
      updatePomodoroData({ mode: m, isActive: active, timeLeft: t });
    };
    sync();
    const id = setInterval(sync, 1000); // 1s sync for better real-time updates
    return () => clearInterval(id);
  }, [updatePomodoroData]);

  // Happiness decay
  // Happiness decay & Periodic Sync & Midnight Reset
  useEffect(() => {
    const t = setInterval(() => {
      // 1. Happiness decay
      setHappiness(h => {
        const next = Math.max(0, h - 0.5);
        if (Math.floor(next) % 5 === 0) {
          updatePomodoroData({ happiness: next });
        }
        return next;
      });

      // 2. Midnight Reset check
      const today = new Date().toDateString();
      const lastSessionDateStored = useUserStore.getState().account?.pomodoro?.lastSessionDate;
      const lastSessionDate = lastSessionDateStored
        ? new Date(lastSessionDateStored).toDateString()
        : "";

      if (lastSessionDate && lastSessionDate !== today) {
        setTotalFocusMinutes(0);
        updatePomodoroData({
          totalFocusMinutes: 0,
          lastSessionDate: new Date().toISOString(),
        });
      }
    }, 60000);
    return () => clearInterval(t);
  }, []);

  // Water reminder
  useEffect(() => {
    if (waterTimerRef.current) clearInterval(waterTimerRef.current);
    if (!waterReminderOn) return;
    waterTimerRef.current = setInterval(() => setShowWaterAlert(true), waterIntervalMin * 60000);
    return () => clearInterval(waterTimerRef.current);
  }, [waterReminderOn, waterIntervalMin]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (ytPlayerRef.current?.setVolume) {
      try {
        ytPlayerRef.current.setVolume(Math.round(volume * 100));
      } catch (e) {
        // ignore yt setVolume error
      }
    }
  }, [volume]);

  // Feed buddy
  const feedBuddy = () => {
    if (foodStock <= 0 || isFeeding) return;
    setFoodStock(s => s - 1);
    setIsFeeding(true);
    const newHappiness = Math.min(100, happiness + 15);
    setHappiness(newHappiness);

    // Save state
    updatePomodoroData({
      foodStock: foodStock - 1,
      happiness: newHappiness,
    });

    setTimeout(() => setIsFeeding(false), 3000);
  };

  // YT API loader
  const loadYouTubeAPI = React.useCallback(
    () =>
      new Promise(resolve => {
        if (window.YT?.Player) return resolve(window.YT);
        if (ytLoadRef.current) {
          const chk = setInterval(() => {
            if (window.YT?.Player) {
              clearInterval(chk);
              resolve(window.YT);
            }
          }, 100);
          return;
        }
        ytLoadRef.current = true;
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
        window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      }),
    []
  );

  // YT player setup
  const setupPlayer = React.useCallback(
    async id => {
      await loadYouTubeAPI();
      const elId = "yt-player-container";
      let container = document.getElementById(elId);
      if (!container) {
        container = document.createElement("div");
        container.id = elId;
        container.style.display = "none";
        document.body.appendChild(container);
      }
      if (ytPlayerRef.current?.getVideoData && ytPlayerRef.current.getVideoData().video_id !== id) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          // ignore error on destroy
        }
        ytPlayerRef.current = null;
      }
      if (!ytPlayerRef.current) {
        return new Promise(resolve => {
          ytPlayerRef.current = new window.YT.Player(elId, {
            videoId: id,
            host: "https://www.youtube-nocookie.com",
            playerVars: {
              autoplay: 1,
              controls: 0,
              loop: 1,
              playlist: id,
              modestbranding: 1,
              rel: 0,
              enablejsapi: 1,
            },
            events: {
              onReady: e => {
                try {
                  e.target.setVolume(Math.round(volume * 100));
                  e.target.playVideo();
                  const data = e.target.getVideoData();
                  if (data?.title) setActiveTrackTitle(data.title);
                } catch (e) {
                  // ignore yt ready error
                }
                resolve();
              },
              onStateChange: e => {
                if (e.data === window.YT.PlayerState.ENDED) e.target.playVideo();
                if (e.data === window.YT.PlayerState.PLAYING) {
                  const data = e.target.getVideoData();
                  if (data?.title) setActiveTrackTitle(data.title);
                }
              },
              onError: () => resolve(),
            },
          });
        });
      } else {
        try {
          ytPlayerRef.current.loadVideoById(id);
        } catch (e) {
          // ignore load error
        }
      }
    },
    [loadYouTubeAPI, volume]
  );

  const targetTimeRef = useRef(null);

  // Handle YouTube Playback Trigger
  useEffect(() => {
    if (soundConfig.type === "youtube" && soundConfig.id) {
      setupPlayer(soundConfig.id);
    } else if (!soundConfig.id && ytPlayerRef.current?.pauseVideo) {
      try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
      setActiveTrackTitle("");
    }
  }, [soundConfig, setupPlayer]);

  // Handle Audio Mute/Unmute Toggle
  useEffect(() => {
    if (ytPlayerRef.current?.playVideo) {
      try {
        if (audioEnabled) ytPlayerRef.current.playVideo();
        else ytPlayerRef.current.pauseVideo();
      } catch (e) {}
    }
  }, [audioEnabled]);

  // UI Sync with Global Timer (PomodoroMini/Store)
  useEffect(() => {
    if (account?.pomodoro) {
        const p = account.pomodoro;
        // Only update local state if drift is significant (>2s) or state changed
        if (Math.abs(p.timeLeft - turnTimeLeft) > 2 || p.isActive !== isActive || p.mode !== mode) {
            setTurnTimeLeft(p.timeLeft ?? turnTimeLeft);
            setIsActive(p.isActive ?? isActive);
            setMode(p.mode ?? mode);
        }
    }
  }, [account?.pomodoro]);

  // Local tick for smooth UI (Protected against browser background throttling & sleeping tabs)
  const lastTickRef = useRef(Date.now());
  useEffect(() => {
      let interval;
      if (isActive && turnTimeLeft > 0) {
          lastTickRef.current = Date.now();
          interval = setInterval(() => {
              const now = Date.now();
              const elapsedSeconds = Math.round((now - lastTickRef.current) / 1000);
              if (elapsedSeconds >= 1) {
                  lastTickRef.current = now;
                  setTurnTimeLeft(prev => Math.max(0, prev - elapsedSeconds));
              }
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [isActive]);

  // Trigger turn completion when time hits 0
  useEffect(() => {
    if (isActive && turns.length > 0 && turnTimeLeft === 0) {
      sounds.playSuccess();

      setTimeout(() => {
        // 1. If it was FOCUS mode, increment sessions and minutes
        if (mode === "focus") {
          const finishedDuration = turns[currentTurnIdx]?.duration || 0;
          const finishedMinutes = Math.round(finishedDuration / 60);

          setSessions(s => s + 1);
          setTotalFocusMinutes(prev => prev + finishedMinutes);
          setFoodStock(s => s + 1);
          setHappiness(h => Math.min(100, h + 10));
          setShowConfetti(true);

          // Use latest store data to avoid stale initialPomodoro bug
          const currentTotal = useUserStore.getState().account?.pomodoro?.totalFocusMinutes || 0;
          const currentSessions = useUserStore.getState().account?.pomodoro?.totalSessions || 0;

          updatePomodoroData({
            totalSessions: currentSessions + 1,
            lastSessionDate: new Date().toISOString(),
            totalFocusMinutes: currentTotal + finishedMinutes,
            foodStock: foodStock + 1,
            happiness: Math.min(100, happiness + 10),
          });

          // Transition logic
          if (autoCycle) {
            // After focus -> Break
            const isLongBreak = (sessions + 1) % 4 === 0;
            const nextMode = isLongBreak ? "longBreak" : "shortBreak";
            setMode(nextMode);
            setTurnTimeLeft(getSmartDuration(nextMode));
            // Keep isActive true for auto-start
          } else {
            setIsActive(false);
          }
        }
        // 2. If it was BREAK mode, go back to FOCUS
        else {
          if (autoCycle && currentTurnIdx + 1 < turns.length) {
            setCurrentTurnIdx(idx => idx + 1);
            setMode("focus");
            setTurnTimeLeft(turns[currentTurnIdx + 1].duration);
          } else {
            setIsActive(false);
            if (currentTurnIdx + 1 >= turns.length) {
              setShowConfetti(true);
              setFoodStock(s => s + 1);
              setHappiness(h => Math.min(100, h + 10));
              updatePomodoroData({
                foodStock: foodStock + 1,
                happiness: Math.min(100, happiness + 10),
              });
            }
          }
        }

        // Global Sync
        const syncData = collectSyncData(useUserStore, useBookmarkStore);
        if (syncData) debouncedSync(syncData);
      }, 0);

      if (ytPlayerRef.current?.pauseVideo) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (e) {}
      }
    }
  }, [isActive, turnTimeLeft, mode, autoCycle, turns, currentTurnIdx]);

  const toggleAmbient = id => {
    setAudioEnabled(true);
    const snd = AMBIENT_SOUNDS.find(s => s.id === id);
    if (snd?.youtubeId) {
      setSoundConfig(p =>
        p.type === "youtube" && p.id === snd.youtubeId
          ? { type: null, id: null }
          : { type: "youtube", id: snd.youtubeId }
      );
    }
  };

  const toggleYoutube = id => {
    setActiveTrackTitle("Đang tải...");
    setAudioEnabled(true);
    setSoundConfig(p =>
      p.type === "youtube" && p.id === id ? { type: null, id: null } : { type: "youtube", id }
    );
  };

  const handleImportYoutube = e => {
    e.preventDefault();
    if (!customYtUrl.trim()) return;
    const re =
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
    const m = customYtUrl.match(re);
    const id = m ? m[1] : customYtUrl.length === 11 ? customYtUrl : null;
    if (id) {
      setAudioEnabled(true);
      toggleYoutube(id);
      setCustomYtUrl("");
    } else alert("Link YouTube không hợp lệ!");
  };

  const persistTimerState = (active, time, m) => {
    updatePomodoroData({ 
        timeLeft: time, 
        isActive: active, 
        mode: m, 
        showMini: active,
        currentTurnIdx // Lưu luôn vị trí turn hiện tại
    });
  };

  const toggleTimer = () => {
    if (!isActive) {
      if (turnTimeLeft > 0) {
        setIsActive(true);
        persistTimerState(true, turnTimeLeft, mode);
      } else {
        // Nếu đã hết thời gian của turn hiện tại, chuyển sang turn mới (hoặc reset nếu là cuối cùng)
        const isLastTurn = currentTurnIdx + 1 >= turns.length;
        const nextIdx = isLastTurn ? 0 : currentTurnIdx + (mode === 'focus' ? 0 : 1);
        
        if (isLastTurn && mode !== 'focus') {
             setCurrentTurnIdx(0);
        }
        
        const freshTime = turns[nextIdx]?.duration || turnDuration;
        setTurnTimeLeft(freshTime);
        setIsActive(true);
        persistTimerState(true, freshTime, mode);
        setShowBell(true);
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.play().catch(() => {});
        setTimeout(() => setShowBell(false), 1200);
      }
    } else {
      setIsActive(false);
      persistTimerState(false, turnTimeLeft, mode);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setCurrentTurnIdx(0);
    const freshTime = turns[0]?.duration || turnDuration;
    setTurnTimeLeft(freshTime);
    updatePomodoroData({ timeLeft: freshTime, isActive: false, mode, showMini: false });
  };

  const switchMode = m => {
    if (isActive) {
        if (!window.confirm("Timer đang chạy, bạn có chắc muốn dừng và đổi chế độ không?")) {
            return;
        }
    }
    // Dừng ngay lập tức và đặt lại thời gian về mặc định của chế độ đó
    setIsActive(false);
    setMode(m);
    const time = getSmartDuration(m);
    setTurnTimeLeft(time);
    
    // Cập nhật Store ngay lập tức để đồng bộ background worker
    updatePomodoroData({ 
        timeLeft: time, 
        isActive: false, 
        mode: m, 
        showMini: false 
    }, true);
  };
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const modeData = MODES[mode];

  const focusQuote = FOCUS_QUOTES[quoteIdx % FOCUS_QUOTES.length];
  const breakQuote = BREAK_QUOTES[quoteIdx % BREAK_QUOTES.length];
  const currentQuote = mode === "focus" ? focusQuote : breakQuote;

  // Sound panel collapse state for mobile/tablet
  const [soundPanelOpen, setSoundPanelOpen] = useState(false);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 lg:left-64 z-20 flex flex-col xl:flex-row overflow-hidden bg-slate-50 dark:bg-slate-900">
      <AnimatePresence>
        {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showWaterAlert && <WaterReminderToast onDismiss={() => setShowWaterAlert(false)} />}
      </AnimatePresence>
      {/* ── LEFT PANEL: 2-column layout ── */}
      <div className="flex-1 flex flex-col relative min-h-0 min-w-0 overflow-y-auto xl:overflow-hidden">
        {/* BG gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 40%, ${modeData.color}12 0%, transparent 68%)`,
          }}
        />

        <AnimatePresence>
          {mode === "focus" && <FloatingBooks isActive={isActive} />}
        </AnimatePresence>

        {/* Top Header: Smart Banner OR Manual Mode Selectors */}
        <div className="relative z-10 flex justify-center pt-3 sm:pt-5 pb-2 sm:pb-3 px-3">
          {autoCycle ? (
            <div className="flex bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm gap-2 sm:gap-3 items-center">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: modeData.color }}
              />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                Chế độ tự động thông minh
              </span>
              <div className="px-2 py-0.5 rounded-md bg-blue-500 text-[9px] text-white font-black">
                ACTIVE
              </div>
            </div>
          ) : (
            <div className="flex bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 sm:p-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm gap-0.5 sm:gap-1">
              {Object.entries(MODES).map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => switchMode(key)}
                  className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black tracking-widest transition-all ${
                    mode === key ? "text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                  }`}
                  style={mode === key ? { backgroundColor: data.color } : {}}
                >
                  {data.label.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main 2-column content */}
        <div className="relative z-10 flex flex-col xl:flex-row flex-1 items-center justify-center gap-0 min-h-0 px-3 sm:px-6">
          {/* ── LEFT COL: Buddy (hidden on mobile/tablet, shown on xl+) ── */}
          <div className="hidden xl:flex flex-1 items-center justify-center">
            {buddyType === "cat" ? (
              <StudyBuddy
                mode={mode}
                isActive={isActive}
                isFeeding={isFeeding}
                happiness={happiness}
              />
            ) : (
              <PixelOffice mode={mode} isActive={isActive} />
            )}
          </div>

          {/* No card needed here anymore! Redundant */}

          {/* ── RIGHT COL: Timer + Controls + Hint ── */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3 sm:gap-5 w-full max-w-md xl:max-w-none mx-auto">
            {/* Turn Timer UI */}
            <div className="flex flex-col items-center select-none w-full">
              {/* Turn Progress */}
              <div className="relative flex flex-col items-center">
                {/* Hiệu ứng visual chuông rung khi bắt đầu */}
                {showBell && (
                  <motion.div
                    initial={{ scale: 0.7, rotate: -15, opacity: 0 }}
                    animate={{
                      scale: [0.7, 1.2, 1],
                      rotate: [0, 15, -15, 0],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{ duration: 1.2 }}
                    className="absolute left-1/2 -translate-x-1/2 top-0 z-50"
                  >
                    <span className="text-4xl">🔔</span>
                  </motion.div>
                )}
                {/* Tổng số Pomodoro đã hoàn thành */}
                <div className="mb-2 flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                  <Trophy size={14} className="text-amber-500" />
                  <span className="text-[10px] sm:text-[11px] font-black text-amber-600">
                    Tổng số Pomodoro: {sessions}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-slate-200/50 dark:border-white/10 backdrop-blur-sm shadow-sm mb-1">
                  <Target size={12} className="text-amber-500" />
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {`${Math.floor(totalFocusMinutes / 60)}h ${String(totalFocusMinutes % 60).padStart(2, "0")}m`}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      /{" "}
                      {`${Math.floor(targetGoal / 60)}h ${String(targetGoal % 60).padStart(2, "0")}m`}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">
                  Focus Today
                </span>
              </div>

              {/* Main Content: Current Turn Timer */}
              <div className="flex flex-col items-center mt-6 sm:mt-12">
                <div className="flex items-center gap-2 mb-2">
                  <motion.div
                    animate={isActive ? { scale: [1, 1.3, 1], opacity: [1, 0.4, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: modeData.color }}
                  />
                  <span
                    className="text-[11px] font-black uppercase tracking-[0.2em]"
                    style={{ color: modeData.color }}
                  >
                    {modeData.label}
                  </span>
                </div>
                <motion.div
                  key={turnTimeLeft}
                  className="text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-slate-800 dark:text-white tracking-tighter drop-shadow-md"
                >
                  {fmt(turnTimeLeft)}
                </motion.div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-[2px] w-4 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    Turn {currentTurnIdx + 1} / {turns.length}
                  </span>
                  <div className="h-[2px] w-4 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
              </div>
              {/* Chọn thời lượng turn */}
              <div className="mt-4 sm:mt-6 flex flex-col items-center w-full max-w-[300px] sm:max-w-md px-2">
                <div className="flex items-center gap-2 mb-1.5 justify-between w-full">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Chỉnh sửa Turn
                  </span>
                  {targetGoal >= 180 ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                          <Brain size={10} className="text-amber-500" />
                          <span className="text-[9px] font-black text-amber-600 uppercase">Gợi ý: Deep Work (50m+)</span>
                      </div>
                  ) : (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                          <Wind size={10} className="text-emerald-500" />
                          <span className="text-[9px] font-black text-emerald-600 uppercase">Gợi ý: Standard (25m)</span>
                      </div>
                  )}
                </div>

                <div className="w-full flex items-center gap-3 bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200/50 dark:border-white/5">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-400">15m</span>
                        <div className="text-[13px] font-black text-slate-800 dark:text-white">
                           {Math.round(turnDuration / 60)} phút / turn
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">120m</span>
                    </div>
                    <input
                        type="range"
                        min={15 * 60}
                        max={120 * 60}
                        step={5 * 60}
                        value={turnDuration}
                        onChange={e => {
                            const val = Number(e.target.value);
                            const diff = val - turnDuration;
                            setTurnDuration(val);
                            setTurnTimeLeft(prev => Math.max(0, prev + diff));
                        }}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-all active:accent-amber-600"
                    />
                  </div>
                </div>
                
                <p className="mt-2 text-[10px] text-center text-slate-400 font-medium italic">
                    Hệ thống đề xuất chia kế hoạch {Math.floor(targetGoal/60)}h thành <strong>{turns.length} sessions</strong> để đạt mục tiêu tối ưu.
                </p>
              </div>
            </div>
            {/* ...existing code... */}

            {/* Controls */}
            <div className="flex items-center gap-3 sm:gap-5">
              <button
                onClick={resetTimer}
                className="p-3 sm:p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur text-slate-500 rounded-2xl hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-90 border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <RotateCcw size={20} className="sm:w-[22px] sm:h-[22px]" />
              </button>

              <motion.button
                onClick={toggleTimer}
                whileTap={{ scale: 0.93 }}
                whileHover={{ scale: 1.05 }}
                className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-[1.4rem] sm:rounded-[1.8rem] shadow-2xl text-white transition-all"
                style={{
                  backgroundColor: modeData.color,
                  boxShadow: `0 10px 36px ${modeData.color}60`,
                }}
              >
                {isActive ? (
                  <Pause size={28} className="sm:w-[34px] sm:h-[34px]" />
                ) : (
                  <Play size={28} className="ml-1 sm:w-[34px] sm:h-[34px]" />
                )}
              </motion.button>

              {/* Feed button */}
              <button
                onClick={feedBuddy}
                disabled={foodStock === 0 || isFeeding}
                className={`p-3 sm:p-4 rounded-2xl border-2 transition-all active:scale-90 shadow-sm relative ${
                  foodStock > 0
                    ? "bg-orange-50 border-orange-200 hover:bg-orange-100 dark:bg-orange-500/10 dark:border-orange-500/30"
                    : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 opacity-40 cursor-not-allowed"
                }`}
              >
                <span className="text-xl sm:text-2xl">🍱</span>
                {foodStock > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                    {foodStock}
                  </span>
                )}
              </button>
            </div>

            {/* Hint */}
            <p className="text-[10px] sm:text-[11px] font-semibold text-center max-w-[220px] leading-relaxed text-slate-400 dark:text-white pb-4 xl:pb-0">
              {foodStock === 0
                ? "⏱️ Hoàn thành 1 Pomodoro để nhận 🍱 cho Buddy ăn!"
                : `🍱 ×${foodStock} — Nhấn nút 🍱 để cho Buddy ăn!`}
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Sound Station ── */}
      {/* Mobile/Tablet: collapsible bottom panel. Desktop xl+: fixed sidebar */}
      <div className="xl:w-80 flex flex-col bg-white dark:bg-slate-800 border-t-2 xl:border-t-0 xl:border-l-2 border-slate-100 dark:border-slate-700 max-h-[60vh] xl:max-h-none overflow-y-auto">
        {/* Toggle button for mobile/tablet */}
        <button
          onClick={() => setSoundPanelOpen(o => !o)}
          className="xl:hidden flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10"
        >
          <Music size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Sound Station & Cài đặt
          </span>
          {soundPanelOpen ? (
            <ChevronDown size={14} className="text-slate-400" />
          ) : (
            <ChevronUp size={14} className="text-slate-400" />
          )}
        </button>

        <div className={`${soundPanelOpen ? "block" : "hidden"} xl:block flex-1 overflow-y-auto custom-scrollbar`}>
          <div className="p-4 space-y-3 flex-1">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
                <Music size={16} className="text-blue-500" /> Sound Station
              </h3>

              {/* Volume + Mute */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl px-3 py-1.5 border border-slate-100 dark:border-slate-600">
                <button
                  onClick={() => setVolume(v => Math.max(0, +(v - 0.1).toFixed(1)))}
                  className="text-slate-400 hover:text-slate-600 font-black text-sm w-4"
                >
                  −
                </button>
                <span className="text-[10px] font-black text-slate-500 w-7 text-center">
                  {Math.round(volume * 100)}%
                </span>
                <button
                  onClick={() => setVolume(v => Math.min(1, +(v + 0.1).toFixed(1)))}
                  className="text-slate-400 hover:text-slate-600 font-black text-sm w-4"
                >
                  +
                </button>
                <button
                  onClick={() => setAudioEnabled(a => !a)}
                  className={`ml-1 p-1 rounded-lg transition-all ${audioEnabled && soundConfig.id ? "text-blue-500" : "text-slate-400"}`}
                >
                  {audioEnabled && soundConfig.id ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              </div>
            </div>

            {/* Automated System is running */}

            {/* Buddy Switcher */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 flex items-center justify-between border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-sm">
                  {buddyType === "cat" ? "🐱" : "🏢"}
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase">Buddy</span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                    {buddyType === "cat" ? "Mèo" : "Office"}
                  </span>
                </div>
              </div>
              <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => {
                    setBuddyType("cat");
                    updatePomodoroData({ buddyType: "cat" });
                  }}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${buddyType === "cat" ? "bg-[#1CB0F6] text-white shadow-md" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  CAT
                </button>
                <button
                  onClick={() => {
                    setBuddyType("office");
                    updatePomodoroData({ buddyType: "office" });
                  }}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${buddyType === "office" ? "bg-[#1CB0F6] text-white shadow-md" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  PIXEL
                </button>
              </div>
            </div>

            {/* Target Goal Selector */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 space-y-3 border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-amber-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Thiết lập mục tiêu
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newVal = !autoCycle;
                      setAutoCycle(newVal);
                      updatePomodoroData({ autoCycle: newVal });
                    }}
                    className={`text-[9px] font-black px-2 py-1 rounded-lg transition-all ${autoCycle ? "bg-green-500 text-white" : "bg-slate-200 dark:bg-slate-600 text-slate-500"}`}
                  >
                    {autoCycle ? "AUTO ON" : "AUTO OFF"}
                  </button>
                  <button
                    onClick={() => {
                      const newVal = !showMini;
                      setShowMini(newVal);
                      updatePomodoroData({ showMini: newVal });
                    }}
                    className={`text-[9px] font-black px-2 py-1 rounded-lg transition-all ${showMini ? "bg-purple-500 text-white shadow-sm" : "bg-slate-200 dark:bg-slate-600 text-slate-500"}`}
                  >
                    {showMini ? "MINI ON" : "MINI OFF"}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>
                    {`${Math.floor(targetGoal / 60)}h ${String(targetGoal % 60).padStart(2, "0")}m`}
                  </span>
                  <span>Mục tiêu: {targetGoal} phút</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onMouseDown={() => {
                      let interval = setInterval(() => {
                        setTargetGoal(val => {
                          const next = Math.max(30, val - 30);
                          updatePomodoroData({ targetGoal: next });
                          return next;
                        });
                      }, 150);
                      const up = () => {
                        clearInterval(interval);
                        window.removeEventListener("mouseup", up);
                      };
                      window.addEventListener("mouseup", up);
                      setTargetGoal(val => {
                        const next = Math.max(30, val - 30);
                        updatePomodoroData({ targetGoal: next });
                        return next;
                      });
                    }}
                    className="px-3 py-2 rounded-lg bg-amber-100 text-amber-600 font-black border border-amber-200 text-lg active:scale-90"
                  >
                    -
                  </button>
                  <span className="text-[13px] font-black text-slate-700 dark:text-slate-200 min-w-[60px] text-center">
                    {`${Math.floor(targetGoal / 60)}h ${String(targetGoal % 60).padStart(2, "0")}m`}
                  </span>
                  <button
                    onMouseDown={() => {
                      let interval = setInterval(() => {
                        setTargetGoal(val => {
                          const next = Math.min(600, val + 30);
                          updatePomodoroData({ targetGoal: next });
                          return next;
                        });
                      }, 150);
                      const up = () => {
                        clearInterval(interval);
                        window.removeEventListener("mouseup", up);
                      };
                      window.addEventListener("mouseup", up);
                      setTargetGoal(val => {
                        const next = Math.min(600, val + 30);
                        updatePomodoroData({ targetGoal: next });
                        return next;
                      });
                    }}
                    className="px-3 py-2 rounded-lg bg-amber-100 text-amber-600 font-black border border-amber-200 text-lg active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Now Playing */}
            <AnimatePresence>
              {soundConfig.id && activeTrackTitle && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-3.5 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
                    {audioEnabled ? (
                      <div className="flex gap-0.5 items-end h-4">
                        {[0.5, 0.6, 0.4].map((d, i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-white rounded-sm"
                            animate={{ height: [5, 14, 5] }}
                            transition={{ duration: d, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                    ) : (
                      <Music size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-0.5">
                      Đang phát
                    </div>
                    <div className="text-sm font-black text-slate-700 dark:text-slate-200 leading-tight line-clamp-2">
                      {activeTrackTitle}
                    </div>
                  </div>
                  <button
                    onClick={() => setAudioEnabled(a => !a)}
                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors text-blue-500 shrink-0"
                  >
                    {audioEnabled ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* YouTube Lofi Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  YouTube Lofi
                </span>
                <Youtube size={14} className="text-red-400 opacity-60" />
              </div>

              {/* Custom URL input */}
              <form onSubmit={handleImportYoutube} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Dán link YouTube..."
                  className="flex-1 min-w-0 px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[11px] font-bold outline-none focus:border-red-400 transition-colors dark:text-slate-200 dark:placeholder-slate-400"
                  value={customYtUrl}
                  onChange={e => setCustomYtUrl(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-xl transition-all active:scale-95 shrink-0"
                >
                  <Plus size={18} />
                </button>
              </form>

              <div className="grid grid-cols-2 gap-2">
                {YOUTUBE_TRACKS.map(track => {
                  const active = soundConfig.type === "youtube" && soundConfig.id === track.id;
                  return (
                    <button
                      key={track.id}
                      onClick={() => toggleYoutube(track.id)}
                      className={`p-2.5 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                        active
                          ? "bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40"
                          : "bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600 hover:border-red-200"
                      }`}
                    >
                      <div
                        className={`text-[11px] font-black uppercase tracking-tight ${active ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}
                      >
                        {track.label}
                      </div>
                      <div className="text-[9px] text-slate-400 font-black mt-0.5">{track.sub}</div>
                      {active && (
                        <div className="absolute top-2 right-2 flex gap-0.5 items-end h-3">
                          {[0.5, 0.6, 0.4].map((d, i) => (
                            <motion.div
                              key={i}
                              className="w-0.5 bg-red-500 rounded-sm"
                              animate={{ height: [3, 8, 3] }}
                              transition={{ duration: d, repeat: Infinity, delay: i * 0.1 }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nature Sounds */}
            <div className="space-y-2 mt-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Nature Escape
              </span>
              <div className="grid grid-cols-2 gap-2">
                {AMBIENT_SOUNDS.map(sound => {
                  const active = soundConfig.id === sound.youtubeId;
                  return (
                    <button
                      key={sound.id}
                      onClick={() => toggleAmbient(sound.id)}
                      className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-2.5 ${
                        active
                          ? "bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40"
                          : "bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600 hover:border-blue-200"
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg ${active ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-600 text-slate-400"}`}
                      >
                        <sound.icon size={14} />
                      </div>
                      <span
                        className={`text-[11px] font-black uppercase tracking-tight ${active ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}
                      >
                        {sound.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom tip card - Click to refresh */}
        <div
          className={`${soundPanelOpen ? "block" : "hidden"} xl:block p-3 border-t border-slate-100 dark:border-slate-700 cursor-pointer group`}
          onClick={() => setQuoteIdx(q => q + 1)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${quoteIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 flex gap-3 items-start group-hover:bg-amber-100 transition-colors"
            >
              <span className="text-2xl mt-0.5 shrink-0">{currentQuote.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                    Buddy nói
                  </div>
                  <RotateCcw
                    size={10}
                    className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <p className="text-[12px] text-amber-900 dark:text-amber-100 font-bold leading-relaxed">
                  {currentQuote.text}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
