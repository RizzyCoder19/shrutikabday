"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experience-store";
import { GIRL_BEHIND_NAME_CONTENT } from "@/content/appreciation";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { ArrowRight, Sparkles } from "lucide-react";

const WORD_LETTERS = GIRL_BEHIND_NAME_CONTENT.interactiveWord.split("");

const TRAIT_PILLS = [
  { label: "Unpredictable", accent: "#E9C77D" },
  { label: "A Little Dramatic", accent: "#D9A6B7" },
  { label: "Never Boring", accent: "#B9A7F2" },
] as const;

interface StardustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  twinklePhase: number;
}

interface RibbonPoint {
  x: number;
  y: number;
  alpha: number;
}

export function GirlBehindNameScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageCardRef = useRef<HTMLDivElement>(null);
  const outerRingRef = useRef<SVGGElement>(null);
  const innerRingRef = useRef<SVGGElement>(null);
  const shockwaveRef = useRef<HTMLDivElement>(null);

  const leadRef = useRef<HTMLParagraphElement>(null);
  const prefixRef = useRef<HTMLSpanElement>(null);
  const letterRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const traitsRef = useRef<HTMLParagraphElement>(null);
  const closingRef = useRef<HTMLParagraphElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const burstFnRef = useRef<((x: number, y: number, color?: string) => void) | null>(null);

  const [exiting, setExiting] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [activeLetterIdx, setActiveLetterIdx] = useState<number | null>(null);

  // ─── 1. Interactive Aurora + Stardust + Luminous Ribbon Trail Canvas ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const palette = ["#E9C77D", "#D9A6B7", "#C4B5FD", "#FFF2E4"];
    const particles: StardustParticle[] = Array.from({ length: reduced ? 20 : 52 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.25 - Math.random() * 0.45,
      size: 0.9 + Math.random() * 1.9,
      alpha: 0.25 + Math.random() * 0.55,
      decay: 0, // ambient persistent motes
      color: palette[Math.floor(Math.random() * palette.length)],
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    const burstParticles: StardustParticle[] = [];
    const ribbonPoints: RibbonPoint[] = [];

    const spawnBurst = (bx: number, by: number, color?: string) => {
      if (reduced) return;
      const count = 22;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const speed = 1.6 + Math.random() * 3.8;
        burstParticles.push({
          x: bx,
          y: by,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.6,
          size: 1.4 + Math.random() * 2.4,
          alpha: 0.95,
          decay: 0.018 + Math.random() * 0.015,
          color: color || palette[i % palette.length],
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };
    burstFnRef.current = spawnBurst;

    const pushPointerTrail = (px: number, py: number) => {
      if (reduced) return;
      ribbonPoints.push({ x: px, y: py, alpha: 0.9 });
      if (ribbonPoints.length > 26) ribbonPoints.shift();

      if (Math.random() < 0.55) {
        burstParticles.push({
          x: px + (Math.random() - 0.5) * 10,
          y: py + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2 - 0.4,
          size: 1.0 + Math.random() * 1.8,
          alpha: 0.85,
          decay: 0.02 + Math.random() * 0.015,
          color: palette[Math.floor(Math.random() * palette.length)],
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      pushPointerTrail(e.clientX, e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        pushPointerTrail(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    let auroraT = 0;
    let rafId = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Flowing Aurora Borealis Silk Waves
      if (!reduced) {
        auroraT += 0.008;
        ctx.save();
        ctx.globalCompositeOperation = "screen";

        const waves = [
          { baseY: 0.36, amp1: 48, amp2: 26, c1: "rgba(168, 85, 247, 0.14)", c2: "rgba(217, 166, 183, 0.02)", speed: 1.0 },
          { baseY: 0.48, amp1: 62, amp2: 34, c1: "rgba(217, 166, 183, 0.13)", c2: "rgba(233, 199, 125, 0.02)", speed: -0.75 },
          { baseY: 0.62, amp1: 42, amp2: 24, c1: "rgba(233, 199, 125, 0.09)", c2: "rgba(124, 58, 237, 0.01)", speed: 0.55 },
        ];

        for (let wIdx = 0; wIdx < waves.length; wIdx++) {
          const w = waves[wIdx];
          ctx.beginPath();
          ctx.moveTo(0, height);
          const stepX = Math.max(28, Math.floor(width / 26));
          for (let x = 0; x <= width + stepX; x += stepX) {
            const y =
              height * w.baseY +
              Math.sin(x * 0.0032 + auroraT * w.speed + wIdx * 1.4) * w.amp1 +
              Math.cos(x * 0.006 - auroraT * 1.2 + wIdx) * w.amp2;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, height * (w.baseY - 0.18), 0, height);
          grad.addColorStop(0, "rgba(0, 0, 0, 0)");
          grad.addColorStop(0.35, w.c1);
          grad.addColorStop(1, w.c2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. Ambient Stardust Motes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reduced) {
          p.x += p.vx;
          p.y += p.vy;
          p.twinklePhase += 0.025;
          if (p.y < -12) p.y = height + 12;
          if (p.x < -12) p.x = width + 12;
          if (p.x > width + 12) p.x = -12;
        }
        const a = p.alpha * (0.55 + 0.45 * Math.sin(p.twinklePhase));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. Interactive Burst Particles
      for (let i = burstParticles.length - 1; i >= 0; i--) {
        const bp = burstParticles[i];
        bp.x += bp.vx;
        bp.y += bp.vy;
        bp.vx *= 0.96;
        bp.vy = bp.vy * 0.96 + 0.03; // gentle gravity
        bp.alpha -= bp.decay;
        if (bp.alpha <= 0) {
          burstParticles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = bp.alpha;
        ctx.fillStyle = bp.color;
        ctx.shadowColor = bp.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, bp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. Luminous Additive Ribbon Light Trail
      if (ribbonPoints.length > 1) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 1; i < ribbonPoints.length; i++) {
          const prev = ribbonPoints[i - 1];
          const curr = ribbonPoints[i];
          curr.alpha -= 0.038;
          if (curr.alpha <= 0) continue;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.lineWidth = (i / ribbonPoints.length) * 5.5;
          ctx.strokeStyle = `rgba(233, 199, 125, ${Math.max(0, curr.alpha * 0.55)})`;
          ctx.shadowBlur = 14;
          ctx.shadowColor = "#D9A6B7";
          ctx.stroke();
        }
        ctx.restore();
        for (let i = ribbonPoints.length - 1; i >= 0; i--) {
          if (ribbonPoints[i].alpha <= 0) ribbonPoints.splice(i, 1);
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // ─── 2. GSAP Kinetic Entrance, Orbital Astrolabe & Levitation ───
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      [leadRef.current, prefixRef.current, traitsRef.current, closingRef.current, nextRef.current].forEach(
        (el) => el && gsap.set(el, { opacity: 1, y: 0 })
      );
      letterRefs.current.forEach((el) => el && gsap.set(el, { opacity: 1, y: 0, scale: 1 }));
      pillRefs.current.forEach((el) => el && gsap.set(el, { opacity: 1, y: 0, scale: 1 }));
      return;
    }

    const tl = gsap.timeline();

    // Continuous counter-rotating celestial astrolabe rings
    const outerSpin = outerRingRef.current
      ? gsap.to(outerRingRef.current, {
          rotation: 360,
          duration: 34,
          repeat: -1,
          ease: "none",
          transformOrigin: "50% 50%",
        })
      : null;

    const innerSpin = innerRingRef.current
      ? gsap.to(innerRingRef.current, {
          rotation: -360,
          duration: 24,
          repeat: -1,
          ease: "none",
          transformOrigin: "50% 50%",
        })
      : null;

    tl.fromTo(
      leadRef.current,
      { opacity: 0, y: 20, filter: "blur(6px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.95, ease: "power3.out" }
    )
      .fromTo(
        prefixRef.current,
        { opacity: 0, y: 12, letterSpacing: "0.22em" },
        { opacity: 1, y: 0, letterSpacing: "0.08em", duration: 0.75, ease: "power2.out" },
        "-=0.35"
      )
      .fromTo(
        letterRefs.current.filter(Boolean),
        { opacity: 0, y: 42, scale: 0.72, rotationX: -35, rotateZ: -8 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotationX: 0,
          rotateZ: 0,
          duration: 0.85,
          stagger: 0.08,
          ease: "back.out(1.8)",
          onComplete: () => {
            // Subtle continuous staggered floating levitation on each crystal letter tile
            letterRefs.current.forEach((el, idx) => {
              if (!el) return;
              gsap.to(el, {
                y: idx % 2 === 0 ? -5 : 5,
                duration: 2.2 + idx * 0.18,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                delay: idx * 0.15,
              });
            });
          },
        },
        "-=0.3"
      )
      .fromTo(
        pillRefs.current.filter(Boolean),
        { opacity: 0, y: 14, scale: 0.88 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.65,
          stagger: 0.12,
          ease: "back.out(1.5)",
        },
        "-=0.25"
      )
      .fromTo(
        traitsRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        "-=0.25"
      )
      .fromTo(
        closingRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" },
        "-=0.3"
      )
      .fromTo(
        nextRef.current,
        { opacity: 0, y: 12, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power2.out" },
        "-=0.25"
      );

    // Subtle pointer parallax on centerpiece stage
    const onPointerParallax = (e: PointerEvent) => {
      if (!stageCardRef.current) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 16;
      const ny = (e.clientY / window.innerHeight - 0.5) * 12;
      gsap.to(stageCardRef.current, {
        x: nx,
        y: ny,
        duration: 0.9,
        ease: "power2.out",
      });
    };
    window.addEventListener("pointermove", onPointerParallax, { passive: true });

    return () => {
      tl.kill();
      outerSpin?.kill();
      innerSpin?.kill();
      window.removeEventListener("pointermove", onPointerParallax);
    };
  }, []);

  const triggerLetterPlay = useCallback(
    (index: number, isClick = false) => {
      const el = letterRefs.current[index];
      if (!el) return;

      setActiveLetterIdx(index);

      if (isClick) {
        setTapCount((c) => c + 1);
        if (soundEnabled) {
          audioSynth.playGentleChime(523.25 + index * 65);
        }

        // Burst stardust particles right from the tapped letter crest
        const rect = el.getBoundingClientRect();
        const burstColor = index % 2 === 0 ? "#D9A6B7" : "#E9C77D";
        burstFnRef.current?.(rect.left + rect.width / 2, rect.top + rect.height / 2, burstColor);

        // Expand radial shockwave halo
        if (shockwaveRef.current) {
          gsap.killTweensOf(shockwaveRef.current);
          gsap.fromTo(
            shockwaveRef.current,
            { scale: 0.35, opacity: 0.85 },
            { scale: 2.1, opacity: 0, duration: 0.85, ease: "power2.out" }
          );
        }
      }

      const dir = index % 2 === 0 ? -1 : 1;
      gsap.killTweensOf(el);
      gsap
        .timeline()
        .to(el, {
          y: isClick ? -24 : -12,
          x: isClick ? dir * 9 : dir * 4,
          rotation: isClick ? dir * 12 : dir * 5,
          scale: isClick ? 1.18 : 1.09,
          duration: 0.22,
          ease: "power2.out",
        })
        .to(el, {
          y: index % 2 === 0 ? -5 : 5,
          x: 0,
          rotation: 0,
          scale: 1,
          duration: 0.65,
          ease: "elastic.out(1.1, 0.45)",
          onComplete: () => {
            setActiveLetterIdx((prev) => (prev === index ? null : prev));
          },
        });

      if (isClick && (tapCount + 1) % 3 === 0) {
        letterRefs.current.forEach((other, j) => {
          if (!other || j === index) return;
          gsap.to(other, {
            y: -12,
            rotation: (j - index) * 4,
            duration: 0.22,
            yoyo: true,
            repeat: 1,
            delay: Math.abs(j - index) * 0.04,
            ease: "sine.inOut",
          });
        });
      }
    },
    [soundEnabled, tapCount]
  );

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
          "radial-gradient(ellipse at 50% 42%, #241938 0%, #141126 52%, #07060F 100%)",
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
      {/* Interactive Aurora, Stardust & Luminous Ribbon Trail Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Ambient Celestial Astrolabe Orbital Halo Behind Centerpiece */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(92vw, 540px)",
          height: "min(92vw, 540px)",
          pointerEvents: "none",
          zIndex: 2,
          opacity: 0.55,
        }}
      >
        <svg viewBox="0 0 400 400" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="gheliRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E9C77D" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#D9A6B7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          <g ref={outerRingRef}>
            <circle
              cx="200"
              cy="200"
              r="168"
              fill="none"
              stroke="url(#gheliRingGrad)"
              strokeWidth="0.9"
              strokeDasharray="4 8"
            />
            <circle cx="200" cy="32" r="3.2" fill="#E9C77D" />
            <circle cx="345" cy="284" r="2.6" fill="#D9A6B7" />
            <circle cx="55" cy="284" r="2.6" fill="#C4B5FD" />
          </g>

          <g ref={innerRingRef}>
            <circle
              cx="200"
              cy="200"
              r="128"
              fill="none"
              stroke="rgba(233, 199, 125, 0.25)"
              strokeWidth="0.75"
              strokeDasharray="16 10"
            />
            <circle cx="200" cy="72" r="2.2" fill="#FFF2E4" />
            <circle cx="200" cy="328" r="2.2" fill="#E9C77D" />
          </g>
        </svg>

        {/* Radial Shockwave Pulse on Letter Tap */}
        <div
          ref={shockwaveRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "160px",
            height: "160px",
            marginLeft: "-80px",
            marginTop: "-80px",
            borderRadius: "9999px",
            border: "1.5px solid rgba(233, 199, 125, 0.7)",
            boxShadow: "0 0 28px rgba(217, 166, 183, 0.45)",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Main Content Stage with Subtle Pointer Parallax */}
      <div
        ref={stageCardRef}
        style={{
          position: "relative",
          zIndex: 5,
          margin: "auto 0",
          maxWidth: "46rem",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(0.95rem, 2.3dvh, 1.85rem)",
        }}
      >
        <p
          ref={leadRef}
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.12rem, 2.4vw, 1.65rem)",
            fontWeight: 300,
            lineHeight: 1.52,
            color: "rgba(255, 242, 228, 0.88)",
            maxWidth: "37rem",
            textShadow: "0 2px 18px rgba(0, 0, 0, 0.65)",
            opacity: 0,
          }}
        >
          {GIRL_BEHIND_NAME_CONTENT.leadLine}
        </p>

        {/* Interactive Motion-Graphics Centerpiece */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.55rem",
            margin: "0.25rem 0",
          }}
        >
          <span
            ref={prefixRef}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(1.12rem, 2.2vw, 1.5rem)",
              color: "#D9A6B7",
              letterSpacing: "0.08em",
              opacity: 0,
            }}
          >
            <Sparkles size={14} style={{ opacity: 0.85, color: "#E9C77D" }} />
            <span>{GIRL_BEHIND_NAME_CONTENT.centerpiecePrefix}</span>
            <Sparkles size={14} style={{ opacity: 0.85, color: "#E9C77D" }} />
          </span>

          {/* 3D Crystal Glassmorphic Letter Crests */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "clamp(0.4rem, 1.8vw, 0.85rem)",
              perspective: "900px",
            }}
            aria-label="Interactive GHELI letters — hover or tap"
          >
            {WORD_LETTERS.map((ch, i) => {
              const isActive = activeLetterIdx === i;
              return (
                <button
                  key={`${ch}-${i}`}
                  ref={(el) => {
                    letterRefs.current[i] = el;
                  }}
                  type="button"
                  onMouseEnter={() => triggerLetterPlay(i, false)}
                  onClick={() => triggerLetterPlay(i, true)}
                  className="gheli-letter-crest"
                  style={{
                    position: "relative",
                    minWidth: "clamp(48px, 14.5vw, 84px)",
                    minHeight: "clamp(60px, 17vw, 102px)",
                    padding: "0.25rem 0.2rem",
                    borderRadius: "18px",
                    border: isActive
                      ? "1px solid rgba(233, 199, 125, 0.78)"
                      : "1px solid rgba(255, 242, 228, 0.16)",
                    background: isActive
                      ? "linear-gradient(155deg, rgba(233, 199, 125, 0.24) 0%, rgba(217, 166, 183, 0.18) 100%)"
                      : "linear-gradient(155deg, rgba(255, 242, 228, 0.09) 0%, rgba(28, 20, 48, 0.45) 100%)",
                    boxShadow: isActive
                      ? "0 14px 36px rgba(233, 199, 125, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
                      : "0 10px 28px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 242, 228, 0.14)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    cursor: "pointer",
                    touchAction: "manipulation",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2.6rem, 9.5vw, 5.2rem)",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: isActive ? "#FFF7E6" : "#FFF2E4",
                    textShadow: isActive
                      ? "0 0 26px rgba(233, 199, 125, 0.85)"
                      : "0 6px 24px rgba(217, 166, 183, 0.3)",
                    opacity: 0,
                    willChange: "transform",
                    WebkitTapHighlightColor: "transparent",
                    transition: "border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease",
                  }}
                >
                  {ch}
                </button>
              );
            })}
          </div>

          <span
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(233, 199, 125, 0.62)",
              marginTop: "0.2rem",
            }}
          >
            Tap the letters • Glide for stardust
          </span>
        </div>

        {/* Kinetic Trait Chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          {TRAIT_PILLS.map((pill, idx) => (
            <span
              key={pill.label}
              ref={(el) => {
                pillRefs.current[idx] = el;
              }}
              style={{
                padding: "0.38rem 0.88rem",
                borderRadius: "9999px",
                fontSize: "clamp(0.7rem, 1.4vw, 0.8rem)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: pill.accent,
                background: "rgba(18, 14, 34, 0.56)",
                border: `1px solid ${pill.accent}44`,
                boxShadow: `0 4px 16px rgba(0, 0, 0, 0.35), inset 0 0 12px ${pill.accent}12`,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                opacity: 0,
              }}
            >
              {pill.label}
            </span>
          ))}
        </div>

        <p
          ref={traitsRef}
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(1.18rem, 2.5vw, 1.75rem)",
            color: "#F3D9C9",
            letterSpacing: "0.03em",
            textShadow: "0 2px 14px rgba(0, 0, 0, 0.65)",
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
          disabled={exiting}
          className="cta-pill"
          style={{ opacity: 0, marginTop: "0.25rem" }}
        >
          <span>Continue</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
