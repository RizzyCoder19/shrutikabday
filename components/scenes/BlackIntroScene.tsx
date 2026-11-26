"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { musicCueManager } from "@/lib/audio/music-cue-manager";

const BEATS = [
  { text: "Hey, Gheli.", emphasis: false, teaser: "" },
  { text: "I made something for you.", emphasis: false, teaser: "" },
  {
    text: "It's a little different.",
    emphasis: true,
    teaser: "Built for one person",
  },
] as const;

export function BlackIntroScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);
  const recordInteraction = useExperienceStore((s) => s.recordInteraction);

  const stageRef = useRef<HTMLDivElement>(null);
  const dustCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigilRef = useRef<HTMLSpanElement>(null);
  const teaserRef = useRef<HTMLSpanElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const promptRef = useRef<HTMLButtonElement>(null);
  const [readyVisible, setReadyVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Subtle warm drifting stardust specks (bhadwikabday confession dust canvas character)
  useEffect(() => {
    const canvas = dustCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const dust = Array.from({ length: 34 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.35,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -0.14 - Math.random() * 0.3,
      alpha: 0.14 + Math.random() * 0.34,
      phase: Math.random() * Math.PI * 2,
    }));

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dust) {
        d.x += d.vx;
        d.y += d.vy;
        d.phase += 0.015;
        if (d.y < -10) d.y = h + 10;
        if (d.x < -10) d.x = w + 10;
        if (d.x > w + 10) d.x = -10;
        const a = d.alpha * (0.55 + 0.45 * Math.sin(d.phase));
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "#fef08a";
        ctx.globalAlpha = a;
        ctx.shadowColor = "#e9c77d";
        ctx.shadowBlur = d.r * 3;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Luminous warning-style sequential beat choreography
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      if (sigilRef.current) gsap.set(sigilRef.current, { opacity: 0.65, scale: 1 });
      if (teaserRef.current) gsap.set(teaserRef.current, { opacity: 0.72, y: 0 });
      lineRefs.current.forEach((el, idx) => {
        if (el) {
          gsap.set(el, {
            opacity: idx === BEATS.length - 1 ? 1 : 0,
            filter: "blur(0px)",
          });
        }
      });
      setReadyVisible(true);
      if (promptRef.current) gsap.set(promptRef.current, { opacity: 1 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    // Brief stillness in pure obsidian darkness before first beat
    tl.to({}, { duration: 0.65 });

    // Restrained champagne sigil aura (from Casa-Tanvi WarningScene)
    if (sigilRef.current) {
      tl.fromTo(
        sigilRef.current,
        { opacity: 0, scale: 0.78 },
        { opacity: 0.65, scale: 1, duration: 0.9, ease: "power1.out" }
      );
    }

    BEATS.forEach((beat, i) => {
      const el = lineRefs.current[i];
      if (!el) return;
      const isLast = i === BEATS.length - 1;

      if (beat.teaser && teaserRef.current) {
        tl.fromTo(
          teaserRef.current,
          { opacity: 0, y: 8, filter: "blur(3px)" },
          { opacity: 0.72, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power1.out" },
          "-=0.15"
        );
      }

      // Blur-to-sharp luminous arrival (combining confession-line & warning-line glow)
      tl.fromTo(
        el,
        { opacity: 0, y: 14, scale: 0.98, filter: "blur(5px)" },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.05,
          ease: "power2.out",
        }
      );

      tl.to({}, { duration: isLast ? 0.75 : 1.2 });

      if (!isLast) {
        tl.to(el, {
          opacity: 0,
          scale: 1.025,
          y: -9,
          filter: "blur(4px)",
          duration: 0.7,
          ease: "power2.inOut",
        });
        tl.to({}, { duration: 0.25 });
      }
    });

    tl.call(() => setReadyVisible(true));
    if (promptRef.current) {
      tl.fromTo(
        promptRef.current,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: "power1.inOut",
          onComplete: () => {
            promptRef.current?.classList.add("intro-ready-pulse");
          },
        }
      );
    }

    return () => {
      tl.kill();
    };
  }, []);

  const handleBegin = () => {
    if (exiting || !readyVisible) return;
    setExiting(true);
    recordInteraction();
    audioSynth.unlock();
    musicCueManager.startMainTrack(soundEnabled);
    if (soundEnabled) {
      audioSynth.playGentleChime(523.25);
    }

    const stage = stageRef.current;
    if (stage) {
      gsap.to(stage, {
        opacity: 0,
        scale: 1.03,
        filter: "blur(6px)",
        duration: 0.9,
        ease: "power2.inOut",
        onComplete: () => {
          transitionTo("SPIDERMAN");
        },
      });
    } else {
      transitionTo("SPIDERMAN");
    }
  };

  return (
    <section
      ref={stageRef}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        zIndex: 40,
        overflow: "hidden",
      }}
      aria-label="Chapter 1: Introduction"
    >
      {/* Subtle warm luminous backdrop orb against deep black */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "min(92vw, 680px)",
          height: "min(92vw, 680px)",
          background:
            "radial-gradient(circle, rgba(233, 199, 125, 0.06) 0%, rgba(168, 85, 247, 0.024) 42%, transparent 72%)",
          filter: "blur(56px)",
          pointerEvents: "none",
        }}
      />

      {/* Restrained drifting warm dust canvas */}
      <canvas
        ref={dustCanvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: "46rem",
        }}
      >
        <span
          ref={sigilRef}
          aria-hidden="true"
          style={{
            fontSize: "clamp(14px, 2vw, 18px)",
            color: "#E9C77D",
            letterSpacing: "0.35em",
            textShadow: "0 0 18px rgba(233, 199, 125, 0.58)",
            marginBottom: "clamp(1rem, 2.5vh, 1.8rem)",
            opacity: 0,
          }}
        >
          ✦
        </span>

        {/* Warning-style tracked whisper eyebrow revealed ahead of the final line */}
        <span
          ref={teaserRef}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.68rem, 1.35vw, 0.78rem)",
            fontWeight: 500,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#D4AF37",
            textShadow: "0 0 22px rgba(212, 175, 55, 0.45)",
            marginBottom: "0.5rem",
            minHeight: "1.2rem",
            opacity: 0,
          }}
        >
          Built for one person
        </span>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "10.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {BEATS.map((beat, i) => (
            <p
              key={beat.text}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontFamily: "var(--font-serif)",
                fontStyle: beat.emphasis ? "italic" : "normal",
                fontSize: "clamp(2rem, 5.2vw, 3.7rem)",
                fontWeight: beat.emphasis ? 400 : 300,
                letterSpacing: "0.03em",
                color: beat.emphasis ? "#FFF4D9" : "#FFF2E4",
                textShadow: beat.emphasis
                  ? "0 0 28px rgba(250, 228, 186, 0.36), 0 0 42px rgba(233, 199, 125, 0.2), 0 4px 18px rgba(0, 0, 0, 0.9)"
                  : "0 0 30px rgba(233, 199, 125, 0.22), 0 2px 14px rgba(0, 0, 0, 0.85)",
                opacity: 0,
                pointerEvents: "none",
              }}
            >
              {beat.text}
            </p>
          ))}
        </div>

        <button
          ref={promptRef}
          onClick={handleBegin}
          disabled={!readyVisible}
          style={{
            marginTop: "1.8rem",
            padding: "13px 40px",
            borderRadius: "9999px",
            border: "1px solid rgba(233, 199, 125, 0.45)",
            background: "rgba(18, 10, 22, 0.62)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(1.05rem, 2vw, 1.3rem)",
            letterSpacing: "0.18em",
            color: "#F3D9C9",
            textShadow: "0 0 16px rgba(233, 199, 125, 0.35)",
            cursor: readyVisible ? "pointer" : "default",
            opacity: 0,
            pointerEvents: readyVisible ? "auto" : "none",
            transition: "color 0.35s ease, transform 0.35s ease, background 0.35s ease",
          }}
        >
          Ready?
        </button>
      </div>
    </section>
  );
}
