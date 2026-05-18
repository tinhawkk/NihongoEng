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
  Settings,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { readingListeningService } from "../services/readingListeningService";
import { useUserStore } from "../store/useUserStore";
import { useToastStore } from "../store/useToastStore";
import { tts } from "../utils/tts";
import { PedagogicalText } from "../components/ui/GrammarFormItem";
import { Headphones as HeadphonesIcon, Volume2 } from "lucide-react";

const JSON_TEMPLATE = {
  title: "Bài đọc thực chiến N3 #1",
  level: "N3",
  type: "reading",
  image_url: "",
  audio_url: "",
  reading_points: "Ghi chú nhanh cho bài học này...",
  sections: [
    {
      title: "Mondai 1",
      audio_url: "",
      content: "店(みせ)で買い物(かいもの)uをすると、何をいくらで買ったか書いてある紙、つまりレシートをもらう。",
      translation: "Khi mua sắm ở cửa hàng, bạn sẽ nhận được một tờ giấy ghi rõ mua cái gì với giá bao nhiêu, tức là hóa đơn.",
      vocabulary: [
        { word: "店", furigana: "みせ", meaning: "cửa hàng, tiệm" },
        { word: "買い物", furigana: "かいもの", meaning: "mua sắm" }
      ],
      questions: [
        {
          question_text: "Câu hỏi số 1",
          image_url: "",
          options: ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"],
          correct_index: 0,
          explanation: "Giải thích chi tiết..."
        }
      ]
    }
  ]
};

const compileSectionContent = (passage, vocabulary, translation) => {
  let html = passage || "";
  
  if (vocabulary && vocabulary.length > 0) {
    let vocabHtml = `<!-- VOCABULARY_START --><div class="vocab-section mt-8 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-slate-100 dark:border-slate-800/80"><h5 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">📖 Từ vựng tham khảo</h5><div class="grid grid-cols-1 sm:grid-cols-2 gap-3">`;
    
    vocabulary.forEach(v => {
      const word = v.word || "";
      const furigana = v.furigana ? `(${v.furigana})` : "";
      const meaning = v.meaning || "";
      
      vocabHtml += `<div class="vocab-item flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm" data-word="${v.word || ""}" data-furigana="${v.furigana || ""}" data-meaning="${v.meaning || ""}"><div class="flex items-baseline gap-1.5"><span class="font-bold text-slate-800 dark:text-white">${word}</span>${v.furigana ? `<span class="text-xs font-semibold text-slate-400">${furigana}</span>` : ""}</div><span class="text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">${meaning}</span></div>`;
    });
    
    vocabHtml += `</div></div><!-- VOCABULARY_END -->`;
    html += vocabHtml;
  }
  
  if (translation) {
    const cleanTrans = translation.replace(/\n/g, "<br/>");
    const transHtml = `<!-- TRANSLATION_START --><div class="translation-section mt-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-slate-100 dark:border-slate-800/80"><h5 class="text-xs font-black text-[#1CB0F6] uppercase tracking-wider mb-3 flex items-center gap-2">🇻🇳 Bản dịch tiếng Việt</h5><p class="translation-text text-sm md:text-base text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed">${cleanTrans}</p></div><!-- TRANSLATION_END -->`;
    html += transHtml;
  }
  
  return html;
};

const parseSectionContent = (htmlContent) => {
  if (!htmlContent) return { mainContent: "", vocabHtml: "", translationHtml: "" };
  
  let mainContent = htmlContent;
  let vocabHtml = "";
  let translationHtml = "";

  // Extract Vocabulary Block
  const vocabStartIdx = htmlContent.indexOf("<!-- VOCABULARY_START -->");
  const vocabEndIdx = htmlContent.indexOf("<!-- VOCABULARY_END -->");
  if (vocabStartIdx !== -1 && vocabEndIdx !== -1) {
    vocabHtml = htmlContent.substring(vocabStartIdx + "<!-- VOCABULARY_START -->".length, vocabEndIdx);
    // Remove vocabulary block from main text
    mainContent = mainContent.substring(0, vocabStartIdx) + mainContent.substring(vocabEndIdx + "<!-- VOCABULARY_END -->".length);
  }

  // Extract Translation Block
  const transStartIdx = mainContent.indexOf("<!-- TRANSLATION_START -->");
  const transEndIdx = mainContent.indexOf("<!-- TRANSLATION_END -->");
  if (transStartIdx !== -1 && transEndIdx !== -1) {
    translationHtml = mainContent.substring(transStartIdx + "<!-- TRANSLATION_START -->".length, transEndIdx);
    // Remove translation block from main text
    mainContent = mainContent.substring(0, transStartIdx) + mainContent.substring(transEndIdx + "<!-- TRANSLATION_END -->".length);
  }

  return {
    mainContent: mainContent.trim(),
    vocabHtml: vocabHtml.trim(),
    translationHtml: translationHtml.trim()
  };
};

const LEVELS = ["N5", "N4", "N3", "N2", "N1"];

export const ReadingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const level = searchParams.get("level") || "N5";
  const lessonIdFromUrl = searchParams.get("lessonId");

  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);
  const [activeDrawerSection, setActiveDrawerSection] = useState(null);
  const [drawerTab, setDrawerTab] = useState("vocab");

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
    if (lessonsLoading) return;
    setLessonsLoading(true);
    try {
      const data = await readingListeningService.fetchLessons(level);
      setLessons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[ReadingPage] loadLessons failed:", err);
      setLessons([]);
    } finally {
      setLessonsLoading(false);
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

      const processedSections = (sections || []).map(sec => {
        let content = compileSectionContent(sec.content, sec.vocabulary, sec.translation);
        if (sec.audio_url) {
          content = `[audio: ${sec.audio_url}]\n${content}`;
        }
        const { id, audio_url, vocabulary, translation, ...rest } = sec;
        if (rest.questions) {
          rest.questions = rest.questions.map(q => {
            const { id: qId, ...qRest } = q;
            let qText = qRest.question_text || "";
            if (qRest.image_url) {
              qText = `<img src="${qRest.image_url}" class="max-w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm mb-4" />\n${qText}`;
            }
            const { image_url, ...qFinal } = qRest;
            return { ...qFinal, question_text: qText };
          });
        }
        return { ...rest, content };
      });

      await readingListeningService.importLesson(lessonData, processedSections);
      
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
  const [jsonInput, setJsonInput] = useState("");
  const [showCloudinaryModal, setShowCloudinaryModal] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [cloudinaryConfig, setCloudinaryConfig] = useState(() => {
    return {
      cloudName: localStorage.getItem("cloudinary_cloud_name") || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "",
      uploadPreset: localStorage.getItem("cloudinary_upload_preset") || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "",
    };
  });

  const handleCloudinaryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const { cloudName, uploadPreset } = cloudinaryConfig;
    if (!cloudName || !uploadPreset) {
      addToast("Vui lòng cấu hình Cloudinary trước!", "warning");
      setShowCloudinaryModal(true);
      return;
    }

    setUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("resource_type", "video");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Tải lên thất bại");
      }

      const data = await res.json();
      navigator.clipboard.writeText(data.secure_url);
      addToast("Tải audio thành công! Đã copy link vào clipboard.", "success");
    } catch (err) {
      console.error(err);
      addToast("Lỗi tải lên: " + err.message, "error");
    } finally {
      setUploadingAudio(false);
      e.target.value = "";
    }
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(JSON.stringify(JSON_TEMPLATE, null, 2));
    addToast("Đã copy JSON mẫu vào clipboard!", "success");
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
    if (!jsonInput.trim()) {
      addToast("Vui lòng dán JSON bài học!", "warning");
      return;
    }
    try {
      setLoading(true);
      const jsonData = JSON.parse(jsonInput);
      const { sections, ...lessonData } = jsonData;
      if (!lessonData.title) throw new Error("File JSON thiếu trường title");
      if (!lessonData.level) lessonData.level = level;

      const processedSections = (sections || []).map(sec => {
        let content = compileSectionContent(sec.content, sec.vocabulary, sec.translation);
        if (sec.audio_url) {
          content = `[audio: ${sec.audio_url}]\n${content}`;
        }
        const { id, audio_url, vocabulary, translation, ...rest } = sec;
        if (rest.questions) {
          rest.questions = rest.questions.map(q => {
            const { id: qId, ...qRest } = q;
            let qText = qRest.question_text || "";
            if (qRest.image_url) {
              qText = `<img src="${qRest.image_url}" class="max-w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm mb-4" />\n${qText}`;
            }
            const { image_url, ...qFinal } = qRest;
            return { ...qFinal, question_text: qText };
          });
        }
        return { ...rest, content };
      });

      await readingListeningService.importLesson(lessonData, processedSections);
      
      addToast(`Import thành công vào cấp độ ${lessonData.level}!`, "success");
      setJsonInput("");
      setIsImportMode(false);
      
      if (lessonData.level !== level) {
        setLevel(lessonData.level);
      } else {
        loadLessons();
      }
    } catch (err) {
      console.error("Import Error:", err);
      addToast("Lỗi import JSON: " + err.message, "error");
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
        .vocab-accordion-content .vocab-section {
          margin-top: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
        }
        .vocab-accordion-content .vocab-section h5 {
          display: none !important;
        }
        .translation-accordion-content .translation-section {
          margin-top: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
        }
        .translation-accordion-content .translation-section h5 {
          display: none !important;
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
                const { id, created_at, ...lessonData } = selectedLesson;
                const cleanLessonData = JSON.parse(JSON.stringify(lessonData));
                
                if (cleanLessonData.sections) {
                  cleanLessonData.sections = cleanLessonData.sections.map(sec => {
                    const { id: sId, ...secCopy } = sec;
                    
                    const audioMatch = secCopy.content?.match(/\[audio:\s*([^\]]+)\]/);
                    if (audioMatch) {
                      secCopy.audio_url = audioMatch[1].trim();
                      secCopy.content = secCopy.content.replace(/\[audio:\s*([^\]]+)\]\n?/, "");
                    }
                    
                    // Extract vocabulary
                    const vocabMatches = [...(secCopy.content || "").matchAll(/data-word="([^"]*)" data-furigana="([^"]*)" data-meaning="([^"]*)"/g)];
                    if (vocabMatches.length > 0) {
                      secCopy.vocabulary = vocabMatches.map(m => ({
                        word: m[1],
                        furigana: m[2],
                        meaning: m[3]
                      }));
                    }
                    
                    // Extract translation
                    const transMatch = secCopy.content?.match(/<!-- TRANSLATION_START -->[\s\S]*?<p class="translation-text[^>]*>([\s\S]*?)<\/p>[\s\S]*?<!-- TRANSLATION_END -->/);
                    if (transMatch) {
                      secCopy.translation = transMatch[1].replace(/<br\s*\/?>/gi, "\n");
                    }
                    
                    // Clean up compiled HTML from content
                    if (secCopy.content) {
                      secCopy.content = secCopy.content
                        .replace(/<!-- VOCABULARY_START -->[\s\S]*?<!-- VOCABULARY_END -->/g, "")
                        .replace(/<!-- TRANSLATION_START -->[\s\S]*?<!-- TRANSLATION_END -->/g, "")
                        .trim();
                    }
                    
                    if (secCopy.questions) {
                      secCopy.questions = secCopy.questions.map(q => {
                        const { id: qId, ...qCopy } = q;
                        const imgMatch = qCopy.question_text?.match(/<img src="([^"]+)"[^>]*\/>\n?/);
                        if (imgMatch) {
                          qCopy.image_url = imgMatch[1];
                          qCopy.question_text = qCopy.question_text.replace(/<img src="([^"]+)"[^>]*\/>\n?/, "");
                        }
                        return qCopy;
                      });
                    }
                    return secCopy;
                  });
                }
                
                setJsonInput(JSON.stringify(cleanLessonData, null, 2));
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
              if (!isImportMode) {
                if (!jsonInput.trim()) {
                  setJsonInput(JSON.stringify(JSON_TEMPLATE, null, 2));
                }
              } else {
                setJsonInput("");
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
          initial="hidden"
          animate="show"
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
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-800 rounded-[40px] border-2 border-slate-100 dark:border-slate-800 p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
                    <Save size={24} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                      Nhập liệu bài học (JSON)
                    </h3>
                    <p className="text-sm font-bold text-slate-400">
                      Dán nội dung JSON vào bên dưới để thêm bài đọc/nghe mới
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="cloudinary-audio-upload"
                    accept="audio/*"
                    onChange={handleCloudinaryUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => {
                      if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
                        setShowCloudinaryModal(true);
                      } else {
                        document.getElementById("cloudinary-audio-upload").click();
                      }
                    }}
                    disabled={uploadingAudio}
                    className="px-4 py-3 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 rounded-2xl font-black text-xs uppercase hover:bg-sky-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <UploadCloud size={16} className={uploadingAudio ? "animate-bounce" : ""} />
                    {uploadingAudio ? "ĐANG TẢI LÊN..." : "TẢI AUDIO LÊN"}
                  </button>
                  <button
                    onClick={() => setShowCloudinaryModal(true)}
                    title="Cấu hình Cloudinary"
                    className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-colors shadow-sm flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={copyTemplate}
                    className="px-4 py-3 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-2xl font-black text-xs uppercase hover:bg-amber-200 transition-colors flex items-center gap-2"
                  >
                    <FileText size={16} /> Copy JSON Mẫu
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  placeholder="Dán JSON vào đây..."
                  className="w-full px-5 py-4 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-[#1CB0F6] outline-none font-mono text-sm h-[500px] resize-y"
                  spellCheck={false}
                />
              </div>

              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full py-5 bg-[#58CC02] text-white rounded-[2rem] font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Save size={24} />
                {loading ? "Đang lưu hệ thống..." : "Lưu Bài Học"}
              </button>
            </div>
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

            {selectedLesson.sections?.map((sec, sIdx) => {
              const audioMatch = sec.content?.match(/\[audio:\s*([^\]]+)\]/);
              const sectionAudioUrl = audioMatch ? audioMatch[1].trim() : null;
              const cleanContent = sec.content 
                ? sec.content.replace(/\[audio:\s*([^\]]+)\]\n?/, "")
                : "";

              const { mainContent, vocabHtml, translationHtml } = parseSectionContent(cleanContent);

              return (
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
                      {mainContent && (
                        <button 
                           onClick={() => tts.speak(cleanTextForTTS(renderContent(mainContent)))}
                           onMouseEnter={() => tts.speak(cleanTextForTTS(renderContent(mainContent)))}
                           className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-[#58CC02]/10 hover:text-[#58CC02] transition-all font-black text-[10px] uppercase text-slate-500"
                        >
                           <Volume2 size={14} /> Nghe nội dung
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedLesson.type === "listening" && sectionAudioUrl && (
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-3xl border-2 border-slate-100 dark:border-slate-800 flex items-center gap-4 w-full animate-fadeIn">
                      <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center font-bold shrink-0">
                        <Headphones size={20} />
                      </div>
                      <audio 
                        controls 
                        src={sectionAudioUrl} 
                        className="h-10 flex-1" 
                      />
                    </div>
                  )}

                  {mainContent && (
                    <div
                      className="text-lg md:text-xl font-medium tracking-wide text-slate-800 dark:text-slate-100 reading-text-container leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderContent(mainContent) }}
                    />
                  )}

                  {/* Drawer triggers */}
                  {(vocabHtml || translationHtml) && (
                    <div className="flex flex-wrap gap-3 mt-6">
                      {vocabHtml && (
                        <button
                          onClick={() => {
                            setActiveDrawerSection({ ...sec, vocabHtml, translationHtml });
                            setDrawerTab("vocab");
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 hover:border-[#1CB0F6]/30 text-slate-600 dark:text-slate-300 font-black text-xs uppercase transition-all shadow-sm hover:shadow"
                        >
                          <span>📖</span> Từ vựng tham khảo
                        </button>
                      )}
                      {translationHtml && (
                        <button
                          onClick={() => {
                            setActiveDrawerSection({ ...sec, vocabHtml, translationHtml });
                            setDrawerTab("translation");
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 hover:border-[#1CB0F6]/30 text-slate-600 dark:text-slate-300 font-black text-xs uppercase transition-all shadow-sm hover:shadow"
                        >
                          <span>🇻🇳</span> Bản dịch tiếng Việt
                        </button>
                      )}
                    </div>
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
            );
          })}

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
          <motion.div
            key="list"
            variants={containerVars}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="w-full"
          >
            {lessonsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(idx => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-800 rounded-[40px] border-2 border-slate-100 dark:border-slate-800 p-8 space-y-4 shadow-sm animate-pulse"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                      <div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-2/3 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                    <div className="flex items-center gap-3 pt-2">
                      <div className="h-4 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="h-1 w-1 rounded-full bg-slate-200" />
                      <div className="h-4 w-24 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : lessons.length > 0 ? (
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
                             if (!jsonInput.trim()) {
                               setJsonInput(JSON.stringify(JSON_TEMPLATE, null, 2));
                             }
                             setIsImportMode(true);
                          }}
                         className="px-10 py-5 bg-[#1CB0F6] text-white rounded-3xl font-black text-sm shadow-2xl shadow-sky-200/50 hover:scale-105 active:scale-95 transition-all"
                       >
                         Mở trình nhập liệu JSON
                       </button>
                    </div>
                  </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDrawerSection && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDrawerSection(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-fadeIn"
            />

            {/* Slide drawer from right */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 h-screen w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-[#1CB0F6] uppercase tracking-widest">
                    Tài liệu tham khảo
                  </span>
                  <h4 className="text-xl font-black text-slate-800 dark:text-white">
                    {activeDrawerSection.title}
                  </h4>
                </div>
                <button
                  onClick={() => setActiveDrawerSection(null)}
                  className="w-10 h-10 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                >
                  <XCircle size={22} />
                </button>
              </div>

              {/* Drawer Tab Selectors */}
              <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 flex gap-2">
                {activeDrawerSection.vocabHtml && (
                  <button
                    onClick={() => setDrawerTab("vocab")}
                    className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                      drawerTab === "vocab"
                        ? "bg-[#1CB0F6] text-white shadow-lg shadow-[#1CB0F6]/20"
                        : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700 hover:border-slate-200"
                    }`}
                  >
                    📖 Từ vựng
                  </button>
                )}
                {activeDrawerSection.translationHtml && (
                  <button
                    onClick={() => setDrawerTab("translation")}
                    className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                      drawerTab === "translation"
                        ? "bg-[#1CB0F6] text-white shadow-lg shadow-[#1CB0F6]/20"
                        : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700 hover:border-slate-200"
                    }`}
                  >
                    🇻🇳 Bản dịch
                  </button>
                )}
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {drawerTab === "vocab" && activeDrawerSection.vocabHtml && (
                  <div 
                    className="vocab-accordion-content animate-fadeIn"
                    dangerouslySetInnerHTML={{ __html: renderContent(activeDrawerSection.vocabHtml) }}
                  />
                )}
                {drawerTab === "translation" && activeDrawerSection.translationHtml && (
                  <div 
                    className="translation-accordion-content animate-fadeIn"
                    dangerouslySetInnerHTML={{ __html: renderContent(activeDrawerSection.translationHtml) }}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {loading && (
        <div className="fixed inset-0 z-50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#1CB0F6] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* Cloudinary Settings Modal */}
      {showCloudinaryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 p-8 max-w-md w-full shadow-2xl space-y-6 text-slate-800 dark:text-white"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-black flex items-center gap-2">
                ☁️ Cấu hình Cloudinary
              </h3>
              <p className="text-xs font-bold text-slate-400 leading-relaxed">
                Để tải file âm thanh trực tiếp lên Cloudinary, bạn cần cấu hình tài khoản (miễn phí) của mình dưới đây.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  Cloud Name (Tên Cloud)
                </label>
                <input
                  type="text"
                  value={cloudinaryConfig.cloudName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCloudinaryConfig(prev => ({ ...prev, cloudName: val }));
                    localStorage.setItem("cloudinary_cloud_name", val);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-[#1CB0F6] outline-none text-sm font-bold text-slate-800 dark:text-white"
                  placeholder="Ví dụ: dnh90sjsa"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                  Upload Preset (Không ký danh - Unsigned)
                </label>
                <input
                  type="text"
                  value={cloudinaryConfig.uploadPreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCloudinaryConfig(prev => ({ ...prev, uploadPreset: val }));
                    localStorage.setItem("cloudinary_upload_preset", val);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-[#1CB0F6] outline-none text-sm font-bold text-slate-800 dark:text-white"
                  placeholder="Ví dụ: ml_default hoặc preset_cua_ban"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-dashed border-amber-200 dark:border-amber-800 text-[10px] text-amber-600 dark:text-amber-400 font-bold leading-relaxed">
                ⚠️ Lưu ý: Upload preset bắt buộc phải là loại <strong>Unsigned</strong> (Không yêu cầu chữ ký) được bật trong mục Settings ➡️ Upload của Cloudinary.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCloudinaryModal(false)}
                className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-black text-slate-400 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-xs uppercase"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
