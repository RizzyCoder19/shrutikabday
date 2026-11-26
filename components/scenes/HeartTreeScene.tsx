"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { musicCueManager } from "@/lib/audio/music-cue-manager";
import { ArrowRight, RotateCcw } from "lucide-react";
import "./heart-tree.css";

const BLOSSOM_PALETTE = [
  { c0: "#ffe1ec", c1: "#ff80aa" },
  { c0: "#ffd0e0", c1: "#f4577f" },
  { c0: "#ffc4d2", c1: "#e23b67" },
  { c0: "#ffd9c4", c1: "#ff8a5b" },
  { c0: "#ffeec2", c1: "#f6b13e" },
  { c0: "#ffd2e6", c1: "#e84d9a" },
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[(Math.random() * arr.length) | 0];
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function shadeHex(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function drawHeartPath(c: CanvasRenderingContext2D, x: number, top: number, w: number, h: number) {
  c.beginPath();
  c.moveTo(x, top + h * 0.28);
  c.bezierCurveTo(x, top, x - w * 0.5, top, x - w * 0.5, top + h * 0.28);
  c.bezierCurveTo(x - w * 0.5, top + h * 0.6, x - w * 0.16, top + h * 0.8, x, top + h);
  c.bezierCurveTo(x + w * 0.16, top + h * 0.8, x + w * 0.5, top + h * 0.6, x + w * 0.5, top + h * 0.28);
  c.bezierCurveTo(x + w * 0.5, top, x, top, x, top + h * 0.28);
  c.closePath();
}

export function HeartTreeScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);

  const rootRef = useRef<HTMLDivElement>(null);
  const treeCanvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const targetHeartRef = useRef<HTMLSpanElement>(null);
  const heartGlowRef = useRef<HTMLSpanElement>(null);
  const aimRef = useRef<HTMLDivElement>(null);
  const archeryRef = useRef<HTMLDivElement>(null);
  const bowRef = useRef<SVGSVGElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const strLRef = useRef<SVGLineElement>(null);
  const strRRef = useRef<SVGLineElement>(null);
  const servingRef = useRef<SVGCircleElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const floodRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const fieldTextRef = useRef<HTMLDivElement>(null);
  const fieldSubRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef<HTMLDivElement>(null);
  const sigLeadRef = useRef<HTMLParagraphElement>(null);
  const sigNamePathRef = useRef<SVGPathElement>(null);
  const sigDotRef = useRef<SVGCircleElement>(null);
  const sigUnderlinePathRef = useRef<SVGPathElement>(null);

  const [treePhase, setTreePhase] = useState<"bow" | "blooming" | "ready">("bow");
  const [wishVisible, setWishVisible] = useState(false);
  const [signatureDone, setSignatureDone] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const canvas = treeCanvasRef.current;
    const hero = heroRef.current;
    const archery = archeryRef.current;
    const bow = bowRef.current;
    const arrow = arrowRef.current;
    const strL = strLRef.current;
    const strR = strRRef.current;
    const serving = servingRef.current;
    const tip = tipRef.current;
    const target = targetRef.current;
    const targetHeart = targetHeartRef.current;
    const heartGlow = heartGlowRef.current;
    const aim = aimRef.current;
    const eyebrow = eyebrowRef.current;
    const hint = hintRef.current;
    const flood = floodRef.current;
    const field = fieldRef.current;
    const fieldText = fieldTextRef.current;
    const fieldSub = fieldSubRef.current;
    const bloom = bloomRef.current;

    if (
      !canvas ||
      !hero ||
      !archery ||
      !bow ||
      !arrow ||
      !strL ||
      !strR ||
      !serving ||
      !tip ||
      !target ||
      !targetHeart ||
      !heartGlow ||
      !aim ||
      !eyebrow ||
      !hint ||
      !flood ||
      !field ||
      !fieldText ||
      !bloom
    ) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Build heart blossom sprites
    const SS = 128;
    const makeBlossom = ({ c0, c1 }: { c0: string; c1: string }, soft: boolean) => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = SS;
      const c = cv.getContext("2d")!;
      const w = SS * 0.62;
      const h = SS * 0.58;
      const x = SS / 2;
      const top = SS * 0.17;
      const g = c.createRadialGradient(x - w * 0.2, top + h * 0.2, h * 0.04, x, top + h * 0.42, h * 0.92);
      g.addColorStop(0, c0);
      g.addColorStop(0.55, c1);
      g.addColorStop(1, shadeHex(c1, -26));
      drawHeartPath(c, x, top, w, h);
      c.fillStyle = g;
      c.fill();
      if (!soft) return cv;
      const cv2 = document.createElement("canvas");
      cv2.width = cv2.height = SS;
      const c2 = cv2.getContext("2d")!;
      c2.filter = "blur(2.2px)";
      c2.drawImage(cv, 0, 0);
      return cv2;
    };

    const SPR = {
      crisp: BLOSSOM_PALETTE.map((b) => makeBlossom(b, false)),
      soft: BLOSSOM_PALETTE.map((b) => makeBlossom(b, true)),
    };

    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cx = 0;
    let cy = 0;
    let rx = 0;
    let ry = 0;
    let groundY = 0;

    interface Branch {
      x1: number;
      y1: number;
      cx: number;
      cy: number;
      x2: number;
      y2: number;
      w0: number;
      w1: number;
      t0: number;
      dur: number;
      grad: CanvasGradient;
    }
    interface HeartLeaf {
      x: number;
      y: number;
      idx: number;
      soft: boolean;
      box: number;
      rot: number;
      sway: number;
      t0: number;
    }
    interface Petal {
      x: number;
      y: number;
      vy: number;
      vx: number;
      sway: number;
      phase: number;
      box: number;
      idx: number;
      rot: number;
      vrot: number;
      age: number;
      land: number;
    }

    let branches: Branch[] = [];
    let hearts: HeartLeaf[] = [];
    let petals: Petal[] = [];
    let rested: Array<{ x: number; y: number; box: number; idx: number; rot: number; a: number }> = [];
    let heartPoly: [number, number][] = [];
    let bgGrad: CanvasGradient;

    const buildHeartPoly = () => {
      const raw: [number, number][] = [];
      let minX = 1e9,
        maxX = -1e9,
        minY = 1e9,
        maxY = -1e9;
      for (let i = 0; i <= 120; i++) {
        const t = (i / 120) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        raw.push([x, y]);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      const hw = (maxX - minX) / 2;
      const hh = (maxY - minY) / 2;
      heartPoly = raw.map(([x, y]) => [(x - midX) / hw, (y - midY) / hh]);
    };

    const pointInPoly = (x: number, y: number) => {
      let inside = false;
      for (let i = 0, j = heartPoly.length - 1; i < heartPoly.length; j = i++) {
        const [xi, yi] = heartPoly[i];
        const [xj, yj] = heartPoly[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    };

    const T = {
      trunkStart: 0.15,
      branchSpan: 2.3,
      bloomT0: 1.5,
      bloomSpan: 2.6,
      petalT0: 2.7,
      noteStart: 4.15,
      done: 4.9,
    };

    const buildScene = () => {
      branches = [];
      hearts = [];
      petals = [];
      rested = [];
      buildHeartPoly();

      const wide = W / H > 1.2;
      cx = W * 0.5;
      cy = H * (wide ? 0.36 : 0.37);
      ry = Math.min(H * 0.31, W * 0.34);
      rx = ry * 1.16;
      groundY = H * 0.91;

      bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#fff3e9");
      bgGrad.addColorStop(0.5, "#ffe7d6");
      bgGrad.addColorStop(1, "#f3c4b5");

      const baseX = cx;
      const baseY = H;
      const trunkTopY = cy + ry * 0.6;
      const trunkW = Math.max(9, W * 0.022);
      const limbLen = ry * 0.58;
      const insidePx = (x: number, y: number) => pointInPoly((x - cx) / (rx * 0.9), (cy - y) / (ry * 0.9));

      const addBranch = (x: number, y: number, ang: number, len: number, w0: number, depth: number, t0: number) => {
        let ex = x + Math.cos(ang) * len;
        let ey = y + Math.sin(ang) * len;
        let clipped = false;
        if (!insidePx(ex, ey)) {
          let lo = 0,
            hi = 1;
          for (let k = 0; k < 10; k++) {
            const mid = (lo + hi) / 2;
            if (insidePx(x + Math.cos(ang) * len * mid, y + Math.sin(ang) * len * mid)) lo = mid;
            else hi = mid;
          }
          ex = x + Math.cos(ang) * len * lo;
          ey = y + Math.sin(ang) * len * lo;
          clipped = true;
        }
        const mx = (x + ex) / 2;
        const my = (y + ey) / 2;
        const perp = ang + Math.PI / 2;
        const bend = rand(-1, 1) * len * 0.12;
        const w1 = w0 * 0.66;
        const grad = ctx.createLinearGradient(x, y, ex, ey);
        grad.addColorStop(0, `hsl(348 26% ${26 + depth * 3}%)`);
        grad.addColorStop(1, `hsl(346 24% ${40 + depth * 5}%)`);
        branches.push({
          x1: x,
          y1: y,
          cx: mx + Math.cos(perp) * bend,
          cy: my + Math.sin(perp) * bend,
          x2: ex,
          y2: ey,
          w0,
          w1,
          t0,
          dur: Math.max(0.14, 0.3 - depth * 0.03),
          grad,
        });
        return { ex, ey, w1, clipped };
      };

      const grow = (x: number, y: number, ang: number, len: number, w: number, depth: number, t0: number) => {
        const r = addBranch(x, y, ang, len, w, depth, t0);
        if (r.clipped || depth >= 5 || len < ry * 0.07) return;
        const childT0 = t0 + (0.3 - depth * 0.03) * 0.6;
        const n = Math.random() < 0.55 ? 2 : 3;
        for (let i = 0; i < n; i++) {
          const spread = 0.6 * (i - (n - 1) / 2) + rand(-0.22, 0.22);
          grow(r.ex, r.ey, ang + spread - 0.06, len * rand(0.74, 0.84), r.w1, depth + 1, childT0 + i * 0.03);
        }
      };

      addBranch(baseX, baseY, -Math.PI / 2, baseY - trunkTopY, trunkW, 0, T.trunkStart);
      branches[0].dur = 0.5;
      for (let i = 0; i < 3; i++) {
        const ang = -Math.PI / 2 + 0.62 * (i - 1) + rand(-0.12, 0.12);
        grow(baseX, trunkTopY, ang, limbLen, trunkW * 0.7, 1, T.trunkStart + 0.35 + i * 0.05);
      }
      const maxT0 = branches.reduce((m, b) => Math.max(m, b.t0 + b.dur), 0);
      const sc = (T.branchSpan - T.trunkStart) / (maxT0 - T.trunkStart);
      branches.forEach((b) => {
        b.t0 = T.trunkStart + (b.t0 - T.trunkStart) * sc;
      });

      const COUNT = Math.round(clamp((rx * ry) / 60, 220, 380));
      const baseBox = clamp(Math.min(W, H) * 0.11, 28, 68);
      let guard = 0;
      while (hearts.length < COUNT && guard < COUNT * 40) {
        guard++;
        const u = rand(-1.05, 1.05);
        const v = rand(-1.05, 1.05);
        if (!pointInPoly(u, v)) continue;
        const x = cx + u * rx;
        const y = cy - v * ry;
        const d = clamp01(Math.hypot(u, v + 1) / 2.4);
        const t0 = T.bloomT0 + d * (T.bloomSpan * 0.82) + rand(0, T.bloomSpan * 0.18);
        const soft = Math.random() < 0.4;
        hearts.push({
          x,
          y,
          idx: (Math.random() * BLOSSOM_PALETTE.length) | 0,
          soft,
          box: baseBox * (soft ? rand(0.6, 0.85) : rand(0.78, 1.12)),
          rot: rand(-0.55, 0.55),
          sway: rand(0, 6.28),
          t0,
        });
      }
    };

    let treeRAF = 0;
    let treeStartT = 0;
    let treeLastT = 0;
    let lastPetal = 0;
    let readyArmed = false;

    const drawTreeFrame = (now: number) => {
      if (!treeStartT) {
        treeStartT = now;
        treeLastT = now;
      }
      const t = (now - treeStartT) / 1000;
      const dt = Math.min(0.05, (now - treeLastT) / 1000);
      treeLastT = now;

      ctx.globalAlpha = 1;
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Branches
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const b of branches) {
        const f = clamp01((t - b.t0) / b.dur);
        if (f <= 0) continue;
        const e = easeOutCubic(f);
        ctx.strokeStyle = b.grad;
        const steps = 10;
        const last = Math.max(1, Math.ceil(steps * e));
        let px = b.x1;
        let py = b.y1;
        for (let i = 1; i <= last; i++) {
          const tt = Math.min(e, i / steps);
          const m = 1 - tt;
          const nx = m * m * b.x1 + 2 * m * tt * b.cx + tt * tt * b.x2;
          const ny = m * m * b.y1 + 2 * m * tt * b.cy + tt * tt * b.y2;
          ctx.lineWidth = lerp(b.w0, b.w1, tt);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          px = nx;
          py = ny;
        }
      }

      // Heart Blossoms
      const breathe = 1 + Math.sin(t * 0.8) * 0.012;
      for (const h of hearts) {
        const p = clamp01((t - h.t0) / 0.6);
        if (p <= 0) continue;
        const scale = Math.max(0, easeOutBack(p));
        const alpha = clamp01(p * 1.7) * (h.soft ? 0.8 : 1);
        const settled = clamp01((t - h.t0 - 0.6) / 0.7);
        const sway = settled * Math.sin(t * 1.5 + h.sway) * (h.box * 0.045);
        const hx = cx + (h.x - cx) * breathe + sway;
        const hy = cy + (h.y - cy) * breathe;
        const sprite = (h.soft ? SPR.soft : SPR.crisp)[h.idx];
        const size = h.box * scale;
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(h.rot + sway * 0.01);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, -size * 0.5, -size * 0.47, size, size);
        ctx.restore();
      }

      // Falling petals
      if (t > T.petalT0 && now - lastPetal > 180) {
        const h = hearts[(Math.random() * hearts.length) | 0];
        if (h) {
          petals.push({
            x: h.x + rand(-8, 8),
            y: h.y + rand(-8, 8),
            vy: rand(16, 32),
            vx: rand(-8, 8),
            sway: rand(0.6, 1.4),
            phase: rand(0, 6.28),
            box: h.box * rand(0.32, 0.55),
            idx: h.idx,
            rot: rand(0, 6.28),
            vrot: rand(-1.4, 1.4),
            age: 0,
            land: groundY + rand(-6, H * 0.05),
          });
        }
        lastPetal = now;
      }

      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i];
        p.age += dt;
        p.vy += 8 * dt;
        p.x += (p.vx + Math.sin(t * p.sway + p.phase) * 16) * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;
        if (p.y >= p.land) {
          rested.push({ x: clamp(p.x, 6, W - 6), y: p.land, box: p.box, idx: p.idx, rot: p.rot, a: 0.85 });
          if (rested.length > 75) rested.shift();
          petals.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, p.age / 0.3);
        ctx.drawImage(SPR.crisp[p.idx], -p.box * 0.5, -p.box * 0.47, p.box, p.box);
        ctx.restore();
      }

      for (const r of rested) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        ctx.globalAlpha = r.a;
        ctx.drawImage(SPR.crisp[r.idx], -r.box * 0.5, -r.box * 0.47, r.box, r.box);
        ctx.restore();
      }

      if (t >= T.noteStart) setWishVisible(true);
      if (!readyArmed && t >= T.done) {
        readyArmed = true;
        setTreePhase("ready");
      }

      treeRAF = requestAnimationFrame(drawTreeFrame);
    };

    const startTree = () => {
      treeStartT = 0;
      treeLastT = 0;
      lastPetal = 0;
      readyArmed = false;
      buildScene();
      if (reduceMotion) {
        // Draw completed state directly
        drawTreeFrame(performance.now() + 99000);
        cancelAnimationFrame(treeRAF);
        setWishVisible(true);
        setTreePhase("ready");
        return;
      }
      treeRAF = requestAnimationFrame(drawTreeFrame);
    };

    // Bow & Arrow rigging
    let svgScale = 1;
    let arrowBaseX = 0;
    let arrowBaseY = 0;
    let maxDraw = 120;
    let curDraw = 0;
    let pullUX = 0;
    let pullUY = 1;
    const REST_NOCK = 96;
    const nockProxy = { val: REST_NOCK };

    const applyNock = () => {
      const y = String(nockProxy.val);
      strL.setAttribute("y2", y);
      strR.setAttribute("y2", y);
      serving.setAttribute("cy", y);
    };

    const refreshRig = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const gripX = W * (W < 600 ? 0.34 : 0.26);
      const gripY = H * 0.76;
      const heartX = W * 0.5;
      const heartY = H * 0.33;
      const aimRad = Math.atan2(heartX - gripX, gripY - heartY);
      pullUX = -Math.sin(aimRad);
      pullUY = Math.cos(aimRad);

      nockProxy.val = REST_NOCK;
      applyNock();
      gsap.set(archery, { rotation: 0, scale: 1, x: 0, y: 0 });
      archery.style.left = "0px";
      archery.style.top = "0px";
      gsap.set(arrow, { x: 0, y: 0 });

      const aR = archery.getBoundingClientRect();
      const bR = bow.getBoundingClientRect();
      const sR = serving.getBoundingClientRect();
      const rR = arrow.getBoundingClientRect();
      svgScale = bR.width / 460 || 1;
      const gripLX = bR.left - aR.left + 0.5 * bR.width;
      const gripLY = bR.top - aR.top + (240 / 300) * bR.height;
      const nockLX = sR.left - aR.left + 0.5 * sR.width;
      const nockLY = sR.top - aR.top + 0.5 * sR.height;
      arrowBaseX = nockLX - (rR.left - aR.left + 0.5 * rR.width);
      arrowBaseY = nockLY - (rR.top - aR.top + (205 / 220) * rR.height);

      archery.style.left = `${gripX - gripLX}px`;
      archery.style.top = `${gripY - gripLY}px`;
      gsap.set(archery, { transformOrigin: `${gripLX}px ${gripLY}px`, rotation: (aimRad * 180) / Math.PI });
      gsap.set(arrow, { x: arrowBaseX, y: arrowBaseY });
      maxDraw = Math.min(bR.height * 0.72, H * 0.16, 132);
      curDraw = 0;
    };

    const setDraw = (d: number) => {
      curDraw = clamp(d, 0, maxDraw);
      gsap.set(arrow, { x: arrowBaseX, y: arrowBaseY + curDraw });
      nockProxy.val = REST_NOCK + curDraw / svgScale;
      applyNock();
      gsap.set(aim, { opacity: 0.55 * (curDraw / maxDraw) });
    };

    refreshRig();
    window.addEventListener("resize", refreshRig);

    // Target heartbeat
    const beatTL = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
    beatTL
      .to(targetHeart, { scale: 1.07, duration: 0.13, ease: "power2.out" }, 0)
      .to(heartGlow, { scale: 1.15, opacity: 0.9, duration: 0.13, ease: "power2.out" }, 0)
      .to(targetHeart, { scale: 1.0, duration: 0.2, ease: "power2.in" }, 0.13)
      .to(targetHeart, { scale: 1.05, duration: 0.12, ease: "power2.out" }, 0.3)
      .to(targetHeart, { scale: 1.0, duration: 0.5, ease: "power2.inOut" }, 0.42)
      .to(heartGlow, { scale: 1.0, opacity: 0.7, duration: 0.7, ease: "power2.inOut" }, 0.3);

    // Entrance
    const enterTL = gsap.timeline();
    gsap.set([hero, eyebrow, hint], { autoAlpha: 0 });
    gsap.set(hero, { autoAlpha: 1 });
    enterTL
      .fromTo(target, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }, 0.1)
      .fromTo(archery, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }, 0.25)
      .fromTo(eyebrow, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.35)
      .fromTo(hint, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.55);

    let played = false;
    let drawing = false;
    let startPX = 0;
    let startPY = 0;
    let startDraw = 0;
    let filmTL: gsap.core.Timeline | null = null;

    const fire = () => {
      if (played) return;
      played = true;
      drawing = false;
      beatTL.kill();
      setTreePhase("blooming");

      if (soundEnabled) {
        audioSynth.playArrowRelease();
        setTimeout(() => {
          audioSynth.playHeartImpactBloom();
          musicCueManager.swellVolume(0.88, 900);
        }, 260);
      }

      const tipR = tip.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      const flightDist = Math.hypot(
        tRect.left + tRect.width / 2 - (tipR.left + tipR.width / 2),
        tRect.top + tRect.height / 2 - (tipR.top + tipR.height / 2)
      );
      const fallPx = Math.min(H * 0.26, H - (tRect.top + tRect.height / 2) - tRect.height * 0.4);
      const reach = Math.hypot(W / 2, H / 2);

      filmTL = gsap.timeline({
        onComplete: () => {
          gsap.set(field, { autoAlpha: 0 });
          startTree();
          gsap.to(bloom, { autoAlpha: 0, duration: 1.0, ease: "power2.out" });
        },
      });

      filmTL
        .fromTo(
          nockProxy,
          { val: REST_NOCK + curDraw / svgScale },
          { val: REST_NOCK, duration: 0.6, ease: "elastic.out(1, 0.34)", onUpdate: applyNock },
          0
        )
        .to(arrow, { y: arrowBaseY + curDraw - flightDist, duration: 0.42, ease: "power2.in" }, 0)
        .to([aim, eyebrow, hint], { opacity: 0, duration: 0.25 }, 0)
        .to(target, { scale: 1.18, duration: 0.1, ease: "power2.out" }, 0.42)
        .to(target, { scale: 1.0, duration: 0.35 }, 0.52)
        .to(arrow, { opacity: 0, duration: 0.2 }, 0.78)
        .to(target, { y: fallPx, scaleX: 0.85, scaleY: 1.25, duration: 0.45, ease: "power1.in" }, 0.88)
        .set(flood, { autoAlpha: 1, x: 0, y: tRect.top + tRect.height / 2 + fallPx - H / 2 }, 1.33)
        .fromTo(flood, { scale: 0.02 }, { scale: (reach * 2.2) / 70, duration: 0.45, ease: "power2.in" }, 1.33)
        .set(field, { autoAlpha: 1 }, 1.75)
        .set(hero, { autoAlpha: 0 }, 1.76)
        .set(flood, { autoAlpha: 0 }, 1.8)
        .fromTo(fieldText, { opacity: 0, y: 18, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: "power3.out" }, 1.88)
        .fromTo(fieldSub, { opacity: 0, y: 16, letterSpacing: "0.28em" }, { opacity: 1, y: 0, letterSpacing: "0.22em", duration: 0.9, ease: "power3.out" }, 2.18)
        .to({}, { duration: 1.75 })
        .set(bloom, { autoAlpha: 1 })
        .fromTo(bloom, { scale: 0.02 }, { scale: (reach * 2.2) / 30, duration: 0.65, ease: "power2.in" });
    };

    const onPointerDown = (e: PointerEvent) => {
      if (played) return;
      drawing = true;
      try {
        archery.setPointerCapture(e.pointerId);
      } catch {}
      startPX = e.clientX;
      startPY = e.clientY;
      startDraw = curDraw;
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawing) return;
      const proj = (e.clientX - startPX) * pullUX + (e.clientY - startPY) * pullUY;
      setDraw(startDraw + proj);
    };

    const onPointerUp = () => {
      if (!drawing) return;
      drawing = false;
      if (curDraw > maxDraw * 0.26) fire();
      else {
        const from = curDraw;
        gsap.to({ d: from }, {
          d: 0,
          duration: 0.5,
          ease: "elastic.out(1, 0.4)",
          onUpdate() {
            setDraw((this.targets()[0] as { d: number }).d);
          },
        });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (played) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        gsap.to({ d: curDraw }, {
          d: maxDraw * 0.92,
          duration: 0.5,
          ease: "power2.inOut",
          onUpdate() {
            setDraw((this.targets()[0] as { d: number }).d);
          },
          onComplete: fire,
        });
      }
    };

    archery.addEventListener("pointerdown", onPointerDown);
    archery.addEventListener("pointermove", onPointerMove);
    archery.addEventListener("pointerup", onPointerUp);
    archery.addEventListener("pointercancel", onPointerUp);
    archery.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("resize", refreshRig);
      archery.removeEventListener("pointerdown", onPointerDown);
      archery.removeEventListener("pointermove", onPointerMove);
      archery.removeEventListener("pointerup", onPointerUp);
      archery.removeEventListener("pointercancel", onPointerUp);
      archery.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(treeRAF);
      beatTL.kill();
      enterTL.kill();
      filmTL?.kill();
    };
  }, [resetKey, soundEnabled]);

  // Progressive SVG stroke-reveal handwritten signature once Happy Birthday reveal appears
  useEffect(() => {
    if (!wishVisible) return;

    const sigBox = signatureRef.current;
    const sigLead = sigLeadRef.current;
    const namePath = sigNamePathRef.current;
    const dotEl = sigDotRef.current;
    const underPath = sigUnderlinePathRef.current;
    if (!sigBox || !sigLead || !namePath || !underPath) {
      setSignatureDone(true);
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nameLen = namePath.getTotalLength();
    const underLen = underPath.getTotalLength();

    if (reduceMotion) {
      gsap.set(sigBox, { opacity: 1 });
      gsap.set(sigLead, { clipPath: "inset(0 0% 0 0)" });
      gsap.set(namePath, { strokeDasharray: nameLen, strokeDashoffset: 0 });
      if (dotEl) gsap.set(dotEl, { opacity: 1, scale: 1 });
      gsap.set(underPath, { strokeDasharray: underLen, strokeDashoffset: 0 });
      setSignatureDone(true);
      return;
    }

    gsap.set(namePath, { strokeDasharray: nameLen, strokeDashoffset: nameLen });
    gsap.set(underPath, { strokeDasharray: underLen, strokeDashoffset: underLen });
    if (dotEl) gsap.set(dotEl, { opacity: 0, scale: 0.3, transformOrigin: "center" });

    const tl = gsap.timeline({
      delay: 0.75,
      onComplete: () => setSignatureDone(true),
    });

    tl.to(sigBox, { opacity: 1, duration: 0.35, ease: "power1.out" })
      .to(
        sigLead,
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 1.05,
          ease: "power2.inOut",
        },
        0.1
      )
      .to(
        namePath,
        {
          strokeDashoffset: 0,
          duration: 1.55,
          ease: "power1.inOut",
        },
        1.05
      )
      .to(
        dotEl,
        {
          opacity: 1,
          scale: 1,
          duration: 0.22,
          ease: "back.out(2)",
        },
        2.55
      )
      .to(
        underPath,
        {
          strokeDashoffset: 0,
          duration: 0.58,
          ease: "power2.out",
        },
        2.4
      );

    return () => {
      tl.kill();
    };
  }, [wishVisible]);

  const handleContinue = () => {
    if (exiting || !signatureDone) return;
    setExiting(true);
    if (soundEnabled) audioSynth.playGentleChime(659.25);
    if (rootRef.current) {
      gsap.to(rootRef.current, {
        opacity: 0,
        duration: 0.7,
        ease: "power2.inOut",
        onComplete: () => transitionTo("BIRTHDAY_CAKE"),
      });
    } else {
      transitionTo("BIRTHDAY_CAKE");
    }
  };

  const handleReplayBow = () => {
    setWishVisible(false);
    setSignatureDone(false);
    setTreePhase("bow");
    setResetKey((k) => k + 1);
  };

  return (
    <section
      key={resetKey}
      ref={rootRef}
      className="ht-scene"
      aria-label="Chapter 8: Bow, Arrow and Heart Tree"
    >
      <canvas ref={treeCanvasRef} className="ht-tree" />

      <div ref={heroRef} className="ht-hero">
        <div className="ht-hero__bg" />
        <p ref={eyebrowRef} className="ht-hero__eyebrow">
          for Shruti
        </p>

        <div className="ht-targetWrap">
          <div ref={targetRef} className="ht-target">
            <span ref={heartGlowRef} className="ht-heart__glow" />
            <span ref={targetHeartRef} className="ht-target__heart">
              <svg className="ht-heart__svg" viewBox="0 0 100 92" aria-hidden="true">
                <defs>
                  <radialGradient id="htHg" cx="38%" cy="30%" r="80%">
                    <stop offset="0%" stopColor="#ffd9e4" />
                    <stop offset="42%" stopColor="#ff6f97" />
                    <stop offset="82%" stopColor="#d81e57" />
                    <stop offset="100%" stopColor="#9d0f3e" />
                  </radialGradient>
                </defs>
                <path
                  d="M50 86.5C26 68 10.5 53.6 10.5 34.6 10.5 20.4 21 11 33.2 11c8.6 0 14.2 4.7 16.8 11.4C52.6 15.7 58.2 11 66.8 11 79 11 89.5 20.4 89.5 34.6 89.5 53.6 74 68 50 86.5Z"
                  fill="url(#htHg)"
                />
              </svg>
            </span>
          </div>
        </div>

        <div
          ref={archeryRef}
          className="ht-archery"
          role="button"
          tabIndex={0}
          aria-label="Pull back the bow string and release to aim at the heart"
        >
          <div ref={aimRef} className="ht-aim" />

          <svg ref={bowRef} className="ht-bow" viewBox="0 0 460 300" aria-hidden="true">
            <defs>
              <linearGradient id="htLimb" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#4a2a1a" />
                <stop offset=".5" stopColor="#8a5127" />
                <stop offset="1" stopColor="#4a2a1a" />
              </linearGradient>
            </defs>
            <path
              d="M34 96 C 118 168, 168 240, 230 252 C 292 240, 342 168, 426 96"
              fill="none"
              stroke="url(#htLimb)"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <rect x="216" y="206" width="28" height="70" rx="9" fill="#3a2315" />
            <line ref={strLRef} x1="40" y1="70" x2="230" y2="96" stroke="#9a8068" strokeWidth="2.4" strokeLinecap="round" />
            <line ref={strRRef} x1="420" y1="70" x2="230" y2="96" stroke="#9a8068" strokeWidth="2.4" strokeLinecap="round" />
            <circle ref={servingRef} cx="230" cy="96" r="4.5" fill="#6f5137" />
          </svg>

          <svg ref={arrowRef} className="ht-arrow" viewBox="0 0 64 220" aria-hidden="true">
            <rect x="29.4" y="30" width="5.2" height="168" rx="2.6" fill="#6f4320" />
            <path
              className="ht-wingL"
              d="M31 30 C 10 16, 2 20, 4 34 C 12 30, 20 32, 31 40 Z"
              fill="#fff"
              stroke="#c4843a"
              strokeWidth="1.2"
            />
            <path
              className="ht-wingR"
              d="M33 30 C 54 16, 62 20, 60 34 C 52 30, 44 32, 33 40 Z"
              fill="#fff"
              stroke="#c4843a"
              strokeWidth="1.2"
            />
            <path
              d="M32 12 C 30 7, 22 6.5, 21.5 13 C 21 18, 27 22, 32 27 C 37 22, 43 18, 42.5 13 C 42 6.5, 34 7, 32 12 Z"
              fill="#f4a626"
            />
            <path d="M32 150 C 16 156, 10 178, 15 200 C 24 194, 30 184, 32 176 Z" fill="#e6396a" />
            <path d="M32 150 C 48 156, 54 178, 49 200 C 40 194, 34 184, 32 176 Z" fill="#e6396a" />
            <circle ref={tipRef} cx="32" cy="9" r="0.6" fill="none" />
          </svg>
        </div>

        <p ref={hintRef} className="ht-hero__hint">
          Pull back the bow &amp; release
        </p>
      </div>

      <div ref={floodRef} className="ht-flood" />
      <div ref={fieldRef} className="ht-field">
        <div className="ht-camera">
          <div ref={fieldTextRef} className="ht-headline-group" style={{ opacity: 0 }}>
            <h2 className="ht-headline">HAPPY BIRTHDAY</h2>
          </div>
          <div ref={fieldSubRef} className="ht-headline-sub-wrap" style={{ opacity: 0 }}>
            <span className="ht-headline-rule" aria-hidden="true" />
            <p className="ht-headline-name">SHRUTI</p>
            <span className="ht-headline-rule" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div ref={bloomRef} className="ht-bloom" />

      <div className={`ht-wish ${wishVisible ? "is-in" : ""}`}>
        <div className="ht-wish__badge">
          <span className="ht-wish__kicker">HAPPY BIRTHDAY</span>
          <span className="ht-wish__name">SHRUTI</span>
        </div>
      </div>

      {/* Progressive SVG stroke-reveal handwritten signature */}
      <div ref={signatureRef} className="ht-signature" aria-label="From your secret admirer, Umar.">
        <p ref={sigLeadRef} className="ht-signature__lead">
          From your secret admirer,
        </p>
        <svg
          className="ht-signature__svg"
          viewBox="0 0 232 76"
          fill="none"
          aria-hidden="true"
        >
          <path
            ref={sigNamePathRef}
            d="M 18 16 C 15 44, 21 60, 38 60 C 52 60, 58 40, 62 14 C 58 34, 57 48, 63 54 C 68 42, 74 34, 80 34 C 85 34, 87 42, 86 54 C 90 40, 97 34, 103 34 C 108 34, 110 43, 109 54 C 113 40, 119 34, 125 34 C 130 34, 131 46, 132 54 C 135 55, 139 52, 143 44 C 147 36, 156 34, 159 39 C 155 34, 142 37, 140 48 C 139 55, 147 57, 155 49 C 159 44, 161 39, 161 37 C 160 46, 161 54, 166 54 C 170 52, 174 41, 177 35 C 179 39, 186 37, 189 36 C 186 43, 185 52, 191 54 C 197 55, 205 50, 211 45"
            stroke="#5d1a31"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle ref={sigDotRef} cx="217.5" cy="52.5" r="2.2" fill="#5d1a31" />
          <path
            ref={sigUnderlinePathRef}
            d="M 22 66 C 72 62, 144 59, 204 63"
            stroke="#8a2c4a"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {treePhase === "ready" && signatureDone && (
        <div
          style={{
            position: "fixed",
            bottom: "max(1.2rem, var(--safe-bottom))",
            right: "max(1.2rem, var(--safe-right))",
            display: "flex",
            gap: "0.6rem",
            zIndex: 45,
          }}
        >
          <button type="button" onClick={handleReplayBow} className="hud-btn">
            <RotateCcw size={13} />
            <span>Draw Again</span>
          </button>
          <button type="button" onClick={handleContinue} className="scene-continue-btn">
            <span>Continue</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
