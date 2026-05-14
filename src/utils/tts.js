/**
 * Tiện ích phát âm thanh bằng Text-to-Speech (TTS) của trình duyệt.
 * Giúp tiết kiệm dữ liệu (data) vì không cần tải file MP3.
 */

class TTSProvider {
  constructor() {
    this.synth = window.speechSynthesis;
    this.jaVoice = null;
    this.enVoice = null;
    this.currentAudio = null;
    this.playbackId = 0; 
    this.resolveCurrent = null;
    
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    this.loadVoices();
  }

  detectLang(text) {
    if (!text) return "ja-JP";
    const hasJapanese = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(text);
    return hasJapanese ? "ja-JP" : "en-US";
  }

  resolveLang(text, lang) {
    if (!lang || lang === "auto") return this.detectLang(text);
    return lang;
  }

  loadVoices() {
    const voices = this.synth.getVoices();
    // Japanese
    this.jaVoice = voices.find(v => v.lang.startsWith('ja') && (v.name.includes('Natural') || v.name.includes('Neural'))) 
                 || voices.find(v => v.lang.startsWith('ja') && v.name.includes('Google'))
                 || voices.find(v => v.lang.startsWith('ja')) 
                 || voices[0];
    
    // English
    this.enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural')))
                 || voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
                 || voices.find(v => v.lang.startsWith('en-US'))
                 || voices.find(v => v.lang.startsWith('en'));
  }

  stop() {
    this.playbackId++; 
    this.synth.cancel();
    
    if (this.currentAudio) {
      this.currentAudio.onplay = null;
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio.pause();
      this.currentAudio.src = ""; 
      this.currentAudio = null;
    }

    if (this.resolveCurrent) {
        this.resolveCurrent();
        this.resolveCurrent = null;
    }

    return this.playbackId;
  }

  async speak(text, options = {}) {
    if (!text) return;
    const { lang = "auto", rate = 1.0, pitch = 1.0 } = options;
    const cleanText = text.replace(/[\[\(\{（].*?[\]\)\}）]/g, '').trim();
    const currentId = this.stop();

    const resolvedLang = this.resolveLang(cleanText, lang);
    const voice = resolvedLang.startsWith("ja") ? this.jaVoice : this.enVoice;

    // Prefer High Quality Local Voice (INSTANT)
    if (voice && rate >= 0.9 && pitch === 1.0) {
      this.speakOffline(cleanText, { lang: resolvedLang, rate, pitch, voice });
      return;
    }

    // Fallback to Google TTS when local voice is unavailable or not ideal
    if (resolvedLang.startsWith("ja") || resolvedLang.startsWith("en")) {
      try {
        const speed = rate < 1 ? 0.45 : 1; 
        const tldLang = resolvedLang.startsWith("ja") ? "ja" : "en";
        const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tldLang}&client=tw-ob&q=${encodeURIComponent(cleanText)}&ttsspeed=${speed}`;
        
        const audio = new Audio(googleTtsUrl);
        this.currentAudio = audio;
        await audio.play();
        
        if (this.playbackId !== currentId) {
            audio.pause();
            audio.src = "";
        }
        return;
      } catch (error) {
        // ignore and fallback
      }
    }

    if (this.playbackId === currentId) {
      this.speakOffline(cleanText, { lang: resolvedLang, rate, pitch, voice });
    }
  }

  speakOffline(text, options = {}) {
    if (!text) return;
    const { lang = 'ja-JP', rate = 1.0, pitch = 1.0, voice = null } = options;
    const cleanText = text.replace(/[\[\(\{（].*?[\]\)\}）]/g, '').trim();
    
    // Brief cancel to ensure priority
    this.synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const selectedVoice = voice || (lang.startsWith('ja') ? this.jaVoice : this.enVoice);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    // Small timeout to allow synth to recover (chrome fix)
    setTimeout(() => {
        this.synth.speak(utterance);
    }, 10);
  }

  playWithFallback(url, text, options = {}) {
    const { lang = "auto", rate = 1.0 } = options;
    const currentId = this.stop();

    if (!url) {
      this.speak(text, { ...options, lang });
      return;
    }

    const audio = new Audio(url);
    this.currentAudio = audio;
    audio.playbackRate = rate;
    
    const timeout = setTimeout(() => {
      if (this.playbackId !== currentId) return;
      audio.pause();
      audio.src = "";
      this.speak(text, { ...options, lang });
    }, 2500); // Reduced timeout for snappier fallback

    audio.onplay = () => {
      if (this.playbackId !== currentId) {
          audio.pause();
          audio.src = "";
      } else {
          clearTimeout(timeout);
      }
    };
    audio.onended = () => { if (this.currentAudio === audio) this.currentAudio = null; };
    audio.onerror = () => {
      clearTimeout(timeout);
      if (this.playbackId === currentId) {
          this.speak(text, { ...options, lang });
      }
    };

    audio.play().catch(() => {
      clearTimeout(timeout);
      if (this.playbackId === currentId) {
          this.speak(text, { ...options, lang });
      }
    });
  }

  async playSequentially(items, rate = 1.0) {
    const currentId = this.stop();

    for (const item of items) {
      if (this.playbackId !== currentId) break;
      
      await new Promise((resolve) => {
        this.resolveCurrent = resolve;
        
        if (item.url) {
          const audio = new Audio(item.url);
          this.currentAudio = audio;
          audio.playbackRate = rate;
          
          audio.onended = () => { 
            if (this.currentAudio === audio) this.currentAudio = null; 
            this.resolveCurrent = null;
            resolve(); 
          };
           audio.onerror = () => {
             if (this.playbackId !== currentId) return resolve();
             const lang = this.resolveLang(item.text, item.lang);
             this.speakOffline(item.text, { lang, rate: rate * 0.9, pitch: item.pitch || 1.0 });
             setTimeout(resolve, (1500 + item.text.length * 50) / rate);
          };
          
          audio.play().catch(() => {
             if (this.playbackId !== currentId) return resolve();
             const lang = this.resolveLang(item.text, item.lang);
             this.speakOffline(item.text, { lang, rate: rate * 0.9, pitch: item.pitch || 1.0 });
             setTimeout(resolve, (1500 + item.text.length * 50) / rate);
          });
        } else {
          if (this.playbackId !== currentId) return resolve();
           const lang = this.resolveLang(item.text, item.lang);
           this.speakOffline(item.text, { lang, rate: rate * 1.0, pitch: item.pitch || 1.0 });
          setTimeout(() => {
              this.resolveCurrent = null;
              resolve();
          }, (1500 + (item.text.length * 80)) / rate);
        }
      });

      if (this.playbackId !== currentId) break;
      await new Promise(r => {
          this.resolveCurrent = r;
          setTimeout(() => {
              this.resolveCurrent = null;
              r();
          }, 200 / rate);
      });
    }
  }
}

export const tts = new TTSProvider();
