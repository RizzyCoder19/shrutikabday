"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import {
  CRIMSON_PALETTES,
  drawArticulatedCrimsonFlower,
  drawRealisticButterfly,
  easeOutCubic,
} from "@/lib/botanical/crimson-blossom";
import { drawOriginalAnimatedFlowerBouquet } from "@/lib/botanical/animated-flower";
import { ArrowRight } from "lucide-react";
import "./flower-garden.css";

const INTERSTITIAL_LINES = [
  { text: "There's something I wish I could've done today.", tone: "normal" as const },
  { text: "Been there, with flowers in my hands.", tone: "normal" as const },
  { text: "But I couldn't.", tone: "normal" as const },
  { text: "So I made you something else...", tone: "accent" as const },
  { text: "A little universe of flowers.", tone: "accent" as const },
  { text: "One that never has to fade.", tone: "final" as const },
];

type CrimsonVariant = keyof typeof CRIMSON_PALETTES;

interface GardenFlowerSpec {
  xRatio: number;
  baseYRatio: number;
  headYRatio: number;
  curvePx: number;
  petalRadius: number;
  depth: number; // 0 (distant horizon) .. 1 (foreground)
  delaySec: number;
  stemDurationSec: number;
  bloomDurationSec: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmp: number;
  variant: CrimsonVariant;
  headTilt: number;
  perspectiveY: number;
  scaleFactor: number;
  petalPhaseShift: number;
  touchBoost: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  decay: number;
  color: string;
}

interface GardenButterfly {
  enterSec: number;
  depthLayer: "near" | "mid" | "far";
  baseXRatio: number;
  baseYRatio: number;
  ampX: number;
  ampY: number;
  freqX: number;
  freqY: number;
  phase: number;
  hoverPeriod: number;
  flapSpeed: number;
  scale: number;
  alpha: number;
  wingLight: string;
  wingMid: string;
  wingDeep: string;
  wingEdge: string;
  wingDot: string;
}

export function GardenScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const rootRef = useRef<HTMLDivElement>(null);
  const emberCanvasRef = useRef<HTMLCanvasElement>(null);
  const gardenCanvasRef = useRef<HTMLCanvasElement>(null);
  const exitVeilRef = useRef<HTMLDivElement>(null);

  // Interstitial refs
  const interstitialRef = useRef<HTMLDivElement>(null);
  const dawnRef = useRef<HTMLDivElement>(null);
  const botanicalRef = useRef<SVGSVGElement>(null);
  const stemOutlineRef = useRef<SVGPathElement>(null);
  const petalOutlineRefs = useRef<(SVGPathElement | null)[]>([]);
  const interstitialLineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  // Garden overlay text & CTA refs
  const line1Ref = useRef<HTMLParagraphElement>(null);
  const line2Ref = useRef<HTMLParagraphElement>(null);
  const whisperRef = useRef<HTMLParagraphElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const [gardenPhase, setGardenPhase] = useState<"interstitial" | "blooming">("interstitial");
  const exitingRef = useRef(false);
  const interactiveFlowersRef = useRef<GardenFlowerSpec[]>([]);
  const burstSparksRef = useRef<Spark[]>([]);

  // Sequence 1 — Emotional Interstitial (Near-total darkness -> embers -> crimson bud silhouette -> dawn)
  useEffect(() => {
    if (gardenPhase !== "interstitial") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      interstitialLineRefs.current.forEach((el) => el && gsap.set(el, { opacity: 1 }));
      const quickTimer = setTimeout(() => setGardenPhase("blooming"), 950);
      return () => clearTimeout(quickTimer);
    }

    const lineEls = interstitialLineRefs.current.filter(Boolean) as HTMLParagraphElement[];
    const stemPath = stemOutlineRef.current;
    const petalPaths = petalOutlineRefs.current.filter(Boolean) as SVGPathElement[];

    if (stemPath) {
      const len = stemPath.getTotalLength();
      gsap.set(stemPath, { strokeDasharray: len, strokeDashoffset: len });
    }
    petalPaths.forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, fillOpacity: 0 });
    });

    const tl = gsap.timeline({
      onComplete: () => setGardenPhase("blooming"),
    });

    tl.to({}, { duration: 0.7 });

    if (lineEls[0]) {
      tl.fromTo(lineEls[0], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" });
    }
    tl.to({}, { duration: 0.95 });

    if (lineEls[1]) {
      tl.fromTo(lineEls[1], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" });
    }
    tl.to({}, { duration: 0.85 });

    if (lineEls[2]) {
      tl.fromTo(lineEls[2], { opacity: 0, y: 10 }, { opacity: 0.85, y: 0, duration: 0.75, ease: "power2.out" });
    }
    if (botanicalRef.current) {
      tl.to(botanicalRef.current, { opacity: 1, duration: 0.8 }, "-=0.2");
    }
    if (stemPath) {
      tl.to(stemPath, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" }, "-=0.6");
    }

    if (lineEls[3]) {
      tl.fromTo(
        lineEls[3],
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.85, ease: "power2.out" },
        "-=0.45"
      );
    }
    if (petalPaths.length > 0) {
      tl.to(
        petalPaths,
        {
          strokeDashoffset: 0,
          fillOpacity: 0.25,
          duration: 1.1,
          stagger: 0.1,
          ease: "power2.out",
        },
        "-=0.35"
      );
    }
    if (lineEls[4]) {
      tl.fromTo(
        lineEls[4],
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" },
        "-=0.5"
      );
    }

    tl.to({}, { duration: 0.65 });
    if (lineEls[5]) {
      tl.fromTo(lineEls[5], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.95, ease: "power2.out" });
    }
    if (dawnRef.current) {
      tl.to(dawnRef.current, { opacity: 1, duration: 1.3, ease: "power1.inOut" }, "-=0.6");
    }

    tl.to({}, { duration: 1.4 });
    if (interstitialRef.current) {
      tl.to(interstitialRef.current, { opacity: 0, duration: 0.9, ease: "power2.inOut" });
    }

    return () => {
      tl.kill();
    };
  }, [gardenPhase]);

  // Interstitial ambient gathering ember canvas (runs only during interstitial)
  useEffect(() => {
    if (gardenPhase !== "interstitial") return;
    const canvas = emberCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener("resize", resize);
    resize();

    const seeds = Array.from({ length: 34 }, () => ({
      x: Math.random() * W,
      y: H * 0.2 + Math.random() * H * 0.78,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -(0.18 + Math.random() * 0.34),
      r: 1.0 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.45 ? "#ff4d6d" : "#E9C77D",
    }));

    let rafId = 0;
    let tick = 0;
    const render = () => {
      if (document.hidden) {
        rafId = requestAnimationFrame(render);
        return;
      }
      tick++;
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.5;
      const cy = H * 0.48;
      for (const s of seeds) {
        s.x += s.vx + (cx - s.x) * 0.0012;
        s.y += s.vy + (cy - s.y) * 0.0005;
        if (s.y < -15) {
          s.y = H + 12;
          s.x = W * 0.12 + Math.random() * W * 0.76;
        }
        ctx.globalAlpha = 0.22 + 0.36 * (0.5 + 0.5 * Math.sin(tick * 0.03 + s.phase));
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, [gardenPhase]);

  // Sequence 2 — Choreographed Living Crimson Garden (Stages 1 -> 4, Aurora Borealis, Realistic Butterflies)
  useEffect(() => {
    if (gardenPhase !== "blooming") return;

    const canvas = gardenCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let skyBackdropCanvas: HTMLCanvasElement | null = null;
    let horizonMistOverlayCanvas: HTMLCanvasElement | null = null;
    let farMeadowSheet: HTMLCanvasElement | null = null;
    let midMeadowSheet: HTMLCanvasElement | null = null;
    interface BakedCrimsonFlower {
      canvas: HTMLCanvasElement;
      anchorX: number;
      anchorY: number;
      w: number;
      h: number;
    }
    const bakedCrimsonMap = new Map<GardenFlowerSpec, BakedCrimsonFlower>();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.15);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bakedCrimsonMap.clear();
      farMeadowSheet = null;
      midMeadowSheet = null;

      // Bake static twilight sky gradient once per resize
      skyBackdropCanvas = document.createElement("canvas");
      skyBackdropCanvas.width = Math.max(1, W);
      skyBackdropCanvas.height = Math.max(1, H);
      const sctx = skyBackdropCanvas.getContext("2d")!;
      const sg = sctx.createLinearGradient(0, 0, 0, H);
      sg.addColorStop(0, "#02050a");
      sg.addColorStop(0.26, "#060c18");
      sg.addColorStop(0.52, "#0d1323");
      sg.addColorStop(0.68, "#160d1c");
      sg.addColorStop(1, "#050207");
      sctx.fillStyle = sg;
      sctx.fillRect(0, 0, W, H);

      // Bake static horizon mist + distant mountain ridge + meadow hill + rim glow once per resize
      const hY = H * (isMobile ? 0.55 : 0.57);
      horizonMistOverlayCanvas = document.createElement("canvas");
      horizonMistOverlayCanvas.width = Math.max(1, W);
      horizonMistOverlayCanvas.height = Math.max(1, H);
      const mctx = horizonMistOverlayCanvas.getContext("2d")!;

      const hm = mctx.createRadialGradient(W * 0.5, hY, 16, W * 0.5, hY, Math.max(W, H) * 0.65);
      hm.addColorStop(0, "rgba(76, 186, 178, 0.14)");
      hm.addColorStop(0.35, "rgba(186, 36, 78, 0.12)");
      hm.addColorStop(0.7, "rgba(62, 28, 68, 0.08)");
      hm.addColorStop(1, "rgba(0, 0, 0, 0)");
      mctx.fillStyle = hm;
      mctx.fillRect(0, 0, W, H);

      mctx.fillStyle = "rgba(16, 18, 30, 0.72)";
      mctx.beginPath();
      mctx.moveTo(0, hY - 4);
      mctx.bezierCurveTo(W * 0.2, hY - 34, W * 0.42, hY + 4, W * 0.62, hY - 24);
      mctx.bezierCurveTo(W * 0.78, hY - 42, W * 0.9, hY - 10, W, hY - 18);
      mctx.lineTo(W, H);
      mctx.lineTo(0, H);
      mctx.closePath();
      mctx.fill();

      const hg = mctx.createLinearGradient(0, hY - 12, 0, H);
      hg.addColorStop(0, "#141020");
      hg.addColorStop(0.22, "#120916");
      hg.addColorStop(1, "#050207");
      mctx.fillStyle = hg;
      mctx.beginPath();
      mctx.moveTo(0, hY + 8);
      mctx.bezierCurveTo(W * 0.24, hY - 14, W * 0.46, hY + 12, W * 0.7, hY - 6);
      mctx.bezierCurveTo(W * 0.85, hY - 16, W * 0.94, hY + 4, W, hY);
      mctx.lineTo(W, H);
      mctx.lineTo(0, H);
      mctx.closePath();
      mctx.fill();

      const rg = mctx.createLinearGradient(0, hY - 28, 0, hY + 34);
      rg.addColorStop(0, "rgba(0, 0, 0, 0)");
      rg.addColorStop(0.45, "rgba(62, 206, 174, 0.13)");
      rg.addColorStop(0.65, "rgba(176, 36, 78, 0.11)");
      rg.addColorStop(1, "rgba(0, 0, 0, 0)");
      mctx.fillStyle = rg;
      mctx.fillRect(0, hY - 28, W, 62);
    };
    window.addEventListener("resize", resize);
    resize();

    // Subtle crimson ambiance sprite used only lightly when awakened by user tap
    const tapHaloSprite = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const gctx = c.getContext("2d")!;
      const g = gctx.createRadialGradient(64, 64, 2, 64, 64, 64);
      g.addColorStop(0, "rgba(255, 86, 122, 0.45)");
      g.addColorStop(0.45, "rgba(214, 24, 68, 0.14)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      gctx.fillStyle = g;
      gctx.fillRect(0, 0, 128, 128);
      return c;
    })();

    // Seeded deterministic PRNG for organic meadow layout
    let seed = 42197;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const flowers: GardenFlowerSpec[] = [];

    // STAGE 1 (t = 0.9s .. 4.6s): Single prominent Hero crimson flower (blooms completely BEFORE #2 starts)
    flowers.push({
      xRatio: isMobile ? 0.4 : 0.425,
      baseYRatio: 1.04,
      headYRatio: isMobile ? 0.67 : 0.65,
      curvePx: isMobile ? 16 : 26,
      petalRadius: isMobile ? 35 : 46,
      depth: 0.96,
      delaySec: 0.9,
      stemDurationSec: 1.45,
      bloomDurationSec: 2.25, // completes around 4.6s
      swayPhase: 0.4,
      swaySpeed: 0.72,
      swayAmp: isMobile ? 4.5 : 6.5,
      variant: "crimson",
      headTilt: -0.14,
      perspectiveY: 0.84,
      scaleFactor: isMobile ? 0.95 : 1.15,
      petalPhaseShift: 0,
      touchBoost: 0,
    });

    // STAGE 2 (t = 4.7s .. 8.3s): Second distinct Hero crimson flower (varied lean, orientation & petal cadence)
    flowers.push({
      xRatio: isMobile ? 0.62 : 0.59,
      baseYRatio: 1.05,
      headYRatio: isMobile ? 0.72 : 0.7,
      curvePx: isMobile ? -18 : -28,
      petalRadius: isMobile ? 31 : 41,
      depth: 0.9,
      delaySec: 4.7,
      stemDurationSec: 1.35,
      bloomDurationSec: 2.2, // completes around 8.25s
      swayPhase: 2.1,
      swaySpeed: 0.85,
      swayAmp: isMobile ? 4 : 5.8,
      variant: "velvetRose",
      headTilt: 0.22,
      perspectiveY: 0.79,
      scaleFactor: isMobile ? 0.86 : 1.04,
      petalPhaseShift: 0.45,
      touchBoost: 0,
    });

    // STAGE 3 & 4 (t >= 8.4s): Organic outward clusters framing the left/right & lower foreground
    // while explicitly keeping the central horizon corridor open (`0.36..0.64 W` above `0.73 H`)
    const flankSpecs: Array<{
      xRatio: number;
      baseYRatio: number;
      headYRatio: number;
      depth: number;
      delay: number;
      variant: CrimsonVariant;
    }> = [
        // Near-flanking companions (8.4s .. 10.4s)
        { xRatio: 0.28, baseYRatio: 1.05, headYRatio: 0.72, depth: 0.84, delay: 8.45, variant: "deepCrimson" },
        { xRatio: 0.73, baseYRatio: 1.04, headYRatio: 0.69, depth: 0.86, delay: 8.85, variant: "crimson" },
        { xRatio: 0.19, baseYRatio: 1.06, headYRatio: 0.66, depth: 0.82, delay: 9.25, variant: "crimson" },
        { xRatio: 0.83, baseYRatio: 1.06, headYRatio: 0.68, depth: 0.8, delay: 9.65, variant: "velvetRose" },
        { xRatio: 0.5, baseYRatio: 1.08, headYRatio: 0.82, depth: 0.98, delay: 10.0, variant: "deepCrimson" },

        // Expanding foreground & lower apron (10.3s .. 12.2s)
        { xRatio: 0.1, baseYRatio: 1.08, headYRatio: 0.75, depth: 0.92, delay: 10.35, variant: "crimson" },
        { xRatio: 0.91, baseYRatio: 1.07, headYRatio: 0.74, depth: 0.9, delay: 10.65, variant: "crimson" },
        { xRatio: 0.35, baseYRatio: 1.07, headYRatio: 0.81, depth: 0.94, delay: 10.95, variant: "velvetRose" },
        { xRatio: 0.67, baseYRatio: 1.08, headYRatio: 0.81, depth: 0.92, delay: 11.2, variant: "deepCrimson" },
        { xRatio: 0.23, baseYRatio: 1.08, headYRatio: 0.84, depth: 0.96, delay: 11.5, variant: "crimson" },
        { xRatio: 0.79, baseYRatio: 1.08, headYRatio: 0.84, depth: 0.95, delay: 11.75, variant: "crimson" },

        // Midground flanking meadow pockets (10.8s .. 12.9s) - outside central horizon window
        { xRatio: 0.14, baseYRatio: 0.92, headYRatio: 0.61, depth: 0.55, delay: 10.85, variant: "deepCrimson" },
        { xRatio: 0.86, baseYRatio: 0.93, headYRatio: 0.62, depth: 0.54, delay: 11.15, variant: "crimson" },
        { xRatio: 0.26, baseYRatio: 0.9, headYRatio: 0.63, depth: 0.5, delay: 11.45, variant: "crimson" },
        { xRatio: 0.74, baseYRatio: 0.91, headYRatio: 0.63, depth: 0.52, delay: 11.7, variant: "velvetRose" },
        { xRatio: 0.06, baseYRatio: 0.96, headYRatio: 0.66, depth: 0.64, delay: 12.0, variant: "deepCrimson" },
        { xRatio: 0.94, baseYRatio: 0.95, headYRatio: 0.65, depth: 0.62, delay: 12.25, variant: "crimson" },
        { xRatio: 0.32, baseYRatio: 0.88, headYRatio: 0.68, depth: 0.46, delay: 12.5, variant: "crimson" },
        { xRatio: 0.68, baseYRatio: 0.88, headYRatio: 0.67, depth: 0.48, delay: 12.75, variant: "velvetRose" },

        // Distant meadow horizon fringe nestled along the ridge base (11.9s .. 13.8s)
        { xRatio: 0.09, baseYRatio: 0.78, headYRatio: 0.59, depth: 0.24, delay: 11.95, variant: "deepCrimson" },
        { xRatio: 0.18, baseYRatio: 0.76, headYRatio: 0.58, depth: 0.2, delay: 12.2, variant: "crimson" },
        { xRatio: 0.29, baseYRatio: 0.79, headYRatio: 0.61, depth: 0.26, delay: 12.55, variant: "deepCrimson" },
        { xRatio: 0.71, baseYRatio: 0.79, headYRatio: 0.6, depth: 0.25, delay: 12.7, variant: "crimson" },
        { xRatio: 0.81, baseYRatio: 0.77, headYRatio: 0.58, depth: 0.22, delay: 13.0, variant: "deepCrimson" },
        { xRatio: 0.9, baseYRatio: 0.78, headYRatio: 0.59, depth: 0.24, delay: 13.25, variant: "velvetRose" },
      ];

    // Add lush desktop extra foreground/midground depth (completes by ~14.4s before Stage 5 animated-flower starts)
    const desktopExtra: typeof flankSpecs = isMobile
      ? []
      : [
        { xRatio: 0.04, baseYRatio: 1.07, headYRatio: 0.71, depth: 0.88, delay: 10.75, variant: "velvetRose" },
        { xRatio: 0.96, baseYRatio: 1.07, headYRatio: 0.72, depth: 0.87, delay: 10.95, variant: "deepCrimson" },
        { xRatio: 0.45, baseYRatio: 1.08, headYRatio: 0.87, depth: 0.95, delay: 11.15, variant: "crimson" },
        { xRatio: 0.56, baseYRatio: 1.08, headYRatio: 0.86, depth: 0.93, delay: 11.3, variant: "velvetRose" },
        { xRatio: 0.14, baseYRatio: 1.08, headYRatio: 0.85, depth: 0.96, delay: 11.45, variant: "deepCrimson" },
        { xRatio: 0.86, baseYRatio: 1.08, headYRatio: 0.85, depth: 0.94, delay: 11.6, variant: "crimson" },
        { xRatio: 0.22, baseYRatio: 0.82, headYRatio: 0.64, depth: 0.34, delay: 11.75, variant: "deepCrimson" },
        { xRatio: 0.77, baseYRatio: 0.83, headYRatio: 0.64, depth: 0.36, delay: 11.88, variant: "crimson" },
        { xRatio: 0.36, baseYRatio: 0.84, headYRatio: 0.71, depth: 0.42, delay: 11.98, variant: "velvetRose" },
        { xRatio: 0.64, baseYRatio: 0.84, headYRatio: 0.71, depth: 0.42, delay: 12.1, variant: "deepCrimson" },
      ];

    for (const sp of [...flankSpecs, ...desktopExtra]) {
      const jitterX = (rand() - 0.5) * 0.032;
      const jitterY = (rand() - 0.5) * 0.028;
      const sz = (isMobile ? 0.42 : 0.48) + sp.depth * (isMobile ? 0.54 : 0.68);

      flowers.push({
        xRatio: Math.max(0.03, Math.min(0.97, sp.xRatio + jitterX)),
        baseYRatio: sp.baseYRatio,
        headYRatio: sp.headYRatio + jitterY,
        curvePx: (rand() - 0.5) * (isMobile ? 28 : 48),
        petalRadius: (17 + sp.depth * 17 + rand() * 5) * (isMobile ? 0.84 : 1.0),
        depth: sp.depth,
        delaySec: Math.min(sp.delay, 12.15),
        stemDurationSec: 1.05 + rand() * 0.35,
        bloomDurationSec: 1.45 + rand() * 0.5,
        swayPhase: rand() * Math.PI * 2,
        swaySpeed: 0.68 + rand() * 0.52,
        swayAmp: (2.4 + rand() * 4.2) * (0.45 + sp.depth * 0.55),
        variant: sp.variant,
        headTilt: (rand() - 0.5) * 0.42,
        perspectiveY: 0.72 + rand() * 0.2,
        scaleFactor: sz,
        petalPhaseShift: (rand() - 0.5) * 0.9,
        touchBoost: 0,
      });
    }

    // Sort back-to-front by depth so Hero #1 & #2 and foreground flankers overlap naturally
    flowers.sort((a, b) => a.depth - b.depth);
    interactiveFlowersRef.current = flowers;

    // Exact completion time of the final crimson flower -> original animated-flower MUST start strictly after this
    const crimsonCompleteSec = flowers.reduce(
      (maxT, f) => Math.max(maxT, f.delaySec + f.stemDurationSec * 0.72 + f.bloomDurationSec),
      0
    );
    const originalFlowerStartSec = crimsonCompleteSec + 0.35;

    // Ground grass tufts concentrated in meadow foreground & flanking ridges (leaving distant ridge crisp)
    const grassBlades = Array.from({ length: isMobile ? 38 : 64 }, (_, idx) => {
      const frac = (idx + 0.25 + rand() * 0.5) / (isMobile ? 38 : 64);
      const isCenterHorizon = frac > 0.38 && frac < 0.62;
      return {
        xRatio: frac,
        rootYRatio: isCenterHorizon ? 0.82 + rand() * 0.24 : 0.64 + rand() * 0.42,
        heightRatio: isCenterHorizon ? 0.05 + rand() * 0.08 : 0.08 + rand() * 0.14,
        curvePx: (rand() - 0.5) * 32,
        phase: rand() * Math.PI * 2,
        crimsonTint: rand() > 0.48,
      };
    });

    const stars = Array.from({ length: isMobile ? 58 : 96 }, () => ({
      xFrac: rand(),
      yFrac: rand() * 0.54,
      r: 0.65 + rand() * 1.25,
      phase: rand() * Math.PI * 2,
      speed: 0.9 + rand() * 1.6,
    }));

    const ambientDrifters = Array.from({ length: isMobile ? 20 : 34 }, () => ({
      x: rand() * W,
      y: H * (0.4 + rand() * 0.6),
      vx: (rand() - 0.5) * 0.28,
      vy: -(0.16 + rand() * 0.34),
      r: 1.0 + rand() * 1.6,
      phase: rand() * Math.PI * 2,
      color: rand() > 0.4 ? "#ff688b" : "#E9C77D",
    }));

    // Multi-depth realistic butterflies appearing naturally AFTER Hero #1 begins blooming
    const butterflies: GardenButterfly[] = [
      {
        enterSec: 2.8, // Appears after Hero #1 starts unfolding
        depthLayer: "near",
        baseXRatio: 0.38,
        baseYRatio: 0.61,
        ampX: isMobile ? 0.2 : 0.24,
        ampY: 0.11,
        freqX: 0.34,
        freqY: 0.49,
        phase: 0.5,
        hoverPeriod: 7.4,
        flapSpeed: 8.6,
        scale: isMobile ? 0.86 : 1.04,
        alpha: 0.94,
        wingLight: "#ffe6a8",
        wingMid: "#f59d34",
        wingDeep: "#a83820",
        wingEdge: "#1d0f0b",
        wingDot: "#fff9dc",
      },
      {
        enterSec: 5.9, // Appears around Hero #2 opening
        depthLayer: "mid",
        baseXRatio: 0.63,
        baseYRatio: 0.55,
        ampX: isMobile ? 0.22 : 0.26,
        ampY: 0.13,
        freqX: -0.29,
        freqY: 0.41,
        phase: 2.1,
        hoverPeriod: 8.8,
        flapSpeed: 9.2,
        scale: isMobile ? 0.72 : 0.86,
        alpha: 0.88,
        wingLight: "#ffd6e3",
        wingMid: "#ea4a78",
        wingDeep: "#7a0e32",
        wingEdge: "#1f0812",
        wingDot: "#fff2f6",
      },
      {
        enterSec: 9.4, // Distant aurora-sky horizon butterfly
        depthLayer: "far",
        baseXRatio: 0.5,
        baseYRatio: 0.45,
        ampX: isMobile ? 0.26 : 0.3,
        ampY: 0.08,
        freqX: 0.22,
        freqY: 0.31,
        phase: 4.3,
        hoverPeriod: 9.5,
        flapSpeed: 7.4,
        scale: isMobile ? 0.48 : 0.56,
        alpha: 0.62,
        wingLight: "#d8f8ee",
        wingMid: "#70d0c6",
        wingDeep: "#2f6b7a",
        wingEdge: "#0d1b22",
        wingDot: "#f4fffa",
      },
      ...(isMobile
        ? []
        : [
          {
            enterSec: 12.2,
            depthLayer: "near" as const,
            baseXRatio: 0.22,
            baseYRatio: 0.66,
            ampX: 0.18,
            ampY: 0.09,
            freqX: -0.37,
            freqY: 0.53,
            phase: 1.4,
            hoverPeriod: 6.7,
            flapSpeed: 8.9,
            scale: 0.94,
            alpha: 0.92,
            wingLight: "#fff3c4",
            wingMid: "#f0c25c",
            wingDeep: "#9b4056",
            wingEdge: "#211216",
            wingDot: "#fffdf0",
          },
        ]),
    ];

    const startWallMs = performance.now();
    let hiddenAtMs: number | null = document.hidden ? startWallMs : null;
    let hiddenTotalMs = 0;

    // Offscreen low-res buffer + pre-baked 1px vertical gradient strips for soft feathered Aurora Borealis
    const aurW = 240;
    const aurH = 110;
    const aurCanvas = document.createElement("canvas");
    aurCanvas.width = aurW;
    aurCanvas.height = aurH;
    const actx = aurCanvas.getContext("2d")!;

    const makeAurStrip = (cBot: string, cMid: string, cTop: string) => {
      const s = document.createElement("canvas");
      s.width = 1;
      s.height = aurH;
      const sc = s.getContext("2d")!;
      const g = sc.createLinearGradient(0, aurH, 0, 0);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.18, cBot);
      g.addColorStop(0.5, cMid);
      g.addColorStop(0.82, cTop);
      g.addColorStop(1, "rgba(0,0,0,0)");
      sc.fillStyle = g;
      sc.fillRect(0, 0, 1, aurH);
      return s;
    };

    const aurLayers = [
      {
        yBase: aurH * 0.88,
        height: aurH * 0.72,
        speed: 0.14,
        waveFreq: 3.1,
        maxAlpha: 0.42,
        strip: makeAurStrip("rgba(52, 232, 174, 0.9)", "rgba(64, 184, 218, 0.65)", "rgba(136, 108, 224, 0.28)"),
      },
      {
        yBase: aurH * 0.78,
        height: aurH * 0.64,
        speed: -0.1,
        waveFreq: 4.2,
        maxAlpha: 0.34,
        strip: makeAurStrip("rgba(74, 244, 194, 0.85)", "rgba(84, 206, 232, 0.6)", "rgba(152, 118, 232, 0.22)"),
      },
      {
        yBase: aurH * 0.68,
        height: aurH * 0.56,
        speed: 0.07,
        waveFreq: 2.3,
        maxAlpha: 0.25,
        strip: makeAurStrip("rgba(92, 192, 226, 0.8)", "rgba(148, 122, 228, 0.55)", "rgba(184, 110, 198, 0.18)"),
      },
    ];

    let lastAurUpdateNow = -100;
    let lastNow = performance.now();
    let rafId = 0;
    let isDisposed = false;

    // Silky seamless Aurora Borealis ribbons above horizon (zero per-frame gradients, ~24Hz smooth update)
    const drawAuroraCurtains = (elapsed: number, horizonY: number, now: number) => {
      if (now - lastAurUpdateNow >= 40 || lastAurUpdateNow < 0) {
        lastAurUpdateNow = now;
        actx.clearRect(0, 0, aurW, aurH);
        actx.globalCompositeOperation = "lighter";

        const xStep = 4;
        for (const layer of aurLayers) {
          for (let x = 0; x < aurW; x += xStep) {
            const nx = x / aurW;
            const wave1 = Math.sin(nx * Math.PI * layer.waveFreq + elapsed * layer.speed);
            const wave2 = Math.cos(nx * Math.PI * (layer.waveFreq * 1.7) - elapsed * layer.speed * 1.4);
            const curtainIntensity = Math.pow(Math.max(0, 0.52 + 0.48 * wave1), 1.35) * (0.65 + 0.35 * wave2);
            const edgeMask = Math.sin(Math.max(0, Math.min(1, nx)) * Math.PI);
            const alpha = layer.maxAlpha * curtainIntensity * (0.35 + 0.65 * edgeMask);
            if (alpha < 0.01) continue;

            const topY = layer.yBase - layer.height + wave2 * 6;
            const botY = layer.yBase + wave1 * 5;
            actx.globalAlpha = alpha;
            actx.drawImage(layer.strip, 0, 0, 1, aurH, x, topY, xStep, botY - topY);
          }
        }
        actx.globalAlpha = 1;
      }

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(aurCanvas, 0, 0, W, horizonY + 28);
      ctx.restore();
    };

    const drawButterflies = (elapsed: number) => {
      for (const b of butterflies) {
        if (elapsed < b.enterSec) continue;
        const life = elapsed - b.enterSec;
        const enterFade = easeOutCubic(life / 1.1);

        // Occasional natural nectar hover slowdown near blooms
        const hoverMod = Math.sin((life / b.hoverPeriod) * Math.PI * 2);
        const speedDamp = hoverMod > 0.65 ? 0.38 : 1;
        const t = life * (0.85 + 0.15 * speedDamp);

        // Multi-harmonic irregular curved trajectory across meadow & horizon
        const px =
          b.baseXRatio +
          Math.cos(t * b.freqX + b.phase) * b.ampX +
          Math.sin(t * b.freqX * 2.1 + b.phase * 0.7) * (b.ampX * 0.28);
        const py =
          b.baseYRatio +
          Math.sin(t * b.freqY + b.phase * 1.2) * b.ampY +
          Math.cos(t * b.freqY * 1.8 - b.phase) * (b.ampY * 0.25);

        const vx =
          -Math.sin(t * b.freqX + b.phase) * b.ampX * b.freqX +
          Math.cos(t * b.freqX * 2.1 + b.phase * 0.7) * (b.ampX * 0.28 * b.freqX * 2.1);
        const vy =
          Math.cos(t * b.freqY + b.phase * 1.2) * b.ampY * b.freqY -
          Math.sin(t * b.freqY * 1.8 - b.phase) * (b.ampY * 0.25 * b.freqY * 1.8);

        const bx = px * W;
        const by = py * H;
        const headingRad = Math.atan2(vy * H, vx * W) + Math.PI * 0.5;

        // Realistic asymmetrical wing beat (fast downstroke, brief upper glide pause)
        const beatRaw = Math.sin(elapsed * b.flapSpeed + b.phase);
        const flapOpen = beatRaw >= 0 ? Math.pow(beatRaw, 0.75) : 0.12 + 0.15 * (1 + beatRaw);

        drawRealisticButterfly(ctx, {
          x: bx,
          y: by,
          headingRad: Number.isFinite(headingRad) ? headingRad : 0,
          scale: b.scale,
          flapOpen,
          alpha: b.alpha * enterFade,
          wingLight: b.wingLight,
          wingMid: b.wingMid,
          wingDeep: b.wingDeep,
          wingEdge: b.wingEdge,
          wingDot: b.wingDot,
        });
      }
    };

    const bakeCompletedFlower = (f: GardenFlowerSpec): BakedCrimsonFlower => {
      const rootX = f.xRatio * W;
      const rootY = f.baseYRatio * H;
      const headX = rootX + f.curvePx * 0.45;
      const headY = f.headYRatio * H;
      const ctrlX = rootX + (headX - rootX) * 0.45 + f.curvePx;
      const ctrlY = (rootY + headY) * 0.5;
      const pad = Math.ceil(f.petalRadius * 2.3 + Math.abs(f.curvePx) + 32);
      const minX = Math.min(rootX, headX, ctrlX) - pad;
      const maxX = Math.max(rootX, headX, ctrlX) + pad;
      const minY = Math.min(rootY, headY, ctrlY) - pad;
      const maxY = Math.max(rootY, headY, ctrlY) + pad;
      const bw = Math.max(16, Math.ceil(maxX - minX));
      const bh = Math.max(16, Math.ceil(maxY - minY));
      const off = document.createElement("canvas");
      off.width = bw;
      off.height = bh;
      const octx = off.getContext("2d")!;
      const distanceAlpha = 0.62 + f.depth * 0.38;
      const auroraRim = 0.14 + f.depth * 0.22;
      drawArticulatedCrimsonFlower(octx, {
        rootX: rootX - minX,
        rootY: rootY - minY,
        headX: headX - minX,
        headY: headY - minY,
        ctrlX: ctrlX - minX,
        ctrlY: ctrlY - minY,
        stemProgress: 1,
        bloomProgress: 1,
        petalRadius: f.petalRadius,
        depth: f.depth,
        headTilt: f.headTilt,
        perspectiveY: f.perspectiveY,
        swayOffsetPx: 0,
        palette: CRIMSON_PALETTES[f.variant],
        petalPhaseShift: f.petalPhaseShift,
        rimLight: auroraRim,
        scaleFactor: f.scaleFactor,
        alpha: distanceAlpha,
      });
      const entry = { canvas: off, anchorX: rootX - minX, anchorY: rootY - minY, w: bw, h: bh };
      bakedCrimsonMap.set(f, entry);
      return entry;
    };

    const buildMeadowLayerSheet = (minDepth: number, maxDepth: number): HTMLCanvasElement => {
      const off = document.createElement("canvas");
      off.width = Math.max(1, W);
      off.height = Math.max(1, H);
      const octx = off.getContext("2d")!;
      for (const f of flowers) {
        if (f.depth < minDepth || f.depth >= maxDepth) continue;
        const rootX = f.xRatio * W;
        const rootY = f.baseYRatio * H;
        const headX = rootX + f.curvePx * 0.45;
        const headY = f.headYRatio * H;
        const ctrlX = rootX + (headX - rootX) * 0.45 + f.curvePx;
        const ctrlY = (rootY + headY) * 0.5;
        drawArticulatedCrimsonFlower(octx, {
          rootX,
          rootY,
          headX,
          headY,
          ctrlX,
          ctrlY,
          stemProgress: 1,
          bloomProgress: 1,
          petalRadius: f.petalRadius,
          depth: f.depth,
          headTilt: f.headTilt,
          perspectiveY: f.perspectiveY,
          swayOffsetPx: 0,
          palette: CRIMSON_PALETTES[f.variant],
          petalPhaseShift: f.petalPhaseShift,
          rimLight: 0.14 + f.depth * 0.22,
          scaleFactor: f.scaleFactor,
          alpha: 0.62 + f.depth * 0.38,
        });
      }
      return off;
    };

    const renderFrame = (now: number) => {
      if (isDisposed || document.hidden) return;
      const dt = Math.min((now - lastNow) / 1000, 0.25);
      lastNow = now;
      const elapsed = reduced
        ? originalFlowerStartSec + 4.5
        : Math.max(0, (now - startWallMs - hiddenTotalMs) / 1000);

      // 1. Cached Twilight Sky + Batched Stars + Aurora + Cached Horizon Landscape
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      if (skyBackdropCanvas) {
        ctx.drawImage(skyBackdropCanvas, 0, 0, W, H);
      }

      // 2. Batched Twinkling Starfield (3 bucketed fill paths instead of 96 draw calls)
      ctx.fillStyle = "#e8f7fa";
      const starBuckets: [number[], number[], number[]] = [[], [], []];
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const a = 0.22 + 0.58 * (0.5 + 0.5 * Math.sin(elapsed * s.speed + s.phase));
        const b = a < 0.42 ? 0 : a < 0.62 ? 1 : 2;
        starBuckets[b].push(i);
      }
      const bucketAlphas = [0.32, 0.52, 0.76];
      for (let b = 0; b < 3; b++) {
        const list = starBuckets[b];
        if (list.length === 0) continue;
        ctx.globalAlpha = bucketAlphas[b];
        ctx.beginPath();
        for (const i of list) {
          const s = stars[i];
          const sx = s.xFrac * W;
          const sy = s.yFrac * H;
          ctx.moveTo(sx + s.r, sy);
          ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const horizonY = H * (isMobile ? 0.55 : 0.57);

      // 3. Prominent Multi-Layered Flowing Aurora Borealis Curtains above Horizon
      drawAuroraCurtains(elapsed, horizonY, now);

      // 4. Cached Distant Ridge, Foreground Meadow & Rim Glow (single blit)
      if (horizonMistOverlayCanvas) {
        ctx.drawImage(horizonMistOverlayCanvas, 0, 0, W, H);
      }

      // Batched Background Meadow Grass Tufts (2 strokes total instead of 64)
      ctx.lineWidth = 1.45;
      for (const isCrimson of [false, true]) {
        ctx.strokeStyle = isCrimson ? "rgba(88, 14, 38, 0.56)" : "rgba(32, 68, 56, 0.54)";
        ctx.beginPath();
        for (const g of grassBlades) {
          if (g.crimsonTint !== isCrimson) continue;
          const gx = g.xRatio * W;
          const gy = g.rootYRatio * H;
          const gh = g.heightRatio * H;
          const gSway = reduced ? 0 : Math.sin(elapsed * 1.05 + g.phase) * 4.5;
          ctx.moveTo(gx, gy);
          ctx.quadraticCurveTo(gx + g.curvePx * 0.5, gy - gh * 0.55, gx + g.curvePx + gSway, gy - gh);
        }
        ctx.stroke();
      }

      // 5. Distant Butterflies glide behind closer blooms
      drawButterflies(elapsed);

      // 6. Choreographed Crimson-Blossom Meadow:
      // Once ALL crimson flowers settle, bake depth < 0.88 into 2 gentle-swaying composite meadow sheets
      // (eliminating ~28 redundant offscreen flower draws per frame while hero foreground flowers sway individually!)
      const allCrimsonSettled = elapsed >= crimsonCompleteSec + 0.05;
      if (allCrimsonSettled) {
        if (!farMeadowSheet) farMeadowSheet = buildMeadowLayerSheet(0, 0.58);
        if (!midMeadowSheet) midMeadowSheet = buildMeadowLayerSheet(0.58, 0.89);
        const farShift = reduced ? 0 : Math.sin(elapsed * 0.72) * 1.8;
        const midShift = reduced ? 0 : Math.sin(elapsed * 0.88 + 1.1) * 3.0;
        ctx.drawImage(farMeadowSheet, farShift, 0, W, H);
        ctx.drawImage(midMeadowSheet, midShift, 0, W, H);
      }

      for (const f of flowers) {
        if (allCrimsonSettled && f.depth < 0.89 && f.touchBoost <= 0.01) continue;
        const age = elapsed - f.delaySec;
        if (age <= 0) continue;

        const stemProgress = easeOutCubic(age / f.stemDurationSec);
        const bloomStart = f.stemDurationSec * 0.72;
        const bloomProgress =
          age > bloomStart ? Math.min(1, (age - bloomStart) / f.bloomDurationSec) : 0;

        if (f.touchBoost > 0) {
          f.touchBoost = Math.max(0, f.touchBoost - dt * 1.3);
        }

        const rootX = f.xRatio * W;
        const rootY = f.baseYRatio * H;
        const sway = reduced ? 0 : Math.sin(elapsed * f.swaySpeed + f.swayPhase) * f.swayAmp;

        if (stemProgress >= 0.999 && bloomProgress >= 0.999 && f.touchBoost <= 0.01) {
          const baked = bakedCrimsonMap.get(f) ?? bakeCompletedFlower(f);
          ctx.save();
          ctx.translate(rootX, rootY);
          ctx.rotate(sway * 0.0085);
          ctx.drawImage(baked.canvas, -baked.anchorX, -baked.anchorY, baked.w, baked.h);
          ctx.restore();
          continue;
        }

        const headX = rootX + f.curvePx * 0.45 + sway;
        const headY = f.headYRatio * H;
        const ctrlX = rootX + (headX - rootX) * 0.45 + f.curvePx;
        const ctrlY = (rootY + headY) * 0.5;

        // Soft local tap highlight halo only when directly awakened by pointer
        if (f.touchBoost > 0.02 && bloomProgress > 0.25) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = f.touchBoost * 0.55;
          const haloSz = f.petalRadius * 3.4 * (1 + f.touchBoost * 0.25);
          ctx.drawImage(tapHaloSprite, headX - haloSz * 0.5, headY - haloSz * 0.5, haloSz, haloSz);
          ctx.restore();
        }

        const distanceAlpha = 0.62 + f.depth * 0.38;
        const auroraRim = 0.14 + f.depth * 0.22 + f.touchBoost * 0.55;

        drawArticulatedCrimsonFlower(ctx, {
          rootX,
          rootY,
          headX,
          headY,
          ctrlX,
          ctrlY,
          stemProgress,
          bloomProgress,
          petalRadius: f.petalRadius * (1 + f.touchBoost * 0.12),
          depth: f.depth,
          headTilt: f.headTilt,
          perspectiveY: f.perspectiveY,
          swayOffsetPx: sway,
          palette: CRIMSON_PALETTES[f.variant],
          petalPhaseShift: f.petalPhaseShift,
          rimLight: auroraRim,
          scaleFactor: f.scaleFactor,
          alpha: distanceAlpha,
        });
      }

      // Stage 5 — Original `animated-flower` Experience (starts strictly AFTER final crimson flower finishes!)
      const originalStageElapsed = elapsed - originalFlowerStartSec;
      if (originalStageElapsed > 0) {
        drawOriginalAnimatedFlowerBouquet(ctx, {
          anchorX: W * 0.5,
          anchorY: H * 0.99,
          bouquetScalePx: isMobile ? H * 0.29 : H * 0.34,
          stageElapsedSec: originalStageElapsed,
          elapsedSec: elapsed,
          alpha: 0.96,
          reducedMotion: reduced,
        });
      }

      // 7. Gentle Twilight Pollen & Pointer Awakening Sparks
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of ambientDrifters) {
        p.x += p.vx + Math.sin(elapsed * 1.1 + p.phase) * 0.22;
        p.y += p.vy;
        if (p.y < -12) {
          p.y = H + 10;
          p.x = Math.random() * W;
        }
        ctx.globalAlpha = 0.22 + 0.34 * (0.5 + 0.5 * Math.sin(elapsed * 1.9 + p.phase));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const list = burstSparksRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const sp = list[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha -= sp.decay;
        if (sp.alpha <= 0) {
          list.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = sp.alpha;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (!reduced && !isDisposed && !document.hidden) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (hiddenAtMs === null) hiddenAtMs = performance.now();
        cancelAnimationFrame(rafId);
      } else {
        if (hiddenAtMs !== null) {
          hiddenTotalMs += performance.now() - hiddenAtMs;
          hiddenAtMs = null;
        }
        lastNow = performance.now();
        if (!reduced && !isDisposed) {
          rafId = requestAnimationFrame(renderFrame);
        } else if (reduced && !isDisposed) {
          renderFrame(performance.now());
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const handleResizeRedraw = () => {
      resize();
      if (reduced && !isDisposed) {
        renderFrame(performance.now());
      }
    };
    window.removeEventListener("resize", resize);
    window.addEventListener("resize", handleResizeRedraw);

    const handlePointerMove = (e: PointerEvent) => {
      if (Math.random() > 0.55 || burstSparksRef.current.length > 75) return;
      burstSparksRef.current.push({
        x: e.clientX,
        y: e.clientY,
        vx: (Math.random() - 0.5) * 0.85,
        vy: -(0.3 + Math.random() * 0.85),
        r: 1.3 + Math.random() * 2.0,
        alpha: 0.78,
        decay: 0.018,
        color: Math.random() > 0.45 ? "#E9C77D" : "#ff4d6d",
      });
    };

    const handleGardenTap = (e: PointerEvent) => {
      const tx = e.clientX;
      const ty = e.clientY;
      let hitFlower = false;
      for (const f of interactiveFlowersRef.current) {
        const fx = f.xRatio * W + f.curvePx * 0.45;
        const fy = f.headYRatio * H;
        if (Math.hypot(fx - tx, fy - ty) < 92) {
          f.touchBoost = 1;
          hitFlower = true;
        }
      }
      if (soundEnabledRef.current) {
        audioSynth.playGentleChime(hitFlower ? 880 : 783.99);
      }
      const colors = ["#ff0c46", "#ff4d6d", "#ffccd5", "#E9C77D"];
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
        const spd = 0.75 + Math.random() * 2.4;
        burstSparksRef.current.push({
          x: tx,
          y: ty,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 0.65,
          r: 1.6 + Math.random() * 2.4,
          alpha: 0.95,
          decay: 0.016,
          color: colors[i % colors.length],
        });
      }
    };

    canvas.addEventListener("pointerdown", handleGardenTap);
    window.addEventListener("pointermove", handlePointerMove);
    if (!document.hidden) {
      rafId = requestAnimationFrame(renderFrame);
    }

    return () => {
      isDisposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", handleResizeRedraw);
      window.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handleGardenTap);
      cancelAnimationFrame(rafId);
      bakedCrimsonMap.clear();
    };
  }, [gardenPhase]);

  // Garden sky typography reveal once flowers begin rising
  useEffect(() => {
    if (gardenPhase !== "blooming") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      [line1Ref.current, line2Ref.current, whisperRef.current, nextRef.current].forEach(
        (el) => el && gsap.set(el, { opacity: 1, y: 0 })
      );
      return;
    }

    const tl = gsap.timeline();
    tl.to({}, { duration: 1.0 })
      .fromTo(line1Ref.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.95, ease: "power2.out" })
      .to({}, { duration: 0.4 })
      .fromTo(line2Ref.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.95, ease: "power2.out" })
      .fromTo(whisperRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.2")
      .fromTo(nextRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.15");

    return () => {
      tl.kill();
    };
  }, [gardenPhase]);

  const handleContinue = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    if (soundEnabledRef.current) {
      audioSynth.playGentleChime(659.25);
    }

    const W = window.innerWidth;
    const H = window.innerHeight;
    for (let i = 0; i < 36; i++) {
      burstSparksRef.current.push({
        x: Math.random() * W,
        y: H * (0.35 + Math.random() * 0.6),
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(1.4 + Math.random() * 2.2),
        r: 1.6 + Math.random() * 2.2,
        alpha: 0.95,
        decay: 0.012,
        color: i % 2 === 0 ? "#E9C77D" : "#ff6b93",
      });
    }

    if (exitVeilRef.current) {
      gsap.to(exitVeilRef.current, {
        opacity: 1,
        duration: 0.85,
        ease: "power2.inOut",
        onComplete: () => transitionTo("MEMORY_CONSTELLATION"),
      });
    } else {
      transitionTo("MEMORY_CONSTELLATION");
    }
  };

  return (
    <section ref={rootRef} className="fg-root" aria-label="Chapter 6: The Flower Garden">
      {/* Dark-to-light Interstitial before flowers bloom */}
      {gardenPhase === "interstitial" && (
        <div
          ref={interstitialRef}
          className="fg-interstitial"
          aria-label="Universe of Undying Flowers introduction"
        >
          <div ref={dawnRef} className="fg-interstitial-dawn" aria-hidden="true" />
          <canvas
            ref={emberCanvasRef}
            style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2 }}
            aria-hidden="true"
          />

          <svg
            ref={botanicalRef}
            className="fg-interstitial-botanical"
            viewBox="0 0 180 210"
            fill="none"
            aria-hidden="true"
          >
            <path
              ref={stemOutlineRef}
              d="M90 198 C90 165, 86 135, 90 100 C92 84, 90 74, 90 64 M90 144 C72 136, 62 126, 58 118 M90 124 C108 116, 118 106, 122 98"
              stroke="rgba(164, 210, 186, 0.7)"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            {[
              "M90 64 C72 54, 62 34, 78 24 C86 30, 90 46, 90 64 Z",
              "M90 64 C108 54, 118 34, 102 24 C94 30, 90 46, 90 64 Z",
              "M90 64 C62 66, 48 48, 60 36 C72 40, 82 52, 90 64 Z",
              "M90 64 C118 66, 132 48, 120 36 C108 40, 98 52, 90 64 Z",
              "M90 64 C76 34, 90 16, 90 16 C90 16, 104 34, 90 64 Z",
            ].map((d, i) => (
              <path
                key={i}
                ref={(el) => {
                  petalOutlineRefs.current[i] = el;
                }}
                d={d}
                stroke="rgba(255, 110, 142, 0.85)"
                fill="rgba(255, 18, 72, 0.35)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          <div className="fg-interstitial-lines">
            {INTERSTITIAL_LINES.map((item, idx) => (
              <p
                key={item.text}
                ref={(el) => {
                  interstitialLineRefs.current[idx] = el;
                }}
                className={`fg-interstitial-line ${item.tone === "accent"
                  ? "fg-interstitial-line--accent"
                  : item.tone === "final"
                    ? "fg-interstitial-line--final"
                    : ""
                  }`}
              >
                {item.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Expansive Sequential Crimson Flower Meadow */}
      {gardenPhase === "blooming" && (
        <>
          <canvas
            ref={gardenCanvasRef}
            className="fg-garden-canvas"
            aria-label="Living crimson flower garden under aurora skies — tap any blossom to awaken light"
          />

          <div className="fg-sky-narrative">
            <p ref={line1Ref} className="fg-sky-line1">
              A little universe of undying flowers.
            </p>
            <p ref={line2Ref} className="fg-sky-line2">
              One that never has to fade.
            </p>
            <p ref={whisperRef} className="fg-sky-whisper">
              Tap anywhere across the meadow to awaken light.
            </p>
          </div>

          <button
            ref={nextRef}
            onClick={handleContinue}
            className="scene-continue-btn"
            style={{
              position: "fixed",
              bottom: "max(1.5rem, var(--safe-bottom))",
              right: "max(1.5rem, var(--safe-right))",
              zIndex: 45,
              opacity: 0,
            }}
          >
            <span>Continue</span>
            <ArrowRight size={14} />
          </button>

          <div ref={exitVeilRef} className="fg-exit-veil" aria-hidden="true" />
        </>
      )}
    </section>
  );
}
