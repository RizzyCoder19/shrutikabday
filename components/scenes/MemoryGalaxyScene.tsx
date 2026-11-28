"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SHRUTI_PHOTOS } from "@/content/gallery";
import { FIRST_CHAT_SCREENSHOTS, MOMENTS_CHAT_SCREENSHOTS } from "@/content/chats";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { musicCueManager } from "@/lib/audio/music-cue-manager";
import { RotateCcw, Compass, X } from "lucide-react";

interface MemoryMedia {
  id: string;
  src: string;
  aspect: number;
  fx?: number;
  fy?: number;
}

// Portrait-aware subject focus anchors so planets frame Shruti's face clearly without awkward edge crops
const PHOTO_FOCUS_MAP: Record<string, { fx: number; fy: number }> = {
  "p-1": { fx: 0.46, fy: 0.42 },
  "p-2": { fx: 0.52, fy: 0.44 },
  "p-3": { fx: 0.5, fy: 0.46 },
  "p-4": { fx: 0.52, fy: 0.42 },
  "p-5": { fx: 0.62, fy: 0.68 },
  "p-6": { fx: 0.54, fy: 0.38 },
  "p-7": { fx: 0.5, fy: 0.5 },
  "p-8": { fx: 0.6, fy: 0.36 },
  "p-9": { fx: 0.48, fy: 0.4 },
  "p-10": { fx: 0.44, fy: 0.32 },
  "p-11": { fx: 0.42, fy: 0.32 },
  "p-12": { fx: 0.5, fy: 0.42 },
};

const ALL_MEMORY_MEDIA: MemoryMedia[] = [
  ...SHRUTI_PHOTOS.map((p) => ({
    id: p.id,
    src: p.src,
    aspect: p.width / p.height,
    ...(PHOTO_FOCUS_MAP[p.id] ?? { fx: 0.5, fy: 0.42 }),
  })),
  ...FIRST_CHAT_SCREENSHOTS.map((c) => ({
    id: c.id,
    src: c.src,
    aspect: c.width / c.height,
    fx: 0.5,
    fy: 0.45,
  })),
  ...MOMENTS_CHAT_SCREENSHOTS.map((m) => ({
    id: m.id,
    src: m.src,
    aspect: m.width / m.height,
    fx: 0.5,
    fy: 0.45,
  })),
];

interface CameraFocusAnim {
  active: boolean;
  elapsed: number;
  duration: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  onDone?: () => void;
}

function createStarGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const c = cv.getContext("2d")!;
  const grad = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // Crisp bright astronomical core with luminous Milky Way corona
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.12, "rgba(255, 252, 245, 0.96)");
  grad.addColorStop(0.28, "rgba(255, 226, 175, 0.55)");
  grad.addColorStop(0.58, "rgba(195, 175, 245, 0.16)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  c.fillStyle = grad;
  c.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

function createNebulaGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const c = cv.getContext("2d")!;
  const grad = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255, 248, 242, 0.52)");
  grad.addColorStop(0.3, "rgba(228, 185, 250, 0.24)");
  grad.addColorStop(0.65, "rgba(110, 150, 255, 0.08)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  c.fillStyle = grad;
  c.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

function CosmicPhraseLine({
  text,
  delayMs = 0,
  reducedMotion = false,
}: {
  text: string;
  delayMs?: number;
  reducedMotion?: boolean;
}) {
  if (reducedMotion) {
    return <span>{text}</span>;
  }

  return (
    <span
      style={{
        display: "inline-block",
        opacity: 0,
        animation: "galaxyPhraseRise 1.35s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        animationDelay: `${delayMs}ms`,
        willChange: "opacity, transform",
      }}
    >
      {text}
    </span>
  );
}

function UmarSignatureSvg({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <svg
      viewBox="0 0 280 96"
      role="img"
      aria-label="— Umar"
      style={{
        width: "clamp(150px, 34vw, 235px)",
        height: "auto",
        overflow: "visible",
        filter: "drop-shadow(0 0 12px rgba(255, 215, 130, 0.55))",
      }}
    >
      <defs>
        <linearGradient id="umarInkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFE9B5" />
          <stop offset="55%" stopColor="#FFD47C" />
          <stop offset="100%" stopColor="#FFF2D6" />
        </linearGradient>
      </defs>
      {/* Continuous connected handwritten "Umar" stroke path */}
      <path
        d="M 24 24 C 21 52, 22 71, 41 73 C 58 75, 67 48, 72 24 C 70 46, 68 65, 72 71 C 76 75, 85 57, 94 51 C 101 46, 105 57, 103 69 C 107 58, 116 48, 123 51 C 129 54, 127 66, 126 71 C 131 61, 140 50, 148 51 C 154 52, 152 67, 158 70 C 164 72, 173 55, 181 50 C 187 46, 194 50, 191 61 C 188 71, 174 73, 172 64 C 171 55, 183 47, 190 52 C 193 55, 191 68, 198 70 C 204 71, 213 55, 219 46 C 221 43, 220 65, 220 71 C 220 61, 222 49, 232 49 C 238 49, 236 66, 244 69 C 251 71, 260 63, 268 57"
        fill="none"
        stroke="url(#umarInkGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          reducedMotion
            ? undefined
            : {
              strokeDasharray: 720,
              strokeDashoffset: 720,
              animation: "umarSignatureDraw 2.15s cubic-bezier(0.32, 0.04, 0.24, 1) forwards",
            }
        }
      />
      {/* Delicate final ink sweep underline */}
      <path
        d="M 104 82 C 148 77, 198 76, 250 79"
        fill="none"
        stroke="rgba(255, 226, 158, 0.72)"
        strokeWidth="1.65"
        strokeLinecap="round"
        style={
          reducedMotion
            ? undefined
            : {
              strokeDasharray: 160,
              strokeDashoffset: 160,
              animation: "umarSweepDraw 0.85s ease-out 1.55s forwards",
            }
        }
      />
    </svg>
  );
}

export function MemoryGalaxyScene() {
  const reset = useExperienceStore((s) => s.reset);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resetCameraFnRef = useRef<(() => void) | null>(null);
  const pullBackFromFocusRef = useRef<(() => void) | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const [webglError, setWebglError] = useState(false);
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);
  const [modalImgReady, setModalImgReady] = useState(false);
  const [reducedMotionUI, setReducedMotionUI] = useState(false);
  const [finalePhase, setFinalePhase] = useState<number>(0);
  const [finaleCycle, setFinaleCycle] = useState<number>(0);
  const selectedSrcRef = useRef<string | null>(null);
  selectedSrcRef.current = selectedSrc;

  // Continuous optical blur + dim driver synced directly to the single monotonic cycle clock (no extra timers)
  const finaleVisualRef = useRef<{ blurMix: number }>({ blurMix: 0 });

  // Milky Way Cinema Finale & Repeatable 23-Second Text Cycle (zero WebGL reset/teardown):
  // - 0s -> 24.8s: Pure unobstructed bright Milky Way exploration
  // - 24.8s (inCycle = 0ms): Background gradually darkens & softens via GPU blur
  // - 26.0s (inCycle = 1200ms): Beat 1 -> Beat 4 -> Umar SVG signature (45.4s, finishes ~47.55s)
  // - 48.2s (inCycle = 23400ms, 0.8s earlier than prior 49.0s): Text fades cleanly to 0 over 1.0s
  // - 48.6s -> 50.4s: Darkened/blurred galaxy restores smoothly to full brightness & sharpness
  // - Continues breathing unobstructed until next 46s cycle boundary (23s window + 23s unobstructed galaxy)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotionUI(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setReducedMotionUI(e.matches);
    mq.addEventListener("change", onMq);

    let elapsedMs = 0;
    let lastTick = performance.now();
    let prevPhase = 0;
    let prevCycle = 0;

    const smoothstep01 = (t: number) => {
      const x = t < 0 ? 0 : t > 1 ? 1 : t;
      return x * x * (3 - 2 * x);
    };

    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(250, now - lastTick);
      lastTick = now;

      if (document.hidden || selectedSrcRef.current !== null) return;
      elapsedMs += dt;

      let nextPhase = 0;
      let nextCycle = 0;
      let blurMix = 0;

      if (elapsedMs < 24800) {
        nextPhase = 0;
        blurMix = 0;
      } else {
        const cycleDur = 46000;
        const postStart = elapsedMs - 24800;
        nextCycle = Math.floor(postStart / cycleDur);
        const inCycle = postStart % cycleDur;

        // Smooth blur + dim ramp in over 1.4s starting at 24.8s (inCycle 0..1400ms)
        if (inCycle < 1400) {
          blurMix = smoothstep01(inCycle / 1400);
        } else if (inCycle < 23800) {
          blurMix = 1;
        } else if (inCycle < 25600) {
          // Restore full sharp bright Milky Way gently over 1.8s right after text fade starts
          blurMix = 1 - smoothstep01((inCycle - 23800) / 1800);
        } else {
          blurMix = 0;
        }

        if (inCycle < 1200) nextPhase = 1;        // 24.8s -> 26.0s backdrop darkening & softening
        else if (inCycle < 4400) nextPhase = 2;   // 26.0s Beat 1
        else if (inCycle < 9000) nextPhase = 3;   // 29.2s Beat 2
        else if (inCycle < 15600) nextPhase = 4;  // 33.8s Beat 3
        else if (inCycle < 20600) nextPhase = 5;  // 40.4s Beat 4
        else if (inCycle < 23400) nextPhase = 6;  // 45.4s Umar handwriting signature
        else if (inCycle < 26000) nextPhase = 7;  // 48.2s (0.8s earlier!) text fades out cleanly, then galaxy restores
        else nextPhase = 0;                       // Pure sharp Milky Way breathing interval
      }

      finaleVisualRef.current.blurMix = blurMix;

      if (nextCycle !== prevCycle) {
        prevCycle = nextCycle;
        setFinaleCycle(nextCycle);
      }
      if (nextPhase !== prevPhase) {
        prevPhase = nextPhase;
        setFinalePhase(nextPhase);
      }
    }, 80);

    return () => {
      window.clearInterval(timer);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  const closeSelectedMemory = useCallback(() => {
    setSelectedSrc(null);
    setModalImgReady(false);
    pullBackFromFocusRef.current?.();
  }, []);

  useEffect(() => {
    if (!selectedSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSelectedMemory();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSrc, closeSelectedMemory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglError(true);
      return;
    }

    const isMobile = window.innerWidth < 768;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const dprCap = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(dprCap);
    renderer.setClearColor(0x030308, 1);

    const scene = new THREE.Scene();

    // Diagonal Milky Way barred-spiral framing tuned for both desktop and mobile viewports
    const isPortrait = sizes.width / sizes.height < 0.85;
    const camera = new THREE.PerspectiveCamera(isPortrait ? 68 : 72, sizes.width / sizes.height, 0.03, 90);
    const introStartPos = new THREE.Vector3(0.45, 0.34, 0.48);
    const overviewCamPos = isPortrait
      ? new THREE.Vector3(2.45, 2.55, 2.45)
      : new THREE.Vector3(2.8, 2.5, 2.8);
    camera.position.copy(reducedMotion ? overviewCamPos : introStartPos);
    scene.add(camera);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 0.28;
    controls.maxDistance = 8.5;
    controls.rotateSpeed = isMobile ? 0.65 : 0.8;
    controls.zoomSpeed = isMobile ? 0.85 : 1.05;

    let userInteracting = false;
    const onControlStart = () => {
      userInteracting = true;
    };
    const onControlEnd = () => {
      userInteracting = false;
    };
    controls.addEventListener("start", onControlStart);
    controls.addEventListener("end", onControlEnd);

    // 1. Astronomical Milky Way barred-spiral starfield with ShaderMaterial (per-star size, dust lanes, twinkling)
    const params = {
      count: isMobile ? 11500 : 25000,
      radius: 2.98,
      branches: 4,
      spin: 2.85,
      insideColor: "#FFFDF8",
      goldColor: "#FFE4A6",
      ivoryWhite: "#F6F8FF",
      roseColor: "#DFA0C4",
      magentaColor: "#D178B5",
      lavenderColor: "#B79AF2",
      violetColor: "#8E6AE0",
      cyanColor: "#78C7FF",
      blueWhiteColor: "#D9ECFF",
    };

    const starGlowTex = createStarGlowTexture();
    const nebulaGlowTex = createNebulaGlowTexture();

    const pointsGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const sizesAttr = new Float32Array(params.count);
    const phasesAttr = new Float32Array(params.count);
    const alphasAttr = new Float32Array(params.count);

    const cInside = new THREE.Color(params.insideColor);
    const cGold = new THREE.Color(params.goldColor);
    const cWhite = new THREE.Color(params.ivoryWhite);
    const cRose = new THREE.Color(params.roseColor);
    const cMagenta = new THREE.Color(params.magentaColor);
    const cLavender = new THREE.Color(params.lavenderColor);
    const cViolet = new THREE.Color(params.violetColor);
    const cCyan = new THREE.Color(params.cyanColor);
    const cBlueWhite = new THREE.Color(params.blueWhiteColor);
    const tmpColor = new THREE.Color();

    const barAngle = 0.38;
    const cosB = Math.cos(barAngle);
    const sinB = Math.sin(barAngle);

    let placed = 0;
    let seedWalk = 0;
    while (placed < params.count) {
      seedWalk++;
      const i3 = placed * 3;
      const negX = Math.random() < 0.5 ? 1 : -1;
      const negY = Math.random() < 0.5 ? 1 : -1;
      const negZ = Math.random() < 0.5 ? 1 : -1;

      // Dense, bright central galactic bar (~16% of stars) feeding the two primary spiral arms
      if (placed % 6 === 0) {
        const barAlong = (Math.random() - 0.5) * 1.15;
        const barFrac = Math.min(1, Math.abs(barAlong) / 0.58);
        const barAcross = Math.pow(Math.random(), 2.2) * negZ * (0.24 - barFrac * 0.08);
        positions[i3] = barAlong * cosB - barAcross * sinB;
        positions[i3 + 1] = Math.pow(Math.random(), 2.7) * negY * 0.16 * (1 - barFrac * 0.45);
        positions[i3 + 2] = barAlong * sinB + barAcross * cosB;

        tmpColor.copy(cInside).lerp(cGold, barFrac * 0.85);
        if (Math.random() > 0.72) tmpColor.lerp(cWhite, 0.35);
        colors[i3] = tmpColor.r;
        colors[i3 + 1] = tmpColor.g;
        colors[i3 + 2] = tmpColor.b;

        const isBrightStar = Math.random() > 0.86;
        sizesAttr[placed] = isBrightStar ? 2.4 + Math.random() * 1.8 : 0.9 + Math.random() * 1.25;
        alphasAttr[placed] = (0.68 + Math.random() * 0.32) * (1 - barFrac * 0.25);
        phasesAttr[placed] = Math.random() * Math.PI * 2;
        placed++;
        continue;
      }

      // Sweeping curved logarithmic spiral arms: 2 dense dominant arms (0, 2) + 2 finer spurs (1, 3)
      const isOuterTrail = seedWalk % 6 === 0;
      const r = isOuterTrail
        ? (0.45 + Math.pow(Math.random(), 0.9) * 0.62) * params.radius
        : Math.pow(Math.random(), 1.65) * params.radius;
      const armChoice = seedWalk % 7;
      const branchIndex = armChoice < 3 ? 0 : armChoice < 6 ? 2 : seedWalk % 2 === 0 ? 1 : 3;
      const isMinorSpur = branchIndex === 1 || branchIndex === 3;

      const branchAngle = (branchIndex / params.branches) * Math.PI * 2 + barAngle;
      const spinAngle = r * params.spin + Math.log(1 + r * 2.4) * 0.68;

      // Angular offset from arm ridge: negative = inner concave trailing side (carves dark dust lanes!)
      const gaussianApprox = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2.0;
      const angularWidth = (isMinorSpur ? 0.24 : 0.32) * (0.52 + 0.55 * (r / params.radius));
      const deltaAngle = gaussianApprox * angularWidth;

      // Carve subtle astronomical dark dust lanes on the inner concave edge of primary spiral arms
      if (!isMinorSpur && r > 0.38 && r < 2.45 && deltaAngle > -0.18 && deltaAngle < -0.045) {
        if (Math.random() < 0.72) continue;
      }

      const finalAngle = branchAngle + spinAngle + deltaAngle;
      const radialJitter = (Math.random() - 0.5) * (0.08 + r * 0.08);
      const radiusActual = Math.max(0.05, r + radialJitter);

      positions[i3] = Math.cos(finalAngle) * radiusActual;
      positions[i3 + 1] =
        Math.pow(Math.random(), 2.9) * negY * (0.065 + Math.exp(-r * 2.0) * 0.38);
      positions[i3 + 2] = Math.sin(finalAngle) * radiusActual;

      // Coherent galactic stellar population colors with organic temperature variation (no discrete bands)
      const t = Math.min(1.12, r / params.radius);
      const jitterT = Math.max(0, Math.min(1, t + (Math.random() - 0.5) * 0.16));
      if (jitterT < 0.22) {
        tmpColor.copy(cInside).lerp(cGold, jitterT / 0.22);
      } else if (jitterT < 0.45) {
        const u = (jitterT - 0.22) / 0.23;
        tmpColor.copy(cGold).lerp(Math.random() > 0.45 ? cRose : cWhite, u);
      } else if (jitterT < 0.72) {
        const u = (jitterT - 0.45) / 0.27;
        const midTarget = deltaAngle > 0.04 ? cBlueWhite : Math.random() > 0.5 ? cLavender : cMagenta;
        tmpColor.copy(cWhite).lerp(midTarget, 0.55 + 0.45 * u);
      } else {
        const u = (jitterT - 0.72) / 0.28;
        const outerTarget =
          deltaAngle > 0.03 ? (Math.random() > 0.42 ? cCyan : cBlueWhite) : Math.random() > 0.5 ? cViolet : cLavender;
        tmpColor.copy(cBlueWhite).lerp(outerTarget, 0.4 + 0.6 * u);
      }

      // Subtle star-forming pink/magenta/ivory accents along bright ridges
      if (Math.random() > 0.91 && t > 0.25 && t < 0.85) {
        tmpColor.lerp(Math.random() > 0.5 ? cMagenta : cInside, 0.42);
      }

      colors[i3] = tmpColor.r;
      colors[i3 + 1] = tmpColor.g;
      colors[i3 + 2] = tmpColor.b;

      const tier = Math.random();
      if (tier > 0.955) {
        // Rare bright supergiant stars
        sizesAttr[placed] = 3.2 + Math.random() * 2.1;
        alphasAttr[placed] = 0.85 + Math.random() * 0.15;
      } else if (tier > 0.72) {
        // Medium spiral arm stars
        sizesAttr[placed] = 1.6 + Math.random() * 1.3;
        alphasAttr[placed] = 0.58 + Math.random() * 0.34;
      } else {
        // Fine luminous Milky Way stardust
        sizesAttr[placed] = 0.65 + Math.random() * 0.9;
        alphasAttr[placed] = 0.28 + Math.random() * 0.36;
      }
      // Brighter near inner bulge & primary spiral ridge
      alphasAttr[placed] *= (isMinorSpur ? 0.76 : 1.0) * (1.0 - t * 0.18) * (deltaAngle > -0.02 ? 1.05 : 0.78);
      phasesAttr[placed] = negX * (Math.random() * Math.PI * 2);
      placed++;
    }

    pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    pointsGeo.setAttribute("aSize", new THREE.BufferAttribute(sizesAttr, 1));
    pointsGeo.setAttribute("aPhase", new THREE.BufferAttribute(phasesAttr, 1));
    pointsGeo.setAttribute("aAlpha", new THREE.BufferAttribute(alphasAttr, 1));

    const galaxyRoot = new THREE.Group();
    scene.add(galaxyRoot);

    const pointsMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: dprCap },
        uScale: { value: isMobile ? 4.8 : 4.2 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uScale;
        void main() {
          vColor = color;
          float twinkle = 0.88 + 0.12 * sin(uTime * 1.35 + aPhase);
          vAlpha = aAlpha * twinkle;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          float dist = max(0.32, -mvPos.z);
          gl_PointSize = clamp(aSize * uScale * uPixelRatio / dist, 1.15, 22.0);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d2 = dot(uv, uv) * 4.0;
          if (d2 > 1.0) discard;
          float core = exp(-d2 * 12.0);
          float halo = exp(-d2 * 3.4) * 0.48;
          float intensity = (core + halo) * vAlpha;
          vec3 starCol = mix(vColor, vec3(1.0, 0.99, 0.96), core * 0.65);
          gl_FragColor = vec4(starCol * intensity, intensity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const starPoints = new THREE.Points(pointsGeo, pointsMat);
    galaxyRoot.add(starPoints);

    // Soft volumetric-looking nebula & H-II clouds nestled along & between spiral arms
    const nebulaCount = isMobile ? 160 : 320;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(nebulaCount * 3);
    const nebulaCol = new Float32Array(nebulaCount * 3);
    for (let i = 0; i < nebulaCount; i++) {
      const i3 = i * 3;
      const neg = Math.random() < 0.5 ? 1 : -1;
      const r = (0.14 + Math.pow(Math.random(), 0.92) * 0.9) * params.radius;
      const spinAngle = r * params.spin + Math.log(1 + r * 2.4) * 0.68;
      const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2 + barAngle;
      const angOffset = (Math.random() - 0.5) * (0.28 + r * 0.14);

      nebulaPos[i3] = Math.cos(branchAngle + spinAngle + angOffset) * r;
      nebulaPos[i3 + 1] = Math.pow(Math.random(), 2.2) * neg * 0.09;
      nebulaPos[i3 + 2] = Math.sin(branchAngle + spinAngle + angOffset) * r;

      const t = r / params.radius;
      if (t < 0.28) {
        tmpColor.copy(cGold).lerp(cRose, t / 0.28);
      } else if (t < 0.62) {
        tmpColor.copy(cRose).lerp(Math.random() > 0.5 ? cViolet : cMagenta, (t - 0.28) / 0.34);
      } else {
        tmpColor.copy(cLavender).lerp(cCyan, Math.min(1, (t - 0.62) / 0.38));
      }
      nebulaCol[i3] = tmpColor.r;
      nebulaCol[i3 + 1] = tmpColor.g;
      nebulaCol[i3 + 2] = tmpColor.b;
    }
    nebulaGeo.setAttribute("position", new THREE.BufferAttribute(nebulaPos, 3));
    nebulaGeo.setAttribute("color", new THREE.BufferAttribute(nebulaCol, 3));
    const nebulaMat = new THREE.PointsMaterial({
      size: isMobile ? 0.36 : 0.42,
      map: nebulaGlowTex,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.068,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const nebulaPoints = new THREE.Points(nebulaGeo, nebulaMat);
    galaxyRoot.add(nebulaPoints);

    // Dense, noticeably warmer & brighter central galactic bulge
    const coreGeo = new THREE.BufferGeometry();
    const coreCount = isMobile ? 1100 : 2200;
    const corePos = new Float32Array(coreCount * 3);
    const coreCol = new Float32Array(coreCount * 3);
    const coreSizes = new Float32Array(coreCount);
    const corePhases = new Float32Array(coreCount);
    const coreAlphas = new Float32Array(coreCount);
    for (let i = 0; i < coreCount; i++) {
      const i3 = i * 3;
      const rr = Math.pow(Math.random(), 2.4) * 0.72;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      corePos[i3] = Math.sin(phi) * Math.cos(theta) * rr;
      corePos[i3 + 1] = Math.cos(phi) * rr * 0.4;
      corePos[i3 + 2] = Math.sin(phi) * Math.sin(theta) * rr;
      const ratio = Math.min(1, rr / 0.72);
      tmpColor.copy(cInside).lerp(cGold, ratio * 0.85);
      coreCol[i3] = tmpColor.r;
      coreCol[i3 + 1] = tmpColor.g;
      coreCol[i3 + 2] = tmpColor.b;
      coreSizes[i] = 1.6 + (1 - ratio) * 2.2 + Math.random() * 1.1;
      corePhases[i] = Math.random() * Math.PI * 2;
      coreAlphas[i] = 0.55 + (1 - ratio) * 0.45;
    }
    coreGeo.setAttribute("position", new THREE.BufferAttribute(corePos, 3));
    coreGeo.setAttribute("color", new THREE.BufferAttribute(coreCol, 3));
    coreGeo.setAttribute("aSize", new THREE.BufferAttribute(coreSizes, 1));
    coreGeo.setAttribute("aPhase", new THREE.BufferAttribute(corePhases, 1));
    coreGeo.setAttribute("aAlpha", new THREE.BufferAttribute(coreAlphas, 1));
    const coreMat = pointsMat.clone();
    coreMat.uniforms = {
      uTime: pointsMat.uniforms.uTime,
      uPixelRatio: pointsMat.uniforms.uPixelRatio,
      uScale: { value: isMobile ? 5.1 : 4.5 },
    };
    const corePoints = new THREE.Points(coreGeo, coreMat);
    galaxyRoot.add(corePoints);

    // Dummy reference kept for cleanup compatibility
    const gemGeo = new THREE.BufferGeometry();
    const gemMat = new THREE.PointsMaterial({ visible: false });

    // Soft central galactic core bloom halo
    const coreHaloMat = new THREE.SpriteMaterial({
      map: nebulaGlowTex,
      color: new THREE.Color("#FFE9BE"),
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coreHaloSprite = new THREE.Sprite(coreHaloMat);
    coreHaloSprite.scale.set(1.75, 1.12, 1);
    galaxyRoot.add(coreHaloSprite);

    // Distant deep-space background starfield
    const bgCount = isMobile ? 420 : 720;
    const bgGeo = new THREE.BufferGeometry();
    const bgPos = new Float32Array(bgCount * 3);
    for (let i = 0; i < bgCount; i++) {
      const i3 = i * 3;
      const rBg = 9 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      bgPos[i3] = rBg * Math.sin(phi) * Math.cos(theta);
      bgPos[i3 + 1] = rBg * Math.cos(phi);
      bgPos[i3 + 2] = rBg * Math.sin(phi) * Math.sin(theta);
    }
    bgGeo.setAttribute("position", new THREE.BufferAttribute(bgPos, 3));
    const bgMat = new THREE.PointsMaterial({
      size: isMobile ? 0.045 : 0.035,
      map: starGlowTex,
      color: new THREE.Color("#E8EEFF"),
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
    });
    const bgStars = new THREE.Points(bgGeo, bgMat);
    scene.add(bgStars);

    // 2. Luminous miniature celestial photo planets embedded across all 3 spiral arms
    // Each planet uses spherical curvature projection, limb darkening, atmospheric Fresnel rim lighting,
    // and champagne/ivory/lavender/rose cosmic corona matching surrounding stars.
    const spritesGroup = new THREE.Group();
    galaxyRoot.add(spritesGroup);

    const createdTextures: THREE.Texture[] = [];
    const createdMaterials: THREE.SpriteMaterial[] = [];
    const spriteObjects: Array<{
      sprite: THREE.Sprite;
      orbitSpeed: number;
      bobPhase: number;
      baseY: number;
      baseScale: number;
      pulseSpeed: number;
    }> = [];
    const raycastSprites: THREE.Sprite[] = [];

    const spriteCount = isMobile ? 120 : 190;
    let isDisposed = false;

    const PLANET_RIMS = [
      { core: "rgba(255, 248, 235, 1.0)", glow: "rgba(255, 224, 150, 0.72)", outer: "rgba(240, 200, 110, 0)" }, // Brilliant Champagne Gold
      { core: "rgba(248, 240, 255, 1.0)", glow: "rgba(215, 195, 255, 0.68)", outer: "rgba(180, 160, 250, 0)" }, // Luminous Lavender
      { core: "rgba(255, 240, 248, 1.0)", glow: "rgba(255, 185, 210, 0.68)", outer: "rgba(240, 160, 190, 0)" }, // Luminous Rose
    ] as const;

    // Precompute shared spherical shading + Fresnel rim + specular crescent overlay once for all planets
    const PLANET_DIM = 192;
    const PLANET_CX = PLANET_DIM / 2;
    const PLANET_CY = PLANET_DIM / 2;
    const PLANET_SPHERE_R = Math.floor(PLANET_DIM * 0.4);
    const sharedOverlay = document.createElement("canvas");
    sharedOverlay.width = PLANET_DIM;
    sharedOverlay.height = PLANET_DIM;
    const ovCtx = sharedOverlay.getContext("2d");
    if (ovCtx) {
      // Subtle spherical limb darkening + Fresnel rim
      const limbGrad = ovCtx.createRadialGradient(
        PLANET_CX - PLANET_SPHERE_R * 0.12,
        PLANET_CY - PLANET_SPHERE_R * 0.14,
        PLANET_SPHERE_R * 0.25,
        PLANET_CX,
        PLANET_CY,
        PLANET_SPHERE_R
      );
      limbGrad.addColorStop(0, "rgba(255, 252, 245, 0)");
      limbGrad.addColorStop(0.72, "rgba(10, 8, 18, 0.12)");
      limbGrad.addColorStop(0.92, "rgba(255, 240, 215, 0.28)");
      limbGrad.addColorStop(1, "rgba(255, 245, 225, 0.58)");
      ovCtx.fillStyle = limbGrad;
      ovCtx.beginPath();
      ovCtx.arc(PLANET_CX, PLANET_CY, PLANET_SPHERE_R, 0, Math.PI * 2);
      ovCtx.fill();

      // Delicate top-left celestial crescent specular highlight
      const spec = ovCtx.createRadialGradient(
        PLANET_CX - PLANET_SPHERE_R * 0.35,
        PLANET_CY - PLANET_SPHERE_R * 0.38,
        0,
        PLANET_CX - PLANET_SPHERE_R * 0.35,
        PLANET_CY - PLANET_SPHERE_R * 0.38,
        PLANET_SPHERE_R * 0.82
      );
      spec.addColorStop(0, "rgba(255, 255, 255, 0.42)");
      spec.addColorStop(0.35, "rgba(255, 250, 240, 0.16)");
      spec.addColorStop(1, "rgba(255, 252, 245, 0)");
      ovCtx.fillStyle = spec;
      ovCtx.beginPath();
      ovCtx.arc(PLANET_CX, PLANET_CY, PLANET_SPHERE_R, 0, Math.PI * 2);
      ovCtx.fill();
    }

    const createCelestialPlanetTexture = async (
      src: string,
      rimVariant: (typeof PLANET_RIMS)[number],
      focal?: { fx: number; fy: number }
    ): Promise<THREE.CanvasTexture | null> => {
      try {
        let bmp: ImageBitmap | HTMLImageElement;
        let iw = 0;
        let ih = 0;
        if (typeof createImageBitmap === "function") {
          const resp = await fetch(src);
          if (!resp.ok || isDisposed) return null;
          const blob = await resp.blob();
          if (isDisposed) return null;
          bmp = await createImageBitmap(blob);
          iw = bmp.width;
          ih = bmp.height;
        } else {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = src;
          await img.decode();
          bmp = img;
          iw = img.width;
          ih = img.height;
        }
        if (isDisposed || iw === 0 || ih === 0) {
          if ("close" in bmp && typeof bmp.close === "function") bmp.close();
          return null;
        }

        const cv = document.createElement("canvas");
        cv.width = PLANET_DIM;
        cv.height = PLANET_DIM;
        const c = cv.getContext("2d");
        if (!c) {
          if ("close" in bmp && typeof bmp.close === "function") bmp.close();
          return null;
        }

        const outerR = PLANET_DIM * 0.5;
        const halo = c.createRadialGradient(
          PLANET_CX,
          PLANET_CY,
          PLANET_SPHERE_R * 0.85,
          PLANET_CX,
          PLANET_CY,
          outerR
        );
        halo.addColorStop(0, rimVariant.core);
        halo.addColorStop(0.38, rimVariant.glow);
        halo.addColorStop(1, rimVariant.outer);
        c.fillStyle = halo;
        c.beginPath();
        c.arc(PLANET_CX, PLANET_CY, outerR, 0, Math.PI * 2);
        c.fill();

        const cropSize = PLANET_SPHERE_R * 2;
        const imgScale = Math.max(cropSize / iw, cropSize / ih);
        const dw = iw * imgScale;
        const dh = ih * imgScale;
        const fx = focal?.fx ?? 0.5;
        const fy = focal?.fy ?? (ih > iw ? 0.38 : 0.45);
        const drawX =
          PLANET_CX - PLANET_SPHERE_R + Math.min(0, Math.max(cropSize - dw, cropSize * 0.5 - fx * dw));
        const drawY =
          PLANET_CY - PLANET_SPHERE_R + Math.min(0, Math.max(cropSize - dh, cropSize * 0.5 - fy * dh));

        c.save();
        c.beginPath();
        c.arc(PLANET_CX, PLANET_CY, PLANET_SPHERE_R, 0, Math.PI * 2);
        c.clip();
        c.drawImage(bmp, drawX, drawY, dw, dh);
        c.drawImage(sharedOverlay, 0, 0);
        c.restore();

        if ("close" in bmp && typeof bmp.close === "function") bmp.close();

        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        return tex;
      } catch {
        return null;
      }
    };

    // Decode & upload 1 planet texture per yielded frame after brief entry settle -> smooth 60 FPS fly-in
    (async () => {
      await new Promise<void>((res) => setTimeout(res, 220));
      const valid: Array<{ item: MemoryMedia; mat: THREE.SpriteMaterial }> = [];
      for (let idx = 0; idx < ALL_MEMORY_MEDIA.length; idx++) {
        if (isDisposed) return;
        const item = ALL_MEMORY_MEDIA[idx];
        const rimVariant = PLANET_RIMS[idx % PLANET_RIMS.length];
        const tex = await createCelestialPlanetTexture(item.src, rimVariant, {
          fx: item.fx ?? 0.5,
          fy: item.fy ?? 0.42,
        });
        if (tex && !isDisposed) {
          createdTextures.push(tex);
          const mat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
          });
          createdMaterials.push(mat);
          valid.push({ item, mat });
        }
        await new Promise<void>((res) => setTimeout(res, 18));
      }

      if (isDisposed || valid.length === 0) return;

      const shrutiEntries = valid.filter((v) => v.item.src.includes("/images/shruti/"));
      const otherEntries = valid.filter((v) => !v.item.src.includes("/images/shruti/"));

      const shuffledOrder: typeof valid = [];
      const maxRounds = 12;
      for (let round = 0; round < maxRounds; round++) {
        const roundShruti = [...shrutiEntries].sort(() => Math.random() - 0.5);
        for (let k = 0; k < roundShruti.length; k++) {
          if (
            shuffledOrder.length > 0 &&
            shuffledOrder[shuffledOrder.length - 1].item.src === roundShruti[k].item.src &&
            roundShruti.length > 1
          ) {
            const swapIdx = (k + 1) % roundShruti.length;
            [roundShruti[k], roundShruti[swapIdx]] = [roundShruti[swapIdx], roundShruti[k]];
          }
          shuffledOrder.push(roundShruti[k]);
        }
        if (otherEntries.length > 0) {
          shuffledOrder.push(otherEntries[round % otherEntries.length]);
        }
      }

      // O(1) spatial hash grid prevents O(N^2) spacing checks across candidate attempts
      const gridCell = 1.08;
      const spatialGrid = new Map<string, Array<{ x: number; y: number; z: number; src: string }>>();
      const cellKey = (gx: number, gz: number) => `${gx},${gz}`;
      const minSamePhotoDistSq = 1.05 * 1.05;
      const minAnyPhotoDistSq = 0.24 * 0.24;

      for (let i = 0; i < spriteCount; i++) {
        if (isDisposed) return;
        const entry = shuffledOrder[i % shuffledOrder.length];
        let bestX = 0;
        let bestY = 0;
        let bestZ = 0;
        let bestR = 0.5;

        for (let attempt = 0; attempt < 18; attempt++) {
          const r = 0.32 + Math.pow(Math.random(), 1.02) * (params.radius - 0.18);
          const spinAngle = r * params.spin + Math.log(1 + r * 2.4) * 0.68;
          const branchIdx = (i + attempt) % params.branches;
          const branchAngle = (branchIdx / params.branches) * Math.PI * 2 + barAngle;
          const spread = 0.22 * (0.55 + r / params.radius);
          const cx = Math.cos(branchAngle + spinAngle) * r + (Math.random() - 0.5) * spread;
          const cy = (Math.random() - 0.5) * 0.22;
          const cz = Math.sin(branchAngle + spinAngle) * r + (Math.random() - 0.5) * spread;

          const gx = Math.floor(cx / gridCell);
          const gz = Math.floor(cz / gridCell);
          let tooClose = false;

          outerLoop: for (let ox = -1; ox <= 1; ox++) {
            for (let oz = -1; oz <= 1; oz++) {
              const bucket = spatialGrid.get(cellKey(gx + ox, gz + oz));
              if (!bucket) continue;
              for (let pIdx = 0; pIdx < bucket.length; pIdx++) {
                const p = bucket[pIdx];
                const dx = cx - p.x;
                const dy = cy - p.y;
                const dz = cz - p.z;
                const distSq = dx * dx + dy * dy + dz * dz;
                if (p.src === entry.item.src && distSq < minSamePhotoDistSq) {
                  tooClose = true;
                  break outerLoop;
                }
                if (distSq < minAnyPhotoDistSq) {
                  tooClose = true;
                  break outerLoop;
                }
              }
            }
          }

          bestX = cx;
          bestY = cy;
          bestZ = cz;
          bestR = r;
          if (!tooClose) break;
        }

        const bgx = Math.floor(bestX / gridCell);
        const bgz = Math.floor(bestZ / gridCell);
        const k = cellKey(bgx, bgz);
        const list = spatialGrid.get(k);
        const pt = { x: bestX, y: bestY, z: bestZ, src: entry.item.src };
        if (list) list.push(pt);
        else spatialGrid.set(k, [pt]);

        const sprite = new THREE.Sprite(entry.mat);
        sprite.position.set(bestX, bestY, bestZ);

        const isHeroPlanet = i % 5 === 0;
        const baseScale = isMobile
          ? isHeroPlanet
            ? 0.14 + Math.random() * 0.035
            : 0.086 + Math.random() * 0.038
          : isHeroPlanet
            ? 0.13 + Math.random() * 0.035
            : 0.078 + Math.random() * 0.032;
        sprite.scale.set(baseScale, baseScale, 1);
        sprite.userData = { src: entry.item.src };

        spritesGroup.add(sprite);
        raycastSprites.push(sprite);
        spriteObjects.push({
          sprite,
          orbitSpeed: (0.015 + Math.random() * 0.018) * (1 - Math.min(0.65, bestR / params.radius)),
          bobPhase: Math.random() * Math.PI * 2,
          baseY: bestY,
          baseScale,
          pulseSpeed: 0.9 + Math.random() * 1.1,
        });

        if (i % 45 === 44) {
          await new Promise<void>((res) => setTimeout(res, 8));
        }
      }
    })();

    // Camera entry pull-back & smooth click-focus choreography
    let introElapsed = 0;
    const introDuration = reducedMotion ? 0 : 3.2;

    const focusAnim: CameraFocusAnim = {
      active: false,
      elapsed: 0,
      duration: 0.72,
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3(),
      startTarget: new THREE.Vector3(),
      endTarget: new THREE.Vector3(),
    };
    const savedBeforeFocus = {
      pos: overviewCamPos.clone(),
      target: new THREE.Vector3(0, 0, 0),
    };

    const startCameraGlide = (
      endPos: THREE.Vector3,
      endTarget: THREE.Vector3,
      duration: number,
      onDone?: () => void
    ) => {
      if (reducedMotion) {
        camera.position.copy(endPos);
        controls.target.copy(endTarget);
        controls.update();
        onDone?.();
        return;
      }
      focusAnim.active = true;
      focusAnim.elapsed = 0;
      focusAnim.duration = duration;
      focusAnim.startPos.copy(camera.position);
      focusAnim.endPos.copy(endPos);
      focusAnim.startTarget.copy(controls.target);
      focusAnim.endTarget.copy(endTarget);
      focusAnim.onDone = onDone;
    };

    resetCameraFnRef.current = () => {
      introElapsed = introDuration;
      startCameraGlide(overviewCamPos, new THREE.Vector3(0, 0, 0), 0.85);
    };

    pullBackFromFocusRef.current = () => {
      startCameraGlide(savedBeforeFocus.pos, savedBeforeFocus.target, 0.7);
    };

    // Raycaster tap to glide camera toward a glowing memory planet and reveal it
    let selectedOpen = false;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      pointer.x = (e.clientX / sizes.width) * 2 - 1;
      pointer.y = -(e.clientY / sizes.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastSprites, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const src = hitObj.userData?.src as string | undefined;
        if (!src) return;

        savedBeforeFocus.pos.copy(camera.position);
        savedBeforeFocus.target.copy(controls.target);

        const worldPos = new THREE.Vector3();
        hitObj.getWorldPosition(worldPos);
        const dir = camera.position.clone().sub(worldPos);
        if (dir.lengthSq() < 0.0001) dir.set(0.4, 0.3, 0.4);
        dir.normalize();
        const zoomPos = worldPos.clone().add(dir.multiplyScalar(0.42));

        introElapsed = introDuration;
        selectedOpen = true;
        setModalImgReady(false);
        const pre = new Image();
        pre.src = src;
        if (typeof pre.decode === "function") {
          pre.decode().catch(() => { });
        }
        if (soundEnabledRef.current) audioSynth.playGentleChime(783.99);

        startCameraGlide(zoomPos, worldPos, 0.62, () => {
          setSelectedSrc(src);
        });
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    // Lightweight WebGL 2-pass optical Gaussian blur + darkening post-process for the text overlay
    // (avoids expensive CSS backdrop-filter; active ONLY when blurMix > 0.002)
    let rtFull: THREE.WebGLRenderTarget | null = null;
    let rtBlurA: THREE.WebGLRenderTarget | null = null;
    let rtBlurB: THREE.WebGLRenderTarget | null = null;

    const blurScene = new THREE.Scene();
    const blurCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);

    const blurPassMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null as THREE.Texture | null },
        uTexelStep: { value: new THREE.Vector2(1 / 400, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uTexelStep;
        varying vec2 vUv;
        void main() {
          vec4 sum = texture2D(tDiffuse, vUv) * 0.227027;
          sum += texture2D(tDiffuse, clamp(vUv + uTexelStep * 1.5, 0.0, 1.0)) * 0.1945946;
          sum += texture2D(tDiffuse, clamp(vUv - uTexelStep * 1.5, 0.0, 1.0)) * 0.1945946;
          sum += texture2D(tDiffuse, clamp(vUv + uTexelStep * 3.5, 0.0, 1.0)) * 0.1216216;
          sum += texture2D(tDiffuse, clamp(vUv - uTexelStep * 3.5, 0.0, 1.0)) * 0.1216216;
          sum += texture2D(tDiffuse, clamp(vUv + uTexelStep * 6.0, 0.0, 1.0)) * 0.0702703;
          sum += texture2D(tDiffuse, clamp(vUv - uTexelStep * 6.0, 0.0, 1.0)) * 0.0702703;
          gl_FragColor = sum;
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    const compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tSharp: { value: null as THREE.Texture | null },
        tBlur: { value: null as THREE.Texture | null },
        uMix: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D tSharp;
        uniform sampler2D tBlur;
        uniform float uMix;
        varying vec2 vUv;
        void main() {
          vec4 sharp = texture2D(tSharp, vUv);
          vec4 blurred = texture2D(tBlur, vUv);
          float dist = length(vUv - vec2(0.5)) * 1.414;
          float vig = mix(1.0, 0.55, smoothstep(0.25, 1.0, dist));
          // Darken substantially while retaining clearly perceptible blurred Milky Way core & spiral silhouette
          vec3 darkBlurred = blurred.rgb * 0.56 * vig;
          vec3 darkSharp = sharp.rgb * 0.28 * vig;
          vec3 targetBg = mix(darkSharp, darkBlurred, 0.94);
          gl_FragColor = vec4(mix(sharp.rgb, targetBg, uMix), 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    const postQuad = new THREE.Mesh(quadGeo, blurPassMat);
    blurScene.add(postQuad);

    const ensureBlurTargets = () => {
      const fullW = Math.max(1, Math.round(sizes.width * Math.min(dprCap, 1.25)));
      const fullH = Math.max(1, Math.round(sizes.height * Math.min(dprCap, 1.25)));
      const blurW = Math.max(160, Math.round(sizes.width * 0.22));
      const blurH = Math.max(96, Math.round(sizes.height * 0.22));
      if (!rtFull || rtFull.width !== fullW || rtFull.height !== fullH) {
        rtFull?.dispose();
        rtBlurA?.dispose();
        rtBlurB?.dispose();
        const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
        const bOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
        rtFull = new THREE.WebGLRenderTarget(fullW, fullH, opts);
        rtBlurA = new THREE.WebGLRenderTarget(blurW, blurH, bOpts);
        rtBlurB = new THREE.WebGLRenderTarget(blurW, blurH, bOpts);
      }
    };

    const onResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      const nextDpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(nextDpr);
      pointsMat.uniforms.uPixelRatio.value = nextDpr;
      coreMat.uniforms.uPixelRatio.value = nextDpr;
      rtFull?.dispose();
      rtFull = null;
    };
    window.addEventListener("resize", onResize);

    // Render loop (tab-visibility aware so hidden tabs pause cleanly without time jumps)
    let rafId = 0;
    let prevTime = performance.now();
    let isTabHidden = document.hidden;

    const tick = (now: number) => {
      if (isDisposed || isTabHidden) return;
      const dt = Math.min((now - prevTime) / 1000, 0.05);
      prevTime = now;

      if (focusAnim.active) {
        focusAnim.elapsed += dt;
        const p = Math.min(1, focusAnim.elapsed / focusAnim.duration);
        const eased = 1 - Math.pow(1 - p, 3);
        camera.position.lerpVectors(focusAnim.startPos, focusAnim.endPos, eased);
        controls.target.lerpVectors(focusAnim.startTarget, focusAnim.endTarget, eased);
        controls.update();
        if (p >= 1) {
          focusAnim.active = false;
          const cb = focusAnim.onDone;
          focusAnim.onDone = undefined;
          cb?.();
        }
      } else if (introElapsed < introDuration) {
        introElapsed += dt;
        const p = Math.min(1, introElapsed / introDuration);
        const eased = 1 - Math.pow(1 - p, 3);
        camera.position.lerpVectors(introStartPos, overviewCamPos, eased);
        camera.lookAt(0, 0, 0);
      } else {
        controls.update();
      }

      if (!reducedMotion && !userInteracting && !focusAnim.active && !selectedOpen) {
        // Serene cosmic spiral drift + subtle star twinkle
        const rotSpeed = 0.042 * dt;
        galaxyRoot.rotation.y += rotSpeed;
        bgStars.rotation.y += rotSpeed * 0.15;
        const tSec = now * 0.001;
        pointsMat.uniforms.uTime.value = tSec;

        for (let i = 0; i < spriteObjects.length; i += 4) {
          const item = spriteObjects[i];
          item.sprite.position.y =
            item.baseY + Math.sin(tSec * item.pulseSpeed * 0.55 + item.bobPhase) * 0.007;
        }
      }

      if (!selectedOpen || focusAnim.active || userInteracting) {
        const blurMix = reducedMotion ? 0 : finaleVisualRef.current.blurMix;
        if (blurMix > 0.002) {
          ensureBlurTargets();
          renderer.setRenderTarget(rtFull);
          renderer.render(scene, camera);

          const bw = rtBlurA!.width;
          const bh = rtBlurA!.height;
          postQuad.material = blurPassMat;
          blurPassMat.uniforms.tDiffuse.value = rtFull!.texture;
          blurPassMat.uniforms.uTexelStep.value.set(1.2 / bw, 0);
          renderer.setRenderTarget(rtBlurA);
          renderer.render(blurScene, blurCam);

          blurPassMat.uniforms.tDiffuse.value = rtBlurA!.texture;
          blurPassMat.uniforms.uTexelStep.value.set(0, 1.2 / bh);
          renderer.setRenderTarget(rtBlurB);
          renderer.render(blurScene, blurCam);

          postQuad.material = compositeMat;
          compositeMat.uniforms.tSharp.value = rtFull!.texture;
          compositeMat.uniforms.tBlur.value = rtBlurB!.texture;
          compositeMat.uniforms.uMix.value = blurMix;
          renderer.setRenderTarget(null);
          renderer.render(blurScene, blurCam);
        } else {
          renderer.setRenderTarget(null);
          renderer.render(scene, camera);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        isTabHidden = true;
        cancelAnimationFrame(rafId);
      } else {
        isTabHidden = false;
        prevTime = performance.now();
        if (!isDisposed) {
          rafId = requestAnimationFrame(tick);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (!isTabHidden) {
      rafId = requestAnimationFrame(tick);
    }

    const origPullBack = pullBackFromFocusRef.current;
    pullBackFromFocusRef.current = () => {
      selectedOpen = false;
      origPullBack?.();
    };

    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      controls.removeEventListener("start", onControlStart);
      controls.removeEventListener("end", onControlEnd);
      controls.dispose();
      rtFull?.dispose();
      rtBlurA?.dispose();
      rtBlurB?.dispose();
      quadGeo.dispose();
      blurPassMat.dispose();
      compositeMat.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      nebulaGeo.dispose();
      nebulaMat.dispose();
      gemGeo.dispose();
      gemMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      coreHaloMat.dispose();
      bgGeo.dispose();
      bgMat.dispose();
      starGlowTex.dispose();
      nebulaGlowTex.dispose();
      createdMaterials.forEach((m) => m.dispose());
      createdTextures.forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, []);

  const handleReplayJourney = () => {
    if (soundEnabled) audioSynth.playGentleChime(523.25);
    reset();
  };

  if (webglError) {
    return (
      <section
        style={{
          position: "fixed",
          inset: 0,
          background: "radial-gradient(ellipse at center, #1d1532 0%, #05050a 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", color: "#FFF2E4", marginBottom: "1rem" }}>
          All these little moments, together, make one beautiful universe.
        </p>
        <button onClick={handleReplayJourney} className="scene-continue-btn">
          <RotateCcw size={14} />
          <span>Replay Journey</span>
        </button>
      </section>
    );
  }

  return (
    <section
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#030308",
        overflow: "hidden",
      }}
      aria-label="Chapter 12: The Memory Galaxy"
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
      />

      {/* Poetic Exploration Caption (Visible during initial exploration & after galaxy restores) */}
      {(finalePhase === 0 || finalePhase === 7) && (
        <div
          style={{
            position: "fixed",
            bottom: "max(4.4rem, calc(var(--safe-bottom) + 3.4rem))",
            left: 0,
            right: 0,
            textAlign: "center",
            padding: "0 1.25rem",
            pointerEvents: "none",
            zIndex: 25,
            animation: "galaxyCaptionIn 1.4s ease forwards",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(1.08rem, 2.5vw, 1.5rem)",
              color: "rgba(255, 242, 228, 0.9)",
              textShadow: "0 0 18px rgba(233, 199, 125, 0.35), 0 2px 18px rgba(0, 0, 0, 0.95)",
            }}
          >
            All these little moments, together, make one beautiful universe.
          </p>
          <p
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(233, 199, 125, 0.72)",
              marginTop: "0.35rem",
            }}
          >
            Drag to orbit • Zoom in to discover • Tap any star
          </p>
        </div>
      )}

          {/* Galaxy-Embedded Luminous Finale Overlay (WebGL background blurs/darkens gently behind crisp text;
              text fades out 0.8s earlier at 48.2s -> completely invisible as sharp galaxy restores) */}
          <div
            key={finaleCycle}
            aria-live="polite"
            style={{
              position: "fixed",
              inset: 0,
              background: reducedMotionUI
                ? "radial-gradient(ellipse 80% 72% at 50% 48%, rgba(5, 4, 14, 0.78) 0%, rgba(2, 2, 8, 0.92) 100%)"
                : "radial-gradient(ellipse 85% 75% at 50% 48%, rgba(4, 3, 12, 0.16) 0%, rgba(2, 2, 8, 0.44) 100%)",
              opacity: finalePhase >= 1 && finalePhase < 7 ? 1 : 0,
              transition:
                finalePhase === 7
                  ? "opacity 1.0s cubic-bezier(0.22, 1, 0.36, 1)"
                  : "opacity 1.25s cubic-bezier(0.22, 1, 0.36, 1)",
              pointerEvents: "none",
              zIndex: 35,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem 1.5rem",
              textAlign: "center",
            }}
          >
            {finalePhase >= 2 && (
              <div
                style={{
                  maxWidth: "min(92vw, 44rem)",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "clamp(0.85rem, 2.4dvh, 1.45rem)",
                }}
              >
                {/* Beat 1: And one last thing, Gheli... */}
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "clamp(1.55rem, 4.8vw, 2.65rem)",
                fontWeight: 400,
                color: "#FFF9F0",
                textShadow:
                  "0 0 22px rgba(255, 224, 165, 0.72), 0 0 44px rgba(233, 199, 125, 0.38), 0 4px 20px rgba(0, 0, 0, 0.95)",
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              <CosmicPhraseLine
                text="And one last thing, Gheli..."
                reducedMotion={reducedMotionUI}
              />
            </p>

            {/* Beat 2: You don't have to remember every little thing in here. */}
            {finalePhase >= 3 && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(1.22rem, 3.6vw, 1.9rem)",
                  fontWeight: 300,
                  color: "#FFF4E6",
                  textShadow:
                    "0 0 18px rgba(255, 240, 215, 0.54), 0 0 36px rgba(217, 166, 183, 0.3), 0 3px 16px rgba(0, 0, 0, 0.95)",
                  lineHeight: 1.4,
                  margin: 0,
                }}
              >
                <CosmicPhraseLine
                  text="You don't have to remember every little thing in here."
                  reducedMotion={reducedMotionUI}
                />
              </p>
            )}

            {/* Beat 3: Just remember that, somewhere, someone thought you were worth making an entire universe for. */}
            {finalePhase >= 4 && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(1.26rem, 3.8vw, 2.05rem)",
                  fontWeight: 400,
                  color: "#FFE3A3",
                  textShadow:
                    "0 0 22px rgba(255, 212, 125, 0.72), 0 0 48px rgba(233, 199, 125, 0.4), 0 4px 18px rgba(0, 0, 0, 0.95)",
                  lineHeight: 1.42,
                  margin: 0,
                }}
              >
                <CosmicPhraseLine
                  text="Just remember that, somewhere, someone thought you were worth making an entire universe for."
                  reducedMotion={reducedMotionUI}
                />
              </p>
            )}

            {/* Beat 4: And I hope, whenever you look up at the stars, one of them makes you smile. */}
            {finalePhase >= 5 && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: "clamp(1.24rem, 3.7vw, 1.98rem)",
                  fontWeight: 300,
                  color: "#F8D4EA",
                  textShadow:
                    "0 0 20px rgba(235, 165, 210, 0.65), 0 0 42px rgba(185, 117, 245, 0.35), 0 3px 18px rgba(0, 0, 0, 0.95)",
                  lineHeight: 1.4,
                  marginTop: "0.2rem",
                  marginBottom: 0,
                }}
              >
                <CosmicPhraseLine
                  text="And I hope, whenever you look up at the stars, one of them makes you smile."
                  reducedMotion={reducedMotionUI}
                />
              </p>
            )}

            {/* Beat 5: Authentic Handwritten Continuous Ink Signature ("Umar") */}
            {finalePhase >= 6 && (
              <div
                style={{
                  marginTop: "0.55rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.2rem",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: "1.02rem",
                    color: "#FFE3A3",
                    textShadow: "0 0 18px rgba(255, 215, 130, 0.85)",
                    letterSpacing: "0.35em",
                    opacity: reducedMotionUI ? 1 : 0,
                    animation: reducedMotionUI
                      ? undefined
                      : "galaxyPhraseRise 0.8s ease forwards",
                  }}
                >
                  ✦
                </span>
                <UmarSignatureSvg reducedMotion={reducedMotionUI} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Galaxy Controls */}
      <div
        style={{
          position: "fixed",
          bottom: "max(1.1rem, var(--safe-bottom))",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: "0.65rem",
          zIndex: 30,
          opacity: finalePhase >= 1 && finalePhase < 7 ? 0.25 : 1,
          transition: "opacity 1.2s ease",
        }}
      >
        <button
          type="button"
          onClick={() => resetCameraFnRef.current?.()}
          className="hud-btn"
        >
          <Compass size={13} />
          <span>Reset View</span>
        </button>

        <button type="button" onClick={handleReplayJourney} className="hud-btn">
          <RotateCcw size={13} />
          <span>Replay</span>
        </button>
      </div>

      {/* Focused Memory Reveal after gliding close */}
      {selectedSrc && (
        <div
          onClick={closeSelectedMemory}
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background:
              "radial-gradient(circle at center, rgba(16, 12, 28, 0.72) 0%, rgba(3, 3, 10, 0.94) 76%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={closeSelectedMemory}
            className="hud-btn"
            style={{
              position: "fixed",
              top: "max(4.4rem, calc(var(--safe-top) + 3.5rem))",
              right: "max(1.2rem, var(--safe-right))",
              minWidth: "42px",
              minHeight: "42px",
              justifyContent: "center",
            }}
            aria-label="Return to galaxy"
          >
            <X size={16} />
          </button>
          <img
            ref={(el) => {
              if (el && el.complete && el.naturalWidth > 0 && !modalImgReady) {
                setModalImgReady(true);
              }
            }}
            src={selectedSrc}
            alt="Memory detail"
            decoding="sync"
            onLoad={() => setModalImgReady(true)}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "86vw",
              maxHeight: "76dvh",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              borderRadius: "8px",
              opacity: modalImgReady ? 1 : 0,
              transition: "opacity 0.28s ease",
              boxShadow:
                "0 28px 80px rgba(0,0,0,0.95), 0 0 38px rgba(233, 199, 125, 0.16)",
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes galaxyCaptionIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes galaxyPhraseRise {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes umarSignatureDraw {
          0% {
            stroke-dashoffset: 720;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes umarSweepDraw {
          0% {
            stroke-dashoffset: 160;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </section>
  );
}
