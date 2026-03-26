import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Headphones,
  ChevronRight,
  Plus,
  CheckCircle2,
  XCircle,
  Play,
  ArrowLeft,
  ImageIcon,
  FileText,
  Save,
  Trash2,
  Sparkles,
  Layers,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { readingListeningService } from "../services/readingListeningService";
import { useUserStore } from "../store/useUserStore";
import { useToastStore } from "../store/useToastStore";
import { tts } from "../utils/tts";
import { PedagogicalText } from "../components/ui/GrammarFormItem";
import { Headphones as HeadphonesIcon, Volume2 } from "lucide-react";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"];

export const ReadingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const level = searchParams.get("level") || "N5";
  const lessonIdFromUrl = searchParams.get("lessonId");

  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);

  const setLevel = (val) => {
    const next = new URLSearchParams(searchParams);
    next.set("level", val);
    next.delete("lessonId");
    setSearchParams(next, { replace: true });
  };

  const setSelectedLessonId = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("lessonId", id);
    else next.delete("lessonId");
    setSearchParams(next);
  };

  const audioInPageRef = React.useRef(null);
  const { account } = useUserStore();
  const addToast = useToastStore(s => s.addToast);

  // Load lesson details if lessonId is present in URL
  useEffect(() => {
    if (lessonIdFromUrl) {
      const fetchDetail = async () => {
        setLoading(true);
        try {
          const detail = await readingListeningService.fetchLessonDetail(lessonIdFromUrl);
          setSelectedLesson(detail);
          setUserAnswers({});
          setShowResults(false);
          if (audioInPageRef.current) audioInPageRef.current.pause();
        } catch (err) {
          console.error("Fetch detail failed:", err);
          addToast("Không thể tải chi tiết bài học", "error");
          setSelectedLessonId(null);
        } finally {
          setLoading(false);
        }
      };
      fetchDetail();
    } else {
      setSelectedLesson(null);
    }
  }, [lessonIdFromUrl]);

  const loadLessons = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await readingListeningService.fetchLessons(level);
      setLessons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[ReadingPage] loadLessons failed:", err);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto load when level or selectedLesson changes
  useEffect(() => {
    if (!selectedLesson) {
      loadLessons();
    }
  }, [level, selectedLesson]);

  const handleSelectLesson = lesson => {
    setSelectedLessonId(lesson.id);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleAnswerChange = (questionId, index) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: index }));
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileUpload = async event => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      const { sections, ...lessonData } = jsonData;
      if (!lessonData.title) throw new Error("File JSON thiếu trường title");
      
      if (!lessonData.level) lessonData.level = level;
      
      await readingListeningService.importLesson(lessonData, sections || []);
      
      addToast(`Đã thêm thành công: ${lessonData.title}!`, "success");
      loadLessons();
      event.target.value = null; // reset
    } catch (err) {
      console.error("Upload failed", err);
      addToast("Lỗi import JSON: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- Import Logic ---
  const [newLesson, setNewLesson] = useState({
    title: "",
    reading_points: "",
    type: "reading",
    level: "N5",
    image_url: "",
    audio_url: "",
  });

  // Now sections (Mondais)
  const [sections, setSections] = useState([
    {
      title: "Mondai 1",
      content: "",
      questions: [
        { question_text: "", options: ["", "", "", ""], correct_index: 0, explanation: "" },
      ],
    },
  ]);

  const handleAddSection = () => {
    setSections([
      ...sections,
      {
        title: `Mondai ${sections.length + 1}`,
        content: "",
        questions: [
          { question_text: "", options: ["", "", "", ""], correct_index: 0, explanation: "" },
        ],
      },
    ]);
  };

  const handleRemoveSection = idx => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== idx));
    }
  };

  const handleSectionChange = (idx, field, value) => {
    const updated = [...sections];
    updated[idx][field] = value;
    setSections(updated);
  };

  const handleAddQuestion = sIdx => {
    const updated = [...sections];
    updated[sIdx].questions.push({
      question_text: "",
      options: ["", "", "", ""],
      correct_index: 0,
      explanation: "",
    });
    setSections(updated);
  };

  const handleQuestionChange = (sIdx, qIdx, field, value) => {
    const updated = [...sections];
    updated[sIdx].questions[qIdx][field] = value;
    setSections(updated);
  };

  const handleOptionChange = (sIdx, qIdx, oIdx, value) => {
    const updated = [...sections];
    updated[sIdx].questions[qIdx].options[oIdx] = value;
    setSections(updated);
  };

  // Simple Markdown-like formatter with Furigana Support
  const renderContent = text => {
    if (!text) return "";
    return (
      text
        // Support Furigana: 漢字(かんじ) -> <ruby>漢字<rt>かんじ</rt></ruby>
        .replace(
          /([\u4E00-\u9FFF\u3005\u4E00-\u9FA5]+)\(([\u3040-\u309F\u30A0-\u30FF]+)\)/g,
          "<ruby>$1<rt>$2</rt></ruby>"
        )
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
        .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic
        .replace(
          /\[(.*?)\]\((.*?)\)/g,
          '<a href="$2" class="text-[#1CB0F6] hover:underline" target="_blank">$1</a>'
        ) // Links
        .replace(/\n/g, "<br/>")
    ); // Newlines
  };

  const cleanTextForTTS = html => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    // Remove rt tags for clear speech
    const rts = tmp.querySelectorAll("rt");
    rts.forEach(rt => rt.remove());
    return tmp.textContent || tmp.innerText || "";
  };

  const handleImport = async () => {
    if (!newLesson.title) {
      addToast("Vui lòng nhập tiêu đề bài học!", "warning");
      return;
    }

    // Capture level before reset
    const targetLevel = newLesson.level;

    try {
      setLoading(true);
      await readingListeningService.importLesson(newLesson, sections);

      // Reset form immediately
      setNewLesson({
        title: "",
        reading_points: "",
        type: "reading",
        level: "N5",
        image_url: "",
        audio_url: "",
      });
      setSections([
        {
          title: "Mondai 1",
          content: "",
          questions: [
            { question_text: "", options: ["", "", "", ""], correct_index: 0, explanation: "" },
          ],
        },
      ]);

      addToast(`Import thành công vào cấp độ ${targetLevel}!`, "success");
      setIsImportMode(false);

      // Update the main tab level to match imported lesson
      if (targetLevel !== level) {
        setLevel(targetLevel); // useEffect will trigger loadLessons
      } else {
        loadLessons(); // Same level, refresh manually
      }
    } catch (err) {
      console.error("Import Error:", err);
      addToast("Lỗi import: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVars = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      variants={containerVars}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-8 pb-6"
    >
      <style>{`
        ruby {
          ruby-position: over;
          -webkit-ruby-position: over;
          ruby-align: space-around;
        }
        rt {
          font-family: 'Noto Sans JP', sans-serif;
          font-size: 0.55em;
          font-weight: 600;
          color: #64748b;
          line-height: 1.2;
          text-align: center;
          ruby-align: center;
        }
        .dark rt {
          color: #94a3b8;
        }
        .reading-text-container {
          font-family: 'Noto Sans JP', 'Inter', sans-serif;
          line-height: 2.2 !important;
          word-break: break-word;
        }
      `}</style>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {selectedLesson && (
            <button
              onClick={() => setSelectedLessonId(null)}
              className="p-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-[#1CB0F6] transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              Luyện Đọc & Nghe
            </h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              {isImportMode ? "Nhập liệu bài học nhiều Mondai" : "Bổ sung kỹ năng thực chiến JLPT"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLessons}
            title="Tải lại danh sách"
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-[#1CB0F6] transition-all shadow-sm"
          >
            <RotateCcw size={20} className={loading ? "animate-spin" : ""} />
          </button>

          {selectedLesson && (
            <button
              onClick={() => {
                setNewLesson({
                  title: selectedLesson.title,
                  level: selectedLesson.level,
                  type: selectedLesson.type,
                  image_url: selectedLesson.image_url || "",
                  reading_points: selectedLesson.reading_points || "",
                  audio_url: selectedLesson.audio_url || "",
                });
                setSections(selectedLesson.sections || []);
                setIsImportMode(true);
                setSelectedLessonId(null);
              }}
              className="px-5 py-3 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase shadow-lg shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-2"
            >
              <Sparkles size={16} /> Chỉnh sửa bài
            </button>
          )}

          <button
            onClick={() => {
              if (isImportMode) {
                // Reset form when canceling
                setNewLesson({
                  title: "",
                  level: level,
                  type: "reading",
                  image_url: "",
                  reading_points: "",
                  audio_url: "",
                });
                setSections([
                  {
                    title: "",
                    content: "",
                    questions: [
                      {
                        question_text: "",
                        options: ["", "", "", ""],
                        correct_index: 0,
                        explanation: "",
                      },
                    ],
                  },
                ]);
              }
              setIsImportMode(!isImportMode);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg ${
              isImportMode
                ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                : "bg-[#1CB0F6] text-white shadow-[#1CB0F6]/20 hover:scale-105"
            }`}
          >
            {isImportMode ? <Plus className="w-5 h-5 rotate-45" /> : <Plus className="w-5 h-5" />}
            {isImportMode ? "Hủy bỏ" : "Nhập bài mới"}
          </button>

          <input type="file" id="reading-upload" accept=".json" onChange={handleFileUpload} className="hidden" />
          <button
             disabled={loading}
             onClick={() => document.getElementById("reading-upload").click()}
             className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg bg-indigo-50 dark:bg-slate-800 text-indigo-500 hover:scale-105 border-2 border-indigo-100 dark:border-slate-700 disabled:opacity-50"
          >
             <UploadCloud size={20} className={loading ? "animate-bounce" : ""} />
             <span className="hidden sm:inline">
               {loading ? "ĐANG TẢI..." : "THÊM JSON"}
             </span>
          </button>
        </div>
      </div>

      {!selectedLesson && !isImportMode && (
        <motion.div
          variants={itemVars}
          className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800 overflow-x-auto scrollbar-hide"
        >
          {LEVELS.map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`flex-1 min-w-[80px] px-4 py-3 rounded-xl text-xs font-black transition-all ${
                level === l
                  ? "bg-white dark:bg-slate-700 text-[#1CB0F6] shadow-md"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              JLPT {l}
            </button>
          ))}
        </motion.div>
      )}

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {isImportMode ? (
          <motion.div
            key="import-extended"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            {/* Base Lesson Info */}
            <div className="bg-white dark:bg-slate-800 rounded-[40px] border-2 border-slate-100 dark:border-slate-800 p-8 shadow-xl space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
                  <Sparkles size={24} className="text-indigo-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                  Thông tin tổng quát
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                    Tiêu đề bài học
                  </label>
                  <input
                    type="text"
                    value={newLesson.title}
                    onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-[#1CB0F6] transition-all outline-none font-bold"
                    placeholder="Ví dụ: Bài 1: Đọc hiểu tổng hợp"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                    Level bài học
                  </label>
                  <select
                    value={newLesson.level}
                    onChange={e => setNewLesson({ ...newLesson, level: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-[#1CB0F6] outline-none font-bold"
                  >
                    {LEVELS.map(l => (
                      <option key={l} value={l}>
                        JLPT {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                    Loại bài học
                  </label>
                  <select
                    value={newLesson.type}
                    onChange={e => setNewLesson({ ...newLesson, type: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-[#1CB0F6] outline-none font-bold appearance-none"
                  >
                    <option value="reading">📖 Bài Đọc (Reading)</option>
                    <option value="listening">🎧 Bài Nghe (Listening)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                    Ảnh minh họa bài học
                  </label>
                  <input
                    placeholder="https://..."
                    value={newLesson.image_url}
                    onChange={e => setNewLesson({ ...newLesson, image_url: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-[#1CB0F6] outline-none text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                  Điểm học tập (Reading Points / Hỗ trợ Markdown)
                </label>
                <textarea
                  value={newLesson.reading_points}
                  onChange={e => setNewLesson({ ...newLesson, reading_points: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-[#1CB0F6] outline-none font-medium h-24"
                  placeholder="Dùng **đậm**, *nghiêng*, [link](url)..."
                />
                {newLesson.reading_points && (
                  <div className="mt-2 p-4 bg-amber-50/30 dark:bg-amber-900/10 rounded-xl border border-dashed border-amber-200 text-xs">
                    <span className="text-[9px] font-black text-amber-500 uppercase block mb-1">
                      Xem trước ghi chú:
                    </span>
                    <div
                      dangerouslySetInnerHTML={{ __html: renderContent(newLesson.reading_points) }}
                    />
                  </div>
                )}
              </div>

              {newLesson.type === "listening" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1.5">
                    <Headphones size={14} /> Audio URL
                  </label>
                  <input
                    placeholder="https://..."
                    value={newLesson.audio_url}
                    onChange={e => setNewLesson({ ...newLesson, audio_url: e.target.value })}
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-[#1CB0F6] outline-none text-xs font-bold"
                  />
                </div>
              )}
            </div>

            {/* Sections (Mondais) */}
            <div className="space-y-8">
              <div className="flex items-center justify-between px-4">
                <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers size={18} /> Danh sách Mondai ({sections.length})
                </h4>
                <button
                  onClick={handleAddSection}
                  className="px-4 py-2 bg-[#58CC02] text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-[#58CC02]/20"
                >
                  + Thêm Mondai
                </button>
              </div>

              {sections.map((sec, sIdx) => (
                <div
                  key={sIdx}
                  className="bg-white dark:bg-slate-800 rounded-[40px] border-2 border-slate-100 dark:border-slate-800 p-8 shadow-lg space-y-6 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-2xl bg-[#1CB0F6] text-white flex items-center justify-center font-black text-sm">
                        #{sIdx + 1}
                      </span>
                      <input
                        value={sec.title}
                        onChange={e => handleSectionChange(sIdx, "title", e.target.value)}
                        className="bg-transparent border-b-2 border-transparent focus:border-[#1CB0F6] outline-none font-black text-xl text-slate-700 dark:text-white"
                        placeholder="Tên Mondai..."
                      />
                    </div>
                    {sections.length > 1 && (
                      <button
                        onClick={() => handleRemoveSection(sIdx)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                      Nội dung bài đọc (Hỗ trợ Markdown)
                    </label>
                    <textarea
                      value={sec.content}
                      onChange={e => handleSectionChange(sIdx, "content", e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-[#1CB0F6] outline-none font-medium h-32 leading-relaxed"
                      placeholder="Nội dung bài đọc của riêng Mondai này..."
                    />
                    {sec.content && (
                      <div className="mt-2 p-5 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-2">
                          Xem trước nội dung:
                        </span>
                        <div
                          className="leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderContent(sec.content) }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Questions for this section */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        Câu hỏi ({sec.questions.length})
                      </h5>
                      <button
                        onClick={() => handleAddQuestion(sIdx)}
                        className="text-[11px] font-black text-[#58CC02] uppercase hover:underline"
                      >
                        + Thêm câu
                      </button>
                    </div>

                    <div className="space-y-6">
                      {sec.questions.map((q, qIdx) => (
                        <div
                          key={qIdx}
                          className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/30 border-2 border-slate-100 dark:border-slate-800 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-300">
                              CÂU {qIdx + 1}
                            </span>
                            {sec.questions.length > 1 && (
                              <button
                                onClick={() => {
                                  const updated = [...sections];
                                  updated[sIdx].questions = sec.questions.filter(
                                    (_, i) => i !== qIdx
                                  );
                                  setSections(updated);
                                }}
                                className="text-slate-200 hover:text-red-400"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </div>
                          <input
                            placeholder="Câu hỏi..."
                            value={q.question_text}
                            onChange={e =>
                              handleQuestionChange(sIdx, qIdx, "question_text", e.target.value)
                            }
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-transparent focus:border-[#1CB0F6] outline-none font-bold text-sm"
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt, oIdx) => (
                              <input
                                key={oIdx}
                                placeholder={`Đáp án ${oIdx + 1}`}
                                value={opt}
                                onChange={e => handleOptionChange(sIdx, qIdx, oIdx, e.target.value)}
                                className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border-2 border-transparent focus:border-[#1CB0F6] outline-none text-xs"
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-4">
                            <select
                              value={q.correct_index}
                              onChange={e =>
                                handleQuestionChange(
                                  sIdx,
                                  qIdx,
                                  "correct_index",
                                  parseInt(e.target.value)
                                )
                              }
                              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-[10px] font-black"
                            >
                              {q.options.map((_, i) => (
                                <option key={i} value={i}>
                                  Đúng: Đáp án {i + 1}
                                </option>
                              ))}
                            </select>
                            <input
                              placeholder="Giải thích..."
                              value={q.explanation}
                              onChange={e =>
                                handleQuestionChange(sIdx, qIdx, "explanation", e.target.value)
                              }
                              className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 outline-none text-[10px]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleImport}
              disabled={loading}
              className="w-full py-5 bg-[#58CC02] text-white rounded-[2rem] font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Save size={24} />
              {loading ? "Đang lưu hệ thống..." : "Lưu Toàn Bộ Mondai"}
            </button>
          </motion.div>
        ) : selectedLesson ? (
          <motion.div
            key="lesson-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-10"
          >
            <button
              onClick={() => setSelectedLessonId(null)}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-black text-xs uppercase hover:bg-white transition-all"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />{" "}
              Quay lại
            </button>

            {/* Lesson Header */}
            <div className="bg-white dark:bg-slate-800 rounded-[40px] border-2 border-slate-100 dark:border-slate-800 p-8 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="relative z-10 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <span className="px-3 py-1 bg-[#1CB0F6]/10 text-[#1CB0F6] rounded-full text-[10px] font-black uppercase">
                      JLPT {selectedLesson.level || level}
                    </span>
                    <h3 className="text-3xl md:text-5xl font-black leading-tight text-slate-800 dark:text-white">
                      {selectedLesson.title}
                    </h3>
                  </div>
                  {selectedLesson.audio_url && (
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-3xl border-2 border-slate-100 dark:border-slate-800 flex items-center gap-4">
                      <audio 
                        ref={audioInPageRef}
                        controls 
                        src={selectedLesson.audio_url} 
                        className="h-10 flex-1" 
                      />
                    </div>
                  )}
                </div>

                {selectedLesson.reading_points && (
                  <div className="bg-amber-50/50 dark:bg-amber-900/10 border-2 border-amber-200/50 dark:border-amber-500/10 rounded-3xl p-8 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-600 uppercase flex items-center gap-2">
                        <Sparkles size={14} className="fill-current" /> Reading Points
                      </span>
                      <button 
                        onClick={() => tts.speak(cleanTextForTTS(renderContent(selectedLesson.reading_points)))}
                        onMouseEnter={() => tts.speak(cleanTextForTTS(renderContent(selectedLesson.reading_points)))}
                        className="p-2 rounded-xl bg-amber-200/50 hover:bg-amber-300 transition-colors text-amber-700"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                    <div className="reading-text-container">
                      <PedagogicalText text={selectedLesson.reading_points} mode="list" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sections Content */}
            {selectedLesson.sections?.map((sec, sIdx) => (
              <div
                key={sec.id}
                className="bg-white dark:bg-slate-800 rounded-[40px] border-2 border-slate-100 dark:border-slate-800 p-8 md:p-12 shadow-xl space-y-10"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#58CC02] text-white flex items-center justify-center font-black text-sm shadow-lg shadow-[#58CC02]/20">
                    #{sIdx + 1}
                  </div>
                  <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white">
                      {sec.title}
                    </h4>
                    {sec.content && (
                      <button 
                         onClick={() => tts.speak(cleanTextForTTS(renderContent(sec.content)))}
                      onMouseEnter={() => tts.speak(cleanTextForTTS(renderContent(sec.content)))}
                         className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-[#58CC02]/10 hover:text-[#58CC02] transition-all font-black text-[10px] uppercase text-slate-500"
                      >
                         <Volume2 size={14} /> Nghe nội dung
                      </button>
                    )}
                  </div>
                </div>

                {sec.content && (
                  <div
                    className="text-lg md:text-xl font-medium tracking-wide text-slate-800 dark:text-slate-100 reading-text-container"
                    dangerouslySetInnerHTML={{ __html: renderContent(sec.content) }}
                  />
                )}

                <div className="space-y-10">
                  {sec.questions?.map((q, idx) => (
                    <div key={q.id} className="space-y-6">
                      <div className="flex items-start gap-4">
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div
                          className="text-lg font-black text-slate-800 dark:text-white leading-snug reading-text-container"
                          dangerouslySetInnerHTML={{ __html: renderContent(q.question_text) }}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-12">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = userAnswers[q.id] === oIdx;
                          const isCorrect = q.correct_index === oIdx;

                          let btnClass =
                            "p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 group/opt";
                          if (showResults) {
                            if (isCorrect)
                              btnClass += " border-[#58CC02] bg-[#58CC02]/10 text-[#2D6601]";
                            else if (isSelected)
                              btnClass += " border-[#FF4B4B] bg-[#FF4B4B]/10 text-[#911818]";
                            else btnClass += " border-slate-50 opacity-40";
                          } else {
                            btnClass += isSelected
                              ? " border-[#1CB0F6] bg-[#DDF4FF] dark:bg-sky-900/30 text-[#1CB0F6]"
                              : " border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-200";
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={showResults}
                              onClick={() => handleAnswerChange(q.id, oIdx)}
                              className={btnClass}
                            >
                              <span
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${
                                  isSelected
                                    ? "bg-[#1CB0F6] text-white"
                                    : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                                }`}
                              >
                                {oIdx + 1}
                              </span>
                              <div
                                className="text-xl font-bold reading-text-container"
                                dangerouslySetInnerHTML={{ __html: renderContent(opt) }}
                              />
                            </button>
                          );
                        })}
                      </div>
                      {showResults && q.explanation && (
                        <div className="ml-0 md:ml-12 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-l-4 border-[#1CB0F6] text-sm italic opacity-80">
                          <span className="font-black">Giải thích:</span> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Fallback Questions (Old simple format or combined questions) */}
            {selectedLesson.questions?.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-[40px] border-2 border-slate-100 dark:border-slate-800 p-8 md:p-12 shadow-xl space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#1CB0F6] text-white flex items-center justify-center font-black text-sm shadow-lg shadow-[#1CB0F6]/20">
                    <FileText size={20} />
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 dark:text-white">
                    Câu hỏi tổng hợp
                  </h4>
                </div>
                <div className="space-y-10">
                  {selectedLesson.questions.map((q, idx) => (
                    <div key={q.id} className="space-y-6">
                      <div className="flex items-start gap-4">
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div
                          className="text-lg font-black text-slate-800 dark:text-white leading-snug reading-text-container"
                          dangerouslySetInnerHTML={{ __html: renderContent(q.question_text) }}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-12">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = userAnswers[q.id] === oIdx;
                          const isCorrect = q.correct_index === oIdx;
                          let btnClass =
                            "p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 group/opt";
                          if (showResults) {
                            if (isCorrect)
                              btnClass += " border-[#58CC02] bg-[#58CC02]/10 text-[#2D6601]";
                            else if (isSelected)
                              btnClass += " border-[#FF4B4B] bg-[#FF4B4B]/10 text-[#911818]";
                            else btnClass += " border-slate-50 opacity-40";
                          } else {
                            btnClass += isSelected
                              ? " border-[#1CB0F6] bg-[#DDF4FF] dark:bg-sky-900/30 text-[#1CB0F6]"
                              : " border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-200";
                          }
                          return (
                            <button
                              key={oIdx}
                              disabled={showResults}
                              onClick={() => handleAnswerChange(q.id, oIdx)}
                              className={btnClass}
                            >
                              <span
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${
                                  isSelected
                                    ? "bg-[#1CB0F6] text-white"
                                    : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                                }`}
                              >
                                {oIdx + 1}
                              </span>
                              <div
                                className="text-xl font-bold reading-text-container"
                                dangerouslySetInnerHTML={{ __html: renderContent(opt) }}
                              />
                            </button>
                          );
                        })}
                      </div>
                      {showResults && q.explanation && (
                        <div className="ml-0 md:ml-12 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-l-4 border-[#1CB0F6] text-sm italic opacity-80">
                          <span className="font-black">Giải thích:</span> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showResults && (
              <div className="bg-white dark:bg-slate-800 rounded-[40px] border-4 border-[#1CB0F6] p-8 md:p-12 shadow-2xl text-center space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#1CB0F6]/10 rounded-full -mr-16 -mt-16" />
                <Sparkles className="mx-auto text-amber-400" size={64} fill="currentColor" />
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-800 dark:text-white">
                    Thành tích của bạn!
                  </h3>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Bài học: {selectedLesson.title}
                  </p>
                </div>
                
                <div className="flex justify-center gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-black text-[#58CC02]">
                      {Object.entries(userAnswers).filter(([qId, ansIdx]) => {
                         const q = [...(selectedLesson.questions || []), ... (selectedLesson.sections?.flatMap(s=>s.questions || []) || [])].find(x => x.id === qId);
                         return q?.correct_index === ansIdx;
                      }).length}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Đúng</div>
                  </div>
                  <div className="w-[1px] bg-slate-100 dark:bg-slate-700 h-12 self-center" />
                  <div className="text-center">
                    <div className="text-4xl font-black text-slate-300">
                      {(selectedLesson.sections?.reduce((a,s)=>a+(s.questions?.length||0), 0) || 0) + (selectedLesson.questions?.length || 0)}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Tổng câu</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setUserAnswers({});
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-black text-slate-400 hover:bg-slate-50 transition-all uppercase text-xs"
                  >
                    Làm lại bài
                  </button>
                  <button
                    onClick={() => setSelectedLesson(null)}
                    className="flex-1 py-4 rounded-2xl bg-[#1CB0F6] text-white font-black hover:scale-105 transition-all uppercase text-xs shadow-lg shadow-[#1CB0F6]/20"
                  >
                    Xong
                  </button>
                </div>
              </div>
            )}

            {!showResults && (
              <button
                onClick={handleSubmitQuiz}
                className="w-full py-5 bg-[#1CB0F6] text-white rounded-[2rem] font-black text-xl shadow-xl shadow-[#1CB0F6]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Nộp bài & Kiểm tra
              </button>
            )}
          </motion.div>
        ) : (
          /* Lesson List */
          <motion.div key="list" variants={containerVars} className="w-full">
            {lessons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lessons.map(lesson => (
                  <motion.div
                    key={lesson.id}
                    variants={itemVars}
                    whileHover={{ y: -6 }}
                    onClick={() => handleSelectLesson(lesson)}
                    className="bg-white dark:bg-slate-800 rounded-[40px] border-2 border-slate-100 dark:border-slate-800 p-8 space-y-4 shadow-sm hover:shadow-2xl hover:border-[#1CB0F6]/30 transition-all cursor-pointer relative group"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center ${lesson.type === "listening" ? "bg-orange-50 text-orange-400" : "bg-[#DDF4FF] text-[#1CB0F6]"}`}
                      >
                        {lesson.type === "listening" ? (
                          <Headphones size={20} />
                        ) : (
                          <BookOpen size={20} />
                        )}
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {lesson.type}
                      </span>
                    </div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white group-hover:text-[#1CB0F6] transition-colors">
                      {lesson.title}
                    </h4>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-lg text-[9px] font-black">
                        {lesson.sections?.length || 0} MONDAI
                      </span>
                      <div className="h-1 w-1 rounded-full bg-slate-200" />
                      <span className="text-[9px] font-bold text-slate-300 uppercase">
                        {new Date(lesson.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-white dark:bg-slate-800/10 rounded-[60px] border-4 border-dashed border-slate-50 dark:border-slate-800">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center">
                       <BookOpen size={48} className="text-slate-200 dark:text-slate-700" />
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-3xl font-black text-slate-800 dark:text-white">Thư viện đang trống</h3>
                       <p className="text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
                        Cấp độ {level} hiện chưa được bổ sung học liệu. Bạn có muốn tự tay soạn bài học đầu tiên không?
                       </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                       <button
                         onClick={loadLessons}
                         className="px-10 py-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-sm hover:border-[#1CB0F6] transition-all shadow-xl shadow-slate-200/20"
                       >
                         Thử tải lại danh sách
                       </button>
                       <button
                         onClick={() => {
                            setNewLesson({ ...newLesson, level: level, title: `Bài đọc thực chiến ${level} #1`, reading_points: "Ghi chú nhanh cho bài học này..." });
                            setIsImportMode(true);
                         }}
                         className="px-10 py-5 bg-[#1CB0F6] text-white rounded-3xl font-black text-sm shadow-2xl shadow-sky-200/50 hover:scale-105 active:scale-95 transition-all"
                       >
                         Mở trình soạn thảo bài đọc
                       </button>
                    </div>
                  </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="fixed inset-0 z-50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#1CB0F6] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </motion.div>
  );
};
