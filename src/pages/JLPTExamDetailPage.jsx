import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useExamSession } from "../hooks/useCases/useExamSession";
import { ArrowLeft, Check, X, Star, RotateCcw, Clock, Trash2, Edit3, Save } from "lucide-react";
import { marked } from "marked";

marked.setOptions({
  breaks: true,
  gfm: true
});

const parseFurigana = (text) => {
  if (!text) return "";
  // Convert Kanji(furigana) to <ruby>Kanji<rt>furigana</rt></ruby>
  // Supports various bracket types and ensures we target kanji-like chars
  return text.replace(/([^\x00-\x7F\s,.]+)\(([^)]+)\)/g, '<ruby>$1<rt>$2</rt></ruby>');
};

const parseContent = (text) => {
  if (!text) return "";
  // Convert [word] to **word** for legacy question compatibility
  let processed = text.replace(/\[([^\]]+)\]/g, '**$1**');
  processed = parseFurigana(processed);
  try {
    processed = marked.parse(processed);
  } catch (e) {
    console.error("Markdown parse error:", e);
  }
  return processed;
};

export const JLPTExamDetailPage = () => {
  const { examId: id } = useParams();
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const {
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
    handleUpdateMondai,
    handleUpdateQuestion,
  } = useExamSession(id);

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const scrollToQ = (qId) => {
    setActiveQuestionId(qId);
    const el = document.getElementById(`q-${qId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading) return <div className="flex justify-center py-40"><RotateCcw size={32} className="text-slate-400 animate-spin" /></div>;
  if (!exam) return <div className="text-center py-40">Không tìm thấy bài thi.</div>;

  const cleanClasses = "[&_img]:hidden [&_.question-number]:hidden [&_.q-icons-top]:hidden [&_.q-icons-bottom]:hidden [&_br:first-of-type]:hidden [&_.custom-div-audio-player]:my-3 [&_audio.custom-audio-player]:!block [&_audio.custom-audio-player]:w-full [&_audio.custom-audio-player]:max-w-lg [&_ruby]:relative [&_ruby]:cursor-help [&_ruby]:border-b [&_ruby]:border-dotted [&_ruby]:border-slate-300 [&_rt]:opacity-0 [&_rt]:transition-opacity [&_rt]:duration-200 [&_ruby:hover_rt]:opacity-100 [&_rt]:text-[0.65em] [&_rt]:text-blue-500 [&_rt]:font-bold";

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
              <div key={mondai.id} id={`mondai-${mondai.id}`} className="space-y-4 relative group">
                <div className="absolute -top-3 -right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => {
                      if (editingId === mondai.id) {
                        handleUpdateMondai(mondai.id, { instruction_text: editValue }).then(() => {
                          setEditingId(null);
                          window.location.reload();
                        });
                      } else {
                        setEditingId(mondai.id);
                        setEditValue(mondai.instruction_text || "");
                      }
                    }}
                    className={`p-2 rounded-full shadow-sm border transition-all ${editingId === mondai.id ? "bg-green-500 text-white border-green-600" : "bg-white text-blue-500 hover:bg-blue-50 border-slate-200"}`}
                    title={editingId === mondai.id ? "Lưu thay đổi" : "Chỉnh sửa phần này"}
                  >
                    {editingId === mondai.id ? <Save size={16} /> : <Edit3 size={16} />}
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Bạn có chắc chắn muốn xóa Mondai ${mondai.mondai_number} này không?\nBạn có thể quay lại trang trước và bấm "Đề thi" để AI tạo bù phần này.`)) {
                        try {
                          await handleDeleteMondai(mondai.id);
                        } catch (e) {
                          alert("Lỗi khi xóa: " + e.message);
                        }
                      }
                    }}
                    className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-full border border-red-100 shadow-sm"
                    title="Xóa phần này"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {editingId === mondai.id ? (
                  <div className="bg-blue-50/50 p-4 rounded-2xl border-2 border-blue-200 space-y-3">
                    <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Đang chỉnh sửa Instruction</p>
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full min-h-[120px] p-4 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none text-slate-800 font-medium"
                      placeholder="Nhập nội dung hướng dẫn (Markdown)..."
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">HỦY BỎ</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const hasHeaderQ = mondai.questions?.[0]?.is_mondai_header;
                      if (mondai.instruction_text) {
                        const titleText = mondai.title ? `**${mondai.title}**　` : '';
                        const cleanInst = parseContent(titleText + mondai.instruction_text);
                        return <div className="py-2"><div dangerouslySetInnerHTML={{ __html: cleanInst }} className={`text-slate-900 dark:text-slate-100 text-[18px] font-medium leading-relaxed prose dark:prose-invert max-w-none ${cleanClasses}`} /></div>;
                      } else if (!hasHeaderQ) {
                        return <div className="bg-slate-50 dark:bg-slate-800/20 p-5 rounded border border-slate-200 dark:border-slate-700"><p className="text-slate-600 font-bold text-xs uppercase tracking-wider">{mondai.title || `Mondai ${mondai.mondai_number}`}</p></div>;
                      }
                      return null;
                    })()}
                  </>
                )}

                {mondai.audio_url && (
                  <div className="mt-4"><audio controls className="w-full h-10 rounded-sm bg-slate-100"><source src={mondai.audio_url} type="audio/mpeg" /></audio></div>
                )}

                <div className="space-y-6">
                  {mondai.questions?.map((q) => {
                    if (q.is_mondai_header) {
                      const cleanHeader = parseContent(q.question_text);
                      return <div key={q.id} className="py-2"><div className={`text-slate-900 dark:text-slate-100 font-medium text-[17px] prose dark:prose-invert max-w-none ${cleanClasses}`} dangerouslySetInnerHTML={{ __html: cleanHeader }} /></div>;
                    }

                    const isActive = q.id === activeQuestionId;
                    const isCorrect = userAnswers[q.id] === q.correct_index;
                    let revealStyle = "";
                    if (mondaiRevealed) revealStyle = isCorrect ? "border-green-200 bg-green-50/20" : "border-red-200 bg-red-50/20";

                    return (
                      <div id={`q-${q.id}`} key={q.id} className={`pt-8 pb-4 border-t px-10 transition-all duration-500 scroll-mt-20 relative group/q ${isActive ? 'border-l-[6px] border-r-[6px] border-red-500 bg-red-50/30' : 'border-slate-200 dark:border-slate-800'} ${revealStyle}`}>
                        <div className="absolute top-2 right-2 opacity-0 group-hover/q:opacity-100 transition-opacity z-10">
                          <button
                            onClick={() => {
                              if (editingId === q.id) {
                                handleUpdateQuestion(q.id, { question_text: editValue }).then(() => {
                                  setEditingId(null);
                                  window.location.reload();
                                });
                              } else {
                                setEditingId(q.id);
                                setEditValue(q.question_text || "");
                              }
                            }}
                            className={`p-1.5 rounded-full shadow-sm border transition-all ${editingId === q.id ? "bg-green-500 text-white border-green-600" : "bg-white text-blue-500 hover:bg-blue-50 border-slate-100"}`}
                          >
                            {editingId === q.id ? <Save size={14} /> : <Edit3 size={14} />}
                          </button>
                        </div>
                        <div className="flex gap-6">
                          <div className="shrink-0 mt-0.5"><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white text-xs font-bold">{q.globalIndex}</span></div>
                          <div className="flex-1 space-y-4">
                            {editingId === q.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-full min-h-[100px] p-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none text-slate-800 text-sm font-medium"
                                />
                                <div className="flex justify-end">
                                  <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-slate-400">HỦY</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {(() => {
                              // Extract audio URL from HTML string since dangerouslySetInnerHTML won't play audio
                              let embeddedAudioUrl = null;
                              let embeddedAudioUrlFull = null;
                              let fallbackUrl = null;
                              const trynihongoMatch = q.question_text?.match(/mooddata\/([a-z0-9]{2})\/([a-z0-9]{2})\/([a-z0-9]+)/i);
                              if (trynihongoMatch) {
                                embeddedAudioUrlFull = `/media/exams/${trynihongoMatch[1]}_${trynihongoMatch[2]}_${trynihongoMatch[3]}.mp3`;
                                embeddedAudioUrl = `/media/exams/${trynihongoMatch[1]}_${trynihongoMatch[2]}_.mp3`;
                                fallbackUrl = `https://trynihongo.com/upload/mooddata/${trynihongoMatch[1]}/${trynihongoMatch[2]}/${trynihongoMatch[3]}`;
                              } else {
                                const audioMatch = q.question_text?.match(/src="([^"]+(?:\.mp3|\.m4a|\.ogg)[^"]*)"/i);
                                embeddedAudioUrl = audioMatch ? audioMatch[1] : null;
                              }
                                
                              const cleanHtml = q.question_text?.replace(/<div[^>]*custom-div-audio-player[^>]*>[\s\S]*?<\/div>/gi, '') || q.question_text;
                              const audioUrl = q.audio_url || embeddedAudioUrl;
                              const hasAudioOriginal = q.question_text?.includes('<audio');

                              return (
                                <>
                                  <div dangerouslySetInnerHTML={{ __html: parseContent(cleanHtml) }} className={`text-[17px] text-slate-800 dark:text-slate-200 leading-[1.6] prose dark:prose-invert max-w-none ${cleanClasses}`} />
                                  {(audioUrl || hasAudioOriginal) && (
                                    <audio controls className="my-4 w-full max-w-2xl rounded-lg shadow-sm border border-slate-200 bg-white" style={{ display: 'block !important', minHeight: '50px' }}>
                                      {embeddedAudioUrlFull && <source src={embeddedAudioUrlFull} type="audio/mpeg" />}
                                      {audioUrl && <source src={audioUrl} type="audio/mpeg" />}
                                      {fallbackUrl && <source src={fallbackUrl} />}
                                      Your browser does not support the audio component.
                                    </audio>
                                  )}
                                </>
                              );
                            })()}
                            {q.image_url && <img src={q.image_url} alt="Question" className="mt-3 max-h-[512px] w-auto object-contain rounded-xl border border-slate-100 bg-white p-1 shadow-xl shadow-slate-200/40 dark:shadow-none" />}
                            
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
                          </>
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

