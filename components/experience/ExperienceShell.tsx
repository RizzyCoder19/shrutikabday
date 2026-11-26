"use client";

import React, { ReactNode, useEffect } from "react";
import { ProgressIndicator } from "./ProgressIndicator";
import { AudioController } from "./AudioController";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { musicCueManager } from "@/lib/audio/music-cue-manager";

interface ExperienceShellProps {
  children: ReactNode;
}

export function ExperienceShell({ children }: ExperienceShellProps) {
  const scene = useExperienceStore((s) => s.scene);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);
  const hideChrome = scene === "BLACK_INTRO";

  // Unlock central audio engines on earliest user gesture (even on intro screen)
  useEffect(() => {
    const unlockOnce = () => {
      audioSynth.unlock();
      musicCueManager.unlock();
      window.removeEventListener("pointerdown", unlockOnce);
      window.removeEventListener("keydown", unlockOnce);
    };

    window.addEventListener("pointerdown", unlockOnce);
    window.addEventListener("keydown", unlockOnce);

    return () => {
      window.removeEventListener("pointerdown", unlockOnce);
      window.removeEventListener("keydown", unlockOnce);
    };
  }, []);

  // Synchronize central musical cue whenever active scene or mute state changes
  useEffect(() => {
    musicCueManager.sync(scene, soundEnabled);
  }, [scene, soundEnabled]);

  useEffect(() => {
    return () => {
      musicCueManager.reset();
    };
  }, []);

  return (
    <div className="experience-stage" data-scene={scene}>
      {!hideChrome && (
        <header className="ambient-hud" aria-label="Experience controls">
          <ProgressIndicator />
          <AudioController />
        </header>
      )}
      {children}
    </div>
  );
}
