/**
 * Hỗ trợ phát âm thanh game và thông báo với độ trễ tối thiểu (Low Latency).
 * Sử dụng Web Audio API để tạo âm thanh trực tiếp thay vì tải file MP3.
 */

class SoundUtility {
  constructor() {
    this.ctx = null;
  }

  _initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Phát tiếng bíp đơn giản
   * @param {number} freq - Tần số (Hz)
   * @param {number} duration - Độ dài (ms)
   * @param {number} volume - Âm lượng (0-1)
   */
  playBeep(freq = 440, duration = 150, volume = 0.1) {
    try {
      const ctx = this._initCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      
      o.type = "sine";
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      
      g.connect(ctx.destination);
      o.connect(g);
      
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(volume, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
      
      o.start(now);
      o.stop(now + duration / 1000 + 0.05);
    } catch (e) {
      console.warn("Sound error:", e);
    }
  }

  /**
   * Phát âm thanh thông báo "Ting Ting" (nhẹ nhàng)
   */
  playNotification() {
    this.playBeep(880, 150, 0.1);
    setTimeout(() => this.playBeep(1046, 200, 0.08), 100);
  }

  /**
   * Phát âm thanh chúc mừng (thành công)
   */
  playSuccess() {
    this.playBeep(523.25, 100, 0.1); // C5
    setTimeout(() => this.playBeep(659.25, 100, 0.1), 100); // E5
    setTimeout(() => this.playBeep(783.99, 150, 0.1), 200); // G5
    setTimeout(() => this.playBeep(1046.50, 300, 0.1), 350); // C6
  }

  /**
   * Phát âm thanh báo lỗi / sai
   */
  playError() {
    this.playBeep(220, 200, 0.15);
    setTimeout(() => this.playBeep(180, 400, 0.1), 150);
  }
}

export const sounds = new SoundUtility();
