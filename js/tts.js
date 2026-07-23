/**
 * Multilingual TTS via Web Speech API.
 * Segments are queued with per-segment BCP-47 lang tags.
 */

const LANG_VOICE_PREF = {
  "zh-TW": ["zh-TW", "zh-HK", "zh-CN", "zh"],
  "zh-CN": ["zh-CN", "zh-TW", "zh"],
  "en-US": ["en-US", "en-GB", "en"],
  "ja-JP": ["ja-JP", "ja"],
  "de-DE": ["de-DE", "de-AT", "de"],
  "fr-FR": ["fr-FR", "fr-CA", "fr"],
};

export class MultilingualTTS {
  constructor() {
    this.supported = typeof window !== "undefined" && "speechSynthesis" in window;
    this.rate = 1;
    this._voices = [];
    this._playingId = null;
    this._onState = null;
    this._keepAlive = null;

    if (this.supported) {
      this._loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
    }
  }

  onStateChange(fn) {
    this._onState = fn;
  }

  _emit(state) {
    this._onState?.(state);
  }

  _loadVoices() {
    this._voices = window.speechSynthesis.getVoices();
  }

  setRate(rate) {
    this.rate = Math.min(1.5, Math.max(0.6, Number(rate) || 1));
  }

  stop() {
    if (!this.supported) return;
    this._clearKeepAlive();
    window.speechSynthesis.cancel();
    this._playingId = null;
    this._emit({ status: "idle", lineId: null });
  }

  get playingId() {
    return this._playingId;
  }

  /**
   * @param {Array<{text: string, lang: string}>} segments
   * @param {string} [lineId]
   */
  speak(segments, lineId = null) {
    if (!this.supported) {
      this._emit({ status: "unsupported", lineId: null });
      return;
    }

    const clean = (segments || []).filter((s) => s?.text?.trim());
    if (!clean.length) return;

    this.stop();
    this._playingId = lineId;
    this._emit({ status: "playing", lineId });

    // Chrome workaround: keep synthesis from pausing mid-queue
    this._startKeepAlive();

    let remaining = clean.length;

    clean.forEach((segment) => {
      const utterance = new SpeechSynthesisUtterance(segment.text.trim());
      utterance.lang = segment.lang;
      utterance.rate = this.rate;
      const voice = this._pickVoice(segment.lang);
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        remaining -= 1;
        if (remaining <= 0) {
          this._clearKeepAlive();
          this._playingId = null;
          this._emit({ status: "idle", lineId: null });
        }
      };

      utterance.onerror = () => {
        remaining -= 1;
        if (remaining <= 0) {
          this._clearKeepAlive();
          this._playingId = null;
          this._emit({ status: "idle", lineId: null });
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  _pickVoice(lang) {
    if (!this._voices.length) this._loadVoices();
    const prefs = LANG_VOICE_PREF[lang] || [lang, lang.split("-")[0]];

    for (const pref of prefs) {
      const exact = this._voices.find(
        (v) => v.lang === pref || v.lang.replace("_", "-") === pref
      );
      if (exact) return exact;
    }

    const prefix = lang.split("-")[0].toLowerCase();
    return (
      this._voices.find((v) =>
        v.lang.replace("_", "-").toLowerCase().startsWith(prefix)
      ) || null
    );
  }

  _startKeepAlive() {
    this._clearKeepAlive();
    this._keepAlive = window.setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        this._clearKeepAlive();
        return;
      }
      // Resume if Chrome silently pauses
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
  }

  _clearKeepAlive() {
    if (this._keepAlive) {
      clearInterval(this._keepAlive);
      this._keepAlive = null;
    }
  }
}
