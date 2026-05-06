import { useState, useEffect, useMemo } from "react";
import { examRepository } from "../../data/repositories/NhostExamRepository";
import { useUserStore } from "../../store/useUserStore";
import { JLPTExam } from "../../types/exam";

const EXAMS_PER_PAGE = 12;

function normalizeString(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export const useExamList = () => {
  const [examsByLevel, setExamsByLevel] = useState<Record<string, JLPTExam[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("n5");
  const [examType, setExamType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const quizHistory = useUserStore(s => s.account?.quizHistory || []);

  const fetchExams = async () => {
    try {
      const grouped = await examRepository.getExamsByLevel();
      setExamsByLevel(grouped);
      const levels = Object.keys(grouped).sort();
      if (levels.length > 0 && !grouped[activeTab]) {
        setActiveTab(levels[0]);
      }
    } catch (err) {
      console.error("Failed to fetch JLPT exams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, examType]);

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const examData = JSON.parse(text);
      
      if (!examData.level) examData.level = activeTab;
      
      await examRepository.uploadExam(examData);
      
      alert(`Đã thêm thành công đề thi ${examData.title}!`);
      await fetchExams();
      event.target.value = null;
    } catch (err: any) {
      console.error("Upload failed", err);
      alert("Lỗi khi thêm đề: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const currentExams = useMemo(() => {
    let exams = examsByLevel[activeTab] || [];
    if (examType === "real") {
      exams = exams.filter(e => e.Type === "REAL_EXAM");
    } else if (examType === "knowledge") {
      exams = exams.filter(e => ["VOCAB", "GRAMMAR", "READING"].includes(e.Type || ""));
    } else if (examType === "listening") {
      exams = exams.filter(e => e.is_listening === true || e.Type === "LISTENING");
    }
    if (searchTerm.trim()) {
      const norm = normalizeString(searchTerm.trim());
      exams = exams.filter(e => normalizeString(e.title).includes(norm));
    }
    return exams;
  }, [examsByLevel, activeTab, examType, searchTerm]);

  const totalPages = Math.ceil(currentExams.length / EXAMS_PER_PAGE);
  const paginatedExams = currentExams.slice(
    (currentPage - 1) * EXAMS_PER_PAGE,
    currentPage * EXAMS_PER_PAGE
  );

  const getExamResult = (id: string) => {
    return quizHistory
      .filter((h: any) => h.deckId === `exam_${id}`)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  const levels = Object.keys(examsByLevel).sort().reverse();

  return {
    levels,
    activeTab,
    setActiveTab,
    examType,
    setExamType,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    currentExams,
    paginatedExams,
    totalPages,
    loading,
    uploading,
    handleFileUpload,
    getExamResult,
  };
};

