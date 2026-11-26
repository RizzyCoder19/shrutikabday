"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SHRUTI_PHOTOS, type ShrutiPhoto } from "@/content/gallery";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";

interface ConstellationSlot {
  xPct: number;
  yPct: number;
  baseWidthPx: number;
  floatSpeed: number;
  floatAmp: number;
  phase: number;
}

const DESKTOP_SLOTS: ConstellationSlot[] = [
  { xPct: 14, yPct: 24, baseWidthPx: 148, floatSpeed: 0.45, floatAmp: 7, phase: 0.2 },
  { xPct: 33, yPct: 20, baseWidthPx: 162, floatSpeed: 0.38, floatAmp: 9, phase: 1.4 },
  { xPct: 55, yPct: 23, baseWidthPx: 140, floatSpeed: 0.42, floatAmp: 8, phase: 2.3 },
  { xPct: 76, yPct: 21, baseWidthPx: 158, floatSpeed: 0.35, floatAmp: 7, phase: 3.1 },
  { xPct: 88, yPct: 38, baseWidthPx: 136, floatSpeed: 0.48, floatAmp: 9, phase: 0.7 },
  { xPct: 20, yPct: 49, baseWidthPx: 156, floatSpeed: 0.36, floatAmp: 8, phase: 1.9 },
  { xPct: 43, yPct: 48, baseWidthPx: 166, floatSpeed: 0.34, floatAmp: 10, phase: 2.8 },
  { xPct: 67, yPct: 49, baseWidthPx: 154, floatSpeed: 0.41, floatAmp: 8, phase: 4.1 },
  { xPct: 83, yPct: 68, baseWidthPx: 146, floatSpeed: 0.39, floatAmp: 7, phase: 5.0 },
  { xPct: 60, yPct: 74, baseWidthPx: 160, floatSpeed: 0.37, floatAmp: 9, phase: 0.9 },
  { xPct: 37, yPct: 74, baseWidthPx: 156, floatSpeed: 0.44, floatAmp: 8, phase: 3.6 },
  { xPct: 14, yPct: 75, baseWidthPx: 152, floatSpeed: 0.4, floatAmp: 9, phase: 4.8 },
];

// Balanced 3-column × 4-row celestial arc fitting cleanly inside 390×844 with zero clipping
const MOBILE_SLOTS: ConstellationSlot[] = [
  { xPct: 20, yPct: 23, baseWidthPx: 74, floatSpeed: 0.45, floatAmp: 4, phase: 0.2 },
  { xPct: 51, yPct: 20, baseWidthPx: 92, floatSpeed: 0.38, floatAmp: 5, phase: 1.4 },
  { xPct: 81, yPct: 24, baseWidthPx: 76, floatSpeed: 0.42, floatAmp: 4, phase: 2.3 },
  { xPct: 21, yPct: 41, baseWidthPx: 90, floatSpeed: 0.35, floatAmp: 5, phase: 3.1 },
  { xPct: 52, yPct: 39, baseWidthPx: 74, floatSpeed: 0.48, floatAmp: 4, phase: 0.7 },
  { xPct: 80, yPct: 42, baseWidthPx: 90, floatSpeed: 0.36, floatAmp: 5, phase: 1.9 },
  { xPct: 20, yPct: 58, baseWidthPx: 74, floatSpeed: 0.34, floatAmp: 5, phase: 2.8 },
  { xPct: 50, yPct: 59, baseWidthPx: 76, floatSpeed: 0.41, floatAmp: 4, phase: 4.1 },
  { xPct: 81, yPct: 58, baseWidthPx: 92, floatSpeed: 0.39, floatAmp: 5, phase: 5.0 },
  { xPct: 22, yPct: 76, baseWidthPx: 90, floatSpeed: 0.37, floatAmp: 4, phase: 0.9 },
  { xPct: 52, yPct: 77, baseWidthPx: 92, floatSpeed: 0.44, floatAmp: 5, phase: 3.6 },
  { xPct: 80, yPct: 75, baseWidthPx: 74, floatSpeed: 0.4, floatAmp: 4, phase: 4.8 },
];

const CONSTELLATION_LINKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [5, 11],
  [11, 10],
  [10, 9],
  [9, 8],
  [8, 7],
  [6, 10],
];

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Cycle timings (in seconds): 6.5s Constellation -> 1.7s morph -> 8.2s 3D Orbit -> 1.7s morph
const CONST_HOLD_S = 6.5;
const MORPH_DUR_S = 1.7;
const ORBIT_HOLD_S = 8.2;
const CYCLE_TOTAL_S = CONST_HOLD_S + MORPH_DUR_S + ORBIT_HOLD_S + MORPH_DUR_S;

function computeMorphBlend(cycleClockS: number): number {
  const c = ((cycleClockS % CYCLE_TOTAL_S) + CYCLE_TOTAL_S) % CYCLE_TOTAL_S;
  if (c < CONST_HOLD_S) return 0;
  if (c < CONST_HOLD_S + MORPH_DUR_S) {
    return easeInOutCubic((c - CONST_HOLD_S) / MORPH_DUR_S);
  }
  if (c < CONST_HOLD_S + MORPH_DUR_S + ORBIT_HOLD_S) return 1;
  return 1 - easeInOutCubic((c - (CONST_HOLD_S + MORPH_DUR_S + ORBIT_HOLD_S)) / MORPH_DUR_S);
}

export function MemoryConstellationScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const rootRef = useRef<HTMLDivElement>(null);
  const skyCanvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusStageRef = useRef<HTMLDivElement>(null);
  const focusCardRef = useRef<HTMLDivElement>(null);
  const pointerParallaxRef = useRef({ nx: 0, ny: 0 });
  const animateFromRectRef = useRef<DOMRect | null>(null);
  const isReturningRef = useRef(false);

  // Unified choreography state
  const cycleClockRef = useRef(0);
  const constOffsetRef = useRef(0);
  const morphBlendRef = useRef(0); // 0 = Constellation, 1 = 3D Orbit
  const orbitAngleRef = useRef(0);
  const orbitVelRef = useRef(0.16);
  const orbitDraggingRef = useRef(false);
  const orbitLastXRef = useRef(0);
  const orbitLastYRef = useRef(0);
  const orbitDragMovedRef = useRef(0);
  const hoverPausedRef = useRef(false);
  const mountStartRef = useRef<number | null>(null);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [exiting, setExiting] = useState(false);

  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Pre-decode all 12 portraits on mount so focus & continuous motion never drop a frame
  useEffect(() => {
    SHRUTI_PHOTOS.forEach((p) => {
      const img = new Image();
      img.src = p.src;
      if (typeof img.decode === "function") {
        img.decode().catch(() => { });
      }
    });
  }, []);

  // Graceful fade-in synced with Flower Garden exit veil
  useEffect(() => {
    if (!rootRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(rootRef.current, { opacity: 1 });
      return;
    }
    gsap.fromTo(
      rootRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.75, ease: "power2.out" }
    );
  }, []);

  // Single-owner staggered fade-in handled cleanly inside unified 60fps loop below

  // Unified 60fps Starfield + Auto-Morphing Constellation <-> 3D Orbit Choreography
  useEffect(() => {
    if (isMobile === null) return;
    const canvas = skyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mob = isMobile;
    const slots = mob ? MOBILE_SLOTS : DESKTOP_SLOTS;
    const N = SHRUTI_PHOTOS.length;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const starCount = mob ? 85 : 155;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.35 + 0.35,
      twinkleSpeed: Math.random() * 1.4 + 0.6,
      phase: Math.random() * Math.PI * 2,
      warm: Math.random() > 0.45,
    }));

    const linkPulses = CONSTELLATION_LINKS.map((pair, idx) => ({
      pair,
      offset: (idx * 0.19) % 1,
      speed: 0.14 + (idx % 3) * 0.04,
    }));

    let rafId = 0;
    let prev = performance.now();
    if (mountStartRef.current === null) mountStartRef.current = prev;
    const start = mountStartRef.current;

    const renderFrame = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const elapsed = (now - start) / 1000;

      // Advance choreography cycle calmly unless reduced motion, inspecting focus modal, hovering, or actively dragging
      if (!reduced && selectedIdx === null && !orbitDraggingRef.current && !hoverPausedRef.current) {
        cycleClockRef.current += dt;
      }

      const morph = reduced ? 0 : computeMorphBlend(cycleClockRef.current);
      morphBlendRef.current = morph;

      if (!reduced && selectedIdx === null && !orbitDraggingRef.current && !hoverPausedRef.current) {
        orbitAngleRef.current += orbitVelRef.current * dt;
        orbitVelRef.current += (0.16 - orbitVelRef.current) * Math.min(1, dt * 1.8);
        if (mob && morph < 0.5) {
          constOffsetRef.current = (constOffsetRef.current + dt * 0.032) % 1;
        }
      }

      // Compute & apply exact structured coordinates for all 12 portraits simultaneously
      const rx = mob ? W * 0.34 : Math.min(W * 0.36, 470);
      const ry = mob ? 44 : 58;
      const orbitCenterY = H * (mob ? 0.53 : 0.54);
      const baseAngle = orbitAngleRef.current;
      const { nx, ny } = pointerParallaxRef.current;

      const curCoords: { x: number; y: number; vis: number }[] = [];
      const mobileOrderPairs: Array<{ idx: number; cy: number; vis: number }> = [];

      for (let idx = 0; idx < N; idx++) {
        const slot = slots[idx % slots.length];
        const photo = SHRUTI_PHOTOS[idx];
        const depth = photo.depthLayer ?? 1;

        let cx = 0;
        let cy = 0;
        let cScale = 1;
        let cOpacity = 1;
        let cZ = 10 + depth * 5;

        if (mob) {
          // Immersive mobile celestial ribbon: 3–4 large separated hero portraits flow cleanly along an S-curve
          const u = ((idx / N + constOffsetRef.current) % 1 + 1) % 1;
          const d = u > 0.5 ? u - 1 : u; // -0.5 .. +0.5
          const edgeVis = Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(d) / 0.21), 2.1));
          const floatX = reduced ? 0 : Math.cos(elapsed * 0.52 + idx) * 6;
          const floatY = reduced ? 0 : Math.sin(elapsed * 0.44 + idx * 0.7) * 5;
          cx = W * (0.5 + (idx % 2 === 0 ? -0.17 : 0.17)) + floatX;
          cy = H * (0.52 + d * 2.15) + floatY;
          cScale = 0.86 + edgeVis * 0.26;
          cOpacity = edgeVis;
          cZ = Math.round(12 + edgeVis * 24);
          mobileOrderPairs.push({ idx, cy, vis: edgeVis });
        } else {
          const floatY = reduced ? 0 : Math.sin(elapsed * slot.floatSpeed + slot.phase) * slot.floatAmp;
          const floatX = reduced
            ? 0
            : Math.cos(elapsed * slot.floatSpeed * 0.7 + slot.phase) * (slot.floatAmp * 0.45);
          const pxParallax = -nx * depth * 12;
          const pyParallax = -ny * depth * 10;

          cx = (slot.xPct / 100) * W + floatX + pxParallax;
          cy = (slot.yPct / 100) * H + floatY + pyParallax;
        }

        const a = baseAngle + (idx / N) * Math.PI * 2;
        const sinA = Math.sin(a);
        const cosA = Math.cos(a); // +1 front, -1 back
        const depth01 = (cosA + 1) * 0.5;

        const ox = W * 0.5 + sinA * rx;
        const oy = orbitCenterY - cosA * ry + Math.sin(a * 2) * (mob ? 6 : 9);

        const posX = lerp(cx, ox, morph);
        const posY = lerp(cy, oy, morph);
        curCoords.push({ x: posX, y: posY, vis: cOpacity });

        const el = cardRefs.current[idx];
        if (!el) continue;

        const enterAlpha = reduced ? 1 : Math.min(1, Math.max(0, (elapsed - idx * 0.06) / 0.65));
        const oScale = mob ? 0.64 + depth01 * 0.72 : 0.65 + depth01 * 0.72;
        const scale = lerp(cScale * (0.92 + enterAlpha * 0.08), oScale, morph);
        const rotY = lerp(0, -sinA * 26, morph);
        const baseAlpha = lerp(cOpacity * enterAlpha, (0.28 + depth01 * 0.72) * enterAlpha, morph);
        const targetOpacity = selectedIdx === idx ? 0 : baseAlpha;
        const z = Math.round(lerp(cZ, 12 + depth01 * 60, morph));

        el.style.transform = `translate3d(${posX.toFixed(1)}px, ${posY.toFixed(1)}px, 0) translate3d(-50%, -50%, 0) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        el.style.opacity = targetOpacity.toFixed(3);
        el.style.pointerEvents = baseAlpha < 0.08 || selectedIdx !== null ? "none" : "auto";
        el.style.zIndex = String(z);
      }

      // Draw sky stars, smoothly fading constellation filaments & orbital guides
      ctx.clearRect(0, 0, W, H);

      for (const s of stars) {
        const tw = 0.45 + 0.55 * Math.sin(elapsed * s.twinkleSpeed + s.phase);
        const alpha = reduced ? 0.5 : tw * 0.68;
        ctx.fillStyle = s.warm
          ? `rgba(255, 240, 212, ${alpha.toFixed(3)})`
          : `rgba(218, 206, 255, ${(alpha * 0.85).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const constAlpha = Math.max(0, 1 - morph * 1.15);
      if (constAlpha > 0.02 && curCoords.length === N) {
        if (mob) {
          mobileOrderPairs.sort((a, b) => a.cy - b.cy);
          for (let i = 0; i < mobileOrderPairs.length - 1; i++) {
            const A = mobileOrderPairs[i];
            const B = mobileOrderPairs[i + 1];
            const pA = curCoords[A.idx];
            const pB = curCoords[B.idx];
            const linkVis = Math.min(A.vis, B.vis) * constAlpha;
            if (linkVis < 0.04) continue;
            const midX = (pA.x + pB.x) * 0.5 + (i % 2 === 0 ? 22 : -22);
            const midY = (pA.y + pB.y) * 0.5;
            ctx.strokeStyle = `rgba(233, 199, 125, ${(0.28 * linkVis).toFixed(3)})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.quadraticCurveTo(midX, midY, pB.x, pB.y);
            ctx.stroke();
          }
        } else {
          for (const { pair, offset, speed } of linkPulses) {
            const pA = curCoords[pair[0]];
            const pB = curCoords[pair[1]];
            if (!pA || !pB) continue;

            const midX = (pA.x + pB.x) * 0.5;
            const midY =
              (pA.y + pB.y) * 0.5 -
              Math.min(28, Math.hypot(pB.x - pA.x, pB.y - pA.y) * 0.08);

            ctx.strokeStyle = `rgba(233, 199, 125, ${(0.2 * constAlpha).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.quadraticCurveTo(midX, midY, pB.x, pB.y);
            ctx.stroke();

            if (!reduced) {
              const u = (elapsed * speed + offset) % 1;
              const iu = 1 - u;
              const sx = iu * iu * pA.x + 2 * iu * u * midX + u * u * pB.x;
              const sy = iu * iu * pA.y + 2 * iu * u * midY + u * u * pB.y;

              const sparkG = ctx.createRadialGradient(sx, sy, 0, sx, sy, 6.5);
              sparkG.addColorStop(0, `rgba(255, 244, 214, ${(0.88 * constAlpha).toFixed(3)})`);
              sparkG.addColorStop(1, "rgba(233, 199, 125, 0)");
              ctx.fillStyle = sparkG;
              ctx.beginPath();
              ctx.arc(sx, sy, 6.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      if (morph > 0.02) {
        ctx.save();
        ctx.strokeStyle = `rgba(233, 199, 125, ${(0.16 * morph).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(W * 0.5, orbitCenterY, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(217, 166, 183, ${(0.1 * morph).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(W * 0.5, orbitCenterY, rx * 0.72, ry * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [isMobile, selectedIdx]);

  // Subtle pointer depth parallax on desktop
  useEffect(() => {
    if (isMobile !== false) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let targetX = 0;
    let targetY = 0;
    let rafId = 0;

    const onMove = (e: PointerEvent) => {
      targetX = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      targetY = (e.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
    };

    const tick = () => {
      const p = pointerParallaxRef.current;
      p.nx += (targetX - p.nx) * 0.08;
      p.ny += (targetY - p.ny) * 0.08;
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, [isMobile]);

  // Animate focused photo rising smoothly out of its clicked slot
  useLayoutEffect(() => {
    if (selectedIdx === null) return;
    const card = focusCardRef.current;
    const stage = focusStageRef.current;
    if (!card || !stage) return;

    const fromRect = animateFromRectRef.current;
    animateFromRectRef.current = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      gsap.set(stage, { opacity: 1 });
      gsap.set(card, { x: 0, y: 0, scale: 1, opacity: 1 });
      return;
    }

    const tl = gsap.timeline();
    tl.fromTo(stage, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" }, 0);

    if (fromRect && fromRect.width > 0) {
      const destRect = card.getBoundingClientRect();
      const dx =
        fromRect.left +
        fromRect.width / 2 -
        (destRect.left + destRect.width / 2);
      const dy =
        fromRect.top +
        fromRect.height / 2 -
        (destRect.top + destRect.height / 2);
      const startScale = Math.max(
        0.18,
        Math.min(0.92, fromRect.width / Math.max(destRect.width, 1))
      );

      tl.fromTo(
        card,
        {
          x: dx,
          y: dy,
          scale: startScale,
          opacity: 0.75,
        },
        {
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.65,
          ease: "power3.out",
        },
        0
      );
    } else {
      tl.fromTo(
        card,
        { scale: 0.92, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.48, ease: "power2.out" },
        0
      );
    }

    return () => {
      tl.kill();
    };
  }, [selectedIdx]);

  const handleCloseFocus = useCallback(() => {
    if (selectedIdx === null || isReturningRef.current) return;
    if (soundEnabledRef.current) audioSynth.playGentleChime(523.25);

    const card = focusCardRef.current;
    const stage = focusStageRef.current;
    const sourceNode = cardRefs.current[selectedIdx];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !card || !stage) {
      setSelectedIdx(null);
      return;
    }

    isReturningRef.current = true;
    const destRect = sourceNode ? sourceNode.getBoundingClientRect() : null;
    const cardRect = card.getBoundingClientRect();

    const tl = gsap.timeline({
      onComplete: () => {
        isReturningRef.current = false;
        setSelectedIdx(null);
      },
    });

    if (destRect && destRect.width > 0) {
      const dx =
        destRect.left +
        destRect.width / 2 -
        (cardRect.left + cardRect.width / 2);
      const dy =
        destRect.top +
        destRect.height / 2 -
        (cardRect.top + cardRect.height / 2);
      const endScale = Math.max(
        0.18,
        Math.min(0.92, destRect.width / Math.max(cardRect.width, 1))
      );
      tl.to(
        card,
        {
          x: dx,
          y: dy,
          scale: endScale,
          opacity: 0.15,
          duration: 0.5,
          ease: "power3.inOut",
        },
        0
      );
    } else {
      tl.to(card, { scale: 0.88, opacity: 0, duration: 0.4, ease: "power2.inOut" }, 0);
    }

    tl.to(stage, { opacity: 0, duration: 0.4, ease: "power2.inOut" }, 0.06);
  }, [selectedIdx]);

  const handleSelectPhoto = (idx: number, originEl?: HTMLElement | null) => {
    if (isReturningRef.current) return;
    animateFromRectRef.current = originEl ? originEl.getBoundingClientRect() : null;
    setSelectedIdx(idx);
    if (soundEnabledRef.current) audioSynth.playGentleChime(659.25);
  };

  const stepFocus = useCallback((delta: number) => {
    if (isReturningRef.current) return;
    animateFromRectRef.current = null;
    setSelectedIdx((i) =>
      i !== null ? (i + delta + SHRUTI_PHOTOS.length) % SHRUTI_PHOTOS.length : 0
    );
    if (soundEnabledRef.current) audioSynth.playGentleChime(delta > 0 ? 739.99 : 622.25);
  }, []);

  useEffect(() => {
    if (selectedIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseFocus();
      if (e.key === "ArrowLeft") stepFocus(-1);
      if (e.key === "ArrowRight") stepFocus(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIdx, handleCloseFocus, stepFocus]);

  const handleContinue = () => {
    if (exiting) return;
    setExiting(true);
    if (soundEnabledRef.current) audioSynth.playGentleChime(587.33);
    if (rootRef.current) {
      gsap.to(rootRef.current, {
        opacity: 0,
        duration: 0.65,
        ease: "power2.inOut",
        onComplete: () => transitionTo("HEART_TREE"),
      });
    } else {
      transitionTo("HEART_TREE");
    }
  };

  const selectedPhoto: ShrutiPhoto | null =
    selectedIdx !== null ? SHRUTI_PHOTOS[selectedIdx] : null;
  const isFocused = selectedPhoto !== null;
  const slots = isMobile ? MOBILE_SLOTS : DESKTOP_SLOTS;

  return (
    <section
      ref={rootRef}
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(ellipse at 50% 45%, #19142c 0%, #0b0a16 62%, #040409 100%)",
        overflow: "hidden",
      }}
      aria-label="Chapter 7: Memory Constellation"
    >
      {/* 60fps Starfield + Auto-Morphing Constellation Links & Orbit Guides */}
      <canvas
        ref={skyCanvasRef}
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

      {/* Minimal Header Whisper (No Mode Switcher UI) */}
      <div
        style={{
          position: "fixed",
          top: "max(3.9rem, calc(var(--safe-top) + 3.1rem))",
          left: 0,
          right: 0,
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingInline: "1rem",
          opacity: isFocused ? 0.14 : 1,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            textAlign: "center",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(1.15rem, 2.3vw, 1.55rem)",
            color: "rgba(255, 242, 228, 0.86)",
            textShadow: "0 2px 18px rgba(0, 0, 0, 0.65)",
          }}
        >
          Tap any moment to bring it closer.
        </p>
      </div>

      {/* Unified Choreography Stage: Smoothly morphs continuously between Constellation & 3D Orbit */}
      {isMobile !== null && (
        <div
          onPointerDown={(e) => {
            orbitDraggingRef.current = true;
            orbitLastXRef.current = e.clientX;
            orbitLastYRef.current = e.clientY;
            orbitDragMovedRef.current = 0;
          }}
          onPointerMove={(e) => {
            if (!orbitDraggingRef.current) return;
            const dx = e.clientX - orbitLastXRef.current;
            const dy = e.clientY - orbitLastYRef.current;
            orbitLastXRef.current = e.clientX;
            orbitLastYRef.current = e.clientY;
            orbitDragMovedRef.current += Math.abs(dx) + Math.abs(dy);
            if (morphBlendRef.current > 0.25) {
              orbitAngleRef.current += dx * 0.0055;
              orbitVelRef.current = dx * 0.04;
            } else if (isMobile) {
              constOffsetRef.current = (constOffsetRef.current + dy * 0.0014 + 1) % 1;
            }
          }}
          onPointerUp={() => {
            orbitDraggingRef.current = false;
          }}
          onPointerCancel={() => {
            orbitDraggingRef.current = false;
          }}
          onWheel={(e) => {
            if (morphBlendRef.current > 0.25) {
              orbitAngleRef.current += (e.deltaY + e.deltaX) * 0.0014;
            } else if (isMobile) {
              constOffsetRef.current = (constOffsetRef.current - e.deltaY * 0.0005 + 1) % 1;
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 6,
            perspective: "1100px",
            touchAction: "none",
            opacity: isFocused ? 0.14 : 1,
            pointerEvents: isFocused ? "none" : "auto",
            transition: "opacity 0.45s ease",
          }}
        >
          {SHRUTI_PHOTOS.map((photo, idx) => {
            const slot = slots[idx % slots.length];
            const isLandscape = photo.width > photo.height;
            const widthPx = isMobile
              ? isLandscape
                ? 172
                : 138
              : isLandscape
                ? Math.round(slot.baseWidthPx * 1.15)
                : Math.round(slot.baseWidthPx * 0.88);
            const isLifted = selectedIdx === idx;

            return (
              <button
                key={photo.id}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                type="button"
                onMouseEnter={() => {
                  hoverPausedRef.current = true;
                }}
                onMouseLeave={() => {
                  hoverPausedRef.current = false;
                }}
                onClick={(e) => {
                  if (orbitDragMovedRef.current > 10) return;
                  handleSelectPhoto(idx, e.currentTarget);
                }}
                className="constellation-node"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: isMobile
                    ? `${widthPx}px`
                    : `clamp(104px, ${Math.round(widthPx / 12)}vw, ${widthPx}px)`,
                  background: "rgba(15, 14, 28, 0.58)",
                  border: "1px solid rgba(233, 199, 125, 0.28)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  padding: "3px",
                  cursor: "pointer",
                  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.74)",
                  transformStyle: "preserve-3d",
                  opacity: 0,
                  visibility: isLifted ? "hidden" : "visible",
                }}
                aria-label={`Inspect photograph ${idx + 1}`}
              >
                <img
                  src={photo.src}
                  alt={`Shruti ${idx + 1}`}
                  decoding="async"
                  draggable={false}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    aspectRatio: `${photo.width} / ${photo.height}`,
                    objectFit: "contain",
                    borderRadius: "7px",
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Photo Elevation / Focus Overlay — Uncropped Original Aspect Ratio */}
      {selectedPhoto && selectedIdx !== null && (
        <div
          ref={focusStageRef}
          onClick={handleCloseFocus}
          role="dialog"
          aria-modal="true"
          aria-label={`Inspecting photograph ${selectedIdx + 1}`}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 75,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "4.6rem 1.25rem 4.8rem",
            background:
              "radial-gradient(circle at 50% 48%, rgba(28, 22, 46, 0.72) 0%, rgba(5, 4, 12, 0.92) 78%)",
          }}
        >
          <button
            type="button"
            className="hud-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseFocus();
            }}
            style={{
              position: "fixed",
              top: "max(4.4rem, calc(var(--safe-top) + 3.5rem))",
              right: "max(1.2rem, var(--safe-right))",
              minWidth: "42px",
              minHeight: "42px",
              justifyContent: "center",
              zIndex: 82,
            }}
            aria-label="Return photograph to constellation"
          >
            <X size={16} />
          </button>

          <div
            ref={focusCardRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: isMobile ? "90vw" : "78vw",
              maxHeight: isMobile ? "72dvh" : "76dvh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "10px",
              padding: "6px",
              background:
                "linear-gradient(155deg, rgba(233, 199, 125, 0.25) 0%, rgba(20, 16, 36, 0.85) 100%)",
              border: "1px solid rgba(233, 199, 125, 0.45)",
              boxShadow:
                "0 34px 96px rgba(0, 0, 0, 0.94), 0 0 68px rgba(233, 199, 125, 0.16)",
            }}
          >
            <img
              src={selectedPhoto.src}
              alt={`Shruti ${selectedIdx + 1}`}
              decoding="sync"
              style={{
                display: "block",
                maxWidth: isMobile ? "calc(90vw - 14px)" : "calc(78vw - 14px)",
                maxHeight: isMobile ? "calc(72dvh - 14px)" : "calc(76dvh - 14px)",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                borderRadius: "6px",
              }}
            />
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              bottom: "max(1.3rem, var(--safe-bottom))",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "0.9rem",
              zIndex: 82,
            }}
          >
            <button
              type="button"
              className="hud-btn"
              onClick={() => stepFocus(-1)}
              aria-label="Previous photograph"
            >
              <ChevronLeft size={16} />
            </button>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "0.82rem",
                letterSpacing: "0.14em",
                color: "rgba(233, 199, 125, 0.84)",
              }}
            >
              {selectedIdx + 1} / {SHRUTI_PHOTOS.length}
            </span>
            <button
              type="button"
              className="hud-btn"
              onClick={() => stepFocus(1)}
              aria-label="Next photograph"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Continue Control */}
      <button
        onClick={handleContinue}
        className="scene-continue-btn"
        style={{
          position: "fixed",
          bottom: "max(1.4rem, var(--safe-bottom))",
          right: "max(1.4rem, var(--safe-right))",
          zIndex: 50,
          opacity: isFocused ? 0 : 1,
          pointerEvents: isFocused ? "none" : "auto",
          transition: "opacity 0.35s ease",
        }}
      >
        <span>Continue</span>
        <ArrowRight size={14} />
      </button>

      <style jsx>{`
        .constellation-node {
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .constellation-node:hover {
          border-color: rgba(233, 199, 125, 0.86) !important;
          box-shadow: 0 22px 48px rgba(0, 0, 0, 0.92), 0 0 24px rgba(233, 199, 125, 0.28) !important;
          z-index: 72 !important;
        }
      `}</style>
    </section>
  );
}
