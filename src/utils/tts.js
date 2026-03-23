/**
 * Tiện ích phát âm thanh bằng Text-to-Speech (TTS) của trình duyệt.
 * Giúp tiết kiệm dữ liệu (data) vì không cần tải file MP3.
 */

class TTSProvider {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.currentAudio = null;
    this.playbackId = 0; 
    this.resolveCurrent = null; // Callback để giải phóng Promise đang chờ
    
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoice();
    }
    this.loadVoice();
  }

  loadVoice() {
    const voices = this.synth.getVoices();
    // Ưu tiên các giọng nói chất lượng cao (Natural, Neural, Google)
    this.voice = voices.find(v => (v.lang.startsWith('ja')) && (v.name.includes('Natural') || v.name.includes('Neural'))) 
                 || voices.find(v => (v.lang.startsWith('ja')) && v.name.includes('Google'))
                 || voices.find(v => v.lang.startsWith('ja')) 
                 || voices[0];
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

    // GIẢI PHÓNG PROMISE ĐANG TREO (CỰC KỲ QUAN TRỌNG)
    if (this.resolveCurrent) {
        this.resolveCurrent();
        this.resolveCurrent = null;
    }

    return this.playbackId;
  }

  async speak(text, rate = 1.0, pitch = 1.0) {
    if (!text) return;
    const cleanText = text.replace(/[\[\(\{（].*?[\]\)\}）]/g, '').trim();
    const currentId = this.stop();

    // Đối với chế độ đọc chậm, ưu tiên sử dụng Offline TTS vì nó xử lý giãn âm thanh tốt hơn online
    if (rate < 0.9 || pitch !== 1.0) {
      return this.speakOffline(cleanText, rate, pitch);
    }

    try {
      // Tối ưu hóa URL Google TTS: Chỉ làm chậm vừa phải để giữ độ trong của tiếng
      const speed = rate < 1 ? 0.45 : 1; 
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(cleanText)}&ttsspeed=${speed}`;
      
      const audio = new Audio(googleTtsUrl);
      this.currentAudio = audio;
      // KHÔNG dùng audio.playbackRate ở đây nữa để tránh méo tiếng 2 lần
      
      await audio.play();
      if (this.playbackId !== currentId) {
          audio.pause();
          audio.src = "";
      }
    } catch (error) {
      if (this.playbackId === currentId) {
          this.speakOffline(cleanText, rate, pitch);
      }
    }
  }

  speakOffline(text, rate = 0.9, pitch = 1.0) {
    if (!text) return;
    const cleanText = text.replace(/[\[\(\{（].*?[\]\)\}）]/g, '').trim();
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    utterance.pitch = pitch;
    this.synth.speak(utterance);
  }

  playWithFallback(url, text, rate = 1.0) {
    const currentId = this.stop();

    if (!url) {
      this.speak(text, rate);
      return;
    }

    const audio = new Audio(url);
    this.currentAudio = audio;
    audio.playbackRate = rate;
    
    const timeout = setTimeout(() => {
      if (this.playbackId !== currentId) return;
      audio.pause();
      audio.src = "";
      this.speak(text, rate);
    }, 3000);

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
          this.speak(text, rate);
      }
    };

    audio.play().catch(() => {
      clearTimeout(timeout);
      if (this.playbackId === currentId) {
          this.speak(text, rate);
      }
    });
  }

  async playSequentially(items, rate = 1.0) {
    const currentId = this.stop();

    for (const item of items) {
      if (this.playbackId !== currentId) break;
      
      await new Promise((resolve) => {
        this.resolveCurrent = resolve; // Đăng ký callback để interrupt
        
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
             this.speakOffline(item.text, rate * 0.9, item.pitch || 1.0);
             setTimeout(resolve, (1500 + item.text.length * 50) / rate);
          };
          
          audio.play().catch(() => {
             if (this.playbackId !== currentId) return resolve();
             this.speakOffline(item.text, rate * 0.9, item.pitch || 1.0);
             setTimeout(resolve, (1500 + item.text.length * 50) / rate);
          });
        } else {
          if (this.playbackId !== currentId) return resolve();
          this.speakOffline(item.text, rate * 1.0, item.pitch || 1.0);
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
