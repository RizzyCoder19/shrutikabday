"use client";

import React from "react";
import { useExperienceStore } from "@/state/experience-store";
import { EXPERIENCE_SCENES, SCENE_METADATA } from "@/experience/scenes";

export function ProgressIndicator() {
  const currentScene = useExperienceStore((s) => s.scene);
  const metadata = SCENE_METADATA[currentScene] || SCENE_METADATA.BLACK_INTRO;
  const currentIndex = EXPERIENCE_SCENES.indexOf(currentScene);

  return (
    <nav className="hud-pill" aria-label="Progress">
      <span style={{ fontWeight: 600, color: "var(--color-champagne-gold)" }}>
        {metadata.number}
      </span>
      <span style={{ opacity: 0.4 }}>/</span>
      <span style={{ opacity: 0.65 }}>12</span>
      <span style={{ margin: "0 0.3rem", opacity: 0.3 }}>•</span>
      <span
        className="hud-scene-title"
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
        }}
      >
        {metadata.title}
      </span>
      <div className="hud-dots" aria-hidden="true">
        {EXPERIENCE_SCENES.map((sc, i) => (
          <div
            key={sc}
            style={{
              width: i === currentIndex ? "10px" : "3px",
              height: "3px",
              borderRadius: "2px",
              backgroundColor:
                i <= currentIndex
                  ? "var(--color-champagne-gold)"
                  : "rgba(255, 255, 255, 0.2)",
              transition: "all 0.35s ease",
            }}
          />
        ))}
      </div>
    </nav>
  );
}
