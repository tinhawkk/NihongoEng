/**
 * Utility for Web Speech API (Speech Recognition)
 */
export class SpeechRecognitionManager {
  constructor(lang = "ja-JP") {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.supported = false;
      return;
    }
    this.supported = true;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = lang;
    this.lang = lang; 
    
    this.transcript = "";
    this.isListening = false;
    this.onResult = null;
    this.onError = null;
    this.onEnd = null;

    this.recognition.onresult = (event) => {
      let fullTranscript = "";
      let isFinal = false;
      
      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      
      this.transcript = fullTranscript;
      if (this.onResult) {
        this.onResult(fullTranscript, isFinal);
      }
    };

    this.recognition.onerror = (event) => {
      // Ignore non-fatal 'no-speech' warnings to keep engine alive
      if (event.error !== 'no-speech') {
         console.error("[Speech] Recognition error", event.error);
      }
      if (this.onError) this.onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
    };
  }

  start() {
    if (!this.supported || this.isListening) return;
    this.isListening = true;
    try {
      this.recognition.start();
    } catch (e) {
      if (!e.message?.includes('already started')) {
        console.error("[Speech] Start error:", e);
      }
      this.isListening = false;
    }
  }

  stop() {
    if (!this.supported || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (e) {}
    this.isListening = false;
  }
}

export const createRecognition = (lang) => new SpeechRecognitionManager(lang);
