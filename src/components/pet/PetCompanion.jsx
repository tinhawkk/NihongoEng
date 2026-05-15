import React, { useEffect, useRef, useState } from "react";
import { sounds } from "../../utils/sounds";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/useUserStore";
import { getDueItems } from "../../utils/srsUtils";
import { calculateCurrentStreak } from "../../utils/streakUtils";
import "./PetCompanion.css";

const STORAGE_KEY = "pet-companion-state-v1";
const PET_NAME = "Mochi";
const FEED_AMOUNT = 24;
const XP_PER_FEED = 12;
const XP_PER_LEVEL = 100;
const HUNGER_DECAY_PER_MIN = 0.12;
const TICK_INTERVAL_MS = 15000;

// Local fox sprites
import idleFox from "../../assets/pets/fox/red_idle_8fps.gif";
import walkFox from "../../assets/pets/fox/red_walk_8fps.gif";
import runFox from "../../assets/pets/fox/red_run_8fps.gif";
import lieFox from "../../assets/pets/fox/red_lie_8fps.gif";
import swipeFox from "../../assets/pets/fox/red_swipe_8fps.gif";
import walkFastFox from "../../assets/pets/fox/red_walk_fast_8fps.gif";
import withBallFox from "../../assets/pets/fox/red_with_ball_8fps.gif";

const SPRITES = {
  idle: idleFox,
  walk: walkFox,
  run: runFox,
  lie: lieFox,
  swipe: swipeFox,
  walk_fast: walkFastFox,
  with_ball: withBallFox,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const getMood = (hunger) => {
  if (hunger <= 10) return "starving";
  if (hunger <= 35) return "hungry";
  if (hunger <= 70) return "okay";
  return "happy";
};

// Cáo là loài crepuscular (hoạt động mạnh lúc chạng vạng và bình minh).
// Chúng ngủ thường xuyên vào buổi trưa và giữa đêm, kèm những giấc ngủ ngắn.
const isFoxSleepTime = () => {
  const h = new Date().getHours();
  return (h >= 11 && h < 14) || (h >= 1 && h < 4);
};

const loadState = () => {
  const now = Date.now();
  const fallback = {
    hunger: 80,
    energy: 100,
    isResting: false,
    xp: 0,
    level: 1,
    bornAt: now,
    soundEnabled: true,
    isWandering: true,
    lastTick: now,
  };
  if (typeof window === "undefined") return { stats: fallback, pos: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stats: fallback, pos: null };
    const saved = JSON.parse(raw);
    const lastTick = typeof saved.lastTick === "number" ? saved.lastTick : now;
    const elapsed = Math.max(0, (now - lastTick) / 60000);
    const hunger = clamp(
      (typeof saved.hunger === "number" ? saved.hunger : fallback.hunger) -
        elapsed * HUNGER_DECAY_PER_MIN,
      0,
      100
    );

    let energy = typeof saved.energy === "number" ? saved.energy : fallback.energy;
    let isResting = typeof saved.isResting === "boolean" ? saved.isResting : fallback.isResting;
    
    if (isFoxSleepTime()) {
       energy = clamp(energy + elapsed * 2, 0, 100);
       isResting = false;
    } else if (isResting) {
       energy = clamp(energy + elapsed * 2, 0, 100);
       if (energy >= 100) isResting = false;
    } else {
       energy = clamp(energy - elapsed * 0.5, 0, 100);
       if (energy <= 0) isResting = true;
    }

    const stats = {
      ...fallback,
      ...saved,
      hunger,
      energy,
      isResting,
      lastTick: now,
      bornAt: typeof saved.bornAt === "number" ? saved.bornAt : fallback.bornAt,
    };
    const pos =
      saved && saved.pos &&
      typeof saved.pos.x === "number" &&
      typeof saved.pos.y === "number"
        ? saved.pos
        : null;
    return { stats, pos };
  } catch {
    return { stats: fallback, pos: null };
  }
};

export const PetCompanion = () => {
  const initRef = useRef(null);
  if (!initRef.current) initRef.current = loadState();

  const [stats, setStats] = useState(initRef.current.stats);
  const [facing, setFacing] = useState("right");
  const [isEating, setIsEating] = useState(false);
  const [status, setStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showHud, setShowHud] = useState(false);
  const [spriteState, setSpriteState] = useState("idle");

  const navigate = useNavigate();
  const userStore = useUserStore();
  const prevQuizzes = useRef(userStore.account?.totalQuizzes || 0);
  const srsCountRef = useRef(0);

  useEffect(() => {
    srsCountRef.current = getDueItems(userStore.account?.srsData || {}).length;
  }, [userStore.account?.srsData]);

  // Handle Age Reset when Streak drops to 0 (i.e. missed a day)
  useEffect(() => {
    const dates = userStore.account?.activityLog || [];
    const currentStreak = calculateCurrentStreak(dates);
    const now = Date.now();
    
    // If streak is broken AND the pet is older than 24 hours, Reset it!
    if (currentStreak === 0 && now - stats.bornAt > 24 * 60 * 60 * 1000) {
      setStats(s => ({
        ...s,
        bornAt: now,
        level: 1,
        xp: 0,
        hunger: 80,
        energy: 100,
        lastTick: now
      }));
      setStatus("Tôi đã được tái sinh vì bạn lười biếng bỏ học! 😭");
    }
  }, [userStore.account?.activityLog, stats.bornAt]);

  useEffect(() => {
    const currentQuizzes = userStore.account?.totalQuizzes || 0;
    if (currentQuizzes > prevQuizzes.current) {
        setStats(s => {
          let xp = s.xp + Math.max(20, (currentQuizzes - prevQuizzes.current) * XP_PER_FEED);
          let level = s.level;
          while (xp >= XP_PER_LEVEL) { xp -= XP_PER_LEVEL; level++; }
          return { ...s, hunger: clamp(s.hunger + 40, 0, 100), xp, level, lastTick: Date.now() };
        });
        spriteRef.current = "run";
        lastSpriteSwitch.current = performance.now();
        setSpriteState("run");
        setStatus("Yeah! No bụng rồi!");
        sounds?.playCorrect?.();
        prevQuizzes.current = currentQuizzes;
    }
  }, [userStore.account?.totalQuizzes]);

  // Proactive Study Reminders
  useEffect(() => {
    const tipInterval = setInterval(() => {
      const isSleepingNow = isFoxSleepTime() || statsRef.current?.isResting;
      const moodNow = getMood(statsRef.current?.hunger ?? 100);
      
      // Only remind if awake, not starving, and currently no status bubble
      if (!isSleepingNow && moodNow !== "starving" && moodNow !== "hungry" && !statusTimer.current) {
        const srsCount = srsCountRef.current || 0;
        const tips = [
          "Eh, ôn từ vựng thẻ Flashcard đi nè! 🦊",
          "Vô Đấu Trường 60s cày point đi!",
          srsCount > 0 ? `Ê, đang có ${srsCount} từ chờ ôn trong mục Flashcards kìa!` : "Hôm nay bạn học thêm từ tập nào chưa?",
          "Lướt qua lướt lại hoài, lo click vô bài học đi!",
          "Tui đang sung sức nè, vô học kiếm XP đi bạn êi!"
        ];
        const tip = tips[Math.floor(Math.random() * tips.length)];
        setStatus(tip);
        statusTimer.current = setTimeout(() => setStatus(""), 5000);
      }
    }, 25000); // Trigger every 25 seconds
    return () => clearInterval(tipInterval);
  }, []);

  const petRef = useRef(null);
  const posRef = useRef({ x: 120, y: 140 });
  const walkState = useRef({ mode: "idle", waitTill: 0, target: null, idleSprite: "idle" });
  const laneYRef = useRef(null);
  const bobRef = useRef(0);
  const statsRef = useRef(stats);
  const statusTimer = useRef(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, startY: 0 });
  const ptrOffset = useRef({ x: 0, y: 0 });
  const lastT = useRef(0);
  const nextTurn = useRef(0);
  const wakeUntilRef = useRef(0);
  const petSize = useRef({ w: 100, h: 100 });
  const vp = useRef({
    w: typeof window !== "undefined" ? window.innerWidth : 1024,
    h: typeof window !== "undefined" ? window.innerHeight : 768,
  });
  const facingRef = useRef("right");
  const spriteRef = useRef("idle");
  const lastSpriteSwitch = useRef(0);

  useEffect(() => { statsRef.current = stats; }, [stats]);

  const mood = getMood(stats.hunger);
  const isSleeping = isFoxSleepTime() || stats.isResting;
  const hungerPct = clamp(Math.round(stats.hunger), 0, 100);
  const xpPct = clamp(Math.round((stats.xp / XP_PER_LEVEL) * 100), 0, 100);
  const energyPct = clamp(Math.round(stats.energy ?? 100), 0, 100);
  
  const ageMs = Date.now() - stats.bornAt;
  const ageInDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const ageInHours = Math.floor(ageMs / (1000 * 60 * 60));
  const ageInMins = Math.floor(ageMs / (1000 * 60));
  const ageDisplay = ageInDays > 0 ? `${ageInDays}d` : ageInHours > 0 ? `${ageInHours}h` : `${ageInMins}m`;

  let bubble = status;
  if (!bubble) {
    if (isSleeping) {
      if (mood === "starving" || mood === "hungry") {
        bubble = "Làm quiz đi... tui đói quá 😭";
      } else if (Math.random() < 0.05) {
        bubble = "Khò khò... zZz";
      }
    } else {
      bubble = mood === "starving" ? "😿 Đói lả! Làm bài đi!" : mood === "hungry" ? "🍖 Đói bụng! Vào quiz ngay!" : "";
    }
  }

  const persist = (s, pos) => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, pos })); } catch {}
  };

  useEffect(() => { persist(stats, posRef.current); }, [stats]);

  const showStatus = (text, duration = 1500) => {
    if (!text) return;
    setStatus(text);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), duration);
  };

  const playMeow = () => {
    if (!statsRef.current.soundEnabled) return;
    sounds.playBeep(660, 80, 0.08);
    setTimeout(() => sounds.playBeep(520, 130, 0.08), 80);
    setTimeout(() => sounds.playBeep(440, 120, 0.06), 160);
  };

  const applyTransform = () => {
    const el = petRef.current;
    if (!el) return;
    const y = posRef.current.y + bobRef.current;
    el.style.transform = `translate3d(${Math.round(posRef.current.x)}px,${Math.round(y)}px,0)`;
  };

  const updateSize = () => {
    const el = petRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0) petSize.current = { w: r.width, h: r.height };
  };

  const getBounds = () => {
    const { w, h } = vp.current;
    const { w: pw, h: ph } = petSize.current;
    const edge = 8;
    return {
      minX: edge, minY: edge,
      maxX: Math.max(edge, w - pw - edge),
      maxY: Math.max(edge, h - ph - (w < 1024 ? 88 : 16)),
    };
  };

  const clampPos = () => {
    const b = getBounds();
    posRef.current = {
      x: clamp(posRef.current.x, b.minX, b.maxX),
      y: clamp(posRef.current.y, b.minY, b.maxY),
    };
  };

  // ── Actions ──────────────────────────────────────────────
  const handleFeed = () => {
    navigate("/quiz");
    setShowHud(false);
  };

  const toggleSound = () => {
    setStats((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
    showStatus(statsRef.current.soundEnabled ? "🔇 Muted" : "🔊 Sound on");
  };

  const toggleWander = () => {
    const next = !statsRef.current.isWandering;
    statsRef.current = { ...statsRef.current, isWandering: next };
    setStats((prev) => ({ ...prev, isWandering: next }));
    if (!next) {
      const s = "lie";
      spriteRef.current = s; 
      lastSpriteSwitch.current = lastT.current || performance.now();
      setSpriteState(s);
      showStatus("😴 Staying...");
    } else {
      showStatus("🐾 Wandering!");
      walkState.current = { mode: "idle", waitTill: 0, target: null, idleSprite: "idle" };
    }
  };

  const handlePetClick = () => {
    if (!showHud) setShowHud(true);
    
    const isSleepingNow = isFoxSleepTime() || statsRef.current.isResting;
    if (isSleepingNow) {
      if (!isFoxSleepTime()) {
        setStats(s => ({ ...s, isResting: false, energy: Math.max(s.energy || 0, 30) }));
        showStatus("Tỉnh rồi! Làm bài đi cha nội ơi ngủ xíu cũng hông yên 😭", 3000);
      } else {
        showStatus("Khò khò... zZz...");
      }
      return;
    }

    showStatus("❤️ Yêu bạn!");
    
    if (statsRef.current.isWandering) {
      walkState.current = { 
        mode: "idle", 
        waitTill: (lastT.current || performance.now()) + 2000, 
        target: null, 
        idleSprite: "with_ball" 
      };
    }
    
    spriteRef.current = "with_ball";
    lastSpriteSwitch.current = performance.now();
    setSpriteState("with_ball");
    playMeow();
  };

  // ── Drag ─────────────────────────────────────────────────
  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    if (Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY) > 5)
      dragRef.current.moved = true;
    const b = getBounds();
    posRef.current = {
      x: clamp(e.clientX - ptrOffset.current.x, b.minX, b.maxX),
      y: clamp(e.clientY - ptrOffset.current.y, b.minY, b.maxY),
    };
    bobRef.current = 0;
    applyTransform();
  };

  const onPointerUp = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setIsDragging(false);
    document.body.classList.remove("pet-dragging");
    laneYRef.current = posRef.current.y;
    window.removeEventListener("pointermove", onPointerMove);
    if (!dragRef.current.moved) {
      handlePetClick();
    } else {
      if (statsRef.current.isWandering) {
        walkState.current = { mode: "idle", waitTill: (lastT.current || performance.now()) + 2000, target: null, idleSprite: "idle" };
      }
    }
    
    // Set wake timer for 4 seconds if dropping while it should be sleeping
    const isSleepingNow = isFoxSleepTime() || statsRef.current.isResting;
    if (isSleepingNow) {
      wakeUntilRef.current = performance.now() + 4000;
      spriteRef.current = "idle";
      lastSpriteSwitch.current = performance.now();
      setSpriteState("idle");
      showStatus("Ngó gì mà ngó? Qua kia làm bài liền đi!! 😾", 4000);
      
      // If it's just exhausted (not real sleep time), aggressively wake it up
      if (!isFoxSleepTime()) {
        setStats(s => ({ ...s, isResting: false, energy: Math.max(s.energy || 0, 30) }));
      }
    }

    persist(statsRef.current, posRef.current);
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const el = petRef.current;
    if (!el) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    dragRef.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY };
    ptrOffset.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    setIsDragging(true);
    document.body.classList.add("pet-dragging");
    
    // Unconditionally change sprite to swipe when grabbed
    spriteRef.current = "swipe";
    lastSpriteSwitch.current = performance.now();
    setSpriteState("swipe");
    
    // Scold if dragged while sleeping
    const isSleepingNow = isFoxSleepTime() || statsRef.current.isResting;
    if (isSleepingNow) {
      showStatus("Phá giấc tui làm gì? Rảnh thì đi học bài đi! 😡", 4000);
    }

    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };

  // ── Mount / Resize ────────────────────────────────────────
  useEffect(() => {
    const savedPos = initRef.current.pos;
    posRef.current = savedPos ?? { x: Math.max(20, vp.current.w * 0.65), y: Math.max(40, vp.current.h * 0.55) };
    laneYRef.current = posRef.current.y;
    updateSize(); clampPos(); applyTransform();
  }, []);

  useEffect(() => {
    const onResize = () => {
      vp.current = { w: window.innerWidth, h: window.innerHeight };
      updateSize(); clampPos(); applyTransform();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Hunger tick ───────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setStats((prev) => {
        const now = Date.now();
        const elapsed = Math.max(0, (now - (prev.lastTick || now)) / 60000);
        if (elapsed <= 0) return prev;
        
        let newEnergy = prev.energy ?? 100;
        let resting = prev.isResting ?? false;

        if (isFoxSleepTime()) {
           newEnergy = clamp(newEnergy + elapsed * 2, 0, 100);
        } else if (resting) {
           newEnergy = clamp(newEnergy + elapsed * 2, 0, 100);
           if (newEnergy >= 100) resting = false;
        } else {
           newEnergy = clamp(newEnergy - elapsed * 0.5, 0, 100);
           if (newEnergy <= 0) resting = true;
        }
        
        return { 
          ...prev, 
          hunger: clamp(prev.hunger - elapsed * HUNGER_DECAY_PER_MIN, 0, 100), 
          energy: newEnergy, 
          isResting: resting, 
          lastTick: now 
        };
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ── RAF movement loop ─────────────────────────────────────
  useEffect(() => {
    let raf;
    const step = (now) => {
      if (!petRef.current) { raf = requestAnimationFrame(step); return; }
      if (!lastT.current) lastT.current = now;
      const dt = Math.min(32, now - lastT.current);
      lastT.current = now;

      const h = new Date().getHours();
      const isFoxSleepTimeLoop = (h >= 11 && h < 14) || (h >= 1 && h < 4);
      const isSleepingLoop = isFoxSleepTimeLoop || statsRef.current.isResting;

      if (!dragRef.current.active && isSleepingLoop) {
        if (now < wakeUntilRef.current) {
          // Temporarily awake, just do idle logic here
          bobRef.current = 0;
          applyTransform();
          raf = requestAnimationFrame(step);
          return;
        }

        bobRef.current = 0;
        if (spriteRef.current !== "lie") {
          spriteRef.current = "lie"; 
          lastSpriteSwitch.current = now; 
          setSpriteState("lie");
        }
        applyTransform();
        raf = requestAnimationFrame(step);
        return;
      }

      if (!dragRef.current.active && statsRef.current.isWandering) {
        const hunger = statsRef.current.hunger ?? 0;
        
        if (hunger <= 0) {
          bobRef.current = 0;
          if (now - lastSpriteSwitch.current > 5000) {
            const rand = Math.random();
            let s = "idle";
            if (rand < 0.25) s = "lie";
            else if (rand < 0.5) s = "swipe";
            else if (rand < 0.6) s = "with_ball";
            if (s !== spriteRef.current) {
              spriteRef.current = s; lastSpriteSwitch.current = now; setSpriteState(s);
            }
          }
          applyTransform();
          raf = requestAnimationFrame(step);
          return;
        }

        const b = getBounds();
        const speedFactor = hunger <= 10 ? 0.3 : hunger <= 35 ? 0.6 : 1;
        const bSpeed = 0.06 * speedFactor * dt;

        if (walkState.current.mode === "idle") {
          if (now > walkState.current.waitTill) {
            walkState.current.mode = "moving";
            const b = getBounds();
            const randMode = Math.random();
            
            let nextX = posRef.current.x;
            let nextY = posRef.current.y;

            if (randMode < 0.6) {
              // Mostly horizontal move
              nextX = b.minX + Math.random() * (b.maxX - b.minX);
              nextY = clamp(posRef.current.y + (Math.random() - 0.5) * 100, b.minY, b.maxY);
            } else if (randMode < 0.8) {
              // Small lane shift (mostly vertical)
              nextX = clamp(posRef.current.x + (Math.random() - 0.5) * 150, b.minX, b.maxX);
              nextY = b.minY + Math.random() * (b.maxY - b.minY);
            } else {
              // Full random
              nextX = b.minX + Math.random() * (b.maxX - b.minX);
              nextY = b.minY + Math.random() * (b.maxY - b.minY);
            }

            walkState.current.target = { x: nextX, y: nextY };
          } else {
            bobRef.current = 0;
            if (spriteRef.current !== walkState.current.idleSprite) {
              spriteRef.current = walkState.current.idleSprite;
              setSpriteState(walkState.current.idleSprite);
            }
          }
        } else if (walkState.current.mode === "moving") {
          const target = walkState.current.target;
          const dx = target.x - posRef.current.x;
          const dy = target.y - posRef.current.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 5) {
            walkState.current.mode = "idle";
            walkState.current.waitTill = now + 1500 + Math.random() * 4000;
            // pick a random idle behavior
            const rand = Math.random();
            if (rand < 0.15) walkState.current.idleSprite = "lie";
            else if (rand < 0.3) walkState.current.idleSprite = "swipe";
            else if (rand < 0.4) walkState.current.idleSprite = "with_ball";
            else walkState.current.idleSprite = "idle";
            
            // Randomly say SRS reminder
            if (srsCountRef.current > 0 && Math.random() > 0.5) {
              setStatus(`📚 Có ${srsCountRef.current} từ ôn SRS kìa!`);
              if (statusTimer.current) clearTimeout(statusTimer.current);
              statusTimer.current = setTimeout(() => setStatus(""), 4000);
            }
          } else {
            const moveX = (dx / dist) * bSpeed;
            const moveY = (dy / dist) * bSpeed;
            posRef.current.x += moveX;
            posRef.current.y += moveY;

            laneYRef.current = posRef.current.y;
            clampPos();

            bobRef.current = Math.sin(now / 150) * 1.5;
            const spd = Math.hypot(moveX, moveY) / dt;
            const wantSprite = spd > 0.065 ? "run" : spd > 0.04 ? "walk_fast" : "walk";

            if (spriteRef.current !== wantSprite && now - lastSpriteSwitch.current > 300) {
              spriteRef.current = wantSprite;
              lastSpriteSwitch.current = now;
              setSpriteState(wantSprite);
            }

            const newFacing = dx < 0 ? "left" : "right";
            if (newFacing !== facingRef.current) {
              facingRef.current = newFacing;
              setFacing(newFacing);
            }
          }
        }
        applyTransform();
      } else if (!dragRef.current.active && !statsRef.current.isWandering) {
        // randomly switch idle <-> lie <-> swipe <-> with_ball while staying
        bobRef.current = 0;
        if (now - lastSpriteSwitch.current > 7000) {
          const rand = Math.random();
          let s = "idle";
          if (rand < 0.2) s = "lie";
          else if (rand < 0.4) s = "swipe";
          else if (rand < 0.6) s = "with_ball";

          if (s !== spriteRef.current) {
            spriteRef.current = s; lastSpriteSwitch.current = now; setSpriteState(s);
          }
        }
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Cleanup ───────────────────────────────────────────────
  useEffect(() => () => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    document.body.classList.remove("pet-dragging");
    window.removeEventListener("pointermove", onPointerMove);
  }, []);

  return (
    <>
      {/* ── Pet sprite ── */}
      <div
        ref={petRef}
        className={`pet-companion${stats.isWandering ? " is-wandering" : ""}${isEating ? " is-eating" : ""}${isDragging ? " is-dragging" : ""}`}
        data-mood={mood}
        style={{ "--pet-flip": facing === "left" ? -1 : 1 }}
        onPointerDown={onPointerDown}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlePetClick(); } }}
        role="button"
        tabIndex={0}
        aria-label={`${PET_NAME} the pet`}
      >
        <div className="pet-shadow" />
        <img
          className="pet-sprite-img"
          src={SPRITES[spriteState]}
          alt={PET_NAME}
          draggable={false}
        />
        {bubble ? <div className="pet-bubble">{bubble}</div> : null}
      </div>

      {/* ── HUD ── */}
      <div className={`pet-hud ${!showHud ? "hidden" : ""}`}>
        <div className="pet-hud-header">
          <div className="pet-hud-title">
            <span className="pet-name">🦊 {PET_NAME}</span>
            <span className="pet-level">Lv {stats.level}</span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button className="pet-icon-btn" onClick={toggleSound} type="button" title="Toggle sound">
              {stats.soundEnabled ? "🔊" : "🔇"}
            </button>
            <button className="pet-icon-btn" onClick={() => setShowHud(false)} type="button" title="Hide HUD">
              ❌
            </button>
          </div>
        </div>

        <div className="pet-meta">
          <span>Mood: {mood}</span>
          <span>Age: {ageDisplay}</span>
        </div>

        <div className="pet-bars">
          <div className="pet-bar-row">
            <div className="pet-bar-label">Food</div>
            <div className="pet-bar-track">
              <div className="pet-bar-fill" style={{ width: `${hungerPct}%` }} />
            </div>
          </div>
          <div className="pet-bar-row">
            <div className="pet-bar-label">XP</div>
            <div className="pet-bar-track">
              <div className="pet-bar-fill xp" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
          <div className="pet-bar-row">
            <div className="pet-bar-label">Energy</div>
            <div className="pet-bar-track">
              <div className="pet-bar-fill energy" style={{ width: `${energyPct}%` }} />
            </div>
          </div>
        </div>

        <div className="pet-actions">
          <button className="pet-btn" onClick={handleFeed} type="button">
            📚 Đi Học Kiếm Ăn
          </button>
          {!isSleeping && (
            <button className="pet-btn ghost" onClick={toggleWander} type="button">
              {stats.isWandering ? "🛑 Sit" : "🐾 Walk"}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
