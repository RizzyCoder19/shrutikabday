"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { useExperienceStore } from "@/state/experience-store";

interface Balloon {
  id: number;
  color: string;
  left: string;
  delay: string;
  popped: boolean;
}

export function CakeCelebration() {
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);
  const [balloons, setBalloons] = useState<Balloon[]>([
    { id: 1, color: "#D9A6B7", left: "15%", delay: "0s", popped: false },
    { id: 2, color: "#7770A8", left: "30%", delay: "1.2s", popped: false },
    { id: 3, color: "#E9C77D", left: "50%", delay: "0.6s", popped: false },
    { id: 4, color: "#F3D9C9", left: "70%", delay: "1.8s", popped: false },
    { id: 5, color: "#D9A6B7", left: "85%", delay: "0.9s", popped: false },
  ]);

  const handlePop = (id: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    // Trigger pop sound
    if (soundEnabled) {
      audioSynth.playBalloonPop();
    }

    // Trigger confetti from balloon coordinate
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { x, y },
      colors: ["#E9C77D", "#D9A6B7", "#7770A8", "#FFF2E4", "#F3D9C9"],
    });

    setBalloons((prev) =>
      prev.map((b) => (b.id === id ? { ...b, popped: true } : b))
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 25,
      }}
      aria-label="Floating party balloons"
    >
      {balloons.map((b) => {
        if (b.popped) return null;
        return (
          <div
            key={b.id}
            onClick={(e) => handlePop(b.id, e)}
            onTouchStart={(e) => handlePop(b.id, e)}
            style={{
              position: "absolute",
              bottom: "-120px",
              left: b.left,
              width: "56px",
              height: "72px",
              borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
              backgroundColor: b.color,
              boxShadow: `inset -6px -6px 12px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px ${b.color}55`,
              animation: `floatUpward 14s linear infinite`,
              animationDelay: b.delay,
              pointerEvents: "auto",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
            title="Tap to pop balloon!"
          >
            {/* Balloon knot and string */}
            <div
              style={{
                position: "absolute",
                bottom: "-6px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "8px",
                height: "6px",
                backgroundColor: b.color,
                borderRadius: "2px",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-36px",
                left: "50%",
                width: "1px",
                height: "30px",
                backgroundColor: "rgba(255, 255, 255, 0.4)",
              }}
            />
          </div>
        );
      })}

      <style jsx>{`
        @keyframes floatUpward {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.85;
          }
          50% {
            transform: translateY(-50vh) rotate(6deg);
          }
          100% {
            transform: translateY(-120vh) rotate(-6deg);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}
