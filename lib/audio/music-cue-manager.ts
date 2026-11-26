import type { ExperienceScene } from "@/experience/scenes";
import { SCENE_AUDIO_CUES } from "@/content/audio-cues";

/**
 * Soundtrack Director / Music Cue Manager
 * Mirrors `bhadwikabday-main`'s SoundtrackDirector:
 * - Uses ONE continuous HTML5 Audio element (`/audio/lut-gaye.mp3`) for unbroken playback.
 * - Scene transitions NEVER seek, crossfade-jump, or interrupt playback — only smooth
 *   volume ducking/unducking occurs across chapters.
 * - Playback only resets to `0:00` when the entire experience explicitly restarts (`reset()`).
 */
class MusicCueManager {
  private audio: HTMLAudioElement | null = null;
  private unlocked = false;
  private muted = false;
  private currentScene: ExperienceScene = "BLACK_INTRO";
  private volumeFadeTimer: number | null = null;
  private pendingStartTimer: number | null = null;

  private ensureAudioElement(src: string): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;

    if (!this.audio) {
      this.audio = new Audio(src);
      this.audio.loop = true;
      this.audio.preload = "auto";
      this.audio.volume = 0;
    }

    return this.audio;
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
    const cue = SCENE_AUDIO_CUES[this.currentScene];
    if (cue?.trackSrc && this.audio && !this.muted && this.audio.paused) {
      this.audio.play().catch(() => {});
    }
  }

  /**
   * Called directly from user gesture when beginning from Intro (0:00 start after 0.8s delay).
   */
  public startMainTrack(soundEnabled: boolean, delayMs = 800): void {
    this.unlocked = true;
    this.muted = !soundEnabled;

    const src = SCENE_AUDIO_CUES.SPIDERMAN.trackSrc;
    if (!src) return;

    const el = this.ensureAudioElement(src);
    if (!el) return;

    this.clearPendingStart();
    this.clearVolumeFade();
    try {
      el.currentTime = 0;
    } catch {}

    el.muted = !soundEnabled;
    el.volume = 0;

    const beginPlay = () => {
      this.pendingStartTimer = null;
      if (this.audio !== el) return;
      el.muted = this.muted;
      el.play()
        .then(() => {
          if (!this.muted) {
            this.fadeVolume(SCENE_AUDIO_CUES[this.currentScene]?.volume || SCENE_AUDIO_CUES.SPIDERMAN.volume, 1100, false);
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
   * Synchronize chapter duck/unduck and mute state WITHOUT interrupting or seeking the song.
   */
  public sync(scene: ExperienceScene, soundEnabled: boolean): void {
    this.currentScene = scene;
    this.muted = !soundEnabled;

    if (scene === "BLACK_INTRO") {
      this.reset();
      return;
    }

    const cue = SCENE_AUDIO_CUES[scene];
    if (!cue?.trackSrc) return;

    const el = this.ensureAudioElement(cue.trackSrc);
    if (!el) return;

    if (!soundEnabled) {
      this.fadeVolume(0, 420, false);
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

    this.fadeVolume(cue.volume, cue.fadeMs, false);
  }

  /**
   * Smoothly unduck / swell volume on a climax interaction (arrow bloom, cake blowout, galaxy warp)
   * without altering `currentTime` or breaking the continuous song stream.
   */
  public swellVolume(targetVolume = 0.88, fadeMs = 850): void {
    if (this.muted || !this.audio) return;
    if (this.audio.paused && this.unlocked) {
      this.audio.play().catch(() => {});
    }
    this.fadeVolume(targetVolume, fadeMs, false);
  }

  public getCurrentTime(): number {
    return this.audio ? this.audio.currentTime : 0;
  }

  public reset(): void {
    this.clearPendingStart();
    this.clearVolumeFade();
    if (!this.audio) return;

    const el = this.audio;
    this.fadeVolume(0, 380, true, () => {
      try {
        el.currentTime = 0;
      } catch {}
    });
  }

  private clearVolumeFade(): void {
    if (this.volumeFadeTimer !== null && typeof window !== "undefined") {
      window.clearInterval(this.volumeFadeTimer);
      this.volumeFadeTimer = null;
    }
  }

  private fadeVolume(
    targetVol: number,
    durationMs: number,
    pauseOnZero: boolean,
    onDone?: () => void
  ): void {
    if (typeof window === "undefined" || !this.audio) return;
    this.clearVolumeFade();

    const el = this.audio;
    const clampedTarget = Math.max(0, Math.min(1, targetVol));
    const steps = Math.max(6, Math.round(durationMs / 40));
    const startVol = el.volume;
    let step = 0;

    this.volumeFadeTimer = window.setInterval(() => {
      step++;
      const t = Math.min(1, step / steps);
      el.volume = Math.max(0, Math.min(1, startVol + (clampedTarget - startVol) * t));
      if (t >= 1) {
        this.clearVolumeFade();
        if (pauseOnZero && clampedTarget === 0) {
          el.pause();
        }
        onDone?.();
      }
    }, Math.max(25, Math.round(durationMs / steps)));
  }
}

export const musicCueManager = new MusicCueManager();
