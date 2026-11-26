"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experience-store";
import { GIRL_BEHIND_NAME_CONTENT } from "@/content/appreciation";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { ArrowRight } from "lucide-react";

const WORD_LETTERS = GIRL_BEHIND_NAME_CONTENT.interactiveWord.split("");

export function GirlBehindNameScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);

  const rootRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const prefixRef = useRef<HTMLSpanElement>(null);
  const letterRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const traitsRef = useRef<HTMLParagraphElement>(null);
  const closingRef = useRef<HTMLParagraphElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const [exiting, setExiting] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      [leadRef.current, prefixRef.current, traitsRef.current, closingRef.current, nextRef.current].forEach(
        (el) => el && gsap.set(el, { opacity: 1, y: 0 })
      );
      letterRefs.current.forEach((el) => el && gsap.set(el, { opacity: 1, y: 0 }));
      return;
    }

    const tl = gsap.timeline();

    tl.fromTo(
      leadRef.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" }
    )
      .to({}, { duration: 0.7 })
      .fromTo(
        prefixRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
      )
      .fromTo(
        letterRefs.current.filter(Boolean),
        { opacity: 0, y: 34, rotate: -8 },
        {
          opacity: 1,
          y: 0,
          rotate: 0,
          duration: 0.75,
          stagger: 0.08,
          ease: "back.out(1.7)",
        },
        "-=0.25"
      )
      .to({}, { duration: 0.5 })
      .fromTo(
        traitsRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }
      )
      .to({}, { duration: 0.5 })
      .fromTo(
        closingRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.85, ease: "power2.out" }
      )
      .fromTo(
        nextRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
        "-=0.2"
      );

    return () => {
      tl.kill();
    };
  }, []);

  const triggerLetterPlay = (index: number, isClick = false) => {
    const el = letterRefs.current[index];
    if (!el) return;

    if (isClick) {
      setTapCount((c) => c + 1);
      if (soundEnabled) {
        audioSynth.playGentleChime(523.25 + index * 65);
      }
    }

    // Playful bounce/scatter and spring return to aligned form
    const dir = index % 2 === 0 ? -1 : 1;
    gsap.killTweensOf(el);
    gsap
      .timeline()
      .to(el, {
        y: isClick ? -22 : -12,
        x: isClick ? dir * 10 : dir * 4,
        rotation: isClick ? dir * 14 : dir * 6,
        scale: isClick ? 1.18 : 1.09,
        color: index % 2 === 0 ? "#D9A6B7" : "#E9C77D",
        duration: 0.22,
        ease: "power2.out",
      })
      .to(el, {
        y: 0,
        x: 0,
        rotation: 0,
        scale: 1,
        color: "#FFF2E4",
        duration: 0.65,
        ease: "elastic.out(1.1, 0.45)",
      });

    if (isClick && (tapCount + 1) % 3 === 0) {
      // Every 3rd tap playfully nudges all letters in a wave
      letterRefs.current.forEach((other, j) => {
        if (!other || j === index) return;
        gsap.to(other, {
          y: -10,
          rotation: (j - index) * 4,
          duration: 0.2,
          yoyo: true,
          repeat: 1,
          delay: Math.abs(j - index) * 0.04,
          ease: "sine.inOut",
        });
      });
    }
  };

  const handleContinue = () => {
    if (exiting) return;
    setExiting(true);
    if (soundEnabled) {
      audioSynth.playGentleChime(659.25);
    }

    if (rootRef.current) {
      gsap.to(rootRef.current, {
        opacity: 0,
        y: -18,
        duration: 0.65,
        ease: "power2.inOut",
        onComplete: () => transitionTo("TWO_YEARS_AGO"),
      });
    } else {
      transitionTo("TWO_YEARS_AGO");
    }
  };

  return (
    <section
      ref={rootRef}
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(ellipse at 50% 42%, #241938 0%, #17172C 52%, #0B0A16 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(4.2rem, calc(var(--safe-top) + 3.2rem)) 1.25rem max(1.6rem, var(--safe-bottom))",
        textAlign: "center",
        overflowY: "auto",
        overflowX: "hidden",
      }}
      aria-label="Chapter 3: The Girl Behind the Name"
    >
      <div
        style={{
          margin: "auto 0",
          maxWidth: "46rem",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(1rem, 2.6dvh, 2.2rem)",
        }}
      >
        <p
          ref={leadRef}
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.2rem, 2.5vw, 1.75rem)",
            fontWeight: 300,
            lineHeight: 1.5,
            color: "rgba(255, 242, 228, 0.86)",
            maxWidth: "38rem",
            opacity: 0,
          }}
        >
          {GIRL_BEHIND_NAME_CONTENT.leadLine}
        </p>

        {/* Interactive Centerpiece */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.35rem",
            margin: "0.4rem 0",
          }}
        >
          <span
            ref={prefixRef}
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(1.15rem, 2.2vw, 1.55rem)",
              color: "#D9A6B7",
              letterSpacing: "0.08em",
              opacity: 0,
            }}
          >
            {GIRL_BEHIND_NAME_CONTENT.centerpiecePrefix}
          </span>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "clamp(0.35rem, 1.6vw, 0.9rem)",
            }}
            aria-label="Interactive GHELI letters — hover or tap"
          >
            {WORD_LETTERS.map((ch, i) => (
              <button
                key={`${ch}-${i}`}
                ref={(el) => {
                  letterRefs.current[i] = el;
                }}
                type="button"
                onMouseEnter={() => triggerLetterPlay(i, false)}
                onClick={() => triggerLetterPlay(i, true)}
                style={{
                  background: "none",
                  border: "none",
                  minWidth: "44px",
                  minHeight: "44px",
                  padding: "0.2rem 0.12rem",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(3.2rem, 11vw, 6.4rem)",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "#FFF2E4",
                  textShadow: "0 6px 28px rgba(217, 166, 183, 0.25)",
                  opacity: 0,
                  willChange: "transform",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        <p
          ref={traitsRef}
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(1.25rem, 2.6vw, 1.85rem)",
            color: "#F3D9C9",
            letterSpacing: "0.03em",
            opacity: 0,
          }}
        >
          {GIRL_BEHIND_NAME_CONTENT.traitsLine}
        </p>

        <p
          ref={closingRef}
          style={{
            fontSize: "clamp(0.92rem, 1.6vw, 1.08rem)",
            fontWeight: 300,
            letterSpacing: "0.08em",
            color: "#E9C77D",
            opacity: 0,
          }}
        >
          {GIRL_BEHIND_NAME_CONTENT.closingLine}
        </p>

        <button
          ref={nextRef}
          onClick={handleContinue}
          className="scene-continue-btn"
          style={{ marginTop: "0.5rem", opacity: 0 }}
        >
          <span>Continue</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}
