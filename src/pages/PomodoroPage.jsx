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
import { StudyBuddy, PixelOffice, FloatingBooks } from "../components/pomodoro/PomodoroCat";
import { ConfettiBurst } from "../components/ui/ConfettiBurst";
import { WaterReminderToast } from "../components/WaterReminderProvider";

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
  const [turnTimeLeft, setTurnTimeLeft] = useState(
    initialPomodoro.timeLeft || MODES[initialPomodoro.mode || "focus"]?.time || 25 * 60
  );

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
    initialPomodoro.turnDuration || getDefaultTurnDuration(initialPomodoro.targetGoal ?? 120)
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
      if (p.turnDuration !== undefined) setTurnDuration(p.turnDuration);
      
      // We don't auto-resume timer from Nhost to avoid jumpy behavior if synced from another tab
      // But we set proper initial time if it exists
      if (p.timeLeft !== undefined) setTurnTimeLeft(p.timeLeft);
      else setTurnTimeLeft(MODES[p.mode || "focus"]?.time || 25 * 60);
      
      hasInitedRef.current = true;
    }
  }, [account?.pomodoro]);

  // Tự động cập nhật turnDuration mặc định khi targetGoal thay đổi (chỉ khi chưa có giá trị hoặc targetGoal đổi lớn)
  useEffect(() => {
    // Chỉ auto-adjust nếu targetGoal thay đổi đáng kể (VD: từ 120 sang 240) 
    // và không ghi đè nếu user đã chỉnh tay (localState match default của goal hiện tại)
    const currentDefault = getDefaultTurnDuration(targetGoal);
    if (!initialPomodoro.turnDuration) {
       setTurnDuration(currentDefault);
    }
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
            const newDuration = getSmartDuration(nextMode);
            setMode(nextMode);
            setTurnTimeLeft(newDuration);
            // Push updated mode & time to global store so Mini catches it
            updatePomodoroData({
                mode: nextMode,
                timeLeft: newDuration,
                isActive: true
            });
            // Keep isActive true for auto-start
          } else {
            setIsActive(false);
            updatePomodoroData({ isActive: false, timeLeft: 0 });
          }
        }
        // 2. If it was BREAK mode, go back to FOCUS
        else {
          if (autoCycle && currentTurnIdx + 1 < turns.length) {
            const nextDuration = turns[currentTurnIdx + 1].duration;
            setCurrentTurnIdx(idx => idx + 1);
            setMode("focus");
            setTurnTimeLeft(nextDuration);
            updatePomodoroData({
               mode: "focus",
               timeLeft: nextDuration,
               currentTurnIdx: currentTurnIdx + 1,
               isActive: true
            });
          } else {
            setIsActive(false);
            updatePomodoroData({ isActive: false, timeLeft: 0 });
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
        audio.volume = 1;
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
                    <span className="text-6xl sm:text-7xl">🔔</span>
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
                            const newTime = Math.max(0, turnTimeLeft + diff);
                            setTurnTimeLeft(newTime);
                            updatePomodoroData({ turnDuration: val, timeLeft: newTime });
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
