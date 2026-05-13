import React, { useRef, useEffect, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
// Pixel Cozy Library using `libassetpack-tiled.png`
// Characters now read books facing sideways or down so you can SEE the books!
// ═══════════════════════════════════════════════════════════════════

const ZOOM = 3;
const COLS = 13,
  ROWS = 10;
const TILE = 16,
  T = TILE * ZOOM,
  Z = ZOOM;
const CW = COLS * T;
const CH = ROWS * T;

const SF_W = 16,
  SF_H = 32;

// Exact crops from `libassetpack-tiled.png` (mapped via auto-scan)
// Padded by 1-2 pixels to avoid edge cut-offs where needed
const CROPS = {
  clock: [80, 22, 56, 120],
  rugH: [454, 22, 169, 73],
  globe: [145, 226, 94, 109],
  tableL: [541, 229, 190, 106],
  tableM: [361, 214, 166, 97],
  sofa: [58, 148, 55, 43], // small chest/sofa at 60,150
  plant: [289, 22, 46, 75], // approximated plant from top? (Wait, 291,24 is 42x21. Let's use handdrawn plant if needed)
  bsEmpty: [28, 382, 88, 121],
  bsSome: [148, 373, 88, 130],
  bsHalf: [268, 364, 88, 139],
  bsFull: [388, 373, 88, 130],
  wallPatch: [936, 0, 534, 501], // big wall chunk
};

// Hand-drawn fallbacks for tiny details
const C = {
  floorA: "#8B6B3D",
  floorB: "#7E6138",
  plank: "#6B522E",
  wallTop: "#253B3C",
  wallBot: "#1B2C2D",
  shadow: "rgba(0,0,0,0.15)",
  pcLight: "rgba(100,200,255,0.08)",
  leather: "#6B3322",
};
const rect = (ctx, x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

function drawOpenBook(ctx, x, y) {
  const w = 24,
    h = 14;
  rect(ctx, x, y, w, h, C.leather); // Book cover
  rect(ctx, x + 2, y + 2, w / 2 - 2, h - 4, "#FFF"); // Left page
  rect(ctx, x + w / 2, y + 2, w / 2 - 2, h - 4, "#FFF"); // Right page
  rect(ctx, x + w / 2 - 1, y, 2, h, C.leather); // Spine
  // Text lines (squiggles)
  rect(ctx, x + 4, y + 4, w / 2 - 6, 2, "#CCC");
  rect(ctx, x + 4, y + 8, w / 2 - 6, 2, "#CCC");
  rect(ctx, x + w / 2 + 2, y + 4, w / 2 - 6, 2, "#CCC");
  rect(ctx, x + w / 2 + 2, y + 8, w / 2 - 6, 2, "#CCC");
}

function drawCandle(ctx, x, y) {
  rect(ctx, x, y + 5, 6, 12, "#EEE8D0");
  rect(ctx, x + 3, y + 2, 3, 3, "#FF9933");
  // Glow
  ctx.fillStyle = "rgba(255, 200, 50, 0.08)";
  ctx.beginPath();
  ctx.arc(x + 3, y + 2, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawHandSofa(ctx, x, y) {
  rect(ctx, x + 2, y + T * 0.8, T * 1.5, 4, C.shadow);
  rect(ctx, x, y, T * 1.5, T * 0.6, "#B2503A");
  rect(ctx, x + Z, y + T * 0.6, T * 1.5 - Z * 2, T * 0.3, "#914230");
  rect(ctx, x - Z * 2, y + T * 0.3, Z * 4, T * 0.6, "#C45738");
  rect(ctx, x + T * 1.5 - Z * 2, y + T * 0.3, Z * 4, T * 0.6, "#C45738");
}

function drawLibraryChairBackrest(ctx, x, y) {
  // A plush cushion backrest visible behind the character
  const w = 38,
    h = 42;
  rect(ctx, x + 4, y + 4, w, h, C.shadow);
  rect(ctx, x, y, w, h, "#753923");
  rect(ctx, x + Z, y + Z, w - Z * 2, h - Z * 2, "#8B442A"); // Inner cushion
  rect(ctx, x - Z, y, Z, h, "#4A2111"); // Wood arm
  rect(ctx, x + w, y, Z, h, "#4A2111"); // Wood arm
}

// ═══════════════════════════════════════════════════════════════════

const t1X = T * 1,
  t1Y = T * 4.5;
const t2X = T * 7.5,
  t2Y = T * 4.5;

// Use actual table sprite height to decide when a character
// is truly "in front of" the table instead of on top of it.
// This fixes the bug where roaming characters look like they
// walk on the desk surface by tightening the z-sorting cutoff.
const TABLE1_BOTTOM_Y = t1Y + CROPS.tableL[3];
const TABLE2_BOTTOM_Y = t2Y + CROPS.tableM[3];
const TABLE_FRONT_Y = Math.min(TABLE1_BOTTOM_Y, TABLE2_BOTTOM_Y);

// Safe walking band in front of the desks so characters
// only roam on the floor area (trái–phải phía dưới bàn),
// never "bước" lên khu vực mặt bàn.
const WALK_BAND_TOP = TABLE_FRONT_Y + 12;
const WALK_BAND_BOTTOM = CH - T * 1.5;

export const PixelOfficeCanvas = ({ mode, isActive }) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const [images, setImages] = useState({ chars: {} });

  const isFocusRef = useRef(false);

  const roams = useRef([
    {
      id: 0,
      sx: t2X + 35,
      sy: t2Y - 75,
      x: t2X + 35,
      y: t2Y - 75,
      tx: t2X,
      ty: t2Y + 80,
      wait: 0,
      dir: 0,
      flip: false,
      sofa: false,
    },
    {
      id: 1,
      sx: t2X + 102,
      sy: t2Y - 75,
      x: t2X + 102,
      y: t2Y - 75,
      tx: t2X + 100,
      ty: t2Y + 120,
      wait: 100,
      dir: 0,
      flip: false,
      sofa: false,
    },
    {
      id: 2,
      sx: t1X + 73,
      sy: t1Y - 40,
      x: t1X + 73,
      y: t1Y - 40,
      tx: t1X,
      ty: t1Y + 90,
      wait: 200,
      dir: 0,
      flip: false,
      sofa: false,
    },
    {
      id: 5,
      sx: T * 2,
      sy: T * 6.8,
      x: T * 2,
      y: T * 6.8,
      tx: T * 3,
      ty: T * 8,
      wait: 50,
      dir: 0,
      flip: false,
      sofa: true,
    },
  ]);

  const isFocus = mode === "focus";
  const isBreak = mode === "shortBreak" || mode === "longBreak";

  useEffect(() => {
    const charsToLoad = [0, 1, 2, 5];
    const loaded = { chars: {} };
    let c = 0;
    const total = charsToLoad.length + 1; // chars + tileset

    const onLoad = () => {
      c++;
      if (c === total) setImages({ ...loaded });
    };

    charsToLoad.forEach(id => {
      const img = new Image();
      img.src = `/pixel-office/characters/char_${id}.png`;
      img.onload = () => {
        loaded.chars[id] = img;
        onLoad();
      };
    });

    const ts = new Image();
    ts.src = "/pixel-office/libassetpack-tiled.png";
    ts.onload = () => {
      loaded.tileset = ts;
      onLoad();
    };
  }, []);

  const render = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CW, CH);

    const TS = images.tileset;
    if (!TS) return;

    // Helper to draw asset crop
    const drawAsset = (cropName, x, y) => {
      const c = CROPS[cropName];
      if (!c) return;
      ctx.drawImage(TS, c[0], c[1], c[2], c[3], x, y, c[2], c[3]);
    };

    // ── 1. BACKGROUND ──
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * T,
          y = r * T;
        if (r < 2) {
          // We use a dark elegant library green for walls behind bookshelves
          rect(ctx, x, y, T, T, C.wallTop);
        } else {
          // Floor
          rect(ctx, x, y, T, T, (r + c) % 2 ? C.floorA : C.floorB);
          rect(ctx, x, y + T - Z, T, Z, C.plank);
        }
      }
    }
    // Deep shadow base for wall
    rect(ctx, 0, 2 * T, CW, T * 0.3, C.shadow);

    const L = [];

    // Z=10: Rugs
    L.push({ z: 10, fn: () => drawAsset("rugH", T * 1, T * 3.5) });
    L.push({ z: 10, fn: () => drawAsset("rugH", T * 7, T * 3.5) });

    // Z=20: Back wall items
    L.push({ z: 20, fn: () => drawAsset("bsFull", T * 0.2, T * 0.3) });
    L.push({ z: 20, fn: () => drawAsset("bsHalf", T * 2.2, T * 0.2) });
    L.push({ z: 20, fn: () => drawAsset("clock", T * 5.2, 0) });
    L.push({ z: 20, fn: () => drawAsset("bsSome", T * 7.2, T * 0.3) });
    L.push({ z: 20, fn: () => drawAsset("bsEmpty", T * 9.2, T * 0.4) });
    L.push({ z: 20, fn: () => drawAsset("bsFull", T * 11.2, T * 0.3) });

    // Z=30: Furniture Base
    // Left study area: Sofa & Globe
    L.push({ z: 15, fn: () => drawHandSofa(ctx, T * 1.5, T * 7.5) }); // Sofa
    // Increase Z to 45 so characters passing behind it are occluded, and move down to T*7.5
    L.push({ z: 45, fn: () => drawAsset("globe", parseInt(T * 0.5), parseInt(T * 7.5)) });

    // Right study area: Two big tables
    // Table 1
    L.push({ z: 30, fn: () => drawAsset("tableL", t1X, t1Y) });

    // Table 2 (Further right)
    L.push({ z: 30, fn: () => drawAsset("tableM", t2X, t2Y) });

    // Table items (Z=31, strictly above tables)
    // Table L (Left administrative desk has a lower recessed surface)
    L.push({ z: 31, fn: () => drawOpenBook(ctx, t1X + 85, t1Y + 42) }); // Centered book on desk
    L.push({ z: 31, fn: () => drawCandle(ctx, t1X + 115, t1Y + 32) }); // Candle to the right

    // Table M (Right straight desk has surface near the top rim)
    L.push({ z: 31, fn: () => drawOpenBook(ctx, t2X + 38, t2Y + 14) });
    L.push({ z: 31, fn: () => drawOpenBook(ctx, t2X + 105, t2Y + 14) });
    L.push({ z: 31, fn: () => drawCandle(ctx, t2X + 75, t2Y + 6) });

    // ── CHARACTERS (reading focus vs roaming) ──
    const isFocus = isFocusRef.current;

    roams.current.forEach(ch => {
      // Draw Chair Backrest behind character (unless on sofa) ALWAYS at their fixed desk
      if (!ch.sofa) {
        L.push({ z: 23, fn: () => drawLibraryChairBackrest(ctx, ch.sx + 5, ch.sy + 45) });
      }

      const img = images.chars[ch.id];
      if (!img) return;

      let fc,
        dr = ch.dir;
      if (isFocus) {
        fc = (frameRef.current % 2) + 5; // Reading frames (5,6)
      } else {
        if (ch.isWalking) {
          fc = frameRef.current % 3; // Walking frames (0,1,2)
        } else {
          fc = 1; // Idle standing still
        }
      }

      const dw = SF_W * Z,
        dh = SF_H * Z;
      const dx = ch.x;
      const dy = ch.y;

      // Dynamic depth sorting while roaming so they weave neatly
      // behind / in front of tables. Use the actual bottom edge
      // of the tables so characters never appear standing on top
      // of the desk surface.
      let charZ = 25;
      if (!isFocus) {
        const feetY = dy + dh;
        // Only draw in front of tables when the character's feet
        // are clearly below the front edge of the table sprites.
        if (feetY > TABLE_FRONT_Y) {
          charZ = 35;
        } else {
          charZ = 25;
        }
      }

      L.push({
        z: charZ,
        fn: () => {
          // Slight head-bobbing when reading
          let bobY = isFocus && fc === 6 ? Z : 0;

          if (ch.flip) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(img, fc * SF_W, dr * SF_H, SF_W, SF_H, -dx - dw, dy + bobY, dw, dh);
            ctx.restore();
          } else {
            ctx.drawImage(img, fc * SF_W, dr * SF_H, SF_W, SF_H, dx, dy + bobY, dw, dh);
          }
        },
      });
    });

    // Sort layers & draw
    L.sort((a, b) => a.z - b.z);
    L.forEach(l => l.fn());

    // ── GLOWS & AMBIENT OVERLAYS ──
    if (isActive && mode === "focus") {
      // Table lamps/candles glow
      const glows = [
        [T * 5.5, T * 4.5],
        [T * 9.5, T * 5.0],
      ];
      glows.forEach(([gx, gy]) => {
        const g = ctx.createRadialGradient(gx, gy, T * 0.5, gx, gy, T * 3);
        g.addColorStop(0, C.pcLight);
        g.addColorStop(1, "transparent");
        rect(ctx, 0, 0, CW, CH, g);
      });
      rect(ctx, 0, 0, CW, CH, "rgba(255,160,50,0.03)");
    } else {
      // Brightness shifts naturally for break time pacing
      rect(ctx, 0, 0, CW, CH, "rgba(0,10,30,0.12)");
    }
  }, [images, isActive, mode]);

  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    isFocusRef.current = isActive && mode === "focus";
  }, [isActive, mode]);

  useEffect(() => {
    let id,
      last = 0;
    const loop = t => {
      let dt = t - lastTimeRef.current;
      if (dt > 100) dt = 100; // Cap large frame leaps
      lastTimeRef.current = t;

      const f = Math.floor(t / 250);
      if (f !== last) {
        last = f;
        frameRef.current = f;
      }

      const isRead = isFocusRef.current;

      roams.current.forEach(ch => {
        if (isRead) {
          // SNAP TO SEAT
          ch.x = ch.sx;
          ch.y = ch.sy;
          ch.dir = 0;
          ch.flip = false;
          ch.isWalking = false;
        } else {
          // ROAMING
          // 1) Nếu vừa rời focus hoặc mới load, đưa nhân vật xuống
          //    dải sàn an toàn phía trước bàn (floor band),
          //    làm "lane" cố định theo trục Y.
          const feetYNow = ch.y + SF_H * Z;
          if (feetYNow < WALK_BAND_TOP || feetYNow > WALK_BAND_BOTTOM) {
            const laneFeetY =
              WALK_BAND_TOP + Math.random() * Math.max(1, WALK_BAND_BOTTOM - WALK_BAND_TOP);
            ch.y = laneFeetY - SF_H * Z;
            ch.ty = ch.y;
            ch.tx = ch.x;
            ch.wait = 500 + Math.random() * 1500;
            ch.isWalking = false;
            return; // bỏ qua frame này sau khi snap lane
          }

          if (ch.wait > 0) {
            ch.wait -= dt;
            ch.isWalking = false;
          } else {
            const dx = ch.tx - ch.x;
            const dy = ch.ty - ch.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 0.035 * dt;
            let collides = false;

            if (dist < speed) {
              ch.x = ch.tx;
              ch.y = ch.ty;

              // Pick a new destination on the floor band in front of desks,
              // moving chủ yếu theo chiều ngang (trái–phải), không leo lên bàn.
              let nx,
                ny,
                valid = false;
              let attempts = 0;
              while (!valid && attempts < 50) {
                attempts++;
                // X: toàn bộ hành lang phía trước
                nx = T * 2 + Math.random() * (CW - T * 4);
                // Y: giữ nguyên lane hiện tại để nhân vật đi ngang
                ny = ch.y;
                valid = true;
                const targetBBY = ny + SF_H * Z;

                // Check endpoint bounds
                if (nx < T * 2.5 && targetBBY > T * 7.8) valid = false;
                if (
                  nx > t1X - 25 &&
                  nx < t1X + 175 &&
                  targetBBY > t1Y + 45 &&
                  targetBBY < t1Y + 110
                )
                  valid = false;
                if (
                  nx > t2X - 25 &&
                  nx < t2X + 150 &&
                  targetBBY > t2Y + 45 &&
                  targetBBY < t2Y + 110
                )
                  valid = false;

                // Check Line-of-sight so they don't clip through furniture
                if (valid) {
                  for (let i = 1; i <= 5; i++) {
                    const px = ch.x + (nx - ch.x) * (i / 5);
                    const py = ch.y + (ny - ch.y) * (i / 5);
                    const b = py + SF_H * Z;
                    if (px < T * 2.5 && b > T * 7.8) valid = false;
                    if (px > t1X - 25 && px < t1X + 175 && b > t1Y + 45 && b < t1Y + 110)
                      valid = false;
                    if (px > t2X - 25 && px < t2X + 150 && b > t2Y + 45 && b < t2Y + 110)
                      valid = false;
                  }
                }
              }
              // If stuck after 50 random checks, just stay in place
              if (!valid) {
                nx = ch.x;
                ny = ch.y;
              }

              ch.tx = nx;
              ch.ty = ny;
              ch.wait = 1000 + Math.random() * 4000;
              ch.isWalking = false;
            } else {
              ch.x += (dx / dist) * speed;
              ch.y += (dy / dist) * speed;
              ch.isWalking = true;
              if (Math.abs(dx) > Math.abs(dy)) {
                ch.dir = 2; // Right
                ch.flip = dx < 0;
              } else {
                ch.dir = dy > 0 ? 0 : 1; // Down / Up
                ch.flip = false;
              }
            }
          }
        }
      });

      render();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [render]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: CW + "px",
        aspectRatio: `${CW} / ${CH}`,
      }}
    >
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{
          width: "100%",
          height: "100%",
          imageRendering: "pixelated",
          borderRadius: "16px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          border: "4px solid #1A2222",
          background: "#1A2222",
        }}
      />
    </div>
  );
};
