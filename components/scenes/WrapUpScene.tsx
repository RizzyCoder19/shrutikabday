"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { musicCueManager } from "@/lib/audio/music-cue-manager";

export function WrapUpScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);

  const rootRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLParagraphElement>(null);
  const line2Ref = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const warpCanvasRef = useRef<HTMLCanvasElement>(null);

  const [warping, setWarping] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      [line1Ref.current, line2Ref.current, btnRef.current].forEach(
        (el) => el && gsap.set(el, { opacity: 1, y: 0 })
      );
      return;
    }

    const tl = gsap.timeline();
    tl.to({}, { duration: 0.6 })
      .fromTo(
        line1Ref.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" }
      )
      .to({}, { duration: 1.1 })
      .fromTo(
        line2Ref.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }
      )
      .to({}, { duration: 0.5 })
      .fromTo(
        btnRef.current,
        { opacity: 0, y: 10, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: "power2.out" }
      );

    return () => {
      tl.kill();
    };
  }, []);

  // Star-warp plunge animation when button clicked
  useEffect(() => {
    if (!warping) return;
    const canvas = warpCanvasRef.current;
    if (!canvas) {
      transitionTo("MEMORY_GALAXY");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      transitionTo("MEMORY_GALAXY");
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = W / 2;
    const cy = H / 2;
    const stars = Array.from({ length: 160 }, () => {
      const ang = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 140;
      return {
        ang,
        dist,
        speed: 1.04 + Math.random() * 0.06,
        color: Math.random() > 0.4 ? "#FFF2E4" : "#E9C77D",
      };
    });

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(0, 0, W, H);

      stars.forEach((s) => {
        const prevDist = s.dist;
        s.dist *= s.speed + elapsed * 0.04;
        const x1 = cx + Math.cos(s.ang) * prevDist;
        const y1 = cy + Math.sin(s.ang) * prevDist;
        const x2 = cx + Math.cos(s.ang) * s.dist;
        const y2 = cy + Math.sin(s.ang) * s.dist;

        ctx.strokeStyle = s.color;
        ctx.lineWidth = Math.min(2.6, 0.8 + elapsed * 1.4);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      if (elapsed < 1.35) {
        rafId = requestAnimationFrame(tick);
      } else {
        transitionTo("MEMORY_GALAXY");
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [warping, transitionTo]);

  const handleLaunchGalaxy = () => {
    if (warping) return;
    if (soundEnabled) {
      audioSynth.playCelestialChimes();
      musicCueManager.swellVolume(0.86, 850);
    }
    setWarping(true);
    if (rootRef.current) {
      gsap.to(rootRef.current.querySelectorAll("p, button"), {
        opacity: 0,
        scale: 0.9,
        duration: 0.45,
        ease: "power2.in",
      });
    }
  };

  return (
    <section
      ref={rootRef}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#04040a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "max(4rem, calc(var(--safe-top) + 3rem)) max(1.25rem, var(--safe-right)) max(2.2rem, calc(var(--safe-bottom) + 1rem)) max(1.25rem, var(--safe-left))",
        textAlign: "center",
        overflow: "hidden",
      }}
      aria-label="Chapter 11: Let's Wrap This Up"
    >
      {warping && (
        <canvas
          ref={warpCanvasRef}
          style={{ position: "fixed", inset: 0, zIndex: 30, pointerEvents: "none" }}
        />
      )}

      <div
        style={{
          maxWidth: "min(90vw, 40rem)",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: "1.1rem",
          zIndex: 10,
        }}
      >
        <p
          ref={line1Ref}
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.9rem, 5.8vw, 3.4rem)",
            fontWeight: 300,
            lineHeight: 1.25,
            color: "#FFF2E4",
            textWrap: "balance",
            opacity: 0,
          }}
        >
          Alright, Gheli...
        </p>

        <p
          ref={line2Ref}
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(1.45rem, 4.6vw, 2.5rem)",
            lineHeight: 1.32,
            color: "#D9A6B7",
            textWrap: "balance",
            opacity: 0,
          }}
        >
          Let&apos;s wrap this up.
        </p>

        <button
          ref={btnRef}
          onClick={handleLaunchGalaxy}
          className="btn-cinematic"
          style={{
            marginTop: "1.6rem",
            padding: "0.95rem 2.2rem",
            borderColor: "rgba(233, 199, 125, 0.72)",
            color: "#E9C77D",
            opacity: 0,
          }}
        >
          LET&apos;S WRAP THIS UP
        </button>
      </div>
    </section>
  );
}
