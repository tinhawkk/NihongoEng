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
    this.recognition.lang = lang;
    this.lang = lang; // Store the original exact string to avoid browser lowercase normalization issues
    
    this.transcript = "";
    this.isListening = false;
    this.onResult = null;
    this.onError = null;
    this.onEnd = null;

    this.recognition.onresult = (event) => {
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }
      this.transcript = fullTranscript;
      if (this.onResult) {
        this.onResult(fullTranscript, event.results[event.results.length - 1].isFinal);
      }
    };

    this.recognition.onerror = (event) => {
      console.error("[Speech] Recognition error", event.error);
      if (this.onError) this.onError(event.error);
      this.isListening = false;
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
    this.recognition.stop();
    this.isListening = false;
  }
}

export const createRecognition = (lang) => new SpeechRecognitionManager(lang);
