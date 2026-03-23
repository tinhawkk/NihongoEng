import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useUserStore } from "../store/useUserStore";
import { Play, Pause, Coffee, ArrowRight, Focus, Sparkles, GripVertical } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const PomodoroMini = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { account, updatePomodoroData } = useUserStore();
    
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState("focus");
    const [isHovered, setIsHovered] = useState(false);
    const dragControls = useDragControls();
    const [dragOffset, setDragOffset] = useState(() => {
        try {
            const saved = window.localStorage.getItem("pomodoro-mini-pos");
            return saved ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch (e) {
            return { x: 0, y: 0 };
        }
    });

    const userName = account?.displayName?.split(' ')[0] || "Bạn";
    const isPomodoroPage = location.pathname === "/pomodoro";

    // Store references to avoid infinite useEffect loops for syncing
    const stateRef = useRef({ timeLeft, isActive, mode });
    useEffect(() => {
        stateRef.current = { timeLeft, isActive, mode };
    }, [timeLeft, isActive, mode]);    // Initialization & Storage Event Listener (Instant Sync across tabs)
    useEffect(() => {
        const loadFromStorage = () => {
            try {
                const raw = window.localStorage.getItem("pomodoro-timer-state");
                if (raw) {
                    const p = JSON.parse(raw);
                    if (typeof p.turnTimeLeft === 'number' && !isNaN(p.turnTimeLeft)) {
                        let exactTimeLeft = p.turnTimeLeft;
                        // Correct for background time based on absolute timestamps
                        if (p.isActive && p.savedAt) {
                            const elapsed = Math.floor((Date.now() - p.savedAt) / 1000);
                            exactTimeLeft = Math.max(0, p.turnTimeLeft - elapsed);
                        }
                        setTimeLeft(exactTimeLeft);
                    }
                    if (typeof p.isActive === 'boolean') setIsActive(p.isActive);
                    if (p.mode) setMode(p.mode);
                }
            } catch(e) {}
        };

        loadFromStorage();
        
        // Listen to storage events from other tabs (INSTANT SYNC)
        const handleStorage = (e) => {
            if (e.key === "pomodoro-timer-state") loadFromStorage();
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    // 1. DỮ LIỆU ĐỒNG BỘ: Liên tục đồng bộ với Store khi ở trang chính (để các component khác biết)
    useEffect(() => {
        if (isPomodoroPage) {
            updatePomodoroData({ timeLeft, isActive, mode });
        }
    }, [isPomodoroPage, timeLeft, isActive, mode]);

    // 2. CHẠY NGẦM: Khi rời trang, PomodoroMini sẽ tự động đếm ngược
    useEffect(() => {
        let interval = null;
        if (!isPomodoroPage && isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    const next = prev - 1;
                    if (next <= 0) {
                        setIsActive(false);
                        try {
                           new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play();
                        } catch(e) {}
                        return 0;
                    }
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, isPomodoroPage]);

    // 3. GHI NHẬN TIẾN TRÌNH: Khi chạy ngầm, sync dữ liệu ngược lại LocalStorage và Store
    useEffect(() => {
        if (isPomodoroPage) return; // Nếu ở trang chính thì ko ghi đè

        const sync = () => {
            const { timeLeft: t, isActive: a, mode: m } = stateRef.current;
            
            // Sync to LocalStorage for PomodoroPage to resume pixel-perfectly
            try {
                let existing = {};
                const raw = window.localStorage.getItem("pomodoro-timer-state");
                if (raw) existing = JSON.parse(raw);
                
                const nextState = {
                    ...existing,
                    turnTimeLeft: t,
                    isActive: a,
                    mode: m,
                    savedAt: Date.now()
                };
                window.localStorage.setItem("pomodoro-timer-state", JSON.stringify(nextState));
            } catch(e) {}

            updatePomodoroData({ timeLeft: t, isActive: a, mode: m });
        };
        const timer = setInterval(sync, 1000); // 1s sync when in background for smoothness
        
        return () => clearInterval(timer);
    }, [isPomodoroPage, updatePomodoroData]);

    const formatTime = (seconds) => {
        const s = Number(seconds);
        if (isNaN(s)) return "25:00";
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? "0" : ""}${sec}`;
    };

    const showMini = account?.pomodoro?.showMini;
    const shouldShow = !isPomodoroPage && account && showMini && (isActive || timeLeft < (mode === 'focus' ? 25 * 60 : 5 * 60));

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
    const totalTime = isFocus ? 25 * 60 : 5 * 60;
    const progress = Math.max(0, Math.min(100, 100 - (timeLeft / totalTime) * 100));

    // Also update Store if users click Play/Pause directly on the widget
    const togglePlayPause = (e) => {
        e.stopPropagation(); 
        const nextState = !isActive;
        setIsActive(nextState);
        
        // Immediate sync to localStorage
        try {
            let existing = {};
            const raw = window.localStorage.getItem("pomodoro-timer-state");
            if (raw) existing = JSON.parse(raw);
            window.localStorage.setItem("pomodoro-timer-state", JSON.stringify({
                ...existing,
                turnTimeLeft: timeLeft,
                isActive: nextState,
                mode,
                savedAt: Date.now()
            }));
        } catch(e) {}

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
                        window.localStorage.setItem("pomodoro-mini-pos", JSON.stringify(newPos));
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
