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
  srcOrder: number;
  dstOrder: number;
  size: number;
  depth: number;
  phaseOffset: number;
  isGold: boolean;
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
  viewportH: number
): MorphParticle[] {
  if (srcPts.length === 0 || dstPts.length === 0) return [];

  const maxCount = viewportW < 520 ? 320 : 520;
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

  const stageCx = viewportW / 2;
  const stageCy = (srcPts[0].y + dList[0].y) * 0.5 || viewportH * 0.45;
  const particles: MorphParticle[] = [];

  for (let i = 0; i < targetCount; i++) {
    const s = sList[i];
    const d = dList[i];
    const norm = i / Math.max(1, targetCount - 1);

    // Coherent upward-and-inward orbital arc across composition
    const arcLift = -Math.min(72, viewportH * 0.085) * (0.45 + 0.55 * Math.sin(norm * Math.PI));
    const orbitSide = (s.x - stageCx) * 0.14;
    const cx = (s.x + d.x) * 0.5 + orbitSide;
    const cy = Math.min(s.y, d.y, stageCy) + arcLift + (d.letterIdx % 2 === 0 ? -10 : 12);

    particles.push({
      sx: s.x,
      sy: s.y,
      tx: d.x,
      ty: d.y,
      cx,
      cy,
      srcOrder: s.letterIdx / Math.max(1, WORD_LETTERS.length - 1),
      dstOrder: d.letterIdx / Math.max(1, TARGET_LETTERS.length - 1),
      size: 1.05 + ((i * 17) % 10) * 0.11,
      depth: 0.78 + ((i * 23) % 10) * 0.055,
      phaseOffset: ((i * 13) % 20) / 20,
      isGold: i % 4 === 0,
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

    const evalCurve = (p: MorphParticle, u: number) => {
      const inv = 1 - u;
      return {
        x: inv * inv * p.sx + 2 * inv * u * p.cx + u * u * p.tx,
        y: inv * inv * p.sy + 2 * inv * u * p.cy + u * u * p.ty,
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

      // Deterministic GHELI -> SHRUTI Typographic Particle Transformation
      const morph = morphDriverRef.current;
      const particles = morphParticlesRef.current;
      if (morph.active && particles.length > 0) {
        const p = morph.progress;

        for (let i = 0; i < particles.length; i++) {
          const pt = particles[i];

          // Staggered spatial timing so dissolution & assembly sweep gracefully left-to-right
          const startShift = pt.srcOrder * 0.14;
          const endShift = (1 - pt.dstOrder) * 0.12;
          const u = smoothstep(startShift, 1 - endShift, p);

          const fadeIn = smoothstep(0.0, 0.1, p);
          const fadeOut = 1 - smoothstep(0.84, 0.99, p);
          const alpha = fadeIn * fadeOut;
          if (alpha <= 0.005) continue;

          const pos = evalCurve(pt, u);
          const prevPos = evalCurve(pt, Math.max(0, u - 0.045));
          const midArcScale = 1 + 0.35 * Math.sin(u * Math.PI) * (pt.depth - 0.65);

          // Fine directional luminous trail during active orbital sweep
          if (u > 0.03 && u < 0.96) {
            ctx.globalAlpha = alpha * 0.36;
            ctx.strokeStyle = pt.isGold ? "#E9C77D" : "#F5ECE0";
            ctx.lineWidth = Math.max(0.65, pt.size * 0.55);
            ctx.beginPath();
            ctx.moveTo(prevPos.x, prevPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
          }

          ctx.globalAlpha = alpha * 0.92;
          ctx.fillStyle = pt.isGold ? "#E9C77D" : "#FBF5EC";
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pt.size * midArcScale, 0, Math.PI * 2);
          ctx.fill();
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

    // ─── ACT IV — DETERMINISTIC TYPOGRAPHIC PARTICLE TRANSFORMATION (GHELI -> SHRUTI) ───
    tl.call(() => {
      transformLockedRef.current = true;
      setIsTransforming(true);
      setActiveIdx(null);

      // Kill all active float/hover tweens and snap GHELI to aligned baseline before sampling
      letterBodyRefs.current.forEach((b) => {
        if (b) {
          gsap.killTweensOf(b);
          gsap.set(b, { y: 0, x: 0, scale: 1, clearProps: "transform" });
        }
      });

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const srcPts = sampleGlyphPixels(WORD_LETTERS, letterBodyRefs.current, vw, vh);
      const dstPts = sampleGlyphPixels(TARGET_LETTERS, shrutiLetterRefs.current, vw, vh);
      morphParticlesRef.current = buildParticleSet(srcPts, dstPts, vw, vh);
      morphDriverRef.current.progress = 0;
      morphDriverRef.current.active = morphParticlesRef.current.length > 0;
    });

    if (hintRef.current) {
      tl.to(hintRef.current, { opacity: 0, duration: 0.35, ease: "power1.out" }, "<");
    }

    // Phase A -> B -> C driven deterministically from named timeline label
    tl.addLabel("morphStart");

    tl.to(
      morphDriverRef.current,
      {
        progress: 1,
        duration: 3.4,
        ease: "power2.inOut",
      },
      "morphStart"
    );

    // Hide GHELI DOM row completely as Phase A dissolves (guaranteeing zero leftover glyphs)
    if (gheliRowRef.current) {
      tl.to(
        gheliRowRef.current,
        {
          opacity: 0,
          duration: 0.42,
          ease: "power1.in",
          onComplete: () => {
            if (gheliRowRef.current) {
              gheliRowRef.current.style.visibility = "hidden";
            }
          },
        },
        "morphStart+=0.06"
      );
    }

    // Prepare SHRUTI DOM container cleanly as Phase C particles converge onto target letters
    if (shrutiRowRef.current) {
      tl.set(shrutiRowRef.current, { opacity: 1, visibility: "visible" }, "morphStart+=2.55");
    }

    // Staggered editorial materialization of SHRUTI letters inside target slots
    tl.fromTo(
      shrutiLetterRefs.current.filter(Boolean),
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.72,
        stagger: 0.075,
        ease: "power2.out",
      },
      "morphStart+=2.58"
    );

    // Deterministic cleanup of all morph particles immediately once SHRUTI finishes assembling
    tl.call(
      () => {
        morphDriverRef.current.progress = 1;
        morphDriverRef.current.active = false;
        morphParticlesRef.current = [];
        setSweepActive(true);
        if (soundEnabled) {
          audioSynth.playGentleChime(659.25);
        }
      },
      [],
      "morphStart+=3.7"
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
