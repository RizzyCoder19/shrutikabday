"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SPIDERMAN_CONTOURS } from "@/content/spiderman-contours";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { ArrowRight } from "lucide-react";

const ORIG_W = 393;
const ORIG_H = 700;
const PTS_PER_SECOND = 285;
const TOTAL_POINTS = SPIDERMAN_CONTOURS.reduce((acc, c) => acc + c.length, 0);

const TEXT_BEATS = [
  { text: "Even Spider-Man has limits.", durationMs: 2500 },
  { text: "Not every story goes as planned Shruti.", durationMs: 2600 },
  { text: "But there's always another chapter.", durationMs: 2700 },
  { text: "Maybe the best ones start with a conversation.", durationMs: 2300 },
] as const;

export function SpidermanScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);

  const rootRef = useRef<HTMLDivElement>(null);
  const sketchpadRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const turtleRef = useRef<SVGSVGElement>(null);
  const revealWashRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const continueRef = useRef<HTMLButtonElement>(null);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [sketchDrawn, setSketchDrawn] = useState(false);
  const [sketchComplete, setSketchComplete] = useState(false);
  const [beatsFinished, setBeatsFinished] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Ref hook to allow click-to-fast-forward without re-running effect
  const fastForwardRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sketchpad = sketchpadRef.current;
    const turtle = turtleRef.current;
    if (!canvas || !sketchpad) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const inkCanvas = document.createElement("canvas");
    const inkCtx = inkCanvas.getContext("2d");
    if (!inkCtx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 800;
    let H = 575;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    let contourIdx = 0;
    let pointIdx = 0;
    let drawnPoints = 0;
    let currentPath: [number, number][] = [];
    let isComplete = false;
    let turtleX = 0;
    let turtleY = 0;
    let turtleAngle = 0;
    let rafId = 0;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;

    const mapPoint = (px: number, py: number): [number, number] => [
      offsetX + px * scale,
      offsetY + py * scale,
    ];

    const paintArchivalPaper = (targetCtx: CanvasRenderingContext2D) => {
      targetCtx.fillStyle = "#fcfbf8";
      targetCtx.fillRect(0, 0, W, H);
      // Soft perimeter shading for fine-art paper depth without obscuring ink
      const paperVignette = targetCtx.createRadialGradient(
        W * 0.5,
        H * 0.48,
        Math.min(W, H) * 0.28,
        W * 0.5,
        H * 0.5,
        Math.max(W, H) * 0.72
      );
      paperVignette.addColorStop(0, "rgba(255, 255, 255, 0)");
      paperVignette.addColorStop(1, "rgba(218, 210, 198, 0.24)");
      targetCtx.fillStyle = paperVignette;
      targetCtx.fillRect(0, 0, W, H);
    };

    const commitAllContours = () => {
      paintArchivalPaper(inkCtx);
      inkCtx.save();
      inkCtx.fillStyle = "#0a0a0d";
      inkCtx.strokeStyle = "#0a0a0d";
      inkCtx.lineWidth = 1.45;
      inkCtx.lineCap = "round";
      inkCtx.lineJoin = "round";
      inkCtx.shadowColor = "rgba(10, 10, 14, 0.16)";
      inkCtx.shadowBlur = 2.5;

      inkCtx.beginPath();
      for (let c = 0; c < SPIDERMAN_CONTOURS.length; c++) {
        const pts = SPIDERMAN_CONTOURS[c];
        if (pts.length < 2) continue;
        const [x0, y0] = mapPoint(pts[0][0], pts[0][1]);
        inkCtx.moveTo(x0, y0);
        for (let i = 1; i < pts.length; i++) {
          const [x, y] = mapPoint(pts[i][0], pts[i][1]);
          inkCtx.lineTo(x, y);
        }
        inkCtx.closePath();
      }
      inkCtx.fill("evenodd");
      inkCtx.stroke();
      inkCtx.restore();
    };

    const redrawCommittedProgress = () => {
      paintArchivalPaper(inkCtx);
      if (isComplete) {
        commitAllContours();
        return;
      }
      inkCtx.save();
      inkCtx.strokeStyle = "#08080b";
      inkCtx.lineWidth = 1.65;
      inkCtx.lineCap = "round";
      inkCtx.lineJoin = "round";
      inkCtx.shadowColor = "rgba(0, 0, 0, 0.12)";
      inkCtx.shadowBlur = 1.2;
      for (let c = 0; c < contourIdx; c++) {
        const pts = SPIDERMAN_CONTOURS[c];
        if (pts.length < 2) continue;
        inkCtx.beginPath();
        const [x0, y0] = mapPoint(pts[0][0], pts[0][1]);
        inkCtx.moveTo(x0, y0);
        for (let i = 1; i < pts.length; i++) {
          const [x, y] = mapPoint(pts[i][0], pts[i][1]);
          inkCtx.lineTo(x, y);
        }
        inkCtx.closePath();
        inkCtx.stroke();
      }
      inkCtx.restore();
    };

    const renderFrame = () => {
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(inkCanvas, 0, 0, W, H);

      if (!isComplete && currentPath.length > 1) {
        ctx.strokeStyle = "#08080b";
        ctx.lineWidth = 1.65;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
        ctx.shadowBlur = 1.4;
        ctx.beginPath();
        ctx.moveTo(currentPath[0][0], currentPath[0][1]);
        for (let i = 1; i < currentPath.length; i++) {
          ctx.lineTo(currentPath[i][0], currentPath[i][1]);
        }
        ctx.stroke();

        // Subtle warm charcoal pinpoint luminescence right at the active nib tip
        ctx.shadowBlur = 0;
        const tip = ctx.createRadialGradient(turtleX, turtleY, 0, turtleX, turtleY, 10);
        tip.addColorStop(0, "rgba(21, 128, 61, 0.26)");
        tip.addColorStop(1, "rgba(21, 128, 61, 0)");
        ctx.fillStyle = tip;
        ctx.beginPath();
        ctx.arc(turtleX, turtleY, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const resize = () => {
      const rect = sketchpad.getBoundingClientRect();
      const rw = Math.max(rect.width || 0, 280);
      const rh = Math.max(rect.height || 0, 210);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      W = Math.round(rw);
      H = Math.round(rh);

      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      inkCanvas.width = W * dpr;
      inkCanvas.height = H * dpr;
      inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const portraitMode = window.innerWidth < 768 && H > W;
      scale = portraitMode
        ? Math.min((W * 0.94) / ORIG_W, (H * 0.87) / ORIG_H)
        : Math.min((W * 0.9) / ORIG_W, (H * 0.94) / ORIG_H);
      offsetX = (W - ORIG_W * scale) / 2;
      offsetY = (H - ORIG_H * scale) / 2 + (portraitMode ? H * 0.012 : 0);

      redrawCommittedProgress();
      renderFrame();
    };

    const finishSketch = () => {
      if (isComplete) return;
      isComplete = true;
      cancelAnimationFrame(rafId);

      commitAllContours();
      renderFrame();
      setSketchDrawn(true);
      if (progressBarRef.current) {
        progressBarRef.current.style.width = "100%";
      }

      if (turtle) turtle.style.opacity = "0";

      // Deliberate reveal moment: soft sheen & proud elevation settle across the finished silhouette
      if (!reducedMotion && revealWashRef.current && sketchpad) {
        gsap.fromTo(
          revealWashRef.current,
          { opacity: 0.72 },
          { opacity: 0, duration: 0.85, ease: "power2.out" }
        );
        gsap.fromTo(
          sketchpad,
          { scale: 1.01 },
          { scale: 1, duration: 0.65, ease: "power2.out" }
        );
      }

      // Brief ~1.15s hold on the completed Spider-Man before fading cleanly to text beats
      holdTimer = setTimeout(() => {
        setSketchComplete(true);
      }, reducedMotion ? 200 : 1150);
    };

    fastForwardRef.current = finishSketch;

    let prevFrameTs = 0;
    let pointBudget = 0;

    const tick = (now: number) => {
      if (isComplete) return;

      if (prevFrameTs === 0) prevFrameTs = now;
      const dt = Math.min((now - prevFrameTs) / 1000, 0.05);
      prevFrameTs = now;
      pointBudget += dt * PTS_PER_SECOND;

      const frameQuota = Math.floor(pointBudget);
      pointBudget -= frameQuota;

      let steps = 0;
      while (steps < frameQuota && contourIdx < SPIDERMAN_CONTOURS.length) {
        const c = SPIDERMAN_CONTOURS[contourIdx];

        if (pointIdx === 0) {
          currentPath = [];
          const [x0, y0] = mapPoint(c[0][0], c[0][1]);
          currentPath.push([x0, y0]);
          turtleX = x0;
          turtleY = y0;
          pointIdx = 1;
          drawnPoints++;
        }

        while (pointIdx < c.length && steps < frameQuota) {
          const [x, y] = mapPoint(c[pointIdx][0], c[pointIdx][1]);
          const dx = x - turtleX;
          const dy = y - turtleY;
          if (dx !== 0 || dy !== 0) {
            turtleAngle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
          }
          turtleX = x;
          turtleY = y;
          currentPath.push([x, y]);
          pointIdx++;
          drawnPoints++;
          steps++;
        }

        if (pointIdx >= c.length) {
          if (currentPath.length > 2) {
            inkCtx.save();
            inkCtx.strokeStyle = "#08080b";
            inkCtx.lineWidth = 1.65;
            inkCtx.lineCap = "round";
            inkCtx.lineJoin = "round";
            inkCtx.shadowColor = "rgba(0, 0, 0, 0.12)";
            inkCtx.shadowBlur = 1.2;
            inkCtx.beginPath();
            inkCtx.moveTo(currentPath[0][0], currentPath[0][1]);
            for (let i = 1; i < currentPath.length; i++) {
              inkCtx.lineTo(currentPath[i][0], currentPath[i][1]);
            }
            inkCtx.closePath();
            inkCtx.stroke();
            inkCtx.restore();
          }
          contourIdx++;
          pointIdx = 0;
          currentPath = [];
        }
      }

      if (turtle && steps > 0) {
        turtle.style.left = `${turtleX}px`;
        turtle.style.top = `${turtleY}px`;
        turtle.style.transform = `translate(-50%, -50%) rotate(${turtleAngle}deg)`;
      }

      if (progressBarRef.current && TOTAL_POINTS > 0) {
        const pct = Math.min(100, (drawnPoints / TOTAL_POINTS) * 100);
        progressBarRef.current.style.width = `${pct.toFixed(1)}%`;
      }

      renderFrame();

      if (contourIdx >= SPIDERMAN_CONTOURS.length) {
        finishSketch();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    let resizeObs: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObs = new ResizeObserver(() => resize());
      resizeObs.observe(sketchpad);
    }
    window.addEventListener("resize", resize);
    resize();

    if (reducedMotion) {
      finishSketch();
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("resize", resize);
      resizeObs?.disconnect();
      cancelAnimationFrame(rafId);
      if (holdTimer) clearTimeout(holdTimer);
    };
  }, []);

  // Reveal short narrative beats sequentially after sketch finishes
  useEffect(() => {
    if (!sketchComplete) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const lastBeat = beatRefs.current[TEXT_BEATS.length - 1];
      if (lastBeat) gsap.set(lastBeat, { opacity: 1, filter: "blur(0px)" });
      setBeatsFinished(true);
      if (continueRef.current) gsap.set(continueRef.current, { opacity: 1 });
      return;
    }

    const tl = gsap.timeline();

    // Fade the sketchpad cleanly into the dark void over 1.0s (matching bhadwikabday curtain)
    if (sketchpadRef.current) {
      tl.to(sketchpadRef.current, {
        opacity: 0,
        scale: 0.97,
        duration: 1.0,
        ease: "power2.inOut",
      });
    }

    TEXT_BEATS.forEach((beat, idx) => {
      const el = beatRefs.current[idx];
      if (!el) return;
      const isLast = idx === TEXT_BEATS.length - 1;
      const fadeInDur = 0.72;
      const fadeOutDur = 0.52;
      const holdSec = Math.max(
        0.75,
        beat.durationMs / 1000 - fadeInDur - (isLast ? 0.35 : fadeOutDur)
      );

      tl.fromTo(
        el,
        { opacity: 0, y: 12, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: fadeInDur, ease: "power2.out" }
      );
      tl.to({}, { duration: holdSec });

      if (!isLast) {
        tl.to(el, {
          opacity: 0,
          y: -10,
          filter: "blur(3px)",
          duration: fadeOutDur,
          ease: "power2.inOut",
        });
      }
    });

    tl.call(() => setBeatsFinished(true));
    if (continueRef.current) {
      tl.fromTo(
        continueRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }

    return () => {
      tl.kill();
    };
  }, [sketchComplete]);

  const handleContinue = () => {
    if (exiting || !beatsFinished) return;
    setExiting(true);
    if (soundEnabled) {
      audioSynth.playGentleChime(587.33);
    }
    if (rootRef.current) {
      gsap.to(rootRef.current, {
        opacity: 0,
        duration: 0.65,
        ease: "power2.inOut",
        onComplete: () => transitionTo("GIRL_BEHIND_NAME"),
      });
    } else {
      transitionTo("GIRL_BEHIND_NAME");
    }
  };

  return (
    <section
      ref={rootRef}
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at 50% 50%, #0e0c14 0%, #020204 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile
          ? "max(4.1rem, calc(var(--safe-top) + 3.3rem)) max(0.55rem, var(--safe-right)) max(0.85rem, var(--safe-bottom)) max(0.55rem, var(--safe-left))"
          : "3.5rem 1rem 2rem",
        overflow: "hidden",
      }}
      aria-label="Chapter 2: Spider-Man"
    >
      {/* Subtle cinema illumination behind the sketchpad */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: isMobile ? "100vw" : "min(96vw, 960px)",
          height: isMobile ? "92dvh" : "min(80dvh, 720px)",
          background:
            "radial-gradient(ellipse at center, rgba(233, 199, 125, 0.085) 0%, rgba(119, 112, 168, 0.05) 38%, transparent 72%)",
          filter: "blur(38px)",
          pointerEvents: "none",
          opacity: sketchComplete ? 0.28 : 1,
          transition: "opacity 1s ease",
        }}
      />

      {/* Fine Art Framed Sketchpad Folio — Full-Screen Portrait on Mobile, 800:575 on Desktop */}
      <div
        ref={sketchpadRef}
        onClick={() => fastForwardRef.current?.()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fastForwardRef.current?.();
        }}
        aria-label="Spider-Man drawing canvas"
        title={sketchDrawn ? undefined : "Click anywhere to instantly complete sketch"}
        style={{
          position: "relative",
          zIndex: 2,
          width: isMobile ? "100%" : "min(93vw, 940px, calc(86dvh * 800 / 575))",
          height: isMobile ? "100%" : "auto",
          maxHeight: isMobile ? "100%" : "min(86dvh, 670px)",
          aspectRatio: isMobile ? undefined : "800 / 575",
          background: "#fcfbf8",
          borderRadius: isMobile ? "14px" : "10px",
          border: sketchDrawn
            ? "1px solid rgba(233, 199, 125, 0.42)"
            : "1px solid rgba(255, 248, 238, 0.22)",
          boxShadow: sketchDrawn
            ? "0 0 85px rgba(233, 199, 125, 0.16), 0 0 42px rgba(255, 255, 255, 0.08), 0 28px 65px rgba(0, 0, 0, 0.9)"
            : "0 0 55px rgba(255, 255, 255, 0.06), 0 22px 50px rgba(0, 0, 0, 0.85), inset 0 0 0 1px rgba(0, 0, 0, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: sketchDrawn ? "default" : "pointer",
          transition: "box-shadow 0.8s ease, border-color 0.8s ease",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%" }}
        />

        {/* Delicate archival corner registration marks */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "9px",
            border: "1px solid rgba(0, 0, 0, 0.055)",
            borderRadius: "4px",
            pointerEvents: "none",
          }}
        />

        {/* Completion radial illumination sweep */}
        <div
          ref={revealWashRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 45%, rgba(255, 246, 224, 0.55) 0%, transparent 68%)",
            opacity: 0,
            pointerEvents: "none",
          }}
        />

        {/* Classic Python Turtle Cursor (Tiny Precision Nib) */}
        <svg
          ref={turtleRef}
          viewBox="0 0 24 24"
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "13px",
            height: "13px",
            pointerEvents: "none",
            transform: "translate(-50%, -50%)",
            transition: "opacity 0.5s ease",
            zIndex: 10,
            filter: "drop-shadow(0 1px 2.5px rgba(0,0,0,0.3))",
          }}
        >
          <polygon
            points="12,2 22,22 12,17 2,22"
            fill="#15803d"
            stroke="#052e16"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <line x1="12" y1="6" x2="12" y2="17" stroke="#166534" strokeWidth="1.1" />
        </svg>

        <span
          style={{
            position: "absolute",
            top: "14px",
            left: "18px",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.5)",
            opacity: 0.72,
            pointerEvents: "none",
          }}
        >
          Python Turtle Engine • Spiderman.py
        </span>

        <span
          style={{
            position: "absolute",
            bottom: "14px",
            left: "18px",
            fontSize: "11px",
            fontWeight: 300,
            letterSpacing: "0.05em",
            color: "rgba(0,0,0,0.38)",
            opacity: sketchDrawn ? 0 : 1,
            transition: "opacity 0.5s ease",
            pointerEvents: "none",
          }}
        >
          {isMobile ? "[ Tap to fast-forward ]" : "[ Click to fast-forward ]"}
        </span>

        <span
          style={{
            position: "absolute",
            bottom: "14px",
            right: "18px",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: sketchDrawn ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.45)",
            pointerEvents: "none",
            transition: "color 0.4s ease",
          }}
        >
          {sketchDrawn ? "Artwork Completed" : "Sketching silhouette..."}
        </span>

        {/* Hairline bottom drawing progress bar */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "2px",
            background: "rgba(0, 0, 0, 0.05)",
            pointerEvents: "none",
          }}
        >
          <div
            ref={progressBarRef}
            style={{
              width: "0%",
              height: "100%",
              background: "linear-gradient(90deg, rgba(21,128,61,0.55), rgba(10,10,14,0.65))",
              transition: sketchDrawn ? "opacity 0.6s ease" : "none",
              opacity: sketchDrawn ? 0.25 : 0.75,
            }}
          />
        </div>
      </div>

      {/* Sequential Text Beats After Sketch */}
      {sketchComplete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "42rem",
              height: "9rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {TEXT_BEATS.map((beat, idx) => (
              <p
                key={beat.text}
                ref={(el) => {
                  beatRefs.current[idx] = el;
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  fontFamily: "var(--font-serif)",
                  fontSize:
                    idx === TEXT_BEATS.length - 1
                      ? "clamp(1.65rem, 3.6vw, 2.5rem)"
                      : "clamp(1.5rem, 3.4vw, 2.3rem)",
                  fontStyle: idx === TEXT_BEATS.length - 1 ? "italic" : "normal",
                  fontWeight: 400,
                  lineHeight: 1.4,
                  color: idx === TEXT_BEATS.length - 1 ? "#F3D9C9" : "#FFF2E4",
                  textShadow:
                    "0 0 26px rgba(233, 199, 125, 0.22), 0 4px 24px rgba(0, 0, 0, 0.95)",
                  opacity: 0,
                }}
              >
                {beat.text}
              </p>
            ))}
          </div>

          <button
            ref={continueRef}
            onClick={handleContinue}
            disabled={!beatsFinished}
            className="scene-continue-btn"
            style={{
              marginTop: "1.4rem",
              opacity: 0,
              pointerEvents: beatsFinished ? "auto" : "none",
            }}
          >
            <span>Continue</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
