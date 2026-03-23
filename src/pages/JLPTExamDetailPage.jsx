import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Check, X, Star, RotateCcw, Clock } from "lucide-react";
import { jlptService } from "../services/jlptService";
import { geminiService } from "../services/geminiService";
import { useUserStore } from "../store/useUserStore";

export const JLPTExamDetailPage = () => {
  const { examId: id } = useParams();
  const { account: user } = useUserStore();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState({});
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedMondais, setRevealedMondais] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [aiExplanations, setAiExplanations] = useState({});
  const [loadingExplanations, setLoadingExplanations] = useState({});

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await jlptService.getExamWithQuestions(id);
        if (!data) {
          console.error("Exam data is empty for ID:", id);
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
        const allQuestionsList = [];
        const processedMondais = Array.from(groupedMondaisMap.values()).map(m => {
          const processedQuestions = m.questions.map(q => {
             if (q.is_mondai_header) return q;
             globalQIndex++;
             const pq = { ...q, globalIndex: globalQIndex, mId: m.id };
             allQuestionsList.push(pq);
             return pq;
          });
          return { ...m, questions: processedQuestions };
        });

        setExam({ ...data, mondais: processedMondais });
        
        // Initial load of existing explanations from DB
        const initialEx = {};
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
  }, [id]);

  useEffect(() => {
    let timer;
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
    return exam.mondais.flatMap(m => m.questions.filter(q => !q.is_mondai_header));
  }, [exam]);

  const totalQ = allQuestions.length;
  const answeredQ = Object.keys(userAnswers).length;

  const handleSelect = (questionId, optionIndex) => {
    if (isRevealed) return;
    const q = allQuestions.find(it => it.id === questionId);
    if (q && revealedMondais[q.mId]) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (isRevealed) return;
    setIsRevealed(true);
    setTimerActive(false);
    
    try {
        const score = allQuestions.reduce((acc, q) => 
            acc + (userAnswers[q.id] === q.correct_index ? 1 : 0), 0
        );
        useUserStore.getState().addQuizResult({
            deckId: `exam_${id}`,
            score,
            total: totalQ,
            title: exam.title,
            level: exam.level
        });
    } catch (e) {
        console.error("Error submitting:", e);
    }
  };

  const getAIExplanation = async (questionId) => {
    if (aiExplanations[questionId]) return;

    setLoadingExplanations(prev => ({ ...prev, [questionId]: true }));
    try {
      const q = allQuestions.find(it => it.id === questionId);
      const isListening = exam?.title?.toLowerCase().includes("nghe") || !!q.audio_url;
      const isGrammar = !isListening && (q.question_text.includes("（　）") || q.question_text.includes("___"));
      const isReading = !isListening && !isGrammar && (q.question_text.length > 100 || q.question_text.includes("その") || q.question_text.includes("これ"));
      const isVocab = !isListening && !isGrammar && !isReading;

      let prompt = `Bạn là một chuyên gia luyện thi JLPT. Đây là câu hỏi thuộc phần ${isListening ? 'NGHE HIỂU' : isGrammar ? 'NGỮ PHÁP' : isVocab ? 'TỪ VỰNG' : 'ĐỌC HIỂU'}. Hãy giải thích câu hỏi sau một cách thật chi tiết, hài hước và khoa học:\n\n Đề bài: ${q.question_text}\n Các đáp án: ${q.options.join(", ")}\n Đáp án đúng: ${q.options[q.correct_index]}\n\nYÊU CẦU BẮT BUỘC:\n`;
      
      if (isListening) {
        prompt += `- PHÂN TÍCH NGHE HIỂU: Phân tích tình huống, keyword quan trọng nghe được, và mẹo loại trừ.\n`;
        prompt += `- Dịch toàn bộ nội dung câu hỏi sang tiếng Việt.\n`;
      } 
      
      if (isGrammar) {
        prompt += `- PHÂN TÍCH NGỮ PHÁP thật kỹ: Show cấu trúc ngữ pháp (Ví dụ: N1 ながら N2 : vừa làm N1, vừa làm N2).\n`;
        prompt += `- Chỉ ra KEYWORD để nhìn vào chọn ngay (Ví dụ: N によると + Vそうだ).\n`;
        prompt += `- Dịch nghĩa câu và phân tích từ vựng quan trọng trong câu.\n`;
      }

      if (isVocab) {
        prompt += `- SÁNG TẠO CÂU CHUYỆN: Dựa vào các bộ thủ, tạo ra câu chuyện hài hước, kỳ cục để nhớ từ.\n`;
        prompt += `- BẮT BUỘC lồng ghép trực tiếp chữ Hán và bộ thủ vào ngoặc đơn ngay cạnh từ khóa (VÍ DỤ: Dùng tre (竹) và gỗ (木) đóng thành cái hộp (箱)).\n`;
        prompt += `- NẾU LÀ TỪ GHÉP: Phải viết câu chuyện riêng cho từng chữ Hán một.\n`;
        prompt += `- SHOW TỪ VỰNG LIÊN QUAN đến mỗi chữ Kanji đó.\n`;
        prompt += `- Giải thích tại sao các phương án khác lại sai.\n`;
      }

      if (isReading) {
        prompt += `- PHÂN TÍCH ĐỌC HIỂU: Chỉ ra các mẹo thay thế. Ví dụ nếu có "その" thì phải chỉ rõ từ/cụm từ đó thay thế cho cái gì ở phía trước.\n`;
        prompt += `- Dịch và phân tích cấu trúc ngữ pháp của các câu quan trọng thật kỹ.\n`;
      }

      prompt += `\nHãy trình bày bằng tiếng Việt, định dạng rõ ràng, chuyên nghiệp.`;
      
      const realResponse = await geminiService.generateExplanation(prompt, q.audio_url);

      await jlptService.updateQuestionExplanation(questionId, realResponse);
      setAiExplanations(prev => ({ ...prev, [questionId]: realResponse }));
    } catch (error) {
       console.error("AI Error:", error);
       setAiExplanations(prev => ({ ...prev, [questionId]: "Lỗi API: Không thể phân tích câu này. Vui lòng thử lại sau." }));
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const scrollToQ = (qId) => {
    setActiveQuestionId(qId);
    const el = document.getElementById(`q-${qId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div className="flex justify-center py-40"><RotateCcw size={32} className="text-slate-400 animate-spin" /></div>;
  if (!exam) return <div className="text-center py-40">Không tìm thấy bài thi.</div>;

  const cleanClasses = "[&_img]:hidden [&_audio]:hidden [&_.question-number]:hidden [&_.q-icons-top]:hidden [&_.q-icons-bottom]:hidden [&_br:first-of-type]:hidden";

  return (
    <div className="w-full max-w-[1920px] ml-0 px-4 lg:pl-16 lg:pr-12 pb-32 pt-10 font-sans">
      <div className="mb-8 pl-1">
        <Link to="/jlpt-exams" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-4 group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm uppercase tracking-wider">Quay lại</span>
        </Link>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Đề thi JLPT {exam.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">Đề thi mô phỏng JLPT - {exam.level}. Chúc bạn làm bài tốt!</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-16 items-start pb-20">
        <div className="flex-1 space-y-10 w-full">
          {exam.mondais?.map((mondai) => {
            const mondaiRevealed = isRevealed || revealedMondais[mondai.id];
            
            return (
              <div key={mondai.id} id={`mondai-${mondai.id}`} className="space-y-4">
                {(() => {
                  const hasHeaderQ = mondai.questions?.[0]?.is_mondai_header;
                  if (mondai.instruction_text) {
                    return <div className="py-2"><div dangerouslySetInnerHTML={{ __html: mondai.instruction_text }} className={`text-slate-900 dark:text-slate-100 text-[18px] font-black leading-relaxed prose dark:prose-invert max-w-none ${cleanClasses}`} /></div>;
                  } else if (!hasHeaderQ) {
                    return <div className="bg-slate-50 dark:bg-slate-800/20 p-5 rounded border border-slate-200 dark:border-slate-700"><p className="text-slate-600 font-bold text-xs uppercase tracking-wider">Mondai {mondai.mondai_number}</p></div>;
                  }
                  return null;
                })()}

                {mondai.audio_url && (
                  <div className="mt-4"><audio controls className="w-full h-10 rounded-sm bg-slate-100"><source src={mondai.audio_url} type="audio/mpeg" /></audio></div>
                )}

                <div className="space-y-6">
                  {mondai.questions?.map((q) => {
                    if (q.is_mondai_header) {
                      return <div key={q.id} className="py-2"><div className={`text-slate-900 dark:text-slate-100 font-black text-[18px] prose dark:prose-invert max-w-none ${cleanClasses}`} dangerouslySetInnerHTML={{ __html: q.question_text }} /></div>;
                    }

                    const isActive = q.id === activeQuestionId;
                    const isCorrect = userAnswers[q.id] === q.correct_index;
                    let revealStyle = "";
                    if (mondaiRevealed) revealStyle = isCorrect ? "border-green-200 bg-green-50/20" : "border-red-200 bg-red-50/20";

                    return (
                      <div id={`q-${q.id}`} key={q.id} className={`pt-8 pb-4 border-t px-10 transition-all duration-500 scroll-mt-20 ${isActive ? 'border-l-[6px] border-r-[6px] border-red-500 bg-red-50/30' : 'border-slate-200 dark:border-slate-800'} ${revealStyle}`}>
                        <div className="flex gap-6">
                          <div className="shrink-0 mt-0.5"><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white text-xs font-bold">{q.globalIndex}</span></div>
                          <div className="flex-1 space-y-4">
                            <div dangerouslySetInnerHTML={{ __html: q.question_text }} className={`text-[17px] text-slate-800 dark:text-slate-200 leading-[1.6] prose dark:prose-invert max-w-none ${cleanClasses}`} />
                            {q.image_url && <img src={q.image_url} alt="Question" className="mt-3 max-h-[512px] w-auto object-contain rounded-xl border border-slate-100 bg-white p-1 shadow-xl shadow-slate-200/40 dark:shadow-none" />}
                            {q.audio_url && (
                              <audio controls controlsList="nodownload" className="mt-3 h-10 w-full max-w-xl rounded overflow-hidden shadow-sm">
                                <source src={q.audio_url} type="audio/mpeg" />
                              </audio>
                            )}
                            
                            {(() => {
                              const maxLen = Math.max(...(q.options?.map(o => String(o).length) || [0]));
                              let gridCols = maxLen < 8 ? "grid-cols-2 lg:grid-cols-4" : maxLen < 40 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1";
                              return (
                                <div className={`grid ${gridCols} gap-4 pt-2 w-full`}>
                                  {q.options?.map((opt, oIdx) => {
                                    const isSelected = userAnswers[q.id] === oIdx;
                                    let radioColor = isSelected ? "border-blue-500 border-4" : "border-slate-300";
                                    let textColor = isSelected ? "text-blue-800 dark:text-blue-200 font-medium" : "text-slate-700 dark:text-slate-300";
                                    let bgClass = "hover:bg-slate-50 dark:hover:bg-slate-800";
                                    
                                    if (mondaiRevealed) {
                                      if (oIdx === q.correct_index) { radioColor = "border-green-500 border-4"; textColor = "text-green-700 font-bold"; bgClass = "bg-green-50/50"; }
                                      else if (isSelected) { radioColor = "border-red-400 border-4"; textColor = "text-red-600"; }
                                      else { radioColor = "border-slate-200"; textColor = "text-slate-400"; bgClass = "opacity-60"; }
                                    }

                                    return (
                                      <label key={oIdx} className={`flex items-start gap-4 p-3 rounded-lg border-2 border-transparent cursor-pointer transition-all ${bgClass} ${mondaiRevealed ? 'pointer-events-none' : 'hover:border-slate-200 dark:hover:border-slate-700'}`}>
                                        <input type="radio" className="sr-only" name={`q-${q.id}`} checked={isSelected} onChange={() => handleSelect(q.id, oIdx)} disabled={mondaiRevealed} />
                                        <div className={`mt-0.5 w-[20px] h-[20px] shrink-0 rounded-full border-2 transition-all duration-200 ${radioColor}`} />
                                        <span className={`text-[17px] leading-snug ${textColor} ${String(opt).length < 15 ? 'whitespace-nowrap' : ''}`}>{opt}</span>
                                        {mondaiRevealed && oIdx === q.correct_index && <Check size={16} className="text-green-600 ml-auto shrink-0" />}
                                        {mondaiRevealed && isSelected && oIdx !== q.correct_index && <X size={16} className="text-red-500 ml-auto shrink-0" />}
                                      </label>
                                    );
                                  })}
                                </div>
                              );
                            })()}

                            {mondaiRevealed && (
                              <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                {!aiExplanations[q.id] ? (
                                  <button onClick={() => getAIExplanation(q.id)} disabled={loadingExplanations[q.id]} className="text-blue-600 flex items-center gap-2 font-bold text-sm bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                                    {loadingExplanations[q.id] ? <RotateCcw size={16} className="animate-spin" /> : <Star size={16} />} Xem giải thích AI
                                  </button>
                                ) : (
                                  <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border-l-4 border-blue-400 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">{aiExplanations[q.id]}</div>
                                )}
                                {loadingExplanations[q.id] && !aiExplanations[q.id] && <div className="mt-2 text-slate-400 text-xs flex items-center gap-2"><div className="w-3 h-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div> Đang phân tích...</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!isRevealed && !revealedMondais[mondai.id] && (
                  <div className="flex justify-center pt-8 pb-12"><button onClick={() => setRevealedMondais(prev => ({ ...prev, [mondai.id]: true }))} className="px-12 py-4 bg-[#1CB0F6] hover:bg-[#19a0e0] text-white rounded-2xl font-black shadow-xl shadow-[#1CB0F6]/20 transition-all hover:-translate-y-1 active:scale-95 text-base uppercase tracking-widest border-b-4 border-blue-700">Kiểm tra Mondai {mondai.mondai_number}</button></div>
                )}
              </div>
            );
          })}
        </div>

        <div className="xl:w-[320px] shrink-0 sticky top-6">
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
              <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 300 && !isRevealed ? "text-red-500" : "text-slate-700 dark:text-slate-200"}`}><Clock size={20} />{formatTime(timeLeft)}</div>
              {isRevealed && <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded uppercase tracking-wider">Hoàn thành</span>}
            </div>
            
            <div className="p-5 bg-slate-50 dark:bg-slate-900/50">
              {!isRevealed ? (
                <button onClick={handleSubmit} disabled={answeredQ === 0} className="w-full mb-6 py-3 bg-[#64748b] hover:bg-[#475569] text-white rounded font-medium text-sm transition-colors disabled:opacity-50">Nộp Bài</button>
              ) : (
                <button onClick={() => window.location.reload()} className="w-full mb-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors">Làm Lại</button>
              )}
              
              <div className="grid grid-cols-6 gap-2">
                  {allQuestions.map((q) => {
                    const isAnswered = userAnswers[q.id] !== undefined;
                    const isCorrect = userAnswers[q.id] === q.correct_index;
                    const isActive = q.id === activeQuestionId;
                    
                    let bg = "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
                    if (isRevealed || revealedMondais[q.mId]) {
                      bg = isCorrect ? "bg-green-500 text-white shadow-lg shadow-green-100" : "bg-red-500 text-white shadow-lg shadow-red-100";
                    } else if (isAnswered) {
                      bg = "bg-[#1CB0F6] text-white font-black shadow-lg shadow-blue-200";
                    } else if (isActive) {
                      bg = "bg-white dark:bg-slate-700 text-blue-600 border-2 border-blue-400";
                    }
                  return <button key={q.id} onClick={() => scrollToQ(q.id)} className={`w-10 h-10 rounded-full flex justify-center items-center text-sm font-black transition-all hover:scale-110 ${bg} ${isActive ? 'ring-4 ring-red-500 ring-offset-2' : ''}`}>{q.globalIndex}</button>;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JLPTExamDetailPage;
