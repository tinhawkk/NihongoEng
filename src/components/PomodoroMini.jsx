import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useUserStore } from "../store/useUserStore";
import { Play, Pause, Coffee, ArrowRight, Focus, Sparkles, GripVertical } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { sounds } from "../utils/sounds";

const getDefaultTurnDuration = goalMinutes => (goalMinutes > 180 ? 50 * 60 : 25 * 60);

const buildTurns = (goalMinutes, focusDuration) => {
    const totalSeconds = Math.max(0, Number(goalMinutes) || 0) * 60;
    const duration = Math.max(1, Number(focusDuration) || 25 * 60);
    const numTurns = Math.max(1, Math.ceil(totalSeconds / duration));
    return Array.from({ length: numTurns }, (_, i) => {
        const remain = totalSeconds - i * duration;
        return remain >= duration ? duration : Math.max(1, remain);
    });
};

const getSmartDuration = (m, goalMinutes, focusDuration) => {
    const isLongGoal = Number(goalMinutes) >= 180;
    if (m === "focus") return focusDuration;
    if (m === "shortBreak") return (isLongGoal ? 10 : 5) * 60;
    if (m === "longBreak") return (isLongGoal ? 30 : 15) * 60;
    return focusDuration;
};

export const PomodoroMini = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { account, updatePomodoroData } = useUserStore();
    
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState("focus");
    const [isHovered, setIsHovered] = useState(false);
    const dragControls = useDragControls();
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const completionGuardRef = useRef(false);
    
    // Initial load from store for dragOffset if it existed
    useEffect(() => {
        if (account?.pomodoro?.miniPos) {
            setDragOffset(account.pomodoro.miniPos);
        }
    }, []);


    const userName = account?.displayName?.split(' ')[0] || "Bạn";
    const isPomodoroPage = location.pathname === "/pomodoro";

    // Store references to avoid infinite useEffect loops for syncing
    const stateRef = useRef({ timeLeft, isActive, mode });
    useEffect(() => {
        stateRef.current = { timeLeft, isActive, mode };
    }, [timeLeft, isActive, mode]);    // Initialization & Storage Event Listener (Instant Sync across tabs)
    // 1. Sync FROM Store: Listen for updates (e.g. from other tabs or the main page)
    const lastRemoteTimeRef = useRef(null);
    useEffect(() => {
        if (account?.pomodoro) {
            const p = account.pomodoro;
            // Only update local state if the remote value actually changed to avoid render loops
            if (typeof p.timeLeft === 'number' && !isNaN(p.timeLeft) && p.timeLeft !== lastRemoteTimeRef.current) {
                lastRemoteTimeRef.current = p.timeLeft;
                setTimeLeft(p.timeLeft);
            }
            if (typeof p.isActive === 'boolean') setIsActive(p.isActive);
            if (p.mode) setMode(p.mode);
        }
    }, [account?.pomodoro]);


    // 2. DỮ LIỆU ĐỒNG BỘ: Đã bị xóa để tránh vòng lặp vô tận (Infinite Loop)
    // PomodoroMini sẽ PUSH dữ liệu qua updatePomodoroData chỉ khi KHÔNG ở trang /pomodoro (xem useEffect ở dưới)
    // PomodoroPage sẽ chịu trách nhiệm PUSH dữ liệu khi trực tiếp ở trang đó.

    // 2. CHẠY NGẦM: PomodoroMini là "trái tim" đếm ngược của cả hệ thống
    const lastMiniTickRef = useRef(Date.now());
    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0 && !isPomodoroPage) {
            lastMiniTickRef.current = Date.now();
            interval = setInterval(() => {
                const now = Date.now();
                const elapsedSeconds = Math.round((now - lastMiniTickRef.current) / 1000);
                if (elapsedSeconds >= 1) {
                    lastMiniTickRef.current = now;
                    setTimeLeft(prev => {
                        return Math.max(0, prev - elapsedSeconds);
                    });
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, isPomodoroPage]);

    useEffect(() => {
        if (!isActive || timeLeft !== 0 || completionGuardRef.current || isPomodoroPage) return;
        completionGuardRef.current = true;

        sounds.playNotification();

        const state = useUserStore.getState();
        const p = state.account?.pomodoro || {};
        const currentMode = p.mode || mode;
        const autoCycle = p.autoCycle ?? true;
        const goalMinutes = Number(p.targetGoal ?? 120);
        const focusDuration = Number(p.turnDuration ?? getDefaultTurnDuration(goalMinutes));
        const turns = buildTurns(goalMinutes, focusDuration);
        const currentTurnIdx = Number.isFinite(p.currentTurnIdx) ? p.currentTurnIdx : 0;
        const safeTurnIdx = Math.max(0, Math.min(currentTurnIdx, turns.length - 1));
        const finishedDuration = turns[safeTurnIdx] || focusDuration;
        const finishedMinutes = Math.round(finishedDuration / 60);

        if (currentMode === "focus") {
            const currentSessions = Number(p.totalSessions ?? 0) || 0;
            const currentTodaySessions = Number(p.todaySessions ?? 0) || 0;
            const currentTotal = Number(p.totalFocusMinutes ?? 0) || 0;
            const currentLifetime = Number(p.lifetimeMinutes ?? 0) || 0;
            const currentFood = Number(p.foodStock ?? 0) || 0;
            const baseHappiness = typeof p.happiness === "number" ? p.happiness : 80;
            const nextHappiness = Math.min(100, baseHappiness + 10);

            const commonUpdate = {
                totalSessions: currentSessions + 1,
                todaySessions: currentTodaySessions + 1,
                totalFocusMinutes: currentTotal + finishedMinutes,
                lifetimeMinutes: currentLifetime + finishedMinutes,
                foodStock: currentFood + 1,
                happiness: nextHappiness,
                lastSessionDate: new Date().toISOString(),
            };

            if (autoCycle) {
                const isLongBreak = (currentSessions + 1) % 4 === 0;
                const nextMode = isLongBreak ? "longBreak" : "shortBreak";
                const nextDuration = getSmartDuration(nextMode, goalMinutes, focusDuration);
                setMode(nextMode);
                setTimeLeft(nextDuration);
                setIsActive(true);
                updatePomodoroData({
                    ...commonUpdate,
                    mode: nextMode,
                    timeLeft: nextDuration,
                    isActive: true,
                    currentTurnIdx: safeTurnIdx,
                });
            } else {
                setIsActive(false);
                updatePomodoroData({
                    ...commonUpdate,
                    isActive: false,
                    timeLeft: 0,
                });
            }
        } else {
            if (autoCycle && safeTurnIdx + 1 < turns.length) {
                const nextIdx = safeTurnIdx + 1;
                const nextDuration = turns[nextIdx] || focusDuration;
                setMode("focus");
                setTimeLeft(nextDuration);
                setIsActive(true);
                updatePomodoroData({
                    mode: "focus",
                    timeLeft: nextDuration,
                    isActive: true,
                    currentTurnIdx: nextIdx,
                });
            } else {
                setIsActive(false);
                updatePomodoroData({ isActive: false, timeLeft: 0 });
            }
        }

        setTimeout(() => {
            completionGuardRef.current = false;
        }, 0);
    }, [isActive, timeLeft, mode, updatePomodoroData]);

    // 3. ĐỒNG BỘ NHANH (LocalStorage & Store): Dùng để khôi phục khi F5/Crash
    useEffect(() => {
        const syncState = { timeLeft, isActive, mode, timestamp: Date.now() };
        localStorage.setItem("pomodoro_persistent_state", JSON.stringify(syncState));
        
        // Cập nhật Store định kỳ để các trang khác (PomodoroPage) thấy được
        const throttledUpdate = setTimeout(() => {
            if (!isPomodoroPage) {
                updatePomodoroData({ timeLeft, isActive, mode });
            }
        }, 100);
        return () => clearTimeout(throttledUpdate);
    }, [timeLeft, isActive, mode, updatePomodoroData, isPomodoroPage]);

    // 4. CLOUD SYNC (Nhost): Định kỳ mỗi 60s lưu lên server để đồng bộ đa thiết bị
    const lastSyncTimeRef = useRef(Date.now());
    useEffect(() => {
        const now = Date.now();
        // Cứ mỗi 60 giây hoặc khi trạng thái quan trọng thay đổi (Active/Inactive) thì đẩy lên Nhost
        if (now - lastSyncTimeRef.current > 60000) {
            lastSyncTimeRef.current = now;
            updatePomodoroData({ timeLeft, isActive, mode }, true); // Force sync
        }
    }, [timeLeft, isActive, mode, updatePomodoroData]);

    // 5. AUTO-RECOVERY: Khi mới load app, kiểm tra xem có timer nào đang chạy dở ko
    useEffect(() => {
        const saved = localStorage.getItem("pomodoro_persistent_state");
        if (saved) {
            try {
                const { timeLeft: st, isActive: sa, mode: sm, timestamp: sp } = JSON.parse(saved);
                if (sa) {
                    const secondsPassed = Math.floor((Date.now() - sp) / 1000);
                    const actualTimeLeft = Math.max(0, st - secondsPassed);
                    setTimeLeft(actualTimeLeft);
                    setIsActive(actualTimeLeft > 0);
                    setMode(sm);
                } else {
                    setTimeLeft(st);
                    setMode(sm);
                }
            } catch (e) {
                console.error("Failed to restore pomodoro state", e);
            }
        }
    }, []);

    const formatTime = (seconds) => {
        const s = Number(seconds);
        if (isNaN(s)) return "25:00";
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? "0" : ""}${sec}`;
    };

    const showMini = account?.pomodoro?.showMini !== false; // Default true
    const shouldShow = !isPomodoroPage && account && showMini && (isActive || timeLeft < (mode === 'focus' ? (account?.pomodoro?.targetGoal || 25) * 60 : 15 * 60));

    // Dynamic content based on mode and status
    const getGreeting = () => {
        if (!isActive) return `Tạm dừng. Nghỉ ngơi hả ${userName}? 🤔`;
        if (mode === 'focus') {
            if (timeLeft < 5 * 60) return `Cố lên ${userName}! Sắp xong rồi 🚀`;
            return `Đang tập trung cao độ, ${userName}! 🧠`;
        }
        return `Nghỉ ngơi xíu nào, ${userName} ☕`;
    };

    const isFocus = mode === 'focus';
    const totalTime = isFocus ? (account?.pomodoro?.targetGoal || 25) * 60 : (mode === 'shortBreak' ? 5 * 60 : 15 * 60);
    const progress = Math.max(0, Math.min(100, 100 - (timeLeft / totalTime) * 100));

    // Also update Store if users click Play/Pause directly on the widget
    const togglePlayPause = (e) => {
        e.stopPropagation(); 
        const nextState = !isActive;
        setIsActive(nextState);
        
        // Khi tương tác từ Mini, luôn giữ showMini = true
        updatePomodoroData({ timeLeft, isActive: nextState, mode, showMini: true });
    };

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div 
                    drag
                    dragControls={dragControls}
                    dragListener={false}
                    dragMomentum={false}
                    onDragEnd={(e, info) => {
                        const newPos = { x: dragOffset.x + info.offset.x, y: dragOffset.y + info.offset.y };
                        setDragOffset(newPos);
                        updatePomodoroData({ miniPos: newPos });
                    }}
                    initial={{ scale: 0.8, y: 100, opacity: 0 }}
                    animate={{ 
                        scale: 1, 
                        y: dragOffset.y, 
                        x: dragOffset.x,
                        opacity: 1 
                    }}
                    exit={{ scale: 0.8, y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[200] group touch-none"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="relative">
                        {/* Status Tooltip */}
                        <AnimatePresence>
                            {isHovered && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute -top-8 right-0 bg-slate-900/95 dark:bg-slate-800/95 text-white px-2 py-1 rounded-lg whitespace-nowrap shadow-lg flex items-center gap-1 border border-white/5 backdrop-blur-md z-30 pointer-events-none"
                                >
                                    <Sparkles size={10} className="text-yellow-400" />
                                    <span className="text-[10px] font-bold">{getGreeting()}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Main Widget */}
                        <div 
                            className={`flex items-center gap-1 p-1 pr-2 rounded-full shadow-[0_5px_20px_rgba(0,0,0,0.15)] border-[1.5px] backdrop-blur-xl transition-all overflow-hidden relative
                            ${isFocus 
                                ? 'bg-white/70 dark:bg-slate-950/70 border-red-500/20' 
                                : 'bg-white/70 dark:bg-slate-950/70 border-emerald-500/20'}`}
                        >
                            {/* Drag Handle - The ONLY area where dragging starts */}
                            <div 
                                onPointerDown={(e) => dragControls.start(e)}
                                className="cursor-grab active:cursor-grabbing p-1 text-slate-300 dark:text-slate-700 hover:text-slate-400 dark:hover:text-slate-500 transition-colors z-20 shrink-0"
                            >
                                <GripVertical size={14} />
                            </div>

                            <div className="flex items-center gap-2 cursor-pointer z-10 shrink-0" onClick={() => navigate("/pomodoro")}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${isFocus ? 'text-red-500' : 'text-emerald-500'}`}>
                                   {isFocus ? <Focus size={15} strokeWidth={2.5} /> : <Coffee size={15} strokeWidth={2.5} />}
                                </div>
                                <div className="flex flex-col z-10 min-w-[2.2rem]">
                                    <span className={`text-[17px] font-bold font-mono leading-none tracking-tighter ${isFocus ? 'text-slate-800 dark:text-white' : 'text-slate-800 dark:text-white'}`}>
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700/50 mx-0.5 z-10" />

                            <button 
                                onClick={togglePlayPause}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 ml-0.5
                                    ${isActive 
                                        ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-300' 
                                        : (isFocus ? 'bg-red-500 text-white shadow-sm hover:bg-red-600' : 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600')}`}
                            >
                                {isActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
