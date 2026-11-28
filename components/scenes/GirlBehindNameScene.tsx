"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experience-store";
import { GIRL_BEHIND_NAME_CONTENT } from "@/content/appreciation";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { ArrowRight } from "lucide-react";
import "./girl-behind-name.css";

const WORD_LETTERS = GIRL_BEHIND_NAME_CONTENT.interactiveWord.split("");
const TARGET_LETTERS = ["S", "H", "R", "U", "T", "I"] as const;

// Approved unobstructed full-face portrait from public/images/shruti/ (p-9 in content/gallery.ts)
const SHRUTI_PORTRAIT_SRC = "/images/shruti/1000019981.jpg";

// Exact source copy from content/appreciation.ts grouped into calm short-film phrases
const LEAD_PHRASES = [
  "You're ambitious, you have your own opinions,",
  "you can argue over the smallest things,",
  "and sometimes your nakhre are on an entirely different level.",
] as const;

const TRAIT_BEATS = [
  "A little unpredictable.",
  "A little dramatic.",
  "Never boring.",
] as const;

interface MorphParticle {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  cx: number;
  cy: number;
  orbitR: number;
  orbitAngle: number;
  srcOrder: number;
  dstOrder: number;
  size: number;
  depth: number;
  phaseOffset: number;
  isGold: boolean;
}

interface MorphStageMetrics {
  cx: number;
  cy: number;
  spanW: number;
  spanH: number;
  slots: Array<{ cx: number; cy: number; w: number; h: number }>;
}

function sampleGlyphPixels(
  letters: readonly string[],
  elements: (HTMLElement | null)[],
  viewportW: number,
  viewportH: number
): Array<{ x: number; y: number; letterIdx: number }> {
  const offscreen = document.createElement("canvas");
  offscreen.width = Math.max(1, Math.round(viewportW));
  offscreen.height = Math.max(1, Math.round(viewportH));
  const octx = offscreen.getContext("2d");
  if (!octx) return [];

  octx.clearRect(0, 0, offscreen.width, offscreen.height);
  octx.textBaseline = "alphabetic";

  const letterRanges: Array<{
    letterIdx: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
  }> = [];

  letters.forEach((ch, idx) => {
    const el = elements[idx];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const cs = getComputedStyle(el);
    octx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const metrics = octx.measureText(ch);
    const ascent = metrics.actualBoundingBoxAscent || rect.height * 0.72;
    const descent = metrics.actualBoundingBoxDescent || rect.height * 0.14;
    const glyphH = ascent + descent;
    const baselineY = rect.top + (rect.height - glyphH) / 2 + ascent;
    const centerX = rect.left + rect.width / 2;

    octx.textAlign = "center";
    octx.fillStyle = "#FFFFFF";
    octx.fillText(ch, centerX, baselineY);

    letterRanges.push({
      letterIdx: idx,
      left: Math.max(0, Math.floor(rect.left) - 4),
      right: Math.min(offscreen.width - 1, Math.ceil(rect.right) + 4),
      top: Math.max(0, Math.floor(rect.top) - 4),
      bottom: Math.min(offscreen.height - 1, Math.ceil(rect.bottom) + 4),
    });
  });

  if (letterRanges.length === 0) return [];

  const imgData = octx.getImageData(0, 0, offscreen.width, offscreen.height).data;
  const step = viewportW < 520 ? 3 : 4;
  const pts: Array<{ x: number; y: number; letterIdx: number }> = [];

  for (const range of letterRanges) {
    for (let y = range.top; y <= range.bottom; y += step) {
      for (let x = range.left; x <= range.right; x += step) {
        const alpha = imgData[(y * offscreen.width + x) * 4 + 3];
        if (alpha > 110) {
          pts.push({ x, y, letterIdx: range.letterIdx });
        }
      }
    }
  }
  return pts;
}

function buildParticleSet(
  srcPts: Array<{ x: number; y: number; letterIdx: number }>,
  dstPts: Array<{ x: number; y: number; letterIdx: number }>,
  viewportW: number,
  stageCx: number,
  stageCy: number
): MorphParticle[] {
  if (srcPts.length === 0 || dstPts.length === 0) return [];

  const maxCount = viewportW < 520 ? 360 : 580;
  const targetCount = Math.min(maxCount, Math.max(srcPts.length, dstPts.length));

  // Resample evenly while preserving glyph spatial ordering
  const resample = (arr: Array<{ x: number; y: number; letterIdx: number }>, count: number) => {
    const out: Array<{ x: number; y: number; letterIdx: number }> = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i / count) * arr.length);
      out.push(arr[Math.min(idx, arr.length - 1)]);
    }
    return out;
  };

  const sList = resample(srcPts, targetCount);
  const dList = resample(dstPts, targetCount);

  const particles: MorphParticle[] = [];
  const baseRadius = Math.min(viewportW * 0.22, 138);

  for (let i = 0; i < targetCount; i++) {
    const s = sList[i];
    const d = dList[i];

    // Quantized mechanical control anchor + helical astrolabe orbit angle
    const dx = (s.x + d.x) * 0.5 - stageCx;
    const dy = (s.y + d.y) * 0.5 - stageCy;
    const orbitAngle = Math.atan2(dy, dx) + (i % 5) * 0.14;
    const ringBand = i % 3 === 0 ? 0.58 : i % 3 === 1 ? 0.92 : 1.18;
    const orbitR = baseRadius * ringBand + ((i * 11) % 18);

    const cx = stageCx + Math.cos(orbitAngle) * orbitR;
    const cy = stageCy + Math.sin(orbitAngle) * (orbitR * 0.42);

    particles.push({
      sx: s.x,
      sy: s.y,
      tx: d.x,
      ty: d.y,
      cx,
      cy,
      orbitR,
      orbitAngle,
      srcOrder: s.letterIdx / Math.max(1, WORD_LETTERS.length - 1),
      dstOrder: d.letterIdx / Math.max(1, TARGET_LETTERS.length - 1),
      size: 0.95 + ((i * 17) % 10) * 0.1,
      depth: 0.8 + ((i * 23) % 10) * 0.055,
      phaseOffset: ((i * 13) % 20) / 20,
      isGold: i % 3 === 0,
    });
  }

  return particles;
}

export function GirlBehindNameScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);

  const rootRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const portraitVeilRef = useRef<HTMLDivElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);

  const leadPhraseRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const prefixRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);

  // Clean interactive GHELI editorial wordmark refs (no fragment DOM clones)
  const gheliRowRef = useRef<HTMLDivElement>(null);
  const letterBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const letterBodyRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const rippleRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Editorial SHRUTI wordmark refs
  const shrutiRowRef = useRef<HTMLDivElement>(null);
  const shrutiLetterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Minimal asymmetric botanical SVG refs
  const stemLeftRef = useRef<SVGPathElement>(null);
  const stemRightRef = useRef<SVGPathElement>(null);
  const clusterLeftRef = useRef<SVGGElement>(null);
  const clusterRightRef = useRef<SVGGElement>(null);

  const traitBeatRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const closingRef = useRef<HTMLParagraphElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const [exiting, setExiting] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [sweepActive, setSweepActive] = useState(false);
  const [ambientLive, setAmbientLive] = useState(false);

  const tapCountRef = useRef(0);
  const transformLockedRef = useRef(false);

  // Deterministic particle engine shared state (single canvas owner)
  const morphDriverRef = useRef({ progress: 0, active: false });
  const morphParticlesRef = useRef<MorphParticle[]>([]);
  const morphMetricsRef = useRef<MorphStageMetrics | null>(null);

  // ─── 1. Single Atmospheric Dust & Morph Particle Canvas ───
  useEffect(() => {
    const canvas = particleCanvasRef.current;
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

    const motes = Array.from({ length: 18 }, () => ({
      x: w * (0.16 + Math.random() * 0.68),
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.1,
      vx: (Math.random() - 0.5) * 0.1,
      vy: -0.09 - Math.random() * 0.15,
      alpha: 0.08 + Math.random() * 0.18,
      phase: Math.random() * Math.PI * 2,
    }));

    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const smoothstep = (e0: number, e1: number, x: number) => {
      const t = clamp01((x - e0) / (e1 - e0));
      return t * t * (3 - 2 * t);
    };
    const power3InOut = (x: number) => {
      const t = clamp01(x);
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const evalMechanicalPos = (p: MorphParticle, u: number, m: MorphStageMetrics) => {
      // Three-stage mechanical trajectory:
      // 0..0.38 -> snap from source glyph onto rotating elliptical watchmaker escapement track
      // 0.38..0.68 -> whip cleanly through calibrated high-torque rotation
      // 0.68..1.00 -> crisp tangential magnetic vector lock onto target glyph coordinates
      const swirlAngle = p.orbitAngle + u * Math.PI * 1.45;
      const orbitX = m.cx + Math.cos(swirlAngle) * p.orbitR;
      const orbitY = m.cy + Math.sin(swirlAngle) * (p.orbitR * 0.36);

      if (u < 0.42) {
        const k = power3InOut(u / 0.42);
        return {
          x: p.sx + (orbitX - p.sx) * k,
          y: p.sy + (orbitY - p.sy) * k,
        };
      }
      if (u < 0.62) {
        return { x: orbitX, y: orbitY };
      }
      const k = power3InOut((u - 0.62) / 0.38);
      // Slight vertical slot-drop bias right before locking into SHRUTI letter
      const dropBias = Math.sin(k * Math.PI) * -10 * (1 - k);
      return {
        x: orbitX + (p.tx - orbitX) * k,
        y: orbitY + (p.ty - orbitY) * k + dropBias,
      };
    };

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, w, h);

      // Quiet ambient dust motes
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.x += m.vx;
        m.y += m.vy;
        m.phase += 0.012;
        if (m.y < -10) {
          m.y = h + 10;
          m.x = w * (0.16 + Math.random() * 0.68);
        }
        const a = m.alpha * (0.55 + 0.45 * Math.sin(m.phase));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#E9C77D";
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Deterministic Mechanical-Luxury GHELI -> SHRUTI Morph Layer
      const morph = morphDriverRef.current;
      const particles = morphParticlesRef.current;
      const metrics = morphMetricsRef.current;
      if (morph.active && particles.length > 0 && metrics) {
        const p = morph.progress;
        const { cx, cy, spanW, spanH, slots } = metrics;

        // 1. Precision Laser Calibration Sweep across GHELI (p: 0.00 -> 0.24)
        if (p < 0.26) {
          const scanK = power3InOut(p / 0.22);
          const scanX = cx - spanW * 0.62 + spanW * 1.24 * scanK;
          const scanAlpha = Math.sin(clamp01(p / 0.24) * Math.PI) * 0.85;

          const grad = ctx.createLinearGradient(scanX, cy - spanH * 0.9, scanX, cy + spanH * 0.9);
          grad.addColorStop(0, "transparent");
          grad.addColorStop(0.5, "rgba(255, 245, 224, 0.95)");
          grad.addColorStop(1, "transparent");
          ctx.globalAlpha = scanAlpha;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(scanX, cy - spanH * 0.95);
          ctx.lineTo(scanX, cy + spanH * 0.95);
          ctx.stroke();
        }

        // 2. Twin Counter-Rotating Precision Watchmaker Escapement Arcs & Calipers (p: 0.06 -> 0.86)
        const rigAlpha = smoothstep(0.05, 0.16, p) * (1 - smoothstep(0.72, 0.88, p));
        if (rigAlpha > 0.01) {
          const rOuter = Math.min(w * 0.34, Math.max(spanW * 0.44, 155));
          const rInner = rOuter * 0.72;
          const rotA = p * Math.PI * 1.65;
          const rotB = -p * Math.PI * 2.1;

          // Horizontal calibrated datum hairline
          ctx.globalAlpha = rigAlpha * 0.28;
          ctx.strokeStyle = "#E9C77D";
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(cx - spanW * 0.68, cy);
          ctx.lineTo(cx + spanW * 0.68, cy);
          ctx.stroke();

          // Outer broken mechanical ring arcs
          ctx.strokeStyle = "#E9C77D";
          ctx.lineWidth = 0.9;
          ctx.globalAlpha = rigAlpha * 0.42;
          for (let seg = 0; seg < 4; seg++) {
            const a0 = rotA + (seg * Math.PI) / 2 + 0.18;
            ctx.beginPath();
            ctx.arc(cx, cy, rOuter, a0, a0 + Math.PI / 2 - 0.36);
            ctx.stroke();
          }

          // Inner fine ivory counter-rotating arc + degree ticks
          ctx.strokeStyle = "#F5ECE0";
          ctx.lineWidth = 0.7;
          ctx.globalAlpha = rigAlpha * 0.32;
          for (let seg = 0; seg < 3; seg++) {
            const a0 = rotB + (seg * Math.PI * 2) / 3 + 0.22;
            ctx.beginPath();
            ctx.arc(cx, cy, rInner, a0, a0 + (Math.PI * 2) / 3 - 0.44);
            ctx.stroke();
          }

          // Radial precision ticks on outer ring
          ctx.globalAlpha = rigAlpha * 0.46;
          for (let tIdx = 0; tIdx < 24; tIdx++) {
            const ta = rotA * 0.5 + (tIdx * Math.PI * 2) / 24;
            const len = tIdx % 3 === 0 ? 7 : 3.5;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ta) * (rOuter - len), cy + Math.sin(ta) * (rOuter - len));
            ctx.lineTo(cx + Math.cos(ta) * (rOuter + 2), cy + Math.sin(ta) * (rOuter + 2));
            ctx.stroke();
          }
        }

        // 3. Quantized High-Torque Typographic Particles & Vector Filaments
        for (let i = 0; i < particles.length; i++) {
          const pt = particles[i];

          // Strict left-to-right mechanical unlock & tumbler assembly cadence
          const startShift = pt.srcOrder * 0.16;
          const endShift = (1 - pt.dstOrder) * 0.18;
          const u = smoothstep(startShift, 1 - endShift, p);

          const fadeIn = smoothstep(0.0, 0.08, p);
          const fadeOut = 1 - smoothstep(0.84, 0.99, p);
          const alpha = fadeIn * fadeOut;
          if (alpha <= 0.005) continue;

          const pos = evalMechanicalPos(pt, u, metrics);
          const prevPos = evalMechanicalPos(pt, Math.max(0, u - 0.055), metrics);
          const scale = 1 + 0.32 * Math.sin(u * Math.PI) * (pt.depth - 0.65);

          // Crisp razor vector filament trails during torque rotation & lock-in
          if (u > 0.02 && u < 0.97) {
            ctx.globalAlpha = alpha * 0.48;
            ctx.strokeStyle = pt.isGold ? "#E9C77D" : "#FBF5EC";
            ctx.lineWidth = Math.max(0.7, pt.size * 0.58);
            ctx.beginPath();
            ctx.moveTo(prevPos.x, prevPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
          }

          ctx.globalAlpha = alpha * 0.95;
          ctx.fillStyle = pt.isGold ? "#E9C77D" : "#FBF5EC";
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pt.size * scale, 0, Math.PI * 2);
          ctx.fill();
        }

        // 4. Precision Slot-Lock Aperture Flash + Final Baseline Shockline (p: 0.64 -> 0.99)
        if (p > 0.63 && slots.length > 0) {
          slots.forEach((slot, sIdx) => {
            const lockStart = 0.65 + sIdx * 0.042;
            const localP = (p - lockStart) / 0.12;
            if (localP > 0 && localP < 1) {
              const flashA = Math.sin(localP * Math.PI) * 0.85;
              const tickHalf = (slot.h * 0.62) * (1 - localP * 0.35);
              ctx.globalAlpha = flashA;
              ctx.strokeStyle = "#E9C77D";
              ctx.lineWidth = 1.1;
              ctx.beginPath();
              ctx.moveTo(slot.cx, slot.cy - tickHalf);
              ctx.lineTo(slot.cx, slot.cy + tickHalf);
              ctx.stroke();

              // Crisp horizontal caliper snap bar beneath locked slot
              const barW = slot.w * (0.45 + 0.55 * (1 - localP));
              ctx.beginPath();
              ctx.moveTo(slot.cx - barW * 0.5, slot.cy + slot.h * 0.56);
              ctx.lineTo(slot.cx + barW * 0.5, slot.cy + slot.h * 0.56);
              ctx.stroke();
            }
          });
        }

        // Sexy champagne velvet horizontal shockwave as final I snaps locked (p: 0.86 -> 0.99)
        if (p > 0.86) {
          const waveK = (p - 0.86) / 0.13;
          const waveAlpha = (1 - waveK) * 0.72;
          const halfRay = spanW * (0.2 + 0.72 * power3InOut(waveK));
          const beamGrad = ctx.createLinearGradient(cx - halfRay, cy, cx + halfRay, cy);
          beamGrad.addColorStop(0, "transparent");
          beamGrad.addColorStop(0.5, "rgba(233, 199, 125, 0.95)");
          beamGrad.addColorStop(1, "transparent");
          ctx.globalAlpha = waveAlpha;
          ctx.strokeStyle = beamGrad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - halfRay, cy);
          ctx.lineTo(cx + halfRay, cy);
          ctx.stroke();
        }
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

  // ─── 2. Short-Film Master Sequence + Deterministic Particle Morph + Portrait Reveal ───
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gheliBodies = letterBodyRefs.current;

    const prepareDraw = (path: SVGPathElement | null) => {
      if (!path) return;
      const len = path.getTotalLength();
      if (reduced) {
        path.style.strokeDasharray = "none";
        path.style.strokeDashoffset = "0";
      } else {
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
      }
    };

    prepareDraw(stemLeftRef.current);
    prepareDraw(stemRightRef.current);

    if (reduced) {
      // Calm understandable sequential word transition for reduced-motion users (no spatial motion/particles)
      transformLockedRef.current = true;
      setIsTransforming(true);
      if (spotlightRef.current) gsap.set(spotlightRef.current, { opacity: 0.9 });
      leadPhraseRefs.current.forEach((el) => el && gsap.set(el, { opacity: 1, y: 0 }));
      if (prefixRef.current) gsap.set(prefixRef.current, { opacity: 1, y: 0 });
      [clusterLeftRef.current, clusterRightRef.current].forEach(
        (el) => el && gsap.set(el, { opacity: 1, scale: 1 })
      );
      traitBeatRefs.current.forEach((el) => el && gsap.set(el, { opacity: 1, y: 0 }));
      if (closingRef.current) gsap.set(closingRef.current, { opacity: 1, y: 0 });
      if (nextRef.current) gsap.set(nextRef.current, { opacity: 1, y: 0 });

      if (gheliRowRef.current) gsap.set(gheliRowRef.current, { opacity: 1, visibility: "visible" });
      if (shrutiRowRef.current) gsap.set(shrutiRowRef.current, { opacity: 0, visibility: "hidden" });
      shrutiLetterRefs.current.forEach((el) => el && gsap.set(el, { opacity: 0 }));
      if (portraitVeilRef.current) gsap.set(portraitVeilRef.current, { opacity: 0 });

      const reducedTl = gsap.timeline();
      reducedTl
        .to({}, { duration: 0.9 })
        .to(gheliRowRef.current, {
          opacity: 0,
          duration: 0.35,
          onComplete: () => {
            if (gheliRowRef.current) gheliRowRef.current.style.visibility = "hidden";
          },
        })
        .set(shrutiRowRef.current, { opacity: 1, visibility: "visible" })
        .to(shrutiLetterRefs.current.filter(Boolean), { opacity: 1, duration: 0.4 })
        .to(portraitVeilRef.current, { opacity: 1, duration: 0.5 }, "<0.1");

      return () => {
        reducedTl.kill();
      };
    }

    // Initial clean deterministic state (mutate in-place so GSAP targets stay bound)
    const morphDriver = morphDriverRef.current;
    morphDriver.progress = 0;
    morphDriver.active = false;
    morphParticlesRef.current = [];
    morphMetricsRef.current = null;

    const tl = gsap.timeline();

    // ACT I — BRIEF ATMOSPHERIC PAUSE & SLOW, DELIBERATE OPENING SENTENCE (~5.8s paced phrasing)
    if (spotlightRef.current) {
      tl.fromTo(
        spotlightRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1.8, ease: "power1.out" },
        0
      );
    }

    // Wait 0.85s after mount before first phrase begins emerging
    tl.to({}, { duration: 0.85 }, 0);

    leadPhraseRefs.current.forEach((phraseEl, idx) => {
      if (!phraseEl) return;
      tl.fromTo(
        phraseEl,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 1.25,
          ease: "power2.out",
        },
        idx === 0 ? 0.85 : "+=0.55"
      );
    });

    // Calm breathing hold after full sentence is read
    tl.to({}, { duration: 0.9 });

    // ACT II — "But that's" + G H E L I EDITORIAL WORDMARK ARRIVAL
    tl.fromTo(
      prefixRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.85, ease: "power2.out" }
    );

    tl.fromTo(
      letterBtnRefs.current.filter(Boolean),
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.95,
        stagger: 0.13,
        ease: "power2.out",
        onComplete: () => {
          letterBodyRefs.current.forEach((bodyEl, idx) => {
            if (!bodyEl || transformLockedRef.current) return;
            gsap.to(bodyEl, {
              y: -3.5,
              duration: 2.4 + idx * 0.16,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
              delay: idx * 0.14,
            });
          });
        },
      },
      "+=0.15"
    );

    // Asymmetric minimal botanical stems
    const stems = [stemLeftRef.current, stemRightRef.current].filter(Boolean);
    if (stems.length > 0) {
      tl.to(
        stems,
        {
          strokeDashoffset: 0,
          duration: 1.3,
          stagger: 0.2,
          ease: "power2.inOut",
        },
        "-=0.45"
      );
    }

    tl.fromTo(
      [clusterLeftRef.current, clusterRightRef.current].filter(Boolean),
      { opacity: 0, scale: 0.82 },
      { opacity: 1, scale: 1, duration: 0.85, stagger: 0.18, ease: "power2.out" },
      "-=0.7"
    );

    if (hintRef.current) {
      tl.fromTo(
        hintRef.current,
        { opacity: 0 },
        { opacity: 0.65, duration: 0.6, ease: "power1.out" },
        "-=0.2"
      );
    }

    // ACT III — PERSONALITY BEATS
    traitBeatRefs.current.forEach((traitEl, idx) => {
      if (!traitEl) return;
      tl.fromTo(
        traitEl,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" },
        idx === 0 ? "+=0.35" : "+=0.3"
      );
    });

    // Brief interactive pause on complete GHELI composition before particle morph
    tl.to({}, { duration: 1.5 });

    // ─── ACT IV — DRAMATIC MECHANICAL & SEXY ESCAPEMENT MORPH (GHELI -> SHRUTI) ───
    // Sudden unexpected tension lock: spotlight tightens and GHELI snaps crisply to zero-datum
    if (spotlightRef.current) {
      tl.to(spotlightRef.current, {
        scale: 0.86,
        opacity: 0.72,
        duration: 0.24,
        ease: "power4.out",
      });
    }

    tl.call(() => {
      transformLockedRef.current = true;
      setIsTransforming(true);
      setActiveIdx(null);

      // Kill all float/hover tweens cleanly and snap GHELI onto a rigid horizontal datum
      letterBodyRefs.current.forEach((b) => {
        if (b) {
          gsap.killTweensOf(b);
          gsap.set(b, { y: 0, x: 0, scale: 1, clearProps: "transform" });
        }
      });

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rowRect = gheliRowRef.current?.getBoundingClientRect();
      const shrutiRect = shrutiRowRef.current?.getBoundingClientRect();
      const stageCx =
        rowRect && rowRect.width > 0 ? rowRect.left + rowRect.width / 2 : vw / 2;
      const stageCy =
        rowRect && rowRect.height > 0 ? rowRect.top + rowRect.height / 2 : vh * 0.45;
      const spanW = Math.max(rowRect?.width ?? 280, shrutiRect?.width ?? 320);
      const spanH = Math.max(rowRect?.height ?? 88, shrutiRect?.height ?? 88);

      const slots = shrutiLetterRefs.current
        .map((el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            cx: r.left + r.width / 2,
            cy: r.top + r.height / 2,
            w: r.width,
            h: r.height,
          };
        })
        .filter((s): s is { cx: number; cy: number; w: number; h: number } => s !== null);

      morphMetricsRef.current = { cx: stageCx, cy: stageCy, spanW, spanH, slots };

      const srcPts = sampleGlyphPixels(WORD_LETTERS, letterBodyRefs.current, vw, vh);
      const dstPts = sampleGlyphPixels(TARGET_LETTERS, shrutiLetterRefs.current, vw, vh);
      morphParticlesRef.current = buildParticleSet(
        srcPts,
        dstPts,
        vw,
        stageCx,
        stageCy
      );
      morphDriverRef.current.progress = 0;
      morphDriverRef.current.active = morphParticlesRef.current.length > 0;

      if (soundEnabled) {
        audioSynth.playGentleChime(440);
      }
    });

    if (hintRef.current) {
      tl.to(hintRef.current, { opacity: 0, duration: 0.25, ease: "power2.out" }, "<");
    }

    // Phase A -> B -> C driven deterministically from named timeline label
    tl.addLabel("morphStart");

    tl.to(
      morphDriverRef.current,
      {
        progress: 1,
        duration: 3.3,
        ease: "power3.inOut",
      },
      "morphStart"
    );

    // Hide GHELI DOM row cleanly right as laser slice dissolves the wordmark (zero ghost glyphs)
    if (gheliRowRef.current) {
      tl.to(
        gheliRowRef.current,
        {
          opacity: 0,
          duration: 0.28,
          ease: "power3.in",
          onComplete: () => {
            if (gheliRowRef.current) {
              gheliRowRef.current.style.visibility = "hidden";
            }
          },
        },
        "morphStart+=0.14"
      );
    }

    // Reveal SHRUTI container cleanly for rhythmic mechanical tumbler slot-lock cadence
    if (shrutiRowRef.current) {
      tl.set(shrutiRowRef.current, { opacity: 1, visibility: "visible" }, "morphStart+=2.18");
    }

    // Crisp mechanical vertical slot-lock snap into final editorial baseline (zero leftover offset)
    tl.fromTo(
      shrutiLetterRefs.current.filter(Boolean),
      { opacity: 0, y: -15, scaleY: 1.07 },
      {
        opacity: 1,
        y: 0,
        scaleY: 1,
        duration: 0.28,
        stagger: 0.095,
        ease: "power4.out",
      },
      "morphStart+=2.22"
    );

    // Velvet spotlight release + deterministic wipe of all temporary canvas morph buffers
    if (spotlightRef.current) {
      tl.to(
        spotlightRef.current,
        {
          scale: 1,
          opacity: 1,
          duration: 1.15,
          ease: "power2.out",
        },
        "morphStart+=3.05"
      );
    }

    tl.call(
      () => {
        morphDriverRef.current.progress = 1;
        morphDriverRef.current.active = false;
        morphParticlesRef.current = [];
        morphMetricsRef.current = null;
        setSweepActive(true);
        if (soundEnabled) {
          audioSynth.playGentleChime(659.25);
        }
      },
      [],
      "morphStart+=3.42"
    );

    // ─── ACT V — RECOGNIZABLE DARK-PLUM PORTRAIT CAMOUFLAGE (ONLY AFTER SHRUTI LOCKS) ───
    if (portraitVeilRef.current) {
      tl.fromTo(
        portraitVeilRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 2.5,
          ease: "power2.out",
        },
        "+=0.35"
      );
    }

    // ─── ACT VI — QUIET FINISH & CONTINUOUS LIVING STATE (NO AUTO-ADVANCE) ───
    tl.fromTo(
      closingRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.95, ease: "power2.out" },
      "+=0.35"
    )
      .fromTo(
        nextRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" },
        "+=0.25"
      )
      .call(() => {
        setAmbientLive(true);
      });

    return () => {
      morphDriver.progress = 0;
      morphDriver.active = false;
      morphParticlesRef.current = [];
      morphMetricsRef.current = null;
      gheliBodies.forEach((b) => {
        if (b) gsap.killTweensOf(b);
      });
      tl.kill();
    };
  }, [soundEnabled]);

  // ─── 3. Interactive GHELI Letters (Locked cleanly once transformation starts) ───
  const getNearbyBotanicalCluster = useCallback((index: number): SVGGElement | null => {
    return index <= 2 ? clusterLeftRef.current : clusterRightRef.current;
  }, []);

  const handleLetterHover = useCallback(
    (index: number, entering: boolean) => {
      if (transformLockedRef.current) return;
      const body = letterBodyRefs.current[index];
      if (!body) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setActiveIdx(entering ? index : null);
      if (reduced) return;

      gsap.killTweensOf(body);
      if (entering) {
        gsap.to(body, {
          y: -6,
          scale: 1.04,
          duration: 0.32,
          ease: "power2.out",
        });

        const cluster = getNearbyBotanicalCluster(index);
        if (cluster) {
          gsap.to(cluster, {
            rotation: index % 2 === 0 ? -3 : 3,
            scale: 1.04,
            duration: 0.45,
            ease: "sine.out",
            transformOrigin: "50% 50%",
          });
        }
      } else {
        gsap.to(body, {
          y: 0,
          scale: 1,
          duration: 0.45,
          ease: "power2.out",
        });

        const cluster = getNearbyBotanicalCluster(index);
        if (cluster) {
          gsap.to(cluster, {
            rotation: 0,
            scale: 1,
            duration: 0.55,
            ease: "sine.out",
          });
        }
      }
    },
    [getNearbyBotanicalCluster]
  );

  const handleLetterTap = useCallback(
    (index: number) => {
      if (transformLockedRef.current) return;
      const body = letterBodyRefs.current[index];
      if (!body) return;

      tapCountRef.current += 1;
      const currentTaps = tapCountRef.current;
      setActiveIdx(index);

      if (soundEnabled) {
        audioSynth.playGentleChime(523.25 + index * 65);
      }

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      const ripple = rippleRefs.current[index];
      if (ripple) {
        gsap.killTweensOf(ripple);
        gsap.fromTo(
          ripple,
          { scale: 0.45, opacity: 0.6 },
          { scale: 1.9, opacity: 0, duration: 0.72, ease: "power2.out" }
        );
      }

      gsap.killTweensOf(body);
      gsap.fromTo(
        body,
        { y: -4, scale: 1.06 },
        { y: 0, scale: 1, duration: 0.6, ease: "power2.out" }
      );

      if (currentTaps % 3 === 0) {
        letterBodyRefs.current.forEach((other, j) => {
          if (!other || j === index) return;
          gsap.to(other, {
            y: -8,
            duration: 0.22,
            yoyo: true,
            repeat: 1,
            delay: Math.abs(j - index) * 0.055,
            ease: "sine.inOut",
          });
        });
      }
    },
    [soundEnabled]
  );

  const handleContinue = () => {
    if (exiting) return;
    setExiting(true);
    setAmbientLive(false);
    if (soundEnabled) {
      audioSynth.playGentleChime(659.25);
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !rootRef.current) {
      transitionTo("TWO_YEARS_AGO");
      return;
    }

    gsap.to(rootRef.current, {
      opacity: 0,
      y: -10,
      duration: 0.45,
      ease: "power2.inOut",
      onComplete: () => transitionTo("TWO_YEARS_AGO"),
    });
  };

  const containerStyle = useMemo<React.CSSProperties>(
    () => ({
      position: "relative",
      zIndex: 4,
      margin: "auto 0",
      paddingBottom: "clamp(0.4rem, 2.5dvh, 1.5rem)",
      maxWidth: "50rem",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "clamp(0.75rem, 2dvh, 1.45rem)",
    }),
    []
  );

  return (
    <section
      ref={rootRef}
      className="gheli-stage-root"
      aria-label="Chapter 3: The Girl Behind the Name"
    >
      {/* Theatrical Warm Spotlight */}
      <div ref={spotlightRef} className="gheli-spotlight" aria-hidden="true" />

      {/* Recognizable Portrait Camouflaged into Dark Plum Double-Exposure */}
      <div
        ref={portraitVeilRef}
        className={`gheli-portrait-veil ${ambientLive ? "is-ambient-live" : ""}`}
        aria-hidden="true"
      >
        <img
          src={SHRUTI_PORTRAIT_SRC}
          alt=""
          loading="eager"
          decoding="sync"
          className="gheli-portrait-img"
        />
        <div className="gheli-portrait-grade" />
        <div className={`gheli-portrait-drift ${ambientLive ? "is-ambient-live" : ""}`} />
      </div>

      {/* Single Owned Canvas for Atmospheric Dust & GHELI -> SHRUTI Typographic Particle Morph */}
      <canvas
        ref={particleCanvasRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 6,
        }}
      />

      <div style={containerStyle}>
        {/* ACT I — Slow, Deliberate Short-Film Opening Sentence */}
        <p className="gheli-calm-lead">
          {LEAD_PHRASES.map((phrase, idx) => (
            <span
              key={phrase}
              ref={(el) => {
                leadPhraseRefs.current[idx] = el;
              }}
              className="gheli-lead-phrase"
            >
              {phrase}
            </span>
          ))}
        </p>

        {/* ACT II & IV — Editorial GHELI -> SHRUTI Wordmarks */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <span
            ref={prefixRef}
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(1.08rem, 1.9vw, 1.38rem)",
              color: "#C68B9E",
              letterSpacing: "0.08em",
              opacity: 0,
            }}
          >
            {GIRL_BEHIND_NAME_CONTENT.centerpiecePrefix}
          </span>

          <div className="gheli-botanical-stage">
            <div className="gheli-wordmark-backdrop" aria-hidden="true" />

            {/* Restrained Asymmetric Botanical Accents (well outside glyph bounds, zero symmetry) */}
            <svg className="gheli-botanical-svg" viewBox="0 0 640 210" aria-hidden="true">
              <path
                ref={stemLeftRef}
                d="M 18 174 C 30 132, 48 100, 82 72 C 95 60, 108 55, 118 53"
                fill="none"
                stroke="#7B8E78"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.62"
              />
              <path
                ref={stemRightRef}
                d="M 642 154 C 624 124, 604 102, 578 90 C 566 84, 556 84, 546 86"
                fill="none"
                stroke="#7B8E78"
                strokeWidth="1.15"
                strokeLinecap="round"
                opacity="0.58"
              />

              <g
                ref={clusterLeftRef}
                className={ambientLive ? "gheli-botanical-sway-left" : ""}
              >
                <path
                  d="M 42 126 C 26 120, 22 107, 34 101 C 44 107, 47 117, 42 126 Z"
                  fill="#6E826B"
                  opacity="0.72"
                />
                <path
                  d="M 70 86 C 76 70, 90 64, 94 74 C 88 82, 78 86, 70 86 Z"
                  fill="#7B8E78"
                  opacity="0.66"
                />
                <g transform="translate(118, 53) rotate(10)">
                  <ellipse cx="-5" cy="-1.5" rx="5.2" ry="2.8" transform="rotate(-26)" fill="#C68B9E" opacity="0.82" />
                  <ellipse cx="5" cy="-1.5" rx="5.2" ry="2.8" transform="rotate(26)" fill="#B5768A" opacity="0.78" />
                  <ellipse cx="0" cy="-5" rx="3.4" ry="5" fill="#D49EAE" opacity="0.85" />
                  <circle cx="0" cy="-1.5" r="1.7" fill="#E9C77D" opacity="0.88" />
                </g>
              </g>

              <g
                ref={clusterRightRef}
                className={ambientLive ? "gheli-botanical-sway-right" : ""}
              >
                <path
                  d="M 612 118 C 627 113, 632 101, 621 95 C 612 101, 608 110, 612 118 Z"
                  fill="#6E826B"
                  opacity="0.68"
                />
                <g transform="translate(546, 86) rotate(-18)">
                  <ellipse cx="-4.8" cy="-1.5" rx="4.6" ry="2.6" transform="rotate(-22)" fill="#B5768A" opacity="0.78" />
                  <ellipse cx="4.8" cy="-1.5" rx="4.6" ry="2.6" transform="rotate(22)" fill="#C68B9E" opacity="0.82" />
                  <circle cx="0" cy="-1.5" r="1.5" fill="#E9C77D" opacity="0.85" />
                </g>
              </g>
            </svg>

            {/* Interactive Editorial GHELI Wordmark */}
            <div
              ref={gheliRowRef}
              className="gheli-sculpture-row"
              role="group"
              aria-label="Interactive sculptural GHELI letters"
            >
              {WORD_LETTERS.map((ch, i) => (
                <button
                  key={`${ch}-${i}`}
                  ref={(el) => {
                    letterBtnRefs.current[i] = el;
                  }}
                  type="button"
                  disabled={isTransforming}
                  data-active={activeIdx === i ? "true" : "false"}
                  aria-label={`Letter ${ch} of GHELI`}
                  onMouseEnter={() => handleLetterHover(i, true)}
                  onMouseLeave={() => handleLetterHover(i, false)}
                  onClick={() => handleLetterTap(i)}
                  className="gheli-letter-btn"
                >
                  <span
                    ref={(el) => {
                      rippleRefs.current[i] = el;
                    }}
                    className="gheli-letter-ripple"
                    aria-hidden="true"
                  />
                  <span
                    ref={(el) => {
                      letterBodyRefs.current[i] = el;
                    }}
                    className="gheli-letter-body"
                  >
                    <span className="gheli-letter-face">{ch}</span>
                    <span className="gheli-letter-sheen" aria-hidden="true">
                      {ch}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {/* Clean Editorial SHRUTI Wordmark (hidden in exact layout until Phase C) */}
            <div
              ref={shrutiRowRef}
              className={`shruti-sculpture-row ${ambientLive ? "shruti-ambient-live" : ""}`}
              aria-label="SHRUTI"
            >
              {TARGET_LETTERS.map((ch, i) => (
                <span
                  key={`shruti-${ch}-${i}`}
                  ref={(el) => {
                    shrutiLetterRefs.current[i] = el;
                  }}
                  className="shruti-letter-body"
                >
                  <span className="gheli-letter-face">{ch}</span>
                  <span
                    className={`gheli-letter-sheen ${sweepActive ? "shruti-light-sweep" : ""}`}
                    style={{ animationDelay: `${i * 95}ms` }}
                    aria-hidden="true"
                  >
                    {ch}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <span
            ref={hintRef}
            style={{
              fontSize: "0.66rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(233, 199, 125, 0.68)",
              opacity: 0,
            }}
          >
            Touch any letter
          </span>
        </div>

        {/* ACT III — Calm Personality Beats */}
        <p className="gheli-calm-traits">
          {TRAIT_BEATS.map((beat, idx) => (
            <React.Fragment key={beat}>
              <span
                ref={(el) => {
                  traitBeatRefs.current[idx] = el;
                }}
                style={{ display: "inline-block", opacity: 0 }}
              >
                {beat}
              </span>
              {idx < TRAIT_BEATS.length - 1 ? " " : null}
            </React.Fragment>
          ))}
        </p>

        {/* ACT VI — Quiet Finish */}
        <p ref={closingRef} className="gheli-calm-closing" style={{ opacity: 0 }}>
          {GIRL_BEHIND_NAME_CONTENT.closingLine}
        </p>

        <button
          ref={nextRef}
          type="button"
          onClick={handleContinue}
          disabled={exiting}
          className="scene-continue-btn"
          style={{ marginTop: "0.25rem", opacity: 0 }}
        >
          <span>Continue</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}
