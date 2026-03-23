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
    {/* Body - Round and chubby */}
    <ellipse cx="80" cy="150" rx="52" ry="44" fill="white" stroke="#432c23" strokeWidth="3.5" />
    {/* Floor shadow */}
    <ellipse cx="80" cy="186" rx="38" ry="8" fill="#cbd5e1" opacity="0.6" />
  </>
);

const CatHead = ({ showHachimaki, happiness }) => (
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

    {/* Head - Extra wide (chubby cheeks) */}
    <ellipse cx="80" cy="84" rx="66" ry="54" fill="white" stroke="#432c23" strokeWidth="3.5" />

    {/* Sleeping Zzz bubbles */}
    {happiness < 40 && (
      <motion.g
        animate={{ opacity: [0, 1, 0], y: [60, 30], x: [120, 130] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <text x="0" y="0" fontSize="14" fontWeight="bold" fill="#94a3b8">
          Zz
        </text>
      </motion.g>
    )}

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
  </>
);

const CatFaceBase = ({ mode, isActive, isFeeding, happiness }) => {
  const happy = isFeeding || (mode === "longBreak" && isActive);
  const exercise = mode === "shortBreak" && isActive;
  const squint = mode === "focus" && isActive;

  return (
    <>
      {/* Blush - Big, soft, positioned low */}
      <ellipse cx="38" cy="102" rx="14" ry="9" fill="#ff99a8" opacity="0.45" />
      <ellipse cx="122" cy="102" rx="14" ry="9" fill="#ff99a8" opacity="0.45" />

      {/* Eyes */}
      {squint
        ? /* Focused (Serious lines + furrowed brows) */
          [52, 108].map((cx, i) => (
            <g key={cx}>
              {/* Eyebrow */}
              <path
                d={i === 0 ? `M${cx - 7} 85 L${cx + 6} 88` : `M${cx - 6} 88 L${cx + 7} 85`}
                stroke="#432c23"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.8"
              />
              {/* Eye line */}
              <path
                d={i === 0 ? `M${cx - 7} 94 L${cx + 5} 97` : `M${cx - 5} 97 L${cx + 7} 94`}
                stroke="#432c23"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </g>
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
                  {/* sparkle dot */}
                  <circle cx={cx - 4} cy="90" r="1.5" fill="#ff99a8" opacity="0.7" />
                </g>
              ))
            : /* Normal (Big anime dots with shine) + Licking Squint */
              [52, 108].map(cx => (
                <g key={cx}>
                  {/* Outer iris */}
                  <circle cx={cx} cy="95" r="8" fill="#2d1a10" />
                  {/* Brown ring */}
                  <circle cx={cx} cy="95" r="6.5" fill="#432c23" />
                  {/* Main shine */}
                  <circle cx={cx - 3} cy="91.5" r="2.8" fill="white" opacity="0.92" />
                  {/* Small shine */}
                  <circle cx={cx + 3.5} cy="94.5" r="1.3" fill="white" opacity="0.65" />

                  {/* Licking Squint (Only when idling) */}
                  {!isActive && !isFeeding && (
                    <motion.path
                      d={`M${cx - 9} 95 Q${cx} 88 ${cx + 9} 95`}
                      stroke="white"
                      strokeWidth="10"
                      fill="none"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: [0, 1, 1, 1, 0, 1, 1, 1, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        repeatDelay: 8,
                        times: [0, 0.1, 0.3, 0.4, 0.45, 0.55, 0.75, 0.85, 0.9],
                      }}
                    />
                  )}

                  {/* Blinking Lid */}
                  <motion.rect
                    x={cx - 10}
                    y="85"
                    width="20"
                    height="20"
                    fill="white"
                    animate={{ height: [0, 0, 20, 0, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      times: [0, 0.9, 0.95, 1, 1],
                    }}
                  />
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
        {/* Tongue - Optimized for Licking the Paw surface at Y ~115 */}
        {!isActive && !isFeeding && (
          <motion.path
            d="M72 104 Q80 128 88 104"
            fill="#ff4d6d"
            stroke="#432c23"
            strokeWidth="1.5"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{
              opacity: [0, 1, 1, 1, 0, 1, 1, 1, 0],
              scaleY: [0, 1.3, 1.8, 1.3, 0, 1.3, 1.8, 1.3, 0],
              y: [0, 4, 10, 4, 0, 4, 10, 4, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatDelay: 8,
              times: [0, 0.1, 0.3, 0.4, 0.45, 0.55, 0.75, 0.85, 0.9],
            }}
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

        {happiness < 40 && !isActive && !isFeeding ? (
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

const IdleProps = () => (
  <>
    {/* Left Arm - Licking - HIGH SHOULDER JOINT */}
    <motion.g
      animate={{ rotate: [0, -110, -100, -110, 0, -110, -100, -110, 0] }}
      transition={{
        duration: 4,
        repeat: Infinity,
        repeatDelay: 8,
        times: [0, 0.1, 0.3, 0.4, 0.45, 0.55, 0.75, 0.85, 0.9],
      }}
      style={{ transformOrigin: "35px 118px" }}
    >
      <path
        d="M35 118 Q20 145 45 145"
        stroke="#432c23"
        strokeWidth="7"
        fill="white"
        strokeLinecap="round"
      />
      <circle cx="35" cy="118" r="4" fill="white" />
      <circle cx="45" cy="145" r="8" fill="white" stroke="#432c23" strokeWidth="2.5" />
      <circle cx="43" cy="143" r="1.5" fill="#ffb8b8" />
      <circle cx="47" cy="143" r="1.5" fill="#ffb8b8" />
      <circle cx="45" cy="147" r="1.5" fill="#ffb8b8" />
    </motion.g>

    {/* Right Arm - Resting - HIGH SHOULDER */}
    <g>
      <path
        d="M125 118 Q140 145 115 145"
        stroke="#432c23"
        strokeWidth="7"
        fill="white"
        strokeLinecap="round"
      />
      <circle cx="125" cy="118" r="4" fill="white" />
      <circle cx="115" cy="145" r="8" fill="white" stroke="#432c23" strokeWidth="2.5" />
    </g>

    {/* Floating Hearts */}
    <motion.g
      animate={{ opacity: [0, 1, 0], y: [-30, -80], x: [80, 75, 90] }}
      transition={{ duration: 4, repeat: Infinity, repeatDelay: 8, delay: 0.2 }}
    >
      <text x="0" y="0" fontSize="18">
        💕
      </text>
    </motion.g>
    <motion.g
      animate={{ opacity: [0, 1, 0], y: [0, -55], x: [0, 15, -15] }}
      transition={{ duration: 4, repeat: Infinity, repeatDelay: 8, delay: 1.2 }}
    >
      <text x="65" y="75" fontSize="12">
        ❤️
      </text>
    </motion.g>

    {/* Feet with toe beans */}
    <ellipse cx="56" cy="192" rx="14" ry="9" fill="white" stroke="#432c23" strokeWidth="3.5" />
    <circle cx="50" cy="191" r="2" fill="#ffb8b8" />
    <circle cx="56" cy="189" r="2" fill="#ffb8b8" />
    <circle cx="62" cy="191" r="2" fill="#ffb8b8" />
    <ellipse cx="104" cy="192" rx="14" ry="9" fill="white" stroke="#432c23" strokeWidth="3.5" />
    <circle cx="98" cy="191" r="2" fill="#ffb8b8" />
    <circle cx="104" cy="189" r="2" fill="#ffb8b8" />
    <circle cx="110" cy="191" r="2" fill="#ffb8b8" />
  </>
);

const FocusProps = ({ isActive }) => (
  <>
    {/* Improved Laptop/Computer */}
    <g transform="translate(0, 10)">
      <rect
        x="24"
        y="164"
        width="112"
        height="10"
        rx="4"
        fill="#1e293b"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      {/* Keyboard detail */}
      <rect x="30" y="166" width="100" height="2" rx="1" fill="#4ade80" opacity="0.3" />
      <rect x="30" y="170" width="100" height="2" rx="1" fill="#4ade80" opacity="0.2" />

      <rect
        x="34"
        y="132"
        width="92"
        height="32"
        rx="6"
        fill="#334155"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      <rect x="40" y="138" width="80" height="20" rx="3" fill="#0f172a" />

      {isActive && (
        <>
          <rect x="45" y="143" width="30" height="2" rx="1" fill="#4ade80" opacity="0.9" />
          <rect x="45" y="147" width="22" height="2" rx="1" fill="#60a5fa" opacity="0.8" />
          <rect x="45" y="151" width="40" height="2" rx="1" fill="#f472b6" opacity="0.7" />
          <motion.rect
            x="88"
            y="143"
            width="2"
            height="6"
            rx="1"
            fill="#e2e8f0"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.75, repeat: Infinity }}
          />
        </>
      )}
    </g>

    {/* Typing hands - LOCKED TO HIGH SHOULDER (35, 118) */}
    <motion.g
      style={{ transformOrigin: "35px 118px" }}
      animate={isActive ? { rotate: [-5, 12, -5] } : { rotate: 0 }}
      transition={{ duration: 0.15, repeat: Infinity }}
    >
      <path
        d="M35 118 Q20 135 45 142"
        stroke="#432c23"
        strokeWidth="7"
        fill="white"
        strokeLinecap="round"
      />
      <circle cx="35" cy="118" r="4.5" fill="white" />
      <circle cx="45" cy="142" r="8" fill="white" stroke="#432c23" strokeWidth="2.5" />
    </motion.g>
    <motion.g
      style={{ transformOrigin: "125px 118px" }}
      animate={isActive ? { rotate: [5, -12, 5] } : { rotate: 0 }}
      transition={{ duration: 0.18, repeat: Infinity, delay: 0.05 }}
    >
      <path
        d="M125 118 Q140 135 115 142"
        stroke="#432c23"
        strokeWidth="7"
        fill="white"
        strokeLinecap="round"
      />
      <circle cx="125" cy="118" r="4.5" fill="white" />
      <circle cx="115" cy="142" r="8" fill="white" stroke="#432c23" strokeWidth="2.5" />
    </motion.g>

    <ellipse cx="56" cy="192" rx="14" ry="9" fill="white" stroke="#432c23" strokeWidth="3.5" />
    <ellipse cx="104" cy="192" rx="14" ry="9" fill="white" stroke="#432c23" strokeWidth="3.5" />
  </>
);

const ExerciseArm = ({ side, delay = 0, isActive }) => {
  const liftT = { duration: 0.8, repeat: Infinity, ease: "easeInOut" };
  return (
    <motion.g
      style={{ transformOrigin: side === "left" ? "35px 118px" : "125px 118px" }}
      animate={
        isActive
          ? {
              rotate: side === "left" ? [70, -10, 70] : [-70, 10, -70],
            }
          : { rotate: side === "left" ? 30 : -30 }
      }
      transition={{ ...liftT, delay }}
    >
      <path
        d={side === "left" ? "M35 118 Q20 145 45 148" : "M125 118 Q140 145 115 148"}
        stroke="#432c23"
        strokeWidth="7"
        fill="white"
        strokeLinecap="round"
      />
      <circle cx={side === "left" ? 35 : 125} cy="118" r="3.5" fill="white" />
      <circle
        cx={side === "left" ? 45 : 115}
        cy="148"
        r="8"
        fill="white"
        stroke="#432c23"
        strokeWidth="2.5"
      />
      {/* Dumbbell */}
      <g
        transform={side === "left" ? "translate(45, 148)" : "translate(115, 148)"}
        rotate={side === "left" ? "-10" : "10"}
      >
        <rect x="-2" y="-14" width="4" height="28" rx="2" fill="#475569" />
        <rect x="-12" y="-18" width="24" height="10" rx="3" fill="#1e293b" />
        <rect x="-12" y="8" width="24" height="10" rx="3" fill="#1e293b" />
      </g>
    </motion.g>
  );
};

const ExerciseProps = ({ isActive }) => {
  return (
    <>
      {isActive && (
        <path d="M 18 64 Q 80 90 142 64 L 138 54 Q 80 80 22 54 Z" fill="#38bdf8" opacity="0.9" />
      )}
      <ExerciseArm side="left" isActive={isActive} />
      <ExerciseArm side="right" delay={0.4} isActive={isActive} />

      <ellipse cx="56" cy="192" rx="14" ry="9" fill="white" stroke="#432c23" strokeWidth="3.5" />
      <ellipse cx="104" cy="192" rx="14" ry="9" fill="white" stroke="#432c23" strokeWidth="3.5" />
    </>
  );
};

const PlayProps = ({ isActive }) => {
  const T = { duration: isActive ? 0.6 : 2, repeat: Infinity, ease: "easeInOut" };
  return (
    <>
      {/* Balloon */}
      <motion.g
        animate={isActive ? { y: [0, -15, 0], rotate: [-2, 2, -2] } : { y: [0, -2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M125 118 Q140 100 148 110" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
        <ellipse cx="152" cy="85" rx="18" ry="22" fill="#f472b6" stroke="#db2777" strokeWidth="2" />
        <path d="M152 107 L148 112 L156 112 Z" fill="#f472b6" stroke="#db2777" strokeWidth="1" />
      </motion.g>

      {/* Left Arm - Wave */}
      <motion.g
        style={{ transformOrigin: "35px 118px" }}
        animate={isActive ? { rotate: [70, -30, 70] } : { rotate: 20 }}
        transition={T}
      >
        <path
          d="M35 118 Q20 145 45 148"
          stroke="#432c23"
          strokeWidth="7"
          fill="white"
          strokeLinecap="round"
        />
        <circle cx="35" cy="118" r="4" fill="white" />
        <circle cx="45" cy="148" r="8" fill="white" stroke="#432c23" strokeWidth="2.5" />
      </motion.g>

      {/* Right Arm - Wave */}
      <motion.g
        style={{ transformOrigin: "125px 118px" }}
        animate={isActive ? { rotate: [-70, 30, -70] } : { rotate: -20 }}
        transition={{ ...T, delay: 0.1 }}
      >
        <path
          d="M125 118 Q140 145 115 148"
          stroke="#432c23"
          strokeWidth="7"
          fill="white"
          strokeLinecap="round"
        />
        <circle cx="125" cy="118" r="4" fill="white" />
        <circle cx="115" cy="148" r="8" fill="white" stroke="#432c23" strokeWidth="2.5" />
      </motion.g>

      {/* Happy Feet */}
      <motion.g
        style={{ transformOrigin: "56px 188px" }}
        animate={isActive ? { rotate: [15, -15, 15] } : { rotate: 0 }}
        transition={T}
      >
        <ellipse cx="56" cy="192" rx="14" ry="9" fill="white" stroke="#432c23" strokeWidth="3.5" />
      </motion.g>
      <motion.g
        style={{ transformOrigin: "104px 188px" }}
        animate={isActive ? { rotate: [-15, 15, -15] } : { rotate: 0 }}
        transition={{ ...T, delay: 0.2 }}
      >
        <ellipse cx="104" cy="192" rx="14" ry="9" fill="white" stroke="#432c23" strokeWidth="3.5" />
      </motion.g>
    </>
  );
};

const EatingProps = () => (
  <>
    {/* Left Arm - Eating */}
    <motion.g
      style={{ transformOrigin: "35px 118px" }}
      animate={{ rotate: [-45, 25, -45] }}
      transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M35 118 Q20 100 45 105"
        stroke="#432c23"
        strokeWidth="7"
        fill="white"
        strokeLinecap="round"
      />
      <circle cx="35" cy="118" r="3.5" fill="white" />
      <circle cx="45" cy="105" r="8" fill="white" stroke="#432c23" strokeWidth="2.5" />
    </motion.g>
    {/* Right Arm - Eating */}
    <motion.g
      style={{ transformOrigin: "125px 118px" }}
      animate={{ rotate: [45, -25, 45] }}
      transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M125 118 Q140 100 115 105"
        stroke="#432c23"
        strokeWidth="7"
        fill="white"
        strokeLinecap="round"
      />
      <circle cx="125" cy="118" r="3.5" fill="white" />
      <circle cx="115" cy="105" r="8" fill="white" stroke="#432c23" strokeWidth="2.5" />
    </motion.g>
    <ellipse cx="56" cy="192" rx="14" ry="9" fill="white" stroke="#432c23" strokeWidth="3.5" />
    <ellipse cx="104" cy="192" rx="14" ry="9" fill="white" stroke="#432c23" strokeWidth="3.5" />
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

  // QA: Reuse AudioContext to prevent memory leaks/browser limits
  const audioCtxRef = useRef(null);
  const playJingle = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(1400, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        try {
          o.stop();
        } catch (e) {}
      }, 400);
    } catch (e) {
      console.warn("Audio jingle failed:", e);
    }
  };

  let catPropsElem;
  if (isFeeding) catPropsElem = <EatingProps />;
  else if (!isActive) catPropsElem = <IdleProps />;
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
          y:
            isActive && mode === "longBreak"
              ? [0, -8, -12, -14, -12, -8, 0, 8, 12, 14, 12, 8, 0]
              : isActive
                ? [0, -9, 0]
                : [0, -5, 0, -3, 0],
          x:
            isActive && mode === "longBreak"
              ? [0, 40, 80, 120, 140, 120, 80, 40, 0, -40, -80, -120, -140, -120, -80, -40, 0]
              : 0,
        }}
        transition={{
          y: {
            duration: isActive ? (mode === "longBreak" ? 6.0 : 0.75) : 3.8,
            repeat: Infinity,
            ease: "easeInOut",
          },
          x:
            isActive && mode === "longBreak"
              ? { duration: 6.0, repeat: Infinity, ease: "easeInOut" }
              : undefined,
        }}
        className="relative"
      >
        <motion.div
          animate={{
            scaleX: isActive ? [1, 0.7, 1] : [0.85, 0.9, 0.85],
            opacity: isActive ? [0.18, 0.04, 0.18] : [0.08, 0.13, 0.08],
          }}
          transition={{ duration: isActive ? 0.75 : 3.8, repeat: Infinity }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black blur-md"
          style={{ width: 110, height: 10 }}
        />

        <motion.div
          animate={
            isActive && mode === "focus"
              ? { rotate: [-1, 1, -1] }
              : !isActive
                ? {
                    rotate: [0, 5, 3, 5, 0, 5, 3, 5, 0], // Tilting head during lick
                    scale: happiness > 90 ? [1, 1.02, 1] : 1,
                  }
                : mode === "shortBreak" && isActive
                  ? { y: [0, -5, 0], rotate: [-3, 3, -3], scale: [1, 1.05, 1] } // Heavy lifting exertion
                  : { rotate: 0 }
          }
          transition={{
            duration: isActive && mode === "focus" ? 1.4 : !isActive ? 4 : 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: !isActive ? (happiness > 90 ? 0 : 8) : 0,
            times: !isActive ? [0, 0.1, 0.3, 0.4, 0.45, 0.55, 0.75, 0.85, 0.9] : undefined,
          }}
        >
          <svg
            viewBox="0 0 160 215"
            style={{ width: 240, height: 322 }}
            className="drop-shadow-2xl overflow-visible"
          >
            {/* 1. Tail goes behind everything */}
            <motion.path
              d="M125 170 Q160 180 145 210"
              stroke="#432c23"
              strokeWidth="3.5"
              fill="white"
              strokeLinecap="round"
              animate={{
                d: isActive
                  ? [
                      "M125 170 Q160 180 145 210",
                      "M125 170 Q170 190 140 220",
                      "M125 170 Q155 175 148 205",
                    ]
                  : [
                      "M125 170 Q155 185 145 210",
                      "M125 170 Q165 190 142 215",
                      "M125 170 Q155 185 145 210",
                    ],
              }}
              transition={{ duration: isActive ? 1.0 : 3.0, repeat: Infinity, ease: "easeInOut" }}
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
            {/* 3. Limbs (Arms/Legs) -> Drawn UNDER the head but OVER body */}
            {!isActive && catPropsElem}

            <CatHead showHachimaki={mode === "focus" && isActive} happiness={happiness} />

            {/* If active, props go OVER head (like computer) */}
            {isActive && catPropsElem}

            {/* 4. Face and Tongue -> Drawn OVER the paw for perfect lick sync */}
            <CatFaceBase
              mode={mode}
              isActive={isActive}
              isFeeding={isFeeding}
              happiness={happiness}
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

// ─── Confetti Burst ───────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  "#FF4B4B",
  "#58CC02",
  "#1CB0F6",
  "#FFC800",
  "#CE82FF",
  "#f472b6",
  "#fb923c",
];
const CONFETTI_PARTICLES = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  angle: (i / 32) * 360 + (Math.random() * 15 - 7),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  dist: 90 + ((i * 37) % 80),
  size: 5 + ((i * 11) % 8),
  shape: i % 3 === 0 ? "circle" : "rect",
}));

const WaterReminderToast = ({ onDismiss }) => (
  <motion.div
    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-2 border-blue-200 dark:border-blue-500/40 shadow-2xl rounded-3xl px-6 py-4"
    initial={{ y: 100, opacity: 0, scale: 0.85 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    exit={{ y: 100, opacity: 0, scale: 0.85 }}
    transition={{ type: "spring", stiffness: 300, damping: 24 }}
  >
    <motion.div
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 1.4, repeat: Infinity }}
      className="text-3xl shrink-0"
    >
      💧
    </motion.div>
    <div className="flex flex-col">
      <p className="text-sm font-bold text-blue-700 dark:text-blue-200">
        Đã đến lúc uống nước rồi đó!
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-300">
        Giữ nước cho não khoẻ, học tốt hơn nhé!
      </p>
    </div>
    <button
      onClick={onDismiss}
      className="ml-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-black rounded-2xl transition-all shrink-0"
    >
      OK 👍
    </button>
  </motion.div>
);

const ConfettiBurst = ({ onDone }) => (
  <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
    {CONFETTI_PARTICLES.map(p => (
      <motion.div
        key={p.id}
        className={p.shape === "circle" ? "absolute rounded-full" : "absolute rounded-sm"}
        style={{ width: p.size, height: p.size, background: p.color, top: "50%", left: "50%" }}
        initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
        animate={{
          x: Math.cos((p.angle * Math.PI) / 180) * p.dist,
          y: Math.sin((p.angle * Math.PI) / 180) * p.dist - 60,
          opacity: 0,
          rotate: p.angle * 4,
          scale: 0.3,
        }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        onAnimationComplete={p.id === 0 ? onDone : undefined}
      />
    ))}
    <motion.div
      className="absolute text-6xl"
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: [0, 1.6, 1.2, 0], opacity: [1, 1, 1, 0] }}
      transition={{ duration: 1.6 }}
    >
      🎉
    </motion.div>
    <motion.div
      className="fixed top-1/3 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-2 border-[#58CC02]/40 shadow-2xl rounded-3xl px-8 py-5 flex flex-col items-center gap-2 text-center z-10"
      initial={{ scale: 0.5, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
    >
      <span className="text-3xl">🏆</span>
      <p className="text-base font-black text-slate-800 dark:text-white">Pomodoro hoàn thành!</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
        +1 🍱 cho Buddy • +10% Mood
      </p>
    </motion.div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const PomodoroPage = () => {
  // Read saved timer state ONCE during initial render (no effects = no race conditions)
  const [_saved] = useState(() => {
    try {
      const raw = localStorage.getItem("pomodoro-timer-state");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Hiệu ứng visual chuông rung khi bắt đầu
  const [showBell, setShowBell] = useState(false);
  const [mode, setMode] = useState(_saved.mode || "focus");
  // Restore isActive from saved state so background mini widget sessions continue seamlessly
  const [isActive, setIsActive] = useState(() => {
    if (_saved.isActive && typeof _saved.savedAt === "number") {
      // Only auto-resume if saved recently (within 30 minutes)
      const elapsed = (Date.now() - _saved.savedAt) / 1000;
      return elapsed < 30 * 60;
    }
    return false;
  });
  // Turn logic
  const [turns, setTurns] = useState([]); // [{duration: 50*60}, ...]
  const [currentTurnIdx, setCurrentTurnIdx] = useState(_saved.currentTurnIdx ?? 0);
  const [turnTimeLeft, setTurnTimeLeft] = useState(() => {
    if (typeof _saved.turnTimeLeft === "number" && _saved.turnTimeLeft > 0) {
      // Timer was running → subtract elapsed time since last save
      if (_saved.isActive && typeof _saved.savedAt === "number") {
        const elapsed = Math.floor((Date.now() - _saved.savedAt) / 1000);
        return Math.max(0, _saved.turnTimeLeft - elapsed);
      }
      // Timer was paused → exact value
      return _saved.turnTimeLeft;
    }
    return 25 * 60; // Default focus time
  });
  // Removed redundant 'timeLeft' state - using 'turnTimeLeft' universally
  const [soundConfig, setSoundConfig] = useState({ type: null, id: null });
  const [customYtUrl, setCustomYtUrl] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [activeTrackTitle, setActiveTrackTitle] = useState("");

  // Global Store Access
  const updatePomodoroData = useUserStore(s => s.updatePomodoroData);
  const account = useUserStore(s => s.account);
  const userStore = useUserStore();
  const bookmarkStore = useBookmarkStore();

  const initialPomodoro = account?.pomodoro || {};

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
    // Chia mục tiêu thành các turn (đều là giây)
    const totalSeconds = targetGoal * 60;
    const numTurns = Math.ceil(totalSeconds / turnDuration);
    const turnsArr = Array.from({ length: numTurns }, (_, i) => {
      const remain = totalSeconds - i * turnDuration;
      return { duration: remain >= turnDuration ? turnDuration : remain };
    });
    setTimeout(() => {
      setTurns(turnsArr);
      // Only reset if targetGoal or turnDuration actually changed from saved values
      // (on reload they match → keep restored state; on manual change → reset)
      if (_saved.targetGoal === targetGoal && _saved.turnDuration === turnDuration) {
        if (turnTimeLeft === 0) setTurnTimeLeft(turnsArr[currentTurnIdx]?.duration || turnDuration);
        return;
      }
      setCurrentTurnIdx(0);
      setTurnTimeLeft(turnsArr[0]?.duration || 0);
    }, 0);
    // Do NOT reset Focus Today here
  }, [targetGoal, turnDuration, _saved.targetGoal, _saved.turnDuration]);

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
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "pomodoro-timer-state") {
        try {
          const p = JSON.parse(e.newValue);
          if (p) {
            if (typeof p.turnTimeLeft === 'number') setTurnTimeLeft(p.turnTimeLeft);
            if (typeof p.isActive === 'boolean') setIsActive(p.isActive);
            if (p.mode) setMode(p.mode);
            if (typeof p.currentTurnIdx === 'number') setCurrentTurnIdx(p.currentTurnIdx);
          }
        } catch(err) {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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

  // Timer tick for turns - OPTIMIZED
  useEffect(() => {
    let interval;
    if (isActive && turns.length > 0 && turnTimeLeft > 0) {
      const startTime = Date.now();
      const initialTimeLeft = turnTimeLeft;

      interval = setInterval(() => {
        setTurnTimeLeft(prev => {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          const next = Math.max(0, initialTimeLeft - elapsedSeconds);

          if (next >= 0) {
            const timerState = {
              turnTimeLeft: next,
              currentTurnIdx,
              isActive,
              mode,
              savedAt: Date.now(),
              targetGoal,
              turnDuration,
            };
            localStorage.setItem("pomodoro-timer-state", JSON.stringify(timerState));
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, turns.length, currentTurnIdx, targetGoal, turnDuration, turnTimeLeft]); // Added turnTimeLeft to dependencies to properly capture initialTimeLeft

  // Trigger turn completion when time hits 0
  useEffect(() => {
    if (isActive && turns.length > 0 && turnTimeLeft === 0) {
      new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3")
        .play()
        .catch(() => {});

      setTimeout(() => {
        // 1. If it was FOCUS mode, increment sessions and minutes
        if (mode === "focus") {
          const finishedDuration = turns[currentTurnIdx]?.duration || 0;
          const finishedMinutes = Math.round(finishedDuration / 60);

          setSessions(s => s + 1);
          setTotalFocusMinutes(prev => prev + finishedMinutes);

          // Use latest store data to avoid stale initialPomodoro bug
          const currentTotal = useUserStore.getState().account?.pomodoro?.totalFocusMinutes || 0;
          const currentSessions = useUserStore.getState().account?.pomodoro?.totalSessions || 0;

          updatePomodoroData({
            totalSessions: currentSessions + 1,
            lastSessionDate: new Date().toISOString(),
            totalFocusMinutes: currentTotal + finishedMinutes,
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
        const syncData = collectSyncData(userStore, bookmarkStore);
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
    try {
      let existing = {};
      const raw = localStorage.getItem("pomodoro-timer-state");
      if (raw) existing = JSON.parse(raw);
      localStorage.setItem("pomodoro-timer-state", JSON.stringify({
        ...existing,
        turnTimeLeft: time,
        currentTurnIdx,
        isActive: active,
        mode: m,
        savedAt: Date.now(),
        targetGoal,
        turnDuration,
      }));
    } catch(e) {}
    // Nếu active (Start) thì hiện mini, nếu pause từ Tab thì ẩn mini
    updatePomodoroData({ timeLeft: time, isActive: active, mode: m, showMini: active });
  };

  const toggleTimer = () => {
    if (!isActive) {
      if (turnTimeLeft > 0) {
        setIsActive(true);
        persistTimerState(true, turnTimeLeft, mode);
      } else {
        setCurrentTurnIdx(0);
        const freshTime = turns[0]?.duration || turnDuration;
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
    setMode(m);
    const time = getSmartDuration(m);
    setTurnTimeLeft(time);
    setIsActive(false);
    updatePomodoroData({ timeLeft: time, isActive: false, mode: m, showMini: false });
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
              <div className="mt-4 sm:mt-6 flex flex-col items-center w-full max-w-[280px] sm:max-w-xs px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase mb-1">
                  Chọn thời lượng mỗi turn
                </span>
                <div className="w-full flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">15</span>
                  <input
                    type="range"
                    min={15 * 60}
                    max={120 * 60}
                    step={5 * 60}
                    value={turnDuration}
                    onChange={e => setTurnDuration(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[11px] font-bold text-slate-400">120</span>
                </div>
                <div className="mt-1 text-[12px] font-bold text-amber-600">
                  {Math.round(turnDuration / 60)} phút / turn
                </div>
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

        <div className={`${soundPanelOpen ? "block" : "hidden"} xl:block`}>
          <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 flex-1">
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
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 space-y-4 border border-slate-100 dark:border-slate-700/50">
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
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>
                    {`${Math.floor(targetGoal / 60)}h ${String(targetGoal % 60).padStart(2, "0")}m`}
                  </span>
                  <span>Mục tiêu: {targetGoal} phút</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
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

            <hr className="border-slate-100 dark:border-slate-700" />

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

            <hr className="border-slate-100 dark:border-slate-700" />

            {/* YouTube Lofi Section */}
            <div className="space-y-3">
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
                      className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
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

            <hr className="border-slate-100 dark:border-slate-700" />

            {/* Nature Sounds */}
            <div className="space-y-3">
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
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2.5 ${
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
          className={`${soundPanelOpen ? "block" : "hidden"} xl:block p-4 border-t border-slate-100 dark:border-slate-700 cursor-pointer group`}
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
