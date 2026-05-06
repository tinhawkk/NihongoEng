import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  Zap,
  TrendingUp,
  BookOpen,
  BarChart3,
  Flame,
  Target,
  ChevronRight,
  Trash2,
  Filter,
  Search,
  X,
  Layers,
  Stars,
  RefreshCw,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { getDueItems, getCardCategory, CATEGORY_LABELS, formatInterval } from "../utils/srsUtils";
import { nhostService } from "../services/nhostService";
import { useSync } from "../components/SyncProvider";

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const formatDeckName = (name, deckTitleMap = {}) => {
  if (!name || name === "Khác" || name === "Bài học cá nhân" || name === "Bài học tự chọn")
    return "Sổ tay lẻ";
  if (deckTitleMap[name]) return deckTitleMap[name];

  if (IS_UUID.test(name)) return "Đang tải tên bài học...";
  if (["n1", "n2", "n3", "n4", "n5", "it", "eng"].includes(name.toLowerCase()))
    return `JLPT ${name.toUpperCase()}`;
  return name;
};

const StudyHeatmap = ({ streak = [] }) => {
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    // 35 days (5 full weeks)
    for (let i = 34; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const ds = d.toLocaleDateString("en-CA");
      result.push({ 
        date: ds, 
        active: streak.includes(ds),
        label: d.toLocaleDateString("vi-VN", { day: 'numeric', month: 'numeric' })
      });
    }
    return result;
  }, [streak]);

  const currentMonth = new Date().toLocaleString("vi-VN", { month: "long" });

  return (
    <div className="flex flex-col items-start bg-white/5 p-4 rounded-2xl border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={12} className="text-emerald-400" />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
          Lịch học {currentMonth}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div
            key={i}
            title={`${d.label}: ${d.active ? "Đã học" : "Chưa học"}`}
            className={`w-4 h-4 rounded-[2px] transition-all relative group ${
              d.active 
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                : "bg-white/5 border border-white/5"
            }`}
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[8px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {d.label}: {d.active ? "✅ Đã học" : "❌ Chưa học"}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[8px] font-bold text-slate-500 uppercase">Ít</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-[1px] bg-white/5 border border-white/5" />
          <div className="w-2 h-2 rounded-[1px] bg-emerald-500/30" />
          <div className="w-2 h-2 rounded-[1px] bg-emerald-500/60" />
          <div className="w-2 h-2 rounded-[1px] bg-emerald-500" />
        </div>
        <span className="text-[8px] font-bold text-slate-500 uppercase">Nhiều</span>
      </div>
    </div>
  );
};

// SRS Stats Bar showing New/Learning/Due distribution
const SrsDistributionBar = ({ items }) => {
  const counts = useMemo(() => {
    let newCount = 0,
      learningCount = 0,
      youngCount = 0,
      matureCount = 0;
    items.forEach(item => {
      const cat = getCardCategory(item);
      if (cat === "new") newCount++;
      else if (cat === "learning") learningCount++;
      else if (cat === "young") youngCount++;
      else matureCount++;
    });
    return { newCount, learningCount, youngCount, matureCount, total: items.length };
  }, [items]);

  if (counts.total === 0) return null;

  const pct = n => ((n / counts.total) * 100).toFixed(1);

  return (
    <div className="space-y-2">
      <div className="h-3 rounded-full overflow-hidden flex gap-0.5 bg-white/5">
        {counts.newCount > 0 && (
          <div
            className="bg-blue-400 transition-all duration-700"
            style={{ width: `${pct(counts.newCount)}%` }}
            title={`Mới: ${counts.newCount}`}
          />
        )}
        {counts.learningCount > 0 && (
          <div
            className="bg-orange-400 transition-all duration-700"
            style={{ width: `${pct(counts.learningCount)}%` }}
            title={`Đang học: ${counts.learningCount}`}
          />
        )}
        {counts.youngCount > 0 && (
          <div
            className="bg-emerald-400 transition-all duration-700"
            style={{ width: `${pct(counts.youngCount)}%` }}
            title={`Quen: ${counts.youngCount}`}
          />
        )}
        {counts.matureCount > 0 && (
          <div
            className="bg-purple-400 transition-all duration-700"
            style={{ width: `${pct(counts.matureCount)}%` }}
            title={`Thuộc: ${counts.matureCount}`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] font-bold">
        {counts.newCount > 0 && (
          <span className="flex items-center gap-1 text-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Mới:{" "}
            {counts.newCount}
          </span>
        )}
        {counts.learningCount > 0 && (
          <span className="flex items-center gap-1 text-orange-300">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Học:{" "}
            {counts.learningCount}
          </span>
        )}
        {counts.youngCount > 0 && (
          <span className="flex items-center gap-1 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Quen:{" "}
            {counts.youngCount}
          </span>
        )}
        {counts.matureCount > 0 && (
          <span className="flex items-center gap-1 text-purple-300">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Thuộc:{" "}
            {counts.matureCount}
          </span>
        )}
      </div>
    </div>
  );
};

export const SRSPage = () => {
  const navigate = useNavigate();
  const { syncing, forceRefresh } = useSync();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDeck = searchParams.get("deck") || "all";
  const searchQuery = searchParams.get("q") || "";
  const sortBy = searchParams.get("sort") || "due";

  const setSearchQuery = val => {
    const newParams = new URLSearchParams(searchParams);
    if (val) newParams.set("q", val);
    else newParams.delete("q");
    setSearchParams(newParams, { replace: true });
  };

  const setSortBy = val => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sort", val);
    setSearchParams(newParams, { replace: true });
  };

  const account = useUserStore(s => s.account);
  const resetSRS = useUserStore(s => s.resetSRS);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const srsData = account?.srsData || {};
  const allItems = Object.values(srsData);
  const streak = account?.streak || [];
  const dueItems = getDueItems(srsData);

  // Fetch real titles for UUID-based deck IDs (custom lessons)
  const [deckTitleMap, setDeckTitleMap] = useState({});
  useEffect(() => {
    const uuids = [
      ...new Set(
        allItems.map(i => i.deck || i.deckId || i.deckName || "").filter(n => IS_UUID.test(n))
      ),
    ];
    if (uuids.length === 0) return;

    const query = `query GetDeckTitles($ids: [String!]!) {
      decks(where: { id: { _in: $ids } }) { id title }
    }`;
    nhostService
      .fetchGraphQL(query, "GetDeckTitles", { ids: uuids })
      .then(res => {
        const map = {};
        (res.data?.decks || []).forEach(d => {
          map[d.id] = d.title;
        });
        setDeckTitleMap(map);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.srsData]);

  const streakCount = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA");
    let count = 0;
    const d = new Date();
    while (true) {
      const ds = d.toLocaleDateString("en-CA");
      if (streak.includes(ds)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else if (ds === today) {
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return count;
  }, [streak]);

  // Items due today + items in learning phase (they have short intervals in minutes)
  const dueTodayCount = dueItems.length;

  // New items that have never been seen
  const newCount = useMemo(
    () => allItems.filter(i => getCardCategory(i) === "new").length,
    [allItems]
  );
  const learningCount = useMemo(
    () => allItems.filter(i => getCardCategory(i) === "learning").length,
    [allItems]
  );
  const matureCount = useMemo(
    () => allItems.filter(i => getCardCategory(i) === "mature").length,
    [allItems]
  );

  const deckGroups = useMemo(() => {
    const groups = {};
    allItems.forEach(item => {
      // Prioritize deckName (actual string title) if it's not a UUID
      let rawName = item.deck || item.deckId || item.deckName || "Khác";
      let display =
        item.deckName && !IS_UUID.test(item.deckName)
          ? item.deckName
          : formatDeckName(rawName, deckTitleMap);

      if (item.source === "search") {
        rawName = "DICTIONARY_SOURCE";
        display = "Sổ tay Từ điển";
      }

      const isDue = new Date(item.nextReview) <= new Date();
      const isMature = item.interval >= 21;
      const cat = getCardCategory(item);

      if (!groups[rawName]) {
        groups[rawName] = {
          rawName,
          name: display,
          items: [],
          dueCount: 0,
          matureCount: 0,
          newCount: 0,
          level: (item.level || "").toUpperCase(),
        };
      }
      groups[rawName].items.push(item);
      if (isDue) groups[rawName].dueCount++;
      if (isMature) groups[rawName].matureCount++;
      if (cat === "new") groups[rawName].newCount++;
    });
    return Object.values(groups).sort((a, b) => b.dueCount - a.dueCount);
  }, [allItems, deckTitleMap]);

  const filteredItems = useMemo(() => {
    let list = allItems;
    if (selectedDeck !== "all") {
      list = list.filter(item => {
        const raw = item.deck || item.deckId || item.deckName || "Khác";
        if (selectedDeck === "DICTIONARY_SOURCE") return item.source === "search";
        return raw === selectedDeck || formatDeckName(raw, deckTitleMap) === selectedDeck;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        item =>
          item.word?.toLowerCase().includes(q) ||
          item.meaning?.toLowerCase().includes(q) ||
          item.reading?.toLowerCase().includes(q)
      );
    }

    // Sort
    list = [...list];
    if (sortBy === "due") {
      list.sort(
        (a, b) => new Date(a.nextReview || "9999-12-31") - new Date(b.nextReview || "9999-12-31")
      );
    } else if (sortBy === "interval") {
      list.sort((a, b) => (b.interval || 0) - (a.interval || 0));
    } else if (sortBy === "word") {
      list.sort((a, b) => (a.word || "").localeCompare(b.word || ""));
    }

    return list;
  }, [allItems, selectedDeck, searchQuery, sortBy]);

  const selectedDeckItems = useMemo(() => {
    if (selectedDeck === "all") return allItems;
    return filteredItems;
  }, [allItems, filteredItems, selectedDeck]);

  const selectedDueDeck = useMemo(
    () => getDueItems(Object.fromEntries(selectedDeckItems.map(i => [i.id || i.word, i]))),
    [selectedDeckItems]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4 lg:space-y-8 pb-32 px-4 lg:px-0">
      {/* Premium Header Dashboard */}
      <div className="bg-[#1a1b1e] rounded-[2rem] lg:rounded-[2.5rem] p-5 lg:p-8 shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row items-start justify-between gap-6 lg:gap-8">
          <div className="flex-1 space-y-4 lg:space-y-6 w-full">
            <div className="flex items-center gap-4 lg:gap-5">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-[#1CB0F6] to-[#A342FF] rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <Brain size={24} className="lg:hidden text-white" />
                <Brain size={32} className="hidden lg:block text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl lg:text-4xl font-black text-white tracking-tight truncate">
                    Ôn Tập SRS
                  </h1>
                  <button
                    onClick={forceRefresh}
                    disabled={syncing}
                    className={`p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all ${syncing ? "animate-spin text-blue-400" : ""}`}
                    title="Đồng bộ với đám mây"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">
                  Hệ thống ghi nhớ dài hạn
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
              {/* Stats Widgets */}
              <div className="flex items-center gap-2.5 bg-white/5 px-3 py-2 lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl border border-white/10 group hover:bg-white/10 transition-all">
                <Flame size={16} className="lg:w-5 lg:h-5 text-orange-400" fill="currentColor" />
                <div className="flex flex-col">
                  <span className="text-sm lg:text-xl font-black text-white leading-none">
                    {streakCount}
                  </span>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                    Chuỗi
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-white/5 px-3 py-2 lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl border border-white/10 group hover:bg-white/10 transition-all">
                <Layers size={14} className="lg:w-[18px] lg:h-[18px] text-blue-400" />
                <div className="flex flex-col">
                  <span className="text-sm lg:text-xl font-black text-white leading-none">
                    {allItems.length}
                  </span>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                    Từ vựng
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-white/5 px-3 py-2 lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl border border-white/10 group hover:bg-white/10 transition-all">
                <Target size={14} className="lg:w-[18px] lg:h-[18px] text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-sm lg:text-xl font-black text-white leading-none">
                    {matureCount}
                  </span>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                    Đã thuộc
                  </span>
                </div>
              </div>

              {/* Heatmap Section */}
              <div className="hidden lg:block ml-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                <StudyHeatmap streak={streak} />
              </div>
            </div>

            {/* Distribution Bar */}
            <div className="w-full max-w-xl">
              <SrsDistributionBar items={allItems} />
            </div>
          </div>

          {/* Large Due Counter Card */}
          <div
            className={`p-6 lg:p-8 rounded-[2rem] border-2 lg:border-4 flex flex-col items-center justify-center min-w-[160px] lg:min-w-[220px] transition-all self-stretch lg:self-auto relative group overflow-hidden
            ${dueTodayCount > 0 ? "bg-orange-500/10 border-orange-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}
          >
            <div
              className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-t ${dueTodayCount > 0 ? "from-orange-500/20" : "from-emerald-500/20"}`}
            />
            <div
              className={`text-6xl lg:text-8xl font-black mb-1 drop-shadow-2xl z-10 ${dueTodayCount > 0 ? "text-orange-500" : "text-emerald-500"}`}
            >
              {dueTodayCount}
            </div>
            <p className="text-[10px] lg:text-sm font-black text-white/60 uppercase tracking-[0.2em] text-center z-10">
              Cần ôn ngay
            </p>
            {newCount > 0 && (
              <div className="mt-3 lg:mt-4 flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl lg:rounded-2xl z-10">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                <span className="text-[10px] lg:text-xs font-black text-blue-300 tracking-wide">
                  {newCount} từ mới
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Sidebar: Decks */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Filter size={12} /> Bộ từ vựng của bạn
            </h3>
            <span className="text-[10px] font-black px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
              {deckGroups.length} bài
            </span>
          </div>

          <div className="space-y-3 px-1 custom-scrollbar max-h-[300px] lg:max-h-[75vh] overflow-y-auto pr-2">
            {/* ... Rest of the toggle and groups ... */}
            {/* All items toggle */}
            <button
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("deck", "all");
                setSearchParams(next);
              }}
              className={`w-full p-6 rounded-[2rem] text-left border-4 transition-all flex items-center justify-between group
                ${
                  selectedDeck === "all"
                    ? "bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-500/30 scale-[1.02]"
                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800/50 shadow-sm"
                }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${selectedDeck === "all" ? "bg-white/20" : "bg-slate-100 dark:bg-slate-900"}`}
                >
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="font-black text-base tracking-tight">Tất cả mục ôn tập</p>
                  <p
                    className={`text-[11px] font-bold ${selectedDeck === "all" ? "text-white/60" : "text-slate-400"}`}
                  >
                    {allItems.length} từ · {dueTodayCount} đến hạn
                  </p>
                </div>
              </div>
              <ChevronRight
                size={20}
                className={`transition-all ${selectedDeck === "all" ? "opacity-100 translate-x-1" : "opacity-20 translate-x-0"}`}
              />
            </button>

            {/* Individual deck groups */}
            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {deckGroups.map(group => {
                const masteryPct =
                  group.items.length > 0
                    ? Math.round((group.matureCount / group.items.length) * 100)
                    : 0;
                const isSelected = selectedDeck === group.rawName;

                return (
                  <button
                    key={group.rawName}
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.set("deck", group.rawName);
                      setSearchParams(next);
                    }}
                    className={`w-full p-5 rounded-3xl text-left border-2 transition-all group relative overflow-hidden
                      ${
                        isSelected
                          ? "bg-white dark:bg-slate-800 border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]"
                          : "bg-white/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                      }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {group.level && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase">
                              {group.level}
                            </span>
                          )}
                          <h4
                            className={`text-sm font-black truncate ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"}`}
                          >
                            {group.name}
                          </h4>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          {group.dueCount > 0 ? (
                            <span className="text-orange-500">{group.dueCount} đến hạn</span>
                          ) : (
                            <span>Đã hoàn thành</span>
                          )}
                          {` · ${group.items.length} từ`}
                        </p>
                      </div>
                      {group.dueCount > 0 && (
                        <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-orange-500/20 shrink-0">
                          {group.dueCount}
                        </div>
                      )}
                    </div>

                    {/* Progress mini bar */}
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-700"
                          style={{ width: `${masteryPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 shrink-0">
                        {masteryPct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Area: Detailed deck view */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            {/* Header / Actions */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 space-y-6 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    {selectedDeck === "all"
                      ? "Toàn bộ mục ôn tập"
                      : formatDeckName(selectedDeck, deckTitleMap)}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      {filteredItems.length} từ vựng
                    </span>
                    {selectedDueDeck.length > 0 && (
                      <span className="text-xs font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Zap size={10} fill="currentColor" /> {selectedDueDeck.length} cần ôn ngay
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  {selectedDueDeck.length > 0 && (
                    <Button
                      onClick={() => navigate(`/quiz/srs?deck=${selectedDeck}`)}
                      className="flex-1 md:flex-none py-3.5 px-6 rounded-2xl bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30 font-black text-sm gap-2"
                    >
                      BẮT ĐẦU ÔN <Play size={16} fill="currentColor" />
                    </Button>
                  )}
                  <Button
                    onClick={() => navigate(`/quiz/srs?deck=${selectedDeck}&mode=all`)}
                    disabled={filteredItems.length === 0}
                    className="flex-1 md:flex-none py-3.5 px-6 rounded-2xl bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:brightness-110 font-black text-sm gap-2"
                  >
                    LUYỆN TẬP <Zap size={16} />
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-3">
                <div className="relative flex-1 group">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                  />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm từ, ý nghĩa..."
                    className="w-full pl-11 pr-10 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-[1.25rem] outline-none font-bold text-sm focus:border-blue-500 transition-all"
                  />
                  {searchQuery && (
                    <X
                      size={16}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                      onClick={() => setSearchQuery("")}
                    />
                  )}
                </div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-[1.25rem] font-black text-sm outline-none cursor-pointer hover:border-slate-400 transition-all"
                >
                  <option value="due">Cần ôn trước</option>
                  <option value="interval">Khoảng cách dài</option>
                  <option value="word">Bảng chữ cái</option>
                </select>
              </div>
            </div>

            {/* Vocabulary List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-h-[70vh]">
              <div className="space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={40} className="text-slate-300" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-600 dark:text-slate-300">
                        Không có mục nào
                      </h4>
                      <p className="text-sm text-slate-400 font-bold">
                        Hãy học thêm từ mới để hệ thống theo dõi nhé!
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                    const category = getCardCategory(item);
                    const catInfo = CATEGORY_LABELS[category];
                    const isDue = item.nextReview && new Date(item.nextReview) <= new Date();
                    const isNew = category === "new";
                    const removeSrsItem = useUserStore.getState().removeSrsItem;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.4) }}
                        key={item.id || item.word}
                        className={`group p-3 lg:p-5 rounded-2xl lg:rounded-[1.75rem] border-2 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none relative
                          ${
                            isDue && !isNew
                              ? "border-orange-200 dark:border-orange-800/50 bg-orange-50/20 dark:bg-orange-500/5"
                              : isNew
                                ? "border-blue-100 dark:border-blue-800/30 bg-blue-50/10 dark:bg-blue-500/5"
                                : "border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-slate-800/30"
                          }`}
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="text-lg lg:text-xl font-black text-slate-800 dark:text-white tracking-tight">
                                {item.word}
                              </span>
                              {(item.reading || item.furigana) && (
                                <span className="bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-lg lg:rounded-xl text-[10px] lg:text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                  {item.reading || item.furigana}
                                </span>
                              )}
                              {item.level && (
                                <span className="text-[9px] lg:text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded shadow-sm">
                                  {item.level}
                                </span>
                              )}
                            </div>
                            <div
                              className={`shrink-0 px-2 py-1 rounded-xl font-black text-[9px] lg:text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${catInfo.bg} ${catInfo.color}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${catInfo.dot}`}></span>
                              {catInfo.label}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-50 dark:border-slate-800/50 pt-3">
                            <p className="text-sm lg:text-base font-bold text-[#A342FF] dark:text-purple-400 opacity-90 leading-snug break-words">
                              {item.meaning}
                            </p>

                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <div className="text-right">
                                <p
                                  className={`text-[9px] lg:text-[10px] font-black uppercase tracking-wider ${isDue && !isNew ? "text-orange-500 animate-pulse" : "text-slate-500"}`}
                                >
                                  {isNew
                                    ? "Mục mới"
                                    : isDue
                                      ? "Ôn ngay"
                                      : new Date(item.nextReview).toLocaleDateString("vi-VN")}
                                </p>
                                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                  {!isNew && (
                                    <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 opacity-60">
                                      {formatInterval(item)}
                                    </span>
                                  )}
                                  <span className="text-[9px] font-black text-slate-400 opacity-60 uppercase bg-slate-100/50 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[80px] lg:max-w-[120px]">
                                    {item.deckName &&
                                    !IS_UUID.test(item.deckName) &&
                                    item.deckName !== "Bài học cá nhân"
                                      ? item.deckName
                                      : formatDeckName(item.deck || item.deckId, deckTitleMap)}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  removeSrsItem(item.id || item.word);
                                }}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {item.type === "kanji" && item.mnemonic && (
                          <div className="mt-2.5 px-3 py-2 bg-amber-50/50 dark:bg-amber-500/5 rounded-2xl border border-dashed border-amber-200 dark:border-amber-800/30 flex items-start gap-2">
                            <span className="text-amber-500 text-xs shrink-0 mt-0.5">💡</span>
                            <p className="text-[11px] font-medium text-amber-900/70 dark:text-amber-300/70 italic leading-snug">
                              {item.mnemonic}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Summary Footer */}
            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                    {filteredItems.length}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    Sổ từ hiện tại
                  </span>
                </div>
                <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700" />
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-orange-500 leading-none">
                    {selectedDueDeck.length}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    Đến hạn ôn tập
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        onConfirm={() => {
          resetSRS();
          setShowConfirmReset(false);
        }}
        title="Xóa vĩnh viễn dữ liệu?"
        message="Hành động này sẽ xóa toàn bộ tiến độ học tập và lịch sử ôn tập. Bạn có chắc muốn bắt đầu lại từ đầu?"
        confirmLabel="Xóa dữ liệu"
        variant="danger"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }`,
        }}
      />
    </div>
  );
};
