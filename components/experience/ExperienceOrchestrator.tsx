"use client";

import React, { Suspense, lazy, useEffect } from "react";
import { EXPERIENCE_SCENES, type ExperienceScene } from "@/experience/scenes";
import { useExperienceStore } from "@/state/experience-store";
import { ExperienceShell } from "./ExperienceShell";
import { BlackIntroScene } from "@/components/scenes/BlackIntroScene";
import { SpidermanScene } from "@/components/scenes/SpidermanScene";
import { GirlBehindNameScene } from "@/components/scenes/GirlBehindNameScene";
import { TwoYearsAgoScene } from "@/components/scenes/TwoYearsAgoScene";
import { InstagramArchiveScene } from "@/components/scenes/InstagramArchiveScene";
import { GardenScene } from "@/components/scenes/GardenScene";
import { MemoryConstellationScene } from "@/components/scenes/MemoryConstellationScene";
import { BirthdayCakeScene } from "@/components/scenes/BirthdayCakeScene";
import { BirthdayLetterScene } from "@/components/scenes/BirthdayLetterScene";
import { WrapUpScene } from "@/components/scenes/WrapUpScene";

// Lazy load heavy Canvas/WebGL experiences
const HeartTreeScene = lazy(() =>
  import("@/components/scenes/HeartTreeScene").then((m) => ({
    default: m.HeartTreeScene,
  }))
);

const MemoryGalaxyScene = lazy(() =>
  import("@/components/scenes/MemoryGalaxyScene").then((m) => ({
    default: m.MemoryGalaxyScene,
  }))
);

function SceneLoader() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#04040a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(233, 199, 125, 0.7)",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: "1.1rem",
      }}
    >
      Preparing...
    </div>
  );
}

export function ExperienceOrchestrator() {
  const scene = useExperienceStore((s) => s.scene);
  const developmentOverride = useExperienceStore((s) => s.developmentOverride);

  // Allow direct ?scene= navigation across desktop & mobile LAN after initial hydration
  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("scene");
      if (!raw) return;
      const candidate = raw.trim().toUpperCase() as ExperienceScene;
      if (EXPERIENCE_SCENES.includes(candidate)) {
        developmentOverride(candidate);
      }
    } catch {}
  }, [developmentOverride]);

  const renderActiveScene = () => {
    switch (scene) {
      case "BLACK_INTRO":
        return <BlackIntroScene key="black-intro" />;
      case "SPIDERMAN":
        return <SpidermanScene key="spiderman" />;
      case "GIRL_BEHIND_NAME":
        return <GirlBehindNameScene key="girl-behind-name" />;
      case "TWO_YEARS_AGO":
        return <TwoYearsAgoScene key="two-years-ago" />;
      case "INSTAGRAM_ARCHIVE":
        return <InstagramArchiveScene key="instagram-archive" />;
      case "FLOWER_GARDEN":
        return <GardenScene key="flower-garden" />;
      case "MEMORY_CONSTELLATION":
        return <MemoryConstellationScene key="memory-constellation" />;
      case "HEART_TREE":
        return (
          <Suspense fallback={<SceneLoader />}>
            <HeartTreeScene key="heart-tree" />
          </Suspense>
        );
      case "BIRTHDAY_CAKE":
        return <BirthdayCakeScene key="birthday-cake" />;
      case "LETTER":
        return <BirthdayLetterScene key="letter" />;
      case "WRAP_UP":
        return <WrapUpScene key="wrap-up" />;
      case "MEMORY_GALAXY":
        return (
          <Suspense fallback={<SceneLoader />}>
            <MemoryGalaxyScene key="memory-galaxy" />
          </Suspense>
        );
      default:
        return <BlackIntroScene key="default-intro" />;
    }
  };

  return <ExperienceShell>{renderActiveScene()}</ExperienceShell>;
}
