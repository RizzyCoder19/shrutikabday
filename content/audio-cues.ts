import type { ExperienceScene } from "@/experience/scenes";

export interface SceneAudioCue {
  /** Mood note for chapter pacing */
  mood: string;
  /** Main continuous soundtrack path inside `public/audio/` */
  trackSrc: string | null;
  /** Target normalized volume (0.0 to 1.0) — transitions smoothly via duck/unduck without seeking */
  volume: number;
  /** Smooth volume transition duration in milliseconds */
  fadeMs: number;
  /** Whether the scene intentionally ducks volume behind reading content */
  duckAudio: boolean;
}

const MAIN_TRACK = "/audio/lut-gaye.mp3";
export const ENDING_TRACK = "/audio/ha tu hai.m4a";

/**
 * Continuous Soundtrack Cue Map (following `bhadwikabday` SoundtrackDirector architecture):
 * - `/audio/lut-gaye.mp3` plays as ONE continuous unbroken stream from 0:00
 *   starting when the user begins the experience (Chapters 01–10).
 * - Chapter 11 (`WRAP_UP`): Immediately fades the first song to zero within ~1.5s,
 *   leaving Chapter 11 in genuine silence.
 * - On clicking "LET'S WRAP THIS UP": Ending track (`ha tu hai.m4a`) starts cleanly from 0:00
 *   at full volume (1.0) and carries across Chapter 12 (`MEMORY_GALAXY`).
 * - Only explicit Replay resets both tracks.
 */
export const SCENE_AUDIO_CUES: Record<ExperienceScene, SceneAudioCue> = {
  BLACK_INTRO: {
    mood: "Silence before Ready? click; resets playback on explicit replay",
    trackSrc: null,
    volume: 0,
    fadeMs: 500,
    duckAudio: false,
  },
  SPIDERMAN: {
    mood: "Piano intro swells smoothly into sketch & opening promise",
    trackSrc: MAIN_TRACK,
    volume: 0.74,
    fadeMs: 1100,
    duckAudio: false,
  },
  GIRL_BEHIND_NAME: {
    mood: "Warm continuous play",
    trackSrc: MAIN_TRACK,
    volume: 0.76,
    fadeMs: 700,
    duckAudio: false,
  },
  TWO_YEARS_AGO: {
    mood: "Reflective timeline buildup",
    trackSrc: MAIN_TRACK,
    volume: 0.76,
    fadeMs: 700,
    duckAudio: false,
  },
  INSTAGRAM_ARCHIVE: {
    mood: "Gentle duck so reading conversations feels unhurried",
    trackSrc: MAIN_TRACK,
    volume: 0.44,
    fadeMs: 850,
    duckAudio: true,
  },
  FLOWER_GARDEN: {
    mood: "Unduck warm swell across blooming botanical garden",
    trackSrc: MAIN_TRACK,
    volume: 0.78,
    fadeMs: 900,
    duckAudio: false,
  },
  MEMORY_CONSTELLATION: {
    mood: "Full warmth over floating Shruti photo constellation",
    trackSrc: MAIN_TRACK,
    volume: 0.86,
    fadeMs: 850,
    duckAudio: false,
  },
  HEART_TREE: {
    mood: "Anticipation on bow -> swells to full strength on tree bloom",
    trackSrc: MAIN_TRACK,
    volume: 0.72,
    fadeMs: 800,
    duckAudio: false,
  },
  BIRTHDAY_CAKE: {
    mood: "Gentle candlelit anticipation -> swells on blowout celebration",
    trackSrc: MAIN_TRACK,
    volume: 0.54,
    fadeMs: 800,
    duckAudio: true,
  },
  LETTER: {
    mood: "Soft intimate duck while reading the folded note",
    trackSrc: MAIN_TRACK,
    volume: 0.38,
    fadeMs: 1000,
    duckAudio: true,
  },
  WRAP_UP: {
    mood: "Fade primary track to absolute silence within ~1.5s; silence in wrap up",
    trackSrc: null,
    volume: 0,
    fadeMs: 1500,
    duckAudio: false,
  },
  MEMORY_GALAXY: {
    mood: "Ending soundtrack finale ('Ha Tu Hai') plays at full volume",
    trackSrc: ENDING_TRACK,
    volume: 1.0,
    fadeMs: 250,
    duckAudio: false,
  },
};
