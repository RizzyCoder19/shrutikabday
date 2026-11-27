import type { ExperienceScene } from "@/experience/scenes";
import { SCENE_AUDIO_CUES, ENDING_TRACK } from "@/content/audio-cues";

/**
 * Soundtrack Director / Music Cue Manager
 * Mirrors `bhadwikabday-main`'s SoundtrackDirector with dedicated two-track ending handoff:
 * - Primary track (`/audio/lut-gaye.mp3`) plays unbroken across Chapters 01–10.
 * - Chapter 11 (`WRAP_UP`): Immediately fades primary track to absolute 0 within ~1.5s,
 *   pauses it, and ensures complete silence during Chapter 11 reading.
 * - On "LET'S WRAP THIS UP" button click: Handoff to ending track (`/audio/ha tu hai.m4a`),
 *   starting from `currentTime = 0` at full volume (1.0), and carrying through Chapter 12.
 * - Explicit Replay: Fully resets both tracks, returning to fresh Chapter 01 state.
 */
class MusicCueManager {
  private primaryAudio: HTMLAudioElement | null = null;
  private endingAudio: HTMLAudioElement | null = null;
  private unlocked = false;
  private muted = false;
  private currentScene: ExperienceScene = "BLACK_INTRO";
  private primaryVolumeFadeTimer: number | null = null;
  private endingVolumeFadeTimer: number | null = null;
  private pendingStartTimer: number | null = null;
  private isEndingPhase = false; // Set true when WRAP_UP or MEMORY_GALAXY is active

  private ensurePrimaryAudio(src: string): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;

    if (!this.primaryAudio) {
      this.primaryAudio = new Audio(src);
      this.primaryAudio.loop = true;
      this.primaryAudio.preload = "auto";
      this.primaryAudio.volume = 0;
    }

    return this.primaryAudio;
  }

  private ensureEndingAudio(src: string): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;

    if (!this.endingAudio) {
      this.endingAudio = new Audio(src);
      this.endingAudio.loop = true;
      this.endingAudio.preload = "auto";
      this.endingAudio.volume = 0;
    }

    return this.endingAudio;
  }

  private clearPendingStart(): void {
    if (this.pendingStartTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(this.pendingStartTimer);
      this.pendingStartTimer = null;
    }
  }

  public unlock(): void {
    this.unlocked = true;
    if (this.pendingStartTimer !== null) return;

    if (this.isEndingPhase) {
      if (this.endingAudio && !this.muted && this.endingAudio.paused && this.currentScene === "MEMORY_GALAXY") {
        this.endingAudio.play().catch(() => {});
      }
      return;
    }

    const cue = SCENE_AUDIO_CUES[this.currentScene];
    if (cue?.trackSrc && this.primaryAudio && !this.muted && this.primaryAudio.paused) {
      this.primaryAudio.play().catch(() => {});
    }
  }

  /**
   * Called directly from user gesture when beginning from Intro (0:00 start after delay).
   */
  public startMainTrack(soundEnabled: boolean, delayMs = 800): void {
    this.unlocked = true;
    this.muted = !soundEnabled;
    this.isEndingPhase = false;

    // Stop and reset any leftover ending audio
    this.stopEndingTrack();

    const src = SCENE_AUDIO_CUES.SPIDERMAN.trackSrc;
    if (!src) return;

    const el = this.ensurePrimaryAudio(src);
    if (!el) return;

    this.clearPendingStart();
    this.clearPrimaryVolumeFade();
    try {
      el.currentTime = 0;
    } catch {}

    el.muted = !soundEnabled;
    el.volume = 0;

    const beginPlay = () => {
      this.pendingStartTimer = null;
      if (this.primaryAudio !== el || this.isEndingPhase) return;
      el.muted = this.muted;
      el.play()
        .then(() => {
          if (!this.muted && !this.isEndingPhase) {
            this.fadePrimaryVolume(
              SCENE_AUDIO_CUES[this.currentScene]?.volume || SCENE_AUDIO_CUES.SPIDERMAN.volume,
              1100,
              false
            );
          }
        })
        .catch(() => {});
    };

    if (delayMs > 0 && typeof window !== "undefined") {
      this.pendingStartTimer = window.setTimeout(beginPlay, delayMs);
    } else {
      beginPlay();
    }
  }

  /**
   * Synchronize chapter duck/unduck and mute state.
   * If scene is WRAP_UP: Immediately begins smooth 1.5s fade to silence of primary track.
   * If scene is MEMORY_GALAXY: Ensures ending track is active and primary is silenced.
   */
  public sync(scene: ExperienceScene, soundEnabled: boolean): void {
    this.currentScene = scene;
    this.muted = !soundEnabled;

    if (scene === "BLACK_INTRO") {
      this.reset();
      return;
    }

    // CHAPTER 11 — Instant fade out of the primary track
    if (scene === "WRAP_UP") {
      this.isEndingPhase = true;
      this.clearPendingStart();
      this.fadePrimaryToSilence(1500);
      return;
    }

    // CHAPTER 12 — Galaxy finale
    if (scene === "MEMORY_GALAXY") {
      this.isEndingPhase = true;
      this.clearPendingStart();
      this.silenceAndPausePrimaryImmediate();

      const endingEl = this.ensureEndingAudio(ENDING_TRACK);
      if (!endingEl) return;

      if (!soundEnabled) {
        this.fadeEndingVolume(0, 250, false);
        endingEl.muted = true;
        return;
      }

      endingEl.muted = false;
      if (this.unlocked && endingEl.paused) {
        endingEl.play().catch(() => {});
      }
      this.fadeEndingVolume(1.0, 250, false);
      return;
    }

    // Chapters 1–10: normal primary track lifecycle
    this.isEndingPhase = false;
    const cue = SCENE_AUDIO_CUES[scene];
    if (!cue?.trackSrc) return;

    const el = this.ensurePrimaryAudio(cue.trackSrc);
    if (!el) return;

    if (!soundEnabled) {
      this.fadePrimaryVolume(0, 420, false);
      el.muted = true;
      return;
    }

    el.muted = false;
    if (this.pendingStartTimer !== null) {
      return;
    }

    if (this.unlocked && el.paused) {
      el.play().catch(() => {});
    }

    this.fadePrimaryVolume(cue.volume, cue.fadeMs, false);
  }

  /**
   * Immediately begins fading the primary track to zero (approx 1.5s) and pauses it.
   */
  public fadePrimaryToSilence(durationMs = 1500): void {
    this.clearPendingStart();
    if (!this.primaryAudio) return;
    this.fadePrimaryVolume(0, durationMs, true);
  }

  private silenceAndPausePrimaryImmediate(): void {
    this.clearPendingStart();
    this.clearPrimaryVolumeFade();
    if (this.primaryAudio) {
      this.primaryAudio.volume = 0;
      this.primaryAudio.pause();
    }
  }

  /**
   * Called directly inside the click handler of the Chapter 11 "LET'S WRAP THIS UP" button.
   * Confirms primary track is stopped/silenced, resets second song to 0:00, and begins playing at full volume (1.0).
   */
  public startEndingTrack(soundEnabled: boolean): void {
    this.isEndingPhase = true;
    this.unlocked = true;
    this.muted = !soundEnabled;

    // Confirm first song is zero volume and paused
    this.silenceAndPausePrimaryImmediate();

    const el = this.ensureEndingAudio(ENDING_TRACK);
    if (!el) return;

    this.clearEndingVolumeFade();
    try {
      el.currentTime = 0;
    } catch {}

    el.muted = !soundEnabled;
    el.volume = 0;

    if (!soundEnabled) {
      return;
    }

    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (!this.muted) {
            // Quick 180ms technical ramp to avoid waveform pop, then full 1.0 volume
            this.fadeEndingVolume(1.0, 180, false);
          }
        })
        .catch(() => {
          // Handled gracefully (e.g. policy block or user gesture interrupted)
        });
    }
  }

  public stopEndingTrack(): void {
    this.clearEndingVolumeFade();
    if (!this.endingAudio) return;
    try {
      this.endingAudio.pause();
      this.endingAudio.currentTime = 0;
      this.endingAudio.volume = 0;
    } catch {}
  }

  /**
   * Smoothly unduck / swell volume on climax interaction (arrow bloom, cake blowout).
   * Guards against affecting the ending phase.
   */
  public swellVolume(targetVolume = 0.88, fadeMs = 850): void {
    if (this.muted) return;
    if (this.isEndingPhase) {
      if (this.endingAudio && !this.endingAudio.paused) {
        this.fadeEndingVolume(1.0, fadeMs, false);
      }
      return;
    }
    if (!this.primaryAudio) return;
    if (this.primaryAudio.paused && this.unlocked) {
      this.primaryAudio.play().catch(() => {});
    }
    this.fadePrimaryVolume(targetVolume, fadeMs, false);
  }

  public getCurrentTime(): number {
    if (this.isEndingPhase && this.endingAudio) {
      return this.endingAudio.currentTime;
    }
    return this.primaryAudio ? this.primaryAudio.currentTime : 0;
  }

  public isEndingPlaying(): boolean {
    return Boolean(this.endingAudio && !this.endingAudio.paused && !this.endingAudio.ended);
  }

  public getEndingAudio(): HTMLAudioElement | null {
    return this.endingAudio;
  }

  /**
   * Full reset when replaying the journey from Chapter 01
   */
  public reset(): void {
    this.clearPendingStart();
    this.clearPrimaryVolumeFade();
    this.clearEndingVolumeFade();
    this.isEndingPhase = false;

    // Stop and reset ending audio
    this.stopEndingTrack();

    // Reset primary audio
    if (!this.primaryAudio) return;
    const el = this.primaryAudio;
    this.fadePrimaryVolume(0, 380, true, () => {
      try {
        el.currentTime = 0;
      } catch {}
    });
  }

  private clearPrimaryVolumeFade(): void {
    if (this.primaryVolumeFadeTimer !== null && typeof window !== "undefined") {
      window.clearInterval(this.primaryVolumeFadeTimer);
      this.primaryVolumeFadeTimer = null;
    }
  }

  private clearEndingVolumeFade(): void {
    if (this.endingVolumeFadeTimer !== null && typeof window !== "undefined") {
      window.clearInterval(this.endingVolumeFadeTimer);
      this.endingVolumeFadeTimer = null;
    }
  }

  private fadePrimaryVolume(
    targetVol: number,
    durationMs: number,
    pauseOnZero: boolean,
    onDone?: () => void
  ): void {
    if (typeof window === "undefined" || !this.primaryAudio) return;
    this.clearPrimaryVolumeFade();

    const el = this.primaryAudio;
    const clampedTarget = Math.max(0, Math.min(1, targetVol));
    const steps = Math.max(6, Math.round(durationMs / 40));
    const startVol = el.volume;
    let step = 0;

    this.primaryVolumeFadeTimer = window.setInterval(() => {
      step++;
      const t = Math.min(1, step / steps);
      el.volume = Math.max(0, Math.min(1, startVol + (clampedTarget - startVol) * t));
      if (t >= 1) {
        this.clearPrimaryVolumeFade();
        if (pauseOnZero && clampedTarget === 0) {
          el.pause();
        }
        onDone?.();
      }
    }, Math.max(25, Math.round(durationMs / steps)));
  }

  private fadeEndingVolume(
    targetVol: number,
    durationMs: number,
    pauseOnZero: boolean,
    onDone?: () => void
  ): void {
    if (typeof window === "undefined" || !this.endingAudio) return;
    this.clearEndingVolumeFade();

    const el = this.endingAudio;
    const clampedTarget = Math.max(0, Math.min(1, targetVol));
    const steps = Math.max(6, Math.round(durationMs / 30));
    const startVol = el.volume;
    let step = 0;

    this.endingVolumeFadeTimer = window.setInterval(() => {
      step++;
      const t = Math.min(1, step / steps);
      el.volume = Math.max(0, Math.min(1, startVol + (clampedTarget - startVol) * t));
      if (t >= 1) {
        this.clearEndingVolumeFade();
        if (pauseOnZero && clampedTarget === 0) {
          el.pause();
        }
        onDone?.();
      }
    }, Math.max(20, Math.round(durationMs / steps)));
  }
}

export const musicCueManager = new MusicCueManager();
