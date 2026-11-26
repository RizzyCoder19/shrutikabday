"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { ArrowRight } from "lucide-react";

export function TwoYearsAgoScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);

  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const date2024Ref = useRef<HTMLDivElement>(null);
  const date2026Ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      [headingRef.current, date2024Ref.current, date2026Ref.current, btnRef.current].forEach(
        (el) => el && gsap.set(el, { opacity: 1, y: 0 })
      );
      if (lineRef.current) gsap.set(lineRef.current, { scaleX: 1 });
      return;
    }

    const tl = gsap.timeline();
    tl.fromTo(
      headingRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" }
    )
      .fromTo(
        lineRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 1.3, ease: "power2.inOut" },
        "-=0.3"
      )
      .fromTo(
        date2024Ref.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        "-=0.9"
      )
      .fromTo(
        date2026Ref.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        "-=0.3"
      )
      .fromTo(
        btnRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
      );

    return () => {
      tl.kill();
    };
  }, []);

  const handleContinue = () => {
    if (exiting) return;
    setExiting(true);
    if (soundEnabled) {
      audioSynth.playGentleChime(587.33);
    }

    if (rootRef.current) {
      // Subtle page-turn horizontal sweep transition into the phone archive
      gsap.to(rootRef.current, {
        opacity: 0,
        x: -36,
        duration: 0.7,
        ease: "power2.inOut",
        onComplete: () => transitionTo("INSTAGRAM_ARCHIVE"),
      });
    } else {
      transitionTo("INSTAGRAM_ARCHIVE");
    }
  };

  return (
    <section
      ref={rootRef}
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, #0E0D1D 0%, #17172C 55%, #0C0B17 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        textAlign: "center",
      }}
      aria-label="Chapter 4: Somewhere, Two Years Ago"
    >
      {/* Subtle ruled notebook lines */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 43px, rgba(233, 199, 125, 0.045) 44px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "42rem",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2.4rem",
        }}
      >
        <h2
          ref={headingRef}
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(2.1rem, 5vw, 3.6rem)",
            color: "#FFF2E4",
            opacity: 0,
          }}
        >
          Somewhere, two years ago.
        </h2>

        {/* Minimal Floating Timeline */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "30rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 0.5rem",
          }}
        >
          <div
            ref={lineRef}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "12%",
              right: "12%",
              top: "50%",
              height: "1px",
              background:
                "linear-gradient(90deg, rgba(217, 166, 183, 0.35), rgba(233, 199, 125, 0.85))",
              transformOrigin: "left center",
              transform: "scaleX(0)",
            }}
          />

          <div
            ref={date2024Ref}
            style={{
              position: "relative",
              zIndex: 2,
              background: "#17172C",
              padding: "0.4rem 0.75rem",
              border: "1px solid rgba(217, 166, 183, 0.35)",
              borderRadius: "9999px",
              opacity: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.72rem, 1.8vw, 0.85rem)",
                letterSpacing: "0.14em",
                color: "#D9A6B7",
              }}
            >
              25 NOV 2024
            </span>
          </div>

          <div
            ref={date2026Ref}
            style={{
              position: "relative",
              zIndex: 2,
              background: "#17172C",
              padding: "0.4rem 0.75rem",
              border: "1px solid rgba(233, 199, 125, 0.6)",
              borderRadius: "9999px",
              opacity: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.72rem, 1.8vw, 0.85rem)",
                letterSpacing: "0.14em",
                color: "#E9C77D",
              }}
            >
              25 NOV 2026
            </span>
          </div>
        </div>

        <button
          ref={btnRef}
          onClick={handleContinue}
          className="scene-continue-btn"
          style={{ opacity: 0 }}
        >
          <span>Open that day</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}
