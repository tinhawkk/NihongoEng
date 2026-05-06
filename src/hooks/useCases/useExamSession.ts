import { useState, useEffect, useMemo } from "react";
import { examRepository } from "../../data/repositories/NhostExamRepository";
import { geminiService } from "../../services/geminiService";
import { useUserStore } from "../../store/useUserStore";
import { JLPTExam, JLPTQuestion } from "../../types/exam";

export const useExamSession = (examId: string) => {
  const [exam, setExam] = useState<JLPTExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedMondais, setRevealedMondais] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await examRepository.getExamWithQuestions(examId);
        if (!data) {
          console.error("Exam data is empty for ID:", examId);
          setLoading(false);
          return;
        }

        const groupedMondaisMap = new Map();
        (data.mondais || []).forEach(m => {
          if (!groupedMondaisMap.has(m.mondai_number)) {
            groupedMondaisMap.set(m.mondai_number, { ...m, questions: [...(m.questions || [])] });
          } else {
            const existing = groupedMondaisMap.get(m.mondai_number);
            existing.questions.push(...(m.questions || []));
            if (m.instruction_text && !existing.instruction_text) existing.instruction_text = m.instruction_text;
            if (m.audio_url && !existing.audio_url) existing.audio_url = m.audio_url;
          }
        });

        let globalQIndex = 0;
        const allQuestionsList: JLPTQuestion[] = [];
        const processedMondais = Array.from(groupedMondaisMap.values()).map(m => {
          const processedQuestions = m.questions.map((q: any) => {
            if (q.is_mondai_header) return q;
            globalQIndex++;
            const pq = { ...q, globalIndex: globalQIndex, mId: m.id };
            allQuestionsList.push(pq);
            return pq;
          });
          return { ...m, questions: processedQuestions };
        });

        setExam({ ...data, mondais: processedMondais });
        
        const initialEx: Record<string, string> = {};
        allQuestionsList.forEach(q => {
          if (q.explanation) initialEx[q.id] = q.explanation;
        });
        setAiExplanations(initialEx);

        const duration = data.level === 'N5' ? 25 : data.level === 'N4' ? 35 : data.level === 'N3' ? 40 : 60;
        setTimeLeft(duration * 60);
        setTimerActive(true);
      } catch (error) {
        console.error("Error fetching exam details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [examId]);

  useEffect(() => {
    let timer: any;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  const allQuestions = useMemo(() => {
    if (!exam?.mondais) return [];
    return exam.mondais.flatMap(m => m.questions.filter((q: any) => !q.is_mondai_header));
  }, [exam]);

  const totalQ = allQuestions.length;
  const answeredQ = Object.keys(userAnswers).length;

  const handleSelect = (questionId: string, optionIndex: number) => {
    if (isRevealed) return;
    const q = allQuestions.find((it: any) => it.id === questionId);
    if (q && revealedMondais[q.mId as string]) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (isRevealed || !exam) return;
    setIsRevealed(true);
    setTimerActive(false);
    
    try {
      const score = allQuestions.reduce((acc, q: any) => 
        acc + (userAnswers[q.id] === q.correct_index ? 1 : 0), 0
      );
      useUserStore.getState().addQuizResult({
        deckId: `exam_${examId}`,
        score,
        total: totalQ,
        title: exam.title,
        level: exam.level
      });
    } catch (e) {
      console.error("Error submitting:", e);
    }
  };

  const getAIExplanation = async (questionId: string) => {
    if (aiExplanations[questionId] || !exam) return;

    setLoadingExplanations(prev => ({ ...prev, [questionId]: true }));
    try {
      const q = allQuestions.find((it: any) => it.id === questionId);
      if (!q) throw new Error("Question not found");

      const isListening = exam.title.toLowerCase().includes("nghe") || !!q.audio_url;
      const isGrammar = !isListening && (q.question_text.includes("（　）") || q.question_text.includes("___"));
      const isReading = !isListening && !isGrammar && (q.question_text.length > 100 || q.question_text.includes("その") || q.question_text.includes("これ"));

      const stripHtml = (html: string) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        const text = tmp.textContent || tmp.innerText || "";
        return text.replace(/\s+/g, ' ').trim();
      };

      const cleanQuestionText = stripHtml(q.question_text);

      let prompt = `Bạn là chuyên gia luyện thi JLPT. Hãy giải thích đề bài này một cách cực kỳ ngắn gọn, đi thẳng vào trọng tâm. 
      Đề bài: ${cleanQuestionText}
      Các đáp án: ${q.options.join(", ")}
      Đáp án đúng: ${q.options[q.correct_index]}

      CẤU TRÚC BẮT BUỘC (Chỉ trình bày đúng 4 mục sau, KHÔNG viết lời chào, KHÔNG viết giới thiệu, KHÔNG viết kết luận):

      ### 1. Dịch nghĩa & Ngữ cảnh
      (Dịch câu đề bài sang tiếng Việt và giải thích ngắn gọn tình huống)

      ### 2. Phân tích Ngữ pháp & Từ vựng
      (Giải thích cấu trúc ngữ pháp chính hoặc từ vựng then chốt trong câu)

      ### 3. Tại sao chọn "${q.options[q.correct_index]}"?
      (Giải thích logic chọn đáp án đúng và lý do các đáp án khác sai)

      ### 4. Mẹo nhớ & Kanji (Nếu có)
      (Sáng tạo câu chuyện vui về bộ thủ Kanji hoặc mẹo làm bài nhanh cho dạng này)`;

      prompt += `\n\nLƯU Ý: Tuyệt đối ĐI THẲNG vào 4 mục trên. KHÔNG dông dài.`;
      
      const realResponse = await geminiService.generateExplanation(prompt, {
        audioUrl: q.audio_url,
        imageUrl: q.image_url
      });

      await examRepository.updateQuestionExplanation(questionId, realResponse);
      setAiExplanations(prev => ({ ...prev, [questionId]: realResponse }));
    } catch (error) {
      console.error("AI Explanation Error:", error);
      alert("Lỗi tải giải thích AI!");
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleDeleteMondai = async (mondaiId: string) => {
    try {
      await examRepository.deleteMondai(mondaiId);
      window.location.reload();
    } catch (e: any) {
      alert("Lỗi khi xóa: " + e.message);
    }
  };

  return {
    exam,
    loading,
    allQuestions,
    totalQ,
    answeredQ,
    userAnswers,
    isRevealed,
    setIsRevealed,
    revealedMondais,
    setRevealedMondais,
    timeLeft,
    setTimeLeft,
    timerActive,
    setTimerActive,
    aiExplanations,
    loadingExplanations,
    handleSelect,
    handleSubmit,
    getAIExplanation,
    handleDeleteMondai,
    handleUpdateMondai: async (mondaiId: string, updates: Partial<JLPTMondai>) => {
      await examRepository.updateMondai(mondaiId, updates);
    },
    handleUpdateQuestion: async (questionId: string, updates: Partial<JLPTQuestion>) => {
      await examRepository.updateQuestion(questionId, updates);
    }
  };
};

