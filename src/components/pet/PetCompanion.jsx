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

const loadState = () => {
  const now = Date.now();
  const fallback = {
    hunger: 80,
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
    const stats = {
      ...fallback,
      ...saved,
      hunger,
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

  useEffect(() => {
    const currentQuizzes = userStore.account?.totalQuizzes || 0;
    if (currentQuizzes > prevQuizzes.current) {
        setStats(s => {
          let xp = s.xp + Math.max(20, (currentQuizzes - prevQuizzes.current) * XP_PER_FEED);
          let level = s.level;
          while (xp >= XP_PER_LEVEL) { xp -= XP_PER_LEVEL; level++; }
          return { ...s, hunger: clamp(s.hunger + 40, 0, 100), xp, level, lastTick: Date.now() };
        });
        setSpriteState("run");
        setStatus("Yeah! No bụng rồi!");
        sounds?.playCorrect?.();
        prevQuizzes.current = currentQuizzes;
    }
  }, [userStore.account?.totalQuizzes]);

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
  const hungerPct = clamp(Math.round(stats.hunger), 0, 100);
  const xpPct = clamp(Math.round((stats.xp / XP_PER_LEVEL) * 100), 0, 100);
  
  const streakArr = userStore.account?.streak || [];
  const totalStudyDays = streakArr.length;
  const currentStreak = calculateCurrentStreak(streakArr);
  const ageDisplay = `${totalStudyDays}d (🔥${currentStreak})`;

  const bubble =
    status ||
    (mood === "starving" ? "😿 Feed me!" : mood === "hungry" ? "🍖 Hungry!" : "");

  const persist = (s, pos) => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, pos })); } catch {}
  };

  useEffect(() => { persist(stats, posRef.current); }, [stats]);

  const showStatus = (text) => {
    if (!text) return;
    setStatus(text);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), 1500);
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
    setStats((prev) => ({ ...prev, isWandering: next }));
    if (!next) {
      const s = Math.random() < 0.5 ? "lie" : "idle";
      spriteRef.current = s; setSpriteState(s);
      showStatus("😴 Staying...");
    } else {
      showStatus("🐾 Wandering!");
    }
  };

  const handlePetClick = () => {
    if (!showHud) setShowHud(true);
    showStatus("❤️ Yêu bạn!");
    setSpriteState("with_ball");
    playMeow();
  };

  // ── Drag ─────────────────────────────────────────────────
  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    if (Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY) > 3)
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
    if (!dragRef.current.moved) handlePetClick();
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
        return { ...prev, hunger: clamp(prev.hunger - elapsed * HUNGER_DECAY_PER_MIN, 0, 100), lastTick: now };
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

      if (!dragRef.current.active && statsRef.current.isWandering) {
        const hunger = statsRef.current.hunger ?? 0;
        
        if (hunger <= 0) {
          bobRef.current = 0;
          if (now - lastSpriteSwitch.current > 7000) {
            const rand = Math.random();
            let s = "idle";
            if (rand < 0.3) s = "lie";
            else if (rand < 0.6) s = "swipe";
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
            walkState.current.target = {
              x: b.minX + Math.random() * (b.maxX - b.minX),
              y: b.minY + Math.random() * (b.maxY - b.minY),
            };
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
            walkState.current.idleSprite = rand < 0.2 ? "lie" : rand < 0.3 ? "swipe" : "idle";
            
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
        </div>

        <div className="pet-actions">
          <button className="pet-btn" onClick={handleFeed} type="button">
            📚 Đi Học Kiếm Ăn
          </button>
          <button className="pet-btn ghost" onClick={toggleWander} type="button">
            {stats.isWandering ? "🛑 Sit" : "🐾 Walk"}
          </button>
        </div>
      </div>
    </>
  );
};
