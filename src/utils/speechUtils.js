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
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = lang;
    
    this.transcript = "";
    this.isListening = false;
    this.onResult = null;
    this.onError = null;
    this.onEnd = null;

    this.recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          this.transcript = event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      if (this.onResult) {
        this.onResult(this.transcript || interimTranscript, event.results[event.results.length - 1].isFinal);
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        console.warn('[Speech] No speech detected.');
        if (this.onError) this.onError('Không nghe thấy tiếng. Vui lòng thử lại.');
      } else {
        console.error("[Speech] Recognition error", event.error);
        if (this.onError) this.onError(event.error);
      }
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd(this.transcript);
    };
  }

  start() {
    if (!this.supported || this.isListening) return;
    this.transcript = "";
    this.isListening = true;
    try {
      this.recognition.start();
    } catch (e) {
      console.error(e);
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
