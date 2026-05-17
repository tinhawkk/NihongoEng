import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, MicOff, Volume2, ArrowLeft, ChevronRight, 
  CheckCircle2, AlertCircle, RotateCcw, Award 
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { vocabularyRepository } from "../data/repositories/NhostVocabularyRepository";
import { tts } from "../utils/tts";
import { sounds } from "../utils/sounds";
import { Button } from "../components/ui/Button";
import { createRecognition } from "../utils/speechUtils"; 
import confetti from "canvas-confetti";

export const ExampleSpeakPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState(null); // 'success' | 'fail'
  const [similarity, setSimilarity] = useState(0);
  const [matchedIndices, setMatchedIndices] = useState(new Set());
  const [countdown, setCountdown] = useState(null);
  
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  
  const currentWord = words[currentIndex];
  const targetText = currentWord?.example || "";

  // Global unmount cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await vocabularyRepository.loadDeck(deckId, "voca");
        const withExamples = data.filter(w => w.example && w.example.trim());
        setWords(withExamples);
      } catch (err) {
        console.error("Load error:", err);
      }
      setLoading(false);
    };
    load();
  }, [deckId]);

  // Helper to play a satisfying word-pop sound (Programmatic - no network required)
  const playWordPop = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  const nextWord = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCountdown(null);
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setFeedback("finished");
    }
  }, [currentIndex, words.length]);

  const resetState = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setTranscript("");
    setFeedback('idle');
    setSimilarity(0);
    setMatchedIndices(new Set());
    setCountdown(null);
  }, []);

  // Helper to get tokens consistently (Bunsetsu style)
  const getTokens = useCallback(() => {
    if (!targetText) return [];
    // 1. Ruby tokens: Kanji(Reading)
    // 2. English words
    // 3. Kanji sequences
    // 4. Hiragana/Katakana chunks ending with complex particles (から, まで...)
    // 5. Hiragana/Katakana chunks ending with simple particles (は, を, に, が, も, と, で, へ...)
    // 6. Remaining particles/words
    const tokens = targetText.match(/([\u4e00-\u9faf]+[（(][^）)]+[）)]|[A-Za-z0-9']+|[\u4e00-\u9faf]+|[\u3040-\u30ff]+(?:から|まで|より|という|だけ|ばかり|ほど|ので|のに|ても|でも|たが|だか|は|を|に|が|も|と|で|へ|な|ね|よ)|[\u3040-\u30ff]+|[^\w\s\u3040-\u30ff\u4e00-\u9faf]+|\s+)/g) || [];
    return tokens;
  }, [targetText]);

  const checkSpeech = useCallback((text) => {
    const tokens = getTokens();
    const cleanTranscript = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()！？。、]/g, "").toLowerCase();
    const newMatched = new Set(matchedIndices);
    const isEnglish = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng') || (targetText && !/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(targetText));

    let contentTokensCount = 0;
    let newlyMatchedCount = 0;

    tokens.forEach((token, idx) => {
      const isWhitespace = /^\s+$/.test(token) || !token.trim();
      const isPunctuation = /^[^\w\s\u3040-\u30ff\u4e00-\u9faf]+$/.test(token);
      if (isWhitespace || isPunctuation) return;
      
      const rubyMatch = token.match(/^(.+)[（(](.+)[）)]$|^(.+)$/);
      const baseWord = rubyMatch[1] || rubyMatch[3] || token;
      const reading = rubyMatch[2] || "";
      const cleanToken = baseWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()！？。、]/g, "").toLowerCase();
      
      if (!cleanToken) return;
      contentTokensCount++;

      let isHit = false;
      if (isEnglish) {
        const regex = new RegExp(`\\b${cleanToken}\\b`, 'i');
        isHit = regex.test(cleanTranscript);
      } else {
        const cleanReading = reading.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()！？。、]/g, "");
        isHit = cleanTranscript.includes(cleanToken) || (cleanReading && cleanTranscript.includes(cleanReading));
      }

      if (isHit && !newMatched.has(idx)) {
        newMatched.add(idx);
        newlyMatchedCount++;
      }
    });

    if (newlyMatchedCount > 0) {
      playWordPop();
      setMatchedIndices(newMatched);
    }
    
    let hitCount = 0;
    tokens.forEach((t, i) => {
      if (newMatched.has(i)) {
        const isWhitespace = /^\s+$/.test(t) || !t.trim();
        const isPunctuation = /^[^\w\s\u3040-\u30ff\u4e00-\u9faf]+$/.test(t);
        if (!isWhitespace && !isPunctuation) hitCount++;
      }
    });

    const sim = contentTokensCount > 0 ? hitCount / contentTokensCount : 0;
    setSimilarity(sim);

    if (sim >= 0.6 && feedback !== 'success') {
      if (feedback === 'success') return; // Prevent duplicate execution
      setFeedback("success");
      sounds.playSuccess();
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#58cc02", "#10b981", "#3b82f6"]
      });
      manualStopRef.current = true;
      setIsListening(false);
      recognitionRef.current?.stop();
      
      // Auto-next in 5 seconds
      setCountdown(5);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      timerRef.current = setTimeout(() => nextWord(), 5000);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => (prev && prev > 1) ? prev - 1 : null);
      }, 1000);
    }
  }, [getTokens, matchedIndices, feedback, nextWord]);

  useEffect(() => {
    resetState();
    return () => { 
      if (timerRef.current) clearTimeout(timerRef.current); 
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [currentIndex, resetState]);

  const checkSpeechRef = useRef(checkSpeech);
  useEffect(() => {
    checkSpeechRef.current = checkSpeech;
  }, [checkSpeech]);

  const manualStopRef = useRef(false);
  const lastErrorRef = useRef(null);
  const fullTranscriptRef = useRef(""); // Keep track of transcript across auto-restarts

  const isEnglish = deckId?.toUpperCase() === 'ENG' || deckId?.toLowerCase().includes('eng') || (targetText && !/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(targetText));
  const targetLang = isEnglish ? "en-US" : "ja-JP";

  useEffect(() => {
    if (!targetText) return;
    
    // Create recognition if it doesn't exist or language changed
    if (!recognitionRef.current || recognitionRef.current.lang !== targetLang) {
      if (recognitionRef.current) recognitionRef.current.stop();
      recognitionRef.current = createRecognition(targetLang);
    }
    
    const rec = recognitionRef.current;
    
    rec.onResult = (text) => {
      // Append current session text to history
      const cumulativeText = fullTranscriptRef.current + " " + text;
      setTranscript(cumulativeText);
      checkSpeechRef.current(cumulativeText);
    };
    
    rec.onError = (err) => {
      console.error("Recognition error:", err);
      lastErrorRef.current = err;
      if (err === 'not-allowed' || err === 'network') {
         setIsListening(false);
         setFeedback('network-error'); // Explicitly show the user why the mic dropped
      }
    };

    rec.onEnd = () => {
      setIsListening(false);
      lastErrorRef.current = null;
    };

    return () => {};
  }, [targetText, deckId, feedback, isListening, transcript]);

  const toggleListening = () => {
    if (isListening) {
      manualStopRef.current = true;
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      manualStopRef.current = false;
      
      // If we are retrying after a successful match, wipe the board clean.
      // Otherwise (resuming from pause, idle, or network error), stitch and keep history!
      if (feedback === 'success') {
        fullTranscriptRef.current = ""; 
        resetState();
      } else {
        fullTranscriptRef.current = transcript;
        setFeedback('idle');
      }
      
      // Stop completely any countdowns or auto-next that might be queued!
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      timerRef.current = null;
      countdownIntervalRef.current = null;
      
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-slate-400 font-bold">Đang tải câu ví dụ...</p>
    </div>
  );

  if (words.length === 0) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-10 text-center bg-slate-50 dark:bg-slate-950">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-6">
        <AlertCircle size={40} />
      </div>
      <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Không tìm thấy ví dụ</h2>
      <p className="text-slate-400 mb-8">Bài học này chưa có câu ví dụ để luyện nói.</p>
      <Button onClick={() => navigate(-1)}>Quay lại</Button>
    </div>
  );

  if (feedback === "finished") return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-slate-900 z-[1000] animate-in fade-in duration-500 text-slate-800 dark:text-white">
      <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-[40px] flex items-center justify-center text-amber-500 mb-8 animate-bounce transition-all">
        <Award size={64} />
      </div>
      <h2 className="text-5xl font-black mb-4">Tuyệt vời!</h2>
      <p className="text-slate-500 dark:text-slate-400 text-lg mb-10 max-w-sm">Bạn đã hoàn thành luyện phát âm toàn bộ câu ví dụ trong bài này.</p>
      <Button onClick={() => navigate(-1)} className="w-full max-w-xs h-16 text-xl">HOÀN THÀNH</Button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col overflow-hidden">
      <div className="p-4 flex items-center justify-between z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all">
          <ArrowLeft size={24} className="text-slate-500" />
        </button>
        <div className="flex-1 max-w-md mx-6 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }} />
        </div>
        <span className="text-xs font-black text-slate-400 font-mono">{currentIndex + 1}/{words.length}</span>
      </div>

      <main className="flex-1 flex flex-col items-center px-4 py-4 md:py-4 gap-4 md:gap-4 max-w-5xl mx-auto w-full overflow-y-auto custom-scrollbar min-h-0">
        {/* Safe centering spacers */}
        <div className="mt-auto"></div>

        <div className="text-center space-y-0.5 shrink-0">
           <h2 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter drop-shadow-sm">
             {currentWord.word}
           </h2>
           <p className="text-lg md:text-xl text-blue-500 font-black uppercase tracking-[0.3em]">{currentWord.meaning}</p>
        </div>

        {/* Example Card */}
        <div className={`w-full p-4 md:p-6 bg-white dark:bg-slate-800 rounded-[2rem] md:rounded-[2.5rem] border-4 transition-all duration-500 shadow-xl relative z-20 shrink-0 ${feedback === 'success' ? 'border-emerald-500 shadow-emerald-500/10' : feedback === 'fail' ? 'border-red-500 shadow-red-500/10' : 'border-white dark:border-slate-700/50'}`}>
          <div className="space-y-4 text-center">
             <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => tts.playWithFallback(null, currentWord.example)}
                  className="w-12 h-12 md:w-14 md:h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
                >
                  <Volume2 size={22} />
                </button>
                <p className="text-[10px] md:text-xs font-black text-slate-300 uppercase tracking-widest hidden md:block">Nhấn để nghe mẫu</p>
             </div>
             
             <div className="flex flex-wrap justify-center gap-x-2 gap-y-2 md:gap-x-3 md:gap-y-3 mx-auto max-w-4xl px-2 py-3 md:px-4 md:py-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[1.5rem] min-h-[80px] md:min-h-[100px] items-center border border-white/30 dark:border-slate-700/30">
               {getTokens().map((token, i) => {
                 const isPunctuation = /^[^\w\s\u3040-\u30ff\u4e00-\u9faf]+$/.test(token);
                 const isWhitespace = /^\s+$/.test(token);
                 if (isWhitespace) return <span key={i} className="w-1 md:w-2"> </span>;
                 
                 const rubyMatch = token.match(/^(.+)[（(](.+)[）)]$|^(.+)$/);
                 const baseWord = rubyMatch[1] || rubyMatch[3] || token;
                 const reading = rubyMatch[2] || "";
                 const isMatched = matchedIndices.has(i);

                 if (isPunctuation) {
                   return (
                     <span key={i} className="text-xl md:text-3xl font-black text-slate-300 self-end mb-1 md:mb-2">
                       {token}
                     </span>
                   );
                 }

                 return (
                   <motion.div
                     key={i}
                     layout
                     initial={false}
                     animate={{ 
                       backgroundColor: isMatched ? "#58cc02" : "rgb(255, 255, 255)",
                       borderColor: isMatched ? "#58cc02" : "rgb(226, 232, 240)",
                       color: isMatched ? "#ffffff" : (transcript ? "#ef4444" : "#334155"),
                       scale: isMatched ? [1, 1.05, 1] : 1,
                       y: isMatched ? [0, -3, 0] : 0
                     }}
                     className={`relative px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl border-b-[3px] md:border-b-4 transition-all duration-300 flex flex-col items-center justify-center min-w-[2.5rem] shadow-sm ${
                       isMatched ? "border-emerald-700 font-bold" : "border-slate-100 dark:bg-slate-800 dark:border-slate-700"
                     }`}
                   >
                     {/* Space for Furigana even if empty to keep alignment perfect */}
                     {deckId?.toUpperCase() !== 'ENG' && (
                       <span className={`text-[9px] md:text-xs font-bold h-3 md:h-4 mb-0.5 md:mb-1 tracking-tight ${isMatched ? "text-emerald-100" : "text-slate-400"}`}>
                         {reading || "\u00A0"} 
                       </span>
                     )}
                     <span className="text-xl md:text-3xl font-black leading-none pb-0.5 md:pb-1">
                       {baseWord}
                     </span>
                   </motion.div>
                 );
               })}
             </div>
             
             {currentWord.exampleMeaning && (
               <p className="text-base md:text-lg text-slate-400 italic mt-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                 {currentWord.exampleMeaning}
               </p>
             )}

             {/* Diagnostic Transcript Display while listening or paused */}
             {(isListening || transcript) && feedback === 'idle' && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800"
               >
                 <p className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-2 text-slate-400">
                    {isListening ? (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    )}
                    {isListening ? `Máy đang nghe: ${targetLang}` : "Đang tạm dừng"}
                 </p>
                 <p className="text-sm font-medium text-slate-500 line-clamp-2 italic min-h-[1.5rem]">
                    {transcript ? `"${transcript}"` : "..."}
                 </p>
               </motion.div>
             )}
          </div>
        </div>

        <>
          {feedback === 'success' || feedback === 'fail' || feedback === 'network-error' ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/20 shadow-lg max-w-lg w-full shrink-0">
               <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-base font-black ${
                 feedback === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                 feedback === 'network-error' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
               }`}>
                 {feedback === 'success' ? <CheckCircle2 size={20} /> : feedback === 'network-error' ? <Mic size={20} /> : <AlertCircle size={20} />}
                 <span className="uppercase tracking-wider">
                   {feedback === 'success' ? 'TUYỆT VỜI!' : 
                    feedback === 'network-error' ? 'LỖI KẾT NỐI' : 'CHƯA ĐÚNG'}
                 </span>
               </div>
               
               <div className="space-y-3">
                 {feedback === 'network-error' ? (
                   <p className="text-slate-500 text-sm">Vui lòng kiểm tra lại mic hoặc mạng.</p>
                 ) : (
                   <div className="space-y-1">
                     <p className="text-xs font-black text-slate-400 uppercase">Độ chính xác: {Math.round(similarity * 100)}%</p>
                     <p className="text-lg font-bold text-slate-700 dark:text-slate-200 italic leading-snug">"{transcript}"</p>
                   </div>
                 )}
                 
                 <div className="flex items-center justify-center gap-3 pt-1">
                   <button onClick={toggleListening} className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded-xl font-black text-sm transition-all">
                     <RotateCcw size={16} /> THỬ LẠI
                   </button>
                   {feedback === 'success' && (
                     <button onClick={nextWord} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-sm shadow-md shadow-emerald-500/20 transition-all">
                       TIẾP TỤC <ChevronRight size={16} />
                     </button>
                   )}
                 </div>
                 {countdown !== null && feedback === 'success' && (
                    <p className="text-[11px] md:text-xs font-bold text-slate-400 animate-pulse pt-1">
                       Tự động chuyển câu sau {countdown}s...
                    </p>
                 )}
               </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-4 shrink-0">
               <div className="relative">
                 {isListening && (
                   <>
                     <motion.div initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-blue-400/30 rounded-full" />
                     <motion.div initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} className="absolute inset-0 bg-blue-400/20 rounded-full" />
                     
                     {/* Real-time Percentage Badge */}
                     <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: -60, opacity: 1 }}
                        className="absolute left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-black shadow-lg z-20 flex items-center gap-1 min-w-[70px] justify-center"
                     >
                        {Math.round(similarity * 100)}%
                     </motion.div>
                   </>
                 )}
                 <button
                   onClick={toggleListening}
                   className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl relative z-10 ${isListening ? "bg-red-500 scale-110" : "bg-blue-600 hover:scale-105 active:scale-95"}`}
                 >
                   {isListening ? (
                     <MicOff size={32} className="text-white" />
                   ) : (
                     <Mic size={32} className="text-white" />
                   )}
                 </button>
               </div>
               <p className="text-slate-400 font-black animate-pulse uppercase tracking-[0.2em] text-sm">
                 {isListening ? "Đang lắng nghe..." : "Nhấn để bắt đầu nói"}
               </p>
            </div>
          )}
         {countdown !== null && (
          <div className="mb-auto"></div>
         )}
        </>
        
      </main>
    </div>
  );
};
