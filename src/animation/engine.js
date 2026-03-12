import * as TWEEN from "@tweenjs/tween.js";
import { log as logAnimDebug } from "./debugLogger";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * RAF-driven animation engine managing playback time, looping, playback rate,
 * seek, play/pause, and tick-based listener notification.
 */
export class AnimationEngine {
  /** @param {Object} opts - Duration, initial time, loop flag, playback rate. */
  constructor({ durationMs = 30000, timeMs = 0, loop = true, playbackRate = 1 } = {}) {
    this.durationMs = Math.max(1, Math.round(Number(durationMs) || 30000));
    this.timeMs = clamp(Math.round(Number(timeMs) || 0), 0, this.durationMs);
    this.loop = Boolean(loop);
    this.playbackRate = Number.isFinite(Number(playbackRate)) ? Number(playbackRate) : 1;
    this.playing = false;
    this.rafId = null;
    this.lastFrameTs = null;
    this.lastTickDeltaMs = 0;
    this.listeners = new Set();
    this.tick = this.tick.bind(this);
    logAnimDebug(`init engine duration=${this.durationMs}`);
  }

  notify() {
    const payload = {
      timeMs: this.timeMs,
      durationMs: this.durationMs,
      isPlaying: this.playing,
      lastTickDeltaMs: this.lastTickDeltaMs,
    };
    this.listeners.forEach((listener) => {
      listener(payload);
    });
  }

  onTick(listener) {
    if (typeof listener !== "function") return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getTime() {
    return this.timeMs;
  }

  isPlaying() {
    return this.playing;
  }

  setDuration(durationMs) {
    const nextDuration = Math.max(1, Math.round(Number(durationMs) || 1));
    this.durationMs = nextDuration;
    this.timeMs = clamp(this.timeMs, 0, this.durationMs);
    this.notify();
  }

  setLoop(enabled) {
    this.loop = Boolean(enabled);
  }

  setPlaybackRate(nextRate) {
    const numeric = Number(nextRate);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    this.playbackRate = numeric;
  }

  seek(timeMs, { shouldLog = true, source = "engine" } = {}) {
    const nextTime = clamp(Math.round(Number(timeMs) || 0), 0, this.durationMs);
    this.timeMs = nextTime;
    this.lastTickDeltaMs = 0;
    if (shouldLog) {
      logAnimDebug(`seek t=${nextTime} source=${source}`);
    }
    this.notify();
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.lastFrameTs = null;
    this.lastTickDeltaMs = 0;
    logAnimDebug("play");
    this.notify();
    this.rafId = requestAnimationFrame(this.tick);
  }

  pause({ shouldLog = true } = {}) {
    if (!this.playing) return;
    this.playing = false;
    this.lastFrameTs = null;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (shouldLog) {
      logAnimDebug("pause");
    }
    this.notify();
  }

  toggle() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  advance(deltaMs) {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.lastTickDeltaMs = deltaMs;
    const scaledDelta = deltaMs * this.playbackRate;
    const limit = this.durationMs;
    let next = this.timeMs + scaledDelta;
    if (next >= limit) {
      if (this.loop) {
        next = next % limit;
      } else {
        next = limit;
      }
    }
    this.timeMs = clamp(next, 0, limit);
    this.notify();

    if (!this.loop && this.timeMs >= limit) {
      this.pause();
    }
  }

  tick(frameTs) {
    if (!this.playing) return;
    TWEEN.update(frameTs);
    if (this.lastFrameTs == null) {
      this.lastFrameTs = frameTs;
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }
    const deltaMs = frameTs - this.lastFrameTs;
    this.lastFrameTs = frameTs;
    this.advance(deltaMs);
    if (this.playing) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  dispose() {
    this.pause({ shouldLog: false });
    this.listeners.clear();
  }
}

export default AnimationEngine;
