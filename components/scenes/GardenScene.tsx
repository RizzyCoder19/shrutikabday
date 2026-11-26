"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
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

type PaletteKind = "crimson" | "roseCrimson" | "blush" | "lavenderRose";
type BlossomForm = "crimson8" | "cuppedLotus" | "roseDouble";

interface FlowerSpec {
  xRatio: number;
  baseYRatio: number; // stem root below horizon line (0.72 .. 1.14)
  headYRatio: number; // blossom center y fraction across viewport
  curvePx: number;
  petalRadius: number;
  depth: number; // 0 (distant horizon) .. 1 (rich foreground)
  delaySec: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmp: number;
  palette: PaletteKind;
  form: BlossomForm;
  headTilt: number;
  perspectiveY: number;
  bloomScale: number;
  pulseOffset: number;
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

interface Butterfly {
  cxRatio: number;
  cyRatio: number;
  orbitRx: number;
  orbitRy: number;
  speed: number;
  phase: number;
  wingColorA: string;
  wingColorB: string;
  scale: number;
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
  const interactiveFlowersRef = useRef<FlowerSpec[]>([]);
  const burstSparksRef = useRef<Spark[]>([]);

  // Sequence 1 — Emotional Interstitial (Near-total darkness -> embers -> botanical silhouette -> dawn)
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

    const seeds = Array.from({ length: 36 }, () => ({
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

  // Sequence 2 — Full-Screen 60fps Luminous Flower Universe Engine (zero CSS filter/layout stutter!)
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
    let cachedSkyGrad: CanvasGradient | null = null;
    let cachedMistGrad: CanvasGradient | null = null;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cachedSkyGrad = ctx.createLinearGradient(0, 0, 0, H);
      cachedSkyGrad.addColorStop(0, "#03060a");
      cachedSkyGrad.addColorStop(0.36, "#080b16");
      cachedSkyGrad.addColorStop(0.64, "#150b1c");
      cachedSkyGrad.addColorStop(0.84, "#160711");
      cachedSkyGrad.addColorStop(1, "#050207");

      const hY = H * (isMobile ? 0.64 : 0.66);
      cachedMistGrad = ctx.createRadialGradient(
        W * 0.5,
        hY,
        12,
        W * 0.5,
        hY,
        Math.max(W, H) * 0.78
      );
      cachedMistGrad.addColorStop(0, "rgba(208, 36, 82, 0.2)");
      cachedMistGrad.addColorStop(0.36, "rgba(96, 148, 168, 0.11)");
      cachedMistGrad.addColorStop(0.7, "rgba(98, 42, 86, 0.06)");
      cachedMistGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    };
    window.addEventListener("resize", resize);
    resize();

    const makeGlowSprite = (innerColor: string, midColor: string, size = 128) => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const gctx = c.getContext("2d")!;
      const r = size / 2;
      const g = gctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, innerColor);
      g.addColorStop(0.35, midColor);
      g.addColorStop(1, "rgba(0,0,0,0)");
      gctx.fillStyle = g;
      gctx.fillRect(0, 0, size, size);
      return c;
    };

    const GLOW_SPRITES: Record<PaletteKind, HTMLCanvasElement> = {
      crimson: makeGlowSprite("rgba(255, 58, 104, 0.68)", "rgba(255, 12, 70, 0.2)"),
      roseCrimson: makeGlowSprite("rgba(255, 108, 142, 0.62)", "rgba(225, 32, 84, 0.18)"),
      blush: makeGlowSprite("rgba(255, 224, 210, 0.52)", "rgba(217, 166, 183, 0.15)"),
      lavenderRose: makeGlowSprite("rgba(210, 194, 255, 0.5)", "rgba(138, 120, 210, 0.15)"),
    };

    // Build authentic botanical blossom sprites inspired by crimson-blossom (rounded overlapping petals)
    // and animated-flower (cupped translucent twilight lotus petals)
    const makeBotanicalBlossomSprite = (
      palette: PaletteKind,
      form: BlossomForm,
      size = 180
    ) => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const bctx = c.getContext("2d")!;
      const cx = size / 2;
      const cy = size / 2;

      const styles: Record<
        PaletteKind,
        { pDark: string; pMid: string; pLight: string; cCenter: string; cEdge: string; vein: string }
      > = {
        crimson: {
          pDark: "#680018",
          pMid: "#e80c42",
          pLight: "#ff7294",
          cCenter: "#ffe9d6",
          cEdge: "#a80028",
          vein: "rgba(255, 222, 232, 0.34)",
        },
        roseCrimson: {
          pDark: "#7a0e34",
          pMid: "#f43366",
          pLight: "#ff9cb5",
          cCenter: "#fff2df",
          cEdge: "#c91c50",
          vein: "rgba(255, 235, 242, 0.36)",
        },
        blush: {
          pDark: "#783a58",
          pMid: "#d994ad",
          pLight: "#fcebe2",
          cCenter: "#fff9dc",
          cEdge: "#c9953e",
          vein: "rgba(255, 250, 245, 0.36)",
        },
        lavenderRose: {
          pDark: "#4a3f7a",
          pMid: "#9c85d2",
          pLight: "#f1dff9",
          cCenter: "#fff6dc",
          cEdge: "#c89f54",
          vein: "rgba(255, 248, 255, 0.34)",
        },
      };

      const st = styles[palette];

      if (form === "cuppedLotus") {
        // Reuses animated-flower's cupped 3-tier translucent corolla & warm stamen dome
        const lobes = [
          { ang: -0.46, len: size * 0.38, wid: size * 0.21, yOff: 4, scale: 0.94 },
          { ang: 0.46, len: size * 0.38, wid: size * 0.21, yOff: 4, scale: 0.94 },
          { ang: 0, len: size * 0.41, wid: size * 0.23, yOff: 2, scale: 1 },
          { ang: -0.82, len: size * 0.3, wid: size * 0.16, yOff: 8, scale: 0.84 },
          { ang: 0.82, len: size * 0.3, wid: size * 0.16, yOff: 8, scale: 0.84 },
        ];
        for (const lb of lobes) {
          bctx.save();
          bctx.translate(cx, cy + size * 0.14);
          bctx.rotate(lb.ang);
          const pg = bctx.createLinearGradient(0, lb.yOff, 0, -lb.len);
          pg.addColorStop(0, st.pDark);
          pg.addColorStop(0.5, st.pMid);
          pg.addColorStop(1, st.pLight);
          bctx.fillStyle = pg;
          bctx.beginPath();
          bctx.moveTo(0, lb.yOff);
          bctx.bezierCurveTo(-lb.wid, -lb.len * 0.18, -lb.wid * 1.05, -lb.len * 0.84, 0, -lb.len);
          bctx.bezierCurveTo(lb.wid * 1.05, -lb.len * 0.84, lb.wid, -lb.len * 0.18, 0, lb.yOff);
          bctx.closePath();
          bctx.fill();
          bctx.strokeStyle = st.vein;
          bctx.lineWidth = 1;
          bctx.stroke();
          bctx.restore();
        }
        const cg = bctx.createRadialGradient(cx, cy + 4, 1, cx, cy + 6, size * 0.14);
        cg.addColorStop(0, "#ffffff");
        cg.addColorStop(0.5, "#ffe9a8");
        cg.addColorStop(1, st.cEdge);
        bctx.fillStyle = cg;
        bctx.beginPath();
        bctx.ellipse(cx, cy + 8, size * 0.11, size * 0.06, 0, 0, Math.PI * 2);
        bctx.fill();
        return c;
      }

      // Asymmetric organic rounded petals (crimson-blossom: back whorl + cupped front whorl)
      const outerCount = form === "roseDouble" ? 5 : 4;
      const innerCount = form === "roseDouble" ? 5 : 4;
      const tiers = [
        { count: outerCount, rotOff: Math.PI / outerCount, len: size * 0.39, wid: size * 0.22, dark: 0 },
        { count: innerCount, rotOff: 0.14, len: size * 0.33, wid: size * 0.19, dark: 1 },
      ];

      for (const tier of tiers) {
        for (let i = 0; i < tier.count; i++) {
          const asym = (i % 2 === 0 ? 1.04 : 0.96);
          const ang = tier.rotOff + (i * Math.PI * 2) / tier.count + (i % 2 ? 0.05 : -0.04);
          const pLen = tier.len * asym;
          const pWid = tier.wid * (i % 2 ? 0.96 : 1.04);

          bctx.save();
          bctx.translate(cx, cy);
          bctx.rotate(ang);

          const pg = bctx.createRadialGradient(0, -pLen * 0.2, 2, 0, -pLen * 0.55, pLen * 0.95);
          pg.addColorStop(0, st.pDark);
          pg.addColorStop(0.52, st.pMid);
          pg.addColorStop(1, st.pLight);

          bctx.fillStyle = pg;
          bctx.beginPath();
          bctx.moveTo(0, 3);
          bctx.bezierCurveTo(-pWid * 0.95, -pLen * 0.22, -pWid * 1.12, -pLen * 0.78, -pWid * 0.14, -pLen * 0.96);
          bctx.quadraticCurveTo(0, -pLen * 1.04, pWid * 0.14, -pLen * 0.96);
          bctx.bezierCurveTo(pWid * 1.12, -pLen * 0.78, pWid * 0.95, -pLen * 0.22, 0, 3);
          bctx.closePath();
          bctx.fill();

          bctx.strokeStyle = st.vein;
          bctx.lineWidth = 0.9;
          bctx.stroke();

          // Delicate central petal vein crease
          bctx.beginPath();
          bctx.moveTo(0, -4);
          bctx.quadraticCurveTo(pWid * 0.06, -pLen * 0.45, 0, -pLen * 0.8);
          bctx.strokeStyle = "rgba(255, 240, 245, 0.22)";
          bctx.lineWidth = 0.8;
          bctx.stroke();

          bctx.restore();
        }
      }

      const cg = bctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, size * 0.13);
      cg.addColorStop(0, st.cCenter);
      cg.addColorStop(0.55, "#ff7d9e");
      cg.addColorStop(1, st.cEdge);
      bctx.fillStyle = cg;
      bctx.beginPath();
      bctx.arc(cx, cy, size * 0.115, 0, Math.PI * 2);
      bctx.fill();

      for (let d = 0; d < 9; d++) {
        const a = (d / 9) * Math.PI * 2;
        const dr = size * (0.11 + (d % 2) * 0.025);
        bctx.fillStyle = "rgba(255, 245, 215, 0.88)";
        bctx.beginPath();
        bctx.arc(cx + Math.cos(a) * dr, cy + Math.sin(a) * dr, 1.5, 0, Math.PI * 2);
        bctx.fill();
      }
      return c;
    };

    const FORMS: BlossomForm[] = ["crimson8", "cuppedLotus", "roseDouble"];
    const HEAD_SPRITES = new Map<string, HTMLCanvasElement>();
    (["crimson", "roseCrimson", "blush", "lavenderRose"] as PaletteKind[]).forEach((pal) => {
      FORMS.forEach((fm) => {
        HEAD_SPRITES.set(`${pal}:${fm}`, makeBotanicalBlossomSprite(pal, fm));
      });
    });

    // Deterministic seeded PRNG for lush balanced whole-screen floral coverage
    let seed = 42197;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Horizon-grounded flower meadow: distant horizon row (roots at 0.72..0.88 H), midground (0.88..1.05 H),
    // and tall lush foreground stems extending below the bottom viewport (1.06..1.14 H)
    const totalFlowers = isMobile ? 46 : 72;
    const flowers: FlowerSpec[] = [];

    for (let i = 0; i < totalFlowers; i++) {
      const colFrac = isMobile
        ? 0.06 + ((i + 0.25 + rand() * 0.5) / totalFlowers) * 0.88
        : 0.03 + ((i + 0.2 + rand() * 0.6) / totalFlowers) * 0.94;
      const tier = i % 3; // 0 = distant horizon, 1 = mid meadow, 2 = lush foreground
      const depth =
        tier === 0 ? 0.12 + rand() * 0.22 : tier === 1 ? 0.42 + rand() * 0.24 : 0.74 + rand() * 0.26;

      const baseYRatio =
        tier === 0
          ? 0.68 + rand() * 0.14
          : tier === 1
            ? 0.84 + rand() * 0.2
            : 1.04 + rand() * 0.1;

      const headYRatio =
        tier === 0
          ? (isMobile ? 0.48 : 0.52) + rand() * 0.14
          : tier === 1
            ? (isMobile ? 0.34 : 0.38) + rand() * 0.26
            : (isMobile ? 0.44 : 0.46) + rand() * 0.38;

      // Keep top-center caption breathing cleanly while letting tall flanking blossoms rise into sky
      const adjustedHeadY =
        headYRatio < 0.34 && colFrac > 0.25 && colFrac < 0.75 ? headYRatio + 0.1 : headYRatio;

      const paletteRoll = rand();
      const palette: PaletteKind =
        paletteRoll < 0.48
          ? "crimson"
          : paletteRoll < 0.74
            ? "roseCrimson"
            : paletteRoll < 0.89
              ? "blush"
              : "lavenderRose";

      const formRoll = rand();
      const form: BlossomForm =
        tier === 2
          ? formRoll < 0.72
            ? "crimson8"
            : "roseDouble"
          : formRoll < 0.45
            ? "crimson8"
            : formRoll < 0.78
              ? "cuppedLotus"
              : "roseDouble";

      const sizeScale = isMobile ? 0.46 + depth * 0.64 : 0.52 + depth * 0.78;

      flowers.push({
        xRatio: colFrac,
        baseYRatio,
        headYRatio: adjustedHeadY,
        curvePx: (rand() - 0.5) * (isMobile ? 42 : 76),
        petalRadius: (18 + rand() * 14) * sizeScale,
        depth,
        delaySec: 0.08 + (1 - depth) * 0.45 + rand() * 1.1,
        swayPhase: rand() * Math.PI * 2,
        swaySpeed: 0.8 + rand() * 0.65,
        swayAmp: (3.2 + rand() * 5.2) * (0.55 + depth * 0.55),
        palette,
        form,
        headTilt: (rand() - 0.5) * 0.38,
        perspectiveY: 0.72 + rand() * 0.24,
        bloomScale: sizeScale,
        pulseOffset: rand() * Math.PI * 2,
        touchBoost: 0,
      });
    }

    const grassBlades = Array.from({ length: isMobile ? 34 : 56 }, (_, idx) => ({
      xRatio: (idx + 0.3 + rand() * 0.4) / (isMobile ? 34 : 56),
      rootYRatio: 0.68 + rand() * 0.38,
      heightRatio: 0.08 + rand() * 0.14,
      curvePx: (rand() - 0.5) * 34,
      phase: rand() * Math.PI * 2,
      crimsonTint: rand() > 0.58,
    }));

    // Sort back-to-front so foreground glowing crimson blossoms overlap softly over deeper blooms
    flowers.sort((a, b) => a.depth - b.depth);
    interactiveFlowersRef.current = flowers;

    const stars = Array.from({ length: isMobile ? 65 : 105 }, () => ({
      xFrac: rand(),
      yFrac: rand() * 0.72,
      r: 0.7 + rand() * 1.4,
      phase: rand() * Math.PI * 2,
      speed: 1.1 + rand() * 1.8,
    }));

    const ambientDrifters = Array.from({ length: isMobile ? 28 : 48 }, () => ({
      x: rand() * W,
      y: rand() * H,
      vx: (rand() - 0.5) * 0.35,
      vy: -(0.2 + rand() * 0.45),
      r: 1.1 + rand() * 2.1,
      phase: rand() * Math.PI * 2,
      color: rand() > 0.45 ? "#ff5c84" : "#E9C77D",
    }));

    const butterflies: Butterfly[] = [
      {
        cxRatio: 0.34,
        cyRatio: 0.44,
        orbitRx: 0.16,
        orbitRy: 0.1,
        speed: 0.42,
        phase: 0.2,
        wingColorA: "#fff2e4",
        wingColorB: "#e9c77d",
        scale: 1,
      },
      {
        cxRatio: 0.68,
        cyRatio: 0.38,
        orbitRx: 0.17,
        orbitRy: 0.11,
        speed: -0.36,
        phase: 2.3,
        wingColorA: "#ffd8e4",
        wingColorB: "#ff4d6d",
        scale: 0.92,
      },
      {
        cxRatio: 0.5,
        cyRatio: 0.54,
        orbitRx: 0.22,
        orbitRy: 0.12,
        speed: 0.29,
        phase: 4.1,
        wingColorA: "#f3d9c9",
        wingColorB: "#9d8fd6",
        scale: 0.88,
      },
    ];

    const startTime = performance.now();
    let prevTime = startTime;
    let rafId = 0;

    const easeOutCubic = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
    const easeOutBack = (x: number) => {
      const t = Math.max(0, Math.min(1, x));
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const drawButterflies = (elapsed: number) => {
      for (const b of butterflies) {
        const bx = (b.cxRatio + Math.cos(elapsed * b.speed + b.phase) * b.orbitRx) * W;
        const by = (b.cyRatio + Math.sin(elapsed * b.speed * 1.4 + b.phase) * b.orbitRy) * H;
        const heading = Math.cos(elapsed * b.speed + b.phase) * 0.24;
        const flap = 0.38 + 0.62 * Math.abs(Math.sin(elapsed * 9.5 + b.phase));

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(heading);
        ctx.scale(b.scale, b.scale);

        // Soft luminous aura around wings
        ctx.fillStyle = "rgba(255, 224, 210, 0.12)";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        const wg = ctx.createLinearGradient(-12, -8, 12, 8);
        wg.addColorStop(0, b.wingColorA);
        wg.addColorStop(1, b.wingColorB);
        ctx.fillStyle = wg;

        // Left & right flapping wing pair
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.scale(side * flap, 1);
          ctx.beginPath();
          ctx.moveTo(0, -2);
          ctx.bezierCurveTo(10, -14, 18, -4, 10, 4);
          ctx.bezierCurveTo(13, 10, 5, 13, 0, 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = "#1c1218";
        ctx.fillRect(-1, -5, 2, 10);
        ctx.restore();
      }
    };

    const renderFrame = (now: number) => {
      const dt = Math.min((now - prevTime) / 1000, 0.05);
      prevTime = now;
      const elapsed = reduced ? 12 : (now - startTime) / 1000;

      // 1. Deep Luminous Twilight & Crimson Horizon Sky (cached gradients for 60fps zero-alloc render)
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      if (cachedSkyGrad) {
        ctx.fillStyle = cachedSkyGrad;
        ctx.fillRect(0, 0, W, H);
      }
      if (cachedMistGrad) {
        ctx.fillStyle = cachedMistGrad;
        ctx.fillRect(0, 0, W, H);
      }

      // Multi-band atmospheric Aurora flowing seamlessly across the full canvas (zero hard clip box)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const aurShift1 = Math.sin(elapsed * 0.12) * W * 0.11;
      const aurShift2 = Math.cos(elapsed * 0.09) * W * 0.12;
      const horizonY = H * (isMobile ? 0.64 : 0.66);

      const aur1 = ctx.createRadialGradient(
        W * 0.32 + aurShift1,
        H * 0.34,
        12,
        W * 0.32 + aurShift1,
        H * 0.34,
        W * (isMobile ? 0.72 : 0.52)
      );
      aur1.addColorStop(0, "rgba(74, 224, 178, 0.09)");
      aur1.addColorStop(0.45, "rgba(86, 172, 222, 0.05)");
      aur1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = aur1;
      ctx.fillRect(0, 0, W, H);

      const aur2 = ctx.createRadialGradient(
        W * 0.72 + aurShift2,
        H * 0.28,
        10,
        W * 0.72 + aurShift2,
        H * 0.28,
        W * (isMobile ? 0.75 : 0.5)
      );
      aur2.addColorStop(0, "rgba(182, 128, 228, 0.08)");
      aur2.addColorStop(0.45, "rgba(225, 114, 162, 0.05)");
      aur2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = aur2;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Distant Meadow Horizon Ridge & Atmospheric Haze
      ctx.save();
      const hillGrad = ctx.createLinearGradient(0, horizonY - 24, 0, H);
      hillGrad.addColorStop(0, "rgba(28, 12, 28, 0.82)");
      hillGrad.addColorStop(0.28, "rgba(18, 7, 18, 0.94)");
      hillGrad.addColorStop(1, "rgba(5, 2, 7, 1)");
      ctx.fillStyle = hillGrad;
      ctx.beginPath();
      ctx.moveTo(0, horizonY + 8);
      ctx.bezierCurveTo(W * 0.25, horizonY - 22, W * 0.45, horizonY + 14, W * 0.68, horizonY - 12);
      ctx.bezierCurveTo(W * 0.84, horizonY - 24, W * 0.94, horizonY + 4, W, horizonY - 4);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      // Soft horizon atmospheric glow ribbon
      const hGlow = ctx.createLinearGradient(0, horizonY - 48, 0, horizonY + 56);
      hGlow.addColorStop(0, "rgba(0, 0, 0, 0)");
      hGlow.addColorStop(0.5, "rgba(184, 38, 84, 0.14)");
      hGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = hGlow;
      ctx.fillRect(0, horizonY - 48, W, 104);
      ctx.restore();

      // Meadow Grass Tufts extending organically along and below the horizon
      for (const g of grassBlades) {
        const gx = g.xRatio * W;
        const gy = g.rootYRatio * H;
        const gh = g.heightRatio * H;
        const gSway = Math.sin(elapsed * 1.15 + g.phase) * 5;
        ctx.strokeStyle = g.crimsonTint ? "rgba(92, 18, 42, 0.55)" : "rgba(32, 68, 56, 0.58)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + g.curvePx * 0.5, gy - gh * 0.55, gx + g.curvePx + gSway, gy - gh);
        ctx.stroke();
      }

      // 2. Twinkling Stars
      for (const s of stars) {
        const a = 0.24 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * s.speed + s.phase));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#fff4e6";
        ctx.beginPath();
        ctx.arc(s.xFrac * W, s.yFrac * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 3. Full-Screen Growing & Glowing Flower Meadow (back-to-front depth order)
      for (const f of flowers) {
        const age = Math.max(0, elapsed - f.delaySec);
        if (age <= 0) continue;

        const stemT = easeOutCubic(Math.min(1, age / 1.85));
        const bloomT = age > 0.95 ? easeOutBack(Math.min(1, (age - 0.95) / 1.15)) : 0;

        if (f.touchBoost > 0) {
          f.touchBoost = Math.max(0, f.touchBoost - dt * 1.4);
        }

        const rootX = f.xRatio * W;
        const rootY = f.baseYRatio * H;
        const sway = Math.sin(elapsed * f.swaySpeed + f.swayPhase) * f.swayAmp;
        const fullHeadX = rootX + f.curvePx * 0.45 + sway;
        const fullHeadY = f.headYRatio * H;

        // Smooth stem endpoint via cubic growth interpolation (zero layout reflow!)
        const headX = rootX + (fullHeadX - rootX) * stemT;
        const headY = rootY + (fullHeadY - rootY) * stemT;
        const ctrlX = rootX + (fullHeadX - rootX) * 0.45 + f.curvePx * stemT;
        const ctrlY = (rootY + headY) * 0.5;

        const isCrimsonStem = f.palette === "crimson" || f.palette === "roseCrimson";
        const stemGrad = ctx.createLinearGradient(rootX, rootY, headX, headY);
        stemGrad.addColorStop(0, "rgba(24, 16, 22, 0.35)");
        stemGrad.addColorStop(0.35, isCrimsonStem ? "#5e1530" : "#285748");
        stemGrad.addColorStop(1, isCrimsonStem ? "#9e1c44" : "#5ca27f");

        ctx.strokeStyle = stemGrad;
        ctx.lineWidth = Math.max(1.4, (1.6 + f.depth * 2.1) * (0.7 + 0.3 * stemT));
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, headX, headY);
        ctx.stroke();

        // Stem Leaves emerging along Bezier midpoint
        if (stemT > 0.42) {
          const leafScale = easeOutCubic((stemT - 0.42) / 0.58) * f.bloomScale;
          for (const side of [-1, 1]) {
            const frac = side === -1 ? 0.52 : 0.66;
            const lx = (1 - frac) * (1 - frac) * rootX + 2 * (1 - frac) * frac * ctrlX + frac * frac * headX;
            const ly = (1 - frac) * (1 - frac) * rootY + 2 * (1 - frac) * frac * ctrlY + frac * frac * headY;
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(side * 0.72 + sway * 0.015);
            ctx.scale(leafScale, leafScale);
            ctx.fillStyle = isCrimsonStem ? "rgba(128, 18, 48, 0.78)" : "rgba(74, 146, 114, 0.78)";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(side * 12, -10, side * 22, -2);
            ctx.quadraticCurveTo(side * 11, 8, 0, 0);
            ctx.fill();
            ctx.restore();
          }
        }

        // Additive Radial Halo + Stamped 8-Petal Blossom Head
        if (bloomT > 0) {
          const pulse = 1 + 0.08 * Math.sin(elapsed * 1.9 + f.pulseOffset) + f.touchBoost * 0.38;
          const drawRadius = f.petalRadius * bloomT * (1 + f.touchBoost * 0.22);

          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = (0.38 + f.depth * 0.34 + f.touchBoost * 0.35) * Math.min(1, bloomT);
          const haloSize = drawRadius * 3.1 * pulse;
          ctx.drawImage(
            GLOW_SPRITES[f.palette],
            headX - haloSize * 0.5,
            headY - haloSize * 0.5,
            haloSize,
            haloSize
          );
          ctx.restore();

          ctx.save();
          ctx.translate(headX, headY);
          ctx.rotate(f.headTilt + sway * 0.022);
          ctx.scale(1, f.perspectiveY);
          ctx.globalAlpha = 0.62 + f.depth * 0.38;
          const headSize = drawRadius * 2.25;
          const sprite = HEAD_SPRITES.get(`${f.palette}:${f.form}`);
          if (sprite) {
            ctx.drawImage(sprite, -headSize * 0.5, -headSize * 0.5, headSize, headSize);
          }
          ctx.restore();
        }
      }

      // 4. Floating Butterflies gliding across the glowing flowers
      drawButterflies(elapsed);

      // 5. Rising Luminous Pollen & Tap Burst Sparks
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of ambientDrifters) {
        p.x += p.vx + Math.sin(elapsed * 1.2 + p.phase) * 0.25;
        p.y += p.vy;
        if (p.y < -12) {
          p.y = H + 10;
          p.x = Math.random() * W;
        }
        ctx.globalAlpha = 0.28 + 0.42 * (0.5 + 0.5 * Math.sin(elapsed * 2.2 + p.phase));
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

      rafId = requestAnimationFrame(renderFrame);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (Math.random() > 0.45 || burstSparksRef.current.length > 90) return;
      burstSparksRef.current.push({
        x: e.clientX,
        y: e.clientY,
        vx: (Math.random() - 0.5) * 0.9,
        vy: -(0.35 + Math.random() * 0.9),
        r: 1.4 + Math.random() * 2.2,
        alpha: 0.85,
        decay: 0.018,
        color: Math.random() > 0.45 ? "#E9C77D" : "#ff4d6d",
      });
    };

    const handleGardenTap = (e: PointerEvent) => {
      const tx = e.clientX;
      const ty = e.clientY;
      // Awaken nearby flowers visually
      let hitFlower = false;
      for (const f of interactiveFlowersRef.current) {
        const fx = f.xRatio * W + f.curvePx * 0.45;
        const fy = f.headYRatio * H;
        if (Math.hypot(fx - tx, fy - ty) < 88) {
          f.touchBoost = 1;
          hitFlower = true;
        }
      }
      if (soundEnabledRef.current) {
        audioSynth.playGentleChime(hitFlower ? 880 : 783.99);
      }
      const colors = ["#ff0c46", "#ff4d6d", "#ffccd5", "#E9C77D"];
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
        const spd = 0.8 + Math.random() * 2.6;
        burstSparksRef.current.push({
          x: tx,
          y: ty,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 0.7,
          r: 1.8 + Math.random() * 2.6,
          alpha: 1,
          decay: 0.016,
          color: colors[i % colors.length],
        });
      }
    };

    canvas.addEventListener("pointerdown", handleGardenTap);
    window.addEventListener("pointermove", handlePointerMove);
    rafId = requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handleGardenTap);
      cancelAnimationFrame(rafId);
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
    tl.to({}, { duration: 0.9 })
      .fromTo(line1Ref.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" })
      .to({}, { duration: 0.35 })
      .fromTo(line2Ref.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" })
      .fromTo(whisperRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.2")
      .fromTo(nextRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.2");

    return () => {
      tl.kill();
    };
  }, [gardenPhase]);

  // Smooth transition: luminous flower embers rise into the constellation sky before handing off
  const handleContinue = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    if (soundEnabledRef.current) {
      audioSynth.playGentleChime(659.25);
    }

    const W = window.innerWidth;
    const H = window.innerHeight;
    for (let i = 0; i < 40; i++) {
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

      {/* Full-Screen 60fps Luminous Flower Universe */}
      {gardenPhase === "blooming" && (
        <>
          <canvas
            ref={gardenCanvasRef}
            className="fg-garden-canvas"
            aria-label="Full-screen glowing flower universe — tap any flower to awaken light"
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
