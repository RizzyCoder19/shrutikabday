"use client";

import React, { useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { musicCueManager } from "@/lib/audio/music-cue-manager";

export function AudioController() {
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);
  const toggleSound = useExperienceStore((s) => s.toggleSound);

  useEffect(() => {
    const handleGesture = () => {
      audioSynth.unlock();
      musicCueManager.unlock();
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };

    window.addEventListener("pointerdown", handleGesture);
    window.addEventListener("keydown", handleGesture);

    return () => {
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, []);

  const handleToggle = () => {
    audioSynth.unlock();
    musicCueManager.unlock();
    if (!soundEnabled) {
      audioSynth.playGentleChime(659.25);
    }
    toggleSound();
  };

  return (
    <button
      onClick={handleToggle}
      className="hud-btn"
      title={soundEnabled ? "Mute soundtrack & chimes" : "Enable soundtrack & chimes"}
      aria-label={soundEnabled ? "Sound on" : "Sound off"}
    >
      {soundEnabled ? (
        <>
          <Volume2 size={14} style={{ color: "var(--color-champagne-gold)" }} />
          <span>Sound On</span>
        </>
      ) : (
        <>
          <VolumeX size={14} style={{ color: "rgba(255, 242, 228, 0.5)" }} />
          <span>Muted</span>
        </>
      )}
    </button>
  );
}
