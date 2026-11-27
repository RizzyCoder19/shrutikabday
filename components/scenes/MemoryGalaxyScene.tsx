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
  const [finalMessageStep, setFinalMessageStep] = useState<number>(0);

  // Progressive final cinematic reveal pacing:
  // Step 0: Galaxy establishes and settles freely with opening music (0-7s)
  // Step 1: "And one last thing, Gheli..."
  // Step 2: "You don't have to remember every little thing in here."
  // Step 3: "Just remember that, somewhere, someone thought you were worth making an entire universe for."
  // Step 4: "And I hope, whenever you look up at the stars, one of them makes you smile."
  // Step 5: "— Umar"
  useEffect(() => {
    const t1 = setTimeout(() => setFinalMessageStep(1), 7500);
    const t2 = setTimeout(() => setFinalMessageStep(2), 11500);
    const t3 = setTimeout(() => setFinalMessageStep(3), 16000);
    const t4 = setTimeout(() => setFinalMessageStep(4), 21500);
    const t5 = setTimeout(() => setFinalMessageStep(5), 26500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
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
        antialias: true,
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

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.setClearColor(0x030308, 1);

    const scene = new THREE.Scene();

    // Camera sweeps out cleanly to classic (3, 3, 3) diagonal view over the 3-arm spiral
    const camera = new THREE.PerspectiveCamera(72, sizes.width / sizes.height, 0.03, 90);
    const introStartPos = new THREE.Vector3(0.45, 0.34, 0.48);
    const isPortrait = sizes.width / sizes.height < 0.85;
    const overviewCamPos = isPortrait
      ? new THREE.Vector3(3.1, 2.9, 3.1)
      : new THREE.Vector3(2.85, 2.55, 2.85);
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

    // 1. Milky Way barred-spiral galaxy with vibrant multi-color glowing particles & dust clouds
    const params = {
      count: isMobile ? 48000 : 74000,
      size: isMobile ? 0.022 : 0.017,
      radius: 2.95,
      branches: 4,
      spin: 3.45,
      randomness: 2.0,
      randomnessPower: 3.55,
      insideColor: "#FFFDF7",
      midColor: "#FFCE73",
      roseColor: "#E87AB5",
      magentaColor: "#B975F5",
      outsideColor: "#5AA2FF",
      tipColor: "#A8DCFF",
    };

    const starGlowTex = createStarGlowTexture();
    const nebulaGlowTex = createNebulaGlowTexture();

    const pointsGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const colorInside = new THREE.Color(params.insideColor);
    const colorMid = new THREE.Color(params.midColor);
    const colorRose = new THREE.Color(params.roseColor);
    const colorMagenta = new THREE.Color(params.magentaColor);
    const colorOutside = new THREE.Color(params.outsideColor);
    const colorTip = new THREE.Color(params.tipColor);

    const barAngle = 0.35;
    for (let i = 0; i < params.count; i++) {
      const i3 = i * 3;
      const neg = () => (Math.random() < 0.5 ? 1 : -1);

      // ~12% of stars form the Milky Way's central galactic bar feeding the spiral arms
      if (i % 8 === 0) {
        const barAlong = (Math.random() - 0.5) * 1.05;
        const barAcross = Math.pow(Math.random(), 2.2) * neg() * 0.22;
        const cosB = Math.cos(barAngle);
        const sinB = Math.sin(barAngle);
        positions[i3] = barAlong * cosB - barAcross * sinB;
        positions[i3 + 1] = Math.pow(Math.random(), 2.8) * neg() * 0.16;
        positions[i3 + 2] = barAlong * sinB + barAcross * cosB;

        const barMix = colorInside.clone().lerp(colorMid, Math.min(1, Math.abs(barAlong) / 0.55));
        colors[i3] = barMix.r;
        colors[i3 + 1] = barMix.g;
        colors[i3 + 2] = barMix.b;
        continue;
      }

      // Exponential core clustering + luminous outer trailing fragments
      const isOuterFragment = i % 5 === 0;
      const r = isOuterFragment
        ? (0.52 + Math.pow(Math.random(), 0.9) * 0.62) * params.radius
        : Math.pow(Math.random(), 1.95) * params.radius;
      const spinAngle = r * params.spin;
      const branchIndex = i % params.branches;
      const branchAngle = (branchIndex / params.branches) * Math.PI * 2 + barAngle;

      const armSpread = 0.28 + r * 0.24;
      const randomX = Math.pow(Math.random(), params.randomnessPower) * neg() * params.randomness * armSpread;
      const randomY = Math.pow(Math.random(), params.randomnessPower) * neg() * (0.1 + Math.exp(-r * 2.0) * 0.42);
      const randomZ = Math.pow(Math.random(), params.randomnessPower) * neg() * params.randomness * armSpread;

      positions[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

      const t = Math.min(1.15, r / params.radius);
      const mixed = colorInside.clone();
      if (t < 0.16) {
        mixed.lerp(colorMid, t / 0.16);
      } else if (t < 0.4) {
        mixed.copy(colorMid).lerp(colorRose, (t - 0.16) / 0.24);
      } else if (t < 0.62) {
        mixed.copy(colorRose).lerp(colorMagenta, (t - 0.4) / 0.22);
      } else if (t < 0.84) {
        mixed.copy(colorMagenta).lerp(colorOutside, (t - 0.62) / 0.22);
      } else {
        mixed.copy(colorOutside).lerp(colorTip, Math.min(1, (t - 0.84) / 0.3));
      }

      colors[i3] = mixed.r;
      colors[i3 + 1] = mixed.g;
      colors[i3 + 2] = mixed.b;
    }

    pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const galaxyRoot = new THREE.Group();
    scene.add(galaxyRoot);

    const pointsMat = new THREE.PointsMaterial({
      size: params.size,
      map: starGlowTex,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const starPoints = new THREE.Points(pointsGeo, pointsMat);
    galaxyRoot.add(starPoints);

    // Milky Way multi-color glowing nebula band & H-II star-forming clouds
    const nebulaCount = isMobile ? 2800 : 4600;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(nebulaCount * 3);
    const nebulaCol = new Float32Array(nebulaCount * 3);
    for (let i = 0; i < nebulaCount; i++) {
      const i3 = i * 3;
      const neg = () => (Math.random() < 0.5 ? 1 : -1);
      const r = (0.14 + Math.pow(Math.random(), 0.92) * 0.98) * params.radius;
      const spinAngle = r * params.spin;
      const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2 + barAngle;
      const scatter = 0.2 + r * 0.13;

      nebulaPos[i3] = Math.cos(branchAngle + spinAngle) * r + (Math.random() - 0.5) * scatter;
      nebulaPos[i3 + 1] = Math.pow(Math.random(), 2.2) * neg() * 0.14;
      nebulaPos[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + (Math.random() - 0.5) * scatter;

      const t = r / params.radius;
      const nc = t < 0.32
        ? colorMid.clone().lerp(colorRose, t / 0.32)
        : t < 0.62
          ? colorRose.clone().lerp(colorMagenta, (t - 0.32) / 0.3)
          : t < 0.85
            ? colorMagenta.clone().lerp(colorOutside, (t - 0.62) / 0.23)
            : colorOutside.clone().lerp(colorTip, Math.min(1, (t - 0.85) / 0.3));
      nebulaCol[i3] = nc.r;
      nebulaCol[i3 + 1] = nc.g;
      nebulaCol[i3 + 2] = nc.b;
    }
    nebulaGeo.setAttribute("position", new THREE.BufferAttribute(nebulaPos, 3));
    nebulaGeo.setAttribute("color", new THREE.BufferAttribute(nebulaCol, 3));
    const nebulaMat = new THREE.PointsMaterial({
      size: isMobile ? 0.26 : 0.21,
      map: nebulaGlowTex,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const nebulaPoints = new THREE.Points(nebulaGeo, nebulaMat);
    galaxyRoot.add(nebulaPoints);

    // Sparkling luminous foreground supergiant stars in gold, rose, violet & cyan-blue
    const gemCount = isMobile ? 650 : 1100;
    const gemGeo = new THREE.BufferGeometry();
    const gemPos = new Float32Array(gemCount * 3);
    const gemCol = new Float32Array(gemCount * 3);
    const gemPalette = [colorInside, colorMid, colorRose, colorMagenta, colorOutside, colorTip];
    for (let i = 0; i < gemCount; i++) {
      const i3 = i * 3;
      const r = (0.12 + Math.pow(Math.random(), 0.95) * 0.96) * params.radius;
      const spinAngle = r * params.spin;
      const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2 + barAngle;
      const scatter = 0.22 + r * 0.15;
      gemPos[i3] = Math.cos(branchAngle + spinAngle) * r + (Math.random() - 0.5) * scatter;
      gemPos[i3 + 1] = (Math.random() - 0.5) * 0.22;
      gemPos[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + (Math.random() - 0.5) * scatter;
      const gc = gemPalette[i % gemPalette.length];
      gemCol[i3] = gc.r;
      gemCol[i3 + 1] = gc.g;
      gemCol[i3 + 2] = gc.b;
    }
    gemGeo.setAttribute("position", new THREE.BufferAttribute(gemPos, 3));
    gemGeo.setAttribute("color", new THREE.BufferAttribute(gemCol, 3));
    const gemMat = new THREE.PointsMaterial({
      size: isMobile ? 0.048 : 0.038,
      map: starGlowTex,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const gemPoints = new THREE.Points(gemGeo, gemMat);
    galaxyRoot.add(gemPoints);

    // Highly dense, luminous warm galactic core bulge
    const coreGeo = new THREE.BufferGeometry();
    const coreCount = isMobile ? 1800 : 3200;
    const corePos = new Float32Array(coreCount * 3);
    const coreCol = new Float32Array(coreCount * 3);
    for (let i = 0; i < coreCount; i++) {
      const i3 = i * 3;
      const rr = Math.pow(Math.random(), 2.6) * 0.74;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      corePos[i3] = Math.sin(phi) * Math.cos(theta) * rr;
      corePos[i3 + 1] = Math.cos(phi) * rr * 0.42;
      corePos[i3 + 2] = Math.sin(phi) * Math.sin(theta) * rr;
      const c = colorInside.clone().lerp(colorMid, Math.min(1, rr / 0.74));
      coreCol[i3] = c.r;
      coreCol[i3 + 1] = c.g;
      coreCol[i3 + 2] = c.b;
    }
    coreGeo.setAttribute("position", new THREE.BufferAttribute(corePos, 3));
    coreGeo.setAttribute("color", new THREE.BufferAttribute(coreCol, 3));
    const coreMat = new THREE.PointsMaterial({
      size: isMobile ? 0.046 : 0.036,
      map: starGlowTex,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const corePoints = new THREE.Points(coreGeo, coreMat);
    galaxyRoot.add(corePoints);

    // Soft central galactic core bloom halo
    const coreHaloMat = new THREE.SpriteMaterial({
      map: nebulaGlowTex,
      color: new THREE.Color("#FFE8C2"),
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coreHaloSprite = new THREE.Sprite(coreHaloMat);
    coreHaloSprite.scale.set(1.6, 1.05, 1);
    galaxyRoot.add(coreHaloSprite);

    // Distant deep-space background starfield
    const bgCount = isMobile ? 550 : 1000;
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

    const spriteCount = isMobile ? 220 : 340;
    let isDisposed = false;

    const PLANET_RIMS = [
      { core: "rgba(255, 248, 235, 1.0)", glow: "rgba(255, 224, 150, 0.75)", outer: "rgba(240, 200, 110, 0)" }, // Brilliant Champagne Gold
      { core: "rgba(248, 240, 255, 1.0)", glow: "rgba(215, 195, 255, 0.72)", outer: "rgba(180, 160, 250, 0)" }, // Luminous Lavender
      { core: "rgba(255, 240, 248, 1.0)", glow: "rgba(255, 185, 210, 0.72)", outer: "rgba(240, 160, 190, 0)" }, // Luminous Rose
    ] as const;

    const createCelestialPlanetTexture = (
      src: string,
      rimVariant: (typeof PLANET_RIMS)[number],
      focal?: { fx: number; fy: number }
    ): Promise<THREE.CanvasTexture | null> =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (isDisposed) {
            resolve(null);
            return;
          }
          const dim = 256;
          const cv = document.createElement("canvas");
          cv.width = dim;
          cv.height = dim;
          const c = cv.getContext("2d");
          if (!c) {
            resolve(null);
            return;
          }

          const cx = dim / 2;
          const cy = dim / 2;
          const sphereR = Math.floor(dim * 0.40);
          const outerR = dim * 0.5;

          // Atmospheric outer planetary halo matching star glow softly
          const halo = c.createRadialGradient(cx, cy, sphereR * 0.85, cx, cy, outerR);
          halo.addColorStop(0, rimVariant.core);
          halo.addColorStop(0.38, rimVariant.glow);
          halo.addColorStop(1, rimVariant.outer);
          c.fillStyle = halo;
          c.beginPath();
          c.arc(cx, cy, outerR, 0, Math.PI * 2);
          c.fill();

          // Frame portrait cleanly around explicit subject focal point without cutting off faces
          const cropSize = sphereR * 2;
          const srcCanvas = document.createElement("canvas");
          srcCanvas.width = cropSize;
          srcCanvas.height = cropSize;
          const sc = srcCanvas.getContext("2d");
          if (!sc) {
            resolve(null);
            return;
          }
          const imgScale = Math.max(cropSize / img.width, cropSize / img.height);
          const dw = img.width * imgScale;
          const dh = img.height * imgScale;
          const fx = focal?.fx ?? 0.5;
          const fy = focal?.fy ?? (img.height > img.width ? 0.38 : 0.45);
          const drawX = Math.min(0, Math.max(cropSize - dw, cropSize * 0.5 - fx * dw));
          const drawY = Math.min(0, Math.max(cropSize - dh, cropSize * 0.5 - fy * dh));
          sc.drawImage(img, drawX, drawY, dw, dh);
          const srcData = sc.getImageData(0, 0, cropSize, cropSize).data;

          // Gentle spherical projection + crisp photo clarity + vibrant rim light
          const sphereImg = c.createImageData(cropSize, cropSize);
          const out = sphereImg.data;
          const invR = 1 / sphereR;

          for (let py = 0; py < cropSize; py++) {
            const ny = (py - sphereR + 0.5) * invR;
            for (let px = 0; px < cropSize; px++) {
              const nx = (px - sphereR + 0.5) * invR;
              const r2 = nx * nx + ny * ny;
              const outIdx = (py * cropSize + px) * 4;
              if (r2 > 1) {
                out[outIdx + 3] = 0;
                continue;
              }
              const r = Math.sqrt(r2);
              const nz = Math.sqrt(Math.max(0, 1 - r2));

              const warp = 1 - 0.08 * (1 - nz);
              const sx = Math.min(
                cropSize - 1,
                Math.max(0, Math.round((nx * warp + 1) * 0.5 * (cropSize - 1)))
              );
              const sy = Math.min(
                cropSize - 1,
                Math.max(0, Math.round((ny * warp + 1) * 0.5 * (cropSize - 1)))
              );
              const srcIdx = (sy * cropSize + sx) * 4;

              // High photo vibrancy & clarity + glowing rim
              const lightDot = Math.max(0, nx * -0.25 + ny * -0.3 + nz * 0.9);
              const limb = 0.72 + 0.28 * Math.pow(nz, 0.4) * (0.8 + 0.25 * lightDot);
              const fresnel = Math.pow(1 - nz, 2.4) * 0.75;

              out[outIdx] = Math.min(255, Math.round(srcData[srcIdx] * limb + 255 * fresnel));
              out[outIdx + 1] = Math.min(
                255,
                Math.round(srcData[srcIdx + 1] * limb + 242 * fresnel)
              );
              out[outIdx + 2] = Math.min(
                255,
                Math.round(srcData[srcIdx + 2] * limb + 225 * fresnel)
              );
              // Clean spherical edge feather
              const edgeAlpha = r > 0.95 ? Math.max(0, (1 - r) / 0.05) : 1;
              out[outIdx + 3] = Math.round(255 * edgeAlpha);
            }
          }

          // Composite spherical globe onto halo canvas cleanly
          const tmpSphere = document.createElement("canvas");
          tmpSphere.width = cropSize;
          tmpSphere.height = cropSize;
          tmpSphere.getContext("2d")!.putImageData(sphereImg, 0, 0);
          c.drawImage(tmpSphere, cx - sphereR, cy - sphereR);

          // Delicate top-left celestial crescent reflection
          const spec = c.createRadialGradient(
            cx - sphereR * 0.35,
            cy - sphereR * 0.38,
            0,
            cx - sphereR * 0.35,
            cy - sphereR * 0.38,
            sphereR * 0.85
          );
          spec.addColorStop(0, "rgba(255, 255, 255, 0.42)");
          spec.addColorStop(0.35, "rgba(255, 250, 240, 0.18)");
          spec.addColorStop(1, "rgba(255, 252, 245, 0)");
          c.fillStyle = spec;
          c.beginPath();
          c.arc(cx, cy, sphereR, 0, Math.PI * 2);
          c.fill();

          const tex = new THREE.CanvasTexture(cv);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          resolve(tex);
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });

    // Generate 1 celestial rim variant per item so GPU textures stay <= 20 uploads while planets shimmer in champagne/lavender/rose
    Promise.all(
      ALL_MEMORY_MEDIA.map(async (item, idx) => {
        const rimVariant = PLANET_RIMS[idx % PLANET_RIMS.length];
        const tex = await createCelestialPlanetTexture(item.src, rimVariant, {
          fx: item.fx ?? 0.5,
          fy: item.fy ?? 0.42,
        });
        if (!tex || isDisposed) return null;
        createdTextures.push(tex);
        const mat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        });
        createdMaterials.push(mat);
        return { item, mat };
      })
    ).then((loaded) => {
      if (isDisposed) return;
      const valid = loaded.filter(Boolean) as Array<{
        item: MemoryMedia;
        mat: THREE.SpriteMaterial;
      }>;
      if (valid.length === 0) return;

      // Interleave Shruti's photos evenly (never consecutive duplicates) and enforce spatial separation
      // so the same picture is NEVER placed near another copy of itself.
      const shrutiEntries = valid.filter((v) => v.item.src.includes("/images/shruti/"));
      const otherEntries = valid.filter((v) => !v.item.src.includes("/images/shruti/"));

      const shuffledOrder: typeof valid = [];
      const maxRounds = 12;
      for (let round = 0; round < maxRounds; round++) {
        const roundShruti = [...shrutiEntries].sort(() => Math.random() - 0.5);
        for (let k = 0; k < roundShruti.length; k++) {
          // Prevent adjacent match across round boundaries
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

      const placedPlanets: Array<{ x: number; y: number; z: number; src: string }> = [];
      const minSamePhotoDistSq = 1.05 * 1.05; // Enforce >= 1.05 units between identical photos
      const minAnyPhotoDistSq = 0.22 * 0.22;  // Prevent overlapping planets

      for (let i = 0; i < spriteCount; i++) {
        const entry = shuffledOrder[i % shuffledOrder.length];
        let bestX = 0;
        let bestY = 0;
        let bestZ = 0;
        let bestR = 0.5;

        // Sample candidate positions along spiral arms and pick one far from any copy of the same photo
        for (let attempt = 0; attempt < 24; attempt++) {
          const r = 0.3 + Math.pow(Math.random(), 1.02) * (params.radius - 0.16);
          const spinAngle = r * params.spin;
          const branchIdx = (i + attempt) % params.branches;
          const branchAngle = (branchIdx / params.branches) * Math.PI * 2 + barAngle;
          const spread = 0.25 * (0.55 + r / params.radius);
          const cx = Math.cos(branchAngle + spinAngle) * r + (Math.random() - 0.5) * spread;
          const cy = (Math.random() - 0.5) * 0.26;
          const cz = Math.sin(branchAngle + spinAngle) * r + (Math.random() - 0.5) * spread;

          let tooClose = false;
          for (let pIdx = 0; pIdx < placedPlanets.length; pIdx++) {
            const p = placedPlanets[pIdx];
            const dx = cx - p.x;
            const dy = cy - p.y;
            const dz = cz - p.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            if (p.src === entry.item.src && distSq < minSamePhotoDistSq) {
              tooClose = true;
              break;
            }
            if (distSq < minAnyPhotoDistSq) {
              tooClose = true;
              break;
            }
          }

          bestX = cx;
          bestY = cy;
          bestZ = cz;
          bestR = r;
          if (!tooClose) break;
        }

        placedPlanets.push({ x: bestX, y: bestY, z: bestZ, src: entry.item.src });

        const sprite = new THREE.Sprite(entry.mat);
        sprite.position.set(bestX, bestY, bestZ);

        // Tiered planetary sizes: prominent and radiant so photos are the pure focal point
        const isHeroPlanet = i % 5 === 0;
        const baseScale = isMobile
          ? isHeroPlanet
            ? 0.135 + Math.random() * 0.035
            : 0.082 + Math.random() * 0.038
          : isHeroPlanet
            ? 0.125 + Math.random() * 0.035
            : 0.075 + Math.random() * 0.032;
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
      }
    });

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

    const onResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    };
    window.addEventListener("resize", onResize);

    // Render loop
    let rafId = 0;
    let prevTime = performance.now();

    const tick = (now: number) => {
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
        // Serene cosmic spiral drift resembling a true living Milky Way
        const rotSpeed = 0.045 * dt;
        galaxyRoot.rotation.y += rotSpeed;
        bgStars.rotation.y += rotSpeed * 0.15;

        const tSec = now * 0.001;
        for (let i = 0; i < spriteObjects.length; i += 4) {
          const item = spriteObjects[i];
          item.sprite.position.y =
            item.baseY + Math.sin(tSec * item.pulseSpeed * 0.55 + item.bobPhase) * 0.007;
        }
      }

      if (!selectedOpen || focusAnim.active || userInteracting) {
        renderer.render(scene, camera);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const origPullBack = pullBackFromFocusRef.current;
    pullBackFromFocusRef.current = () => {
      selectedOpen = false;
      origPullBack?.();
    };

    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      controls.removeEventListener("start", onControlStart);
      controls.removeEventListener("end", onControlEnd);
      controls.dispose();
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

      {/* Initial Poetic Caption (Bottom, during galaxy immersion) */}
      {finalMessageStep === 0 && (
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
            transition: "opacity 1.2s ease",
            opacity: 1,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 2.5vw, 1.55rem)",
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

      {/* Final Cinematic Glowing Message Overlay (Top of Screen after galaxy settles) */}
      {finalMessageStep >= 1 && (
        <div
          style={{
            position: "fixed",
            top: "max(4.1rem, calc(var(--safe-top) + 3.3rem))",
            left: 0,
            right: 0,
            textAlign: "center",
            padding: "0.75rem 1.25rem 1.5rem",
            background:
              "radial-gradient(ellipse at top, rgba(4, 3, 12, 0.72) 0%, rgba(4, 3, 12, 0.36) 55%, transparent 85%)",
            pointerEvents: "none",
            zIndex: 25,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              maxWidth: "min(92vw, 38rem)",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.38rem",
              pointerEvents: "none",
            }}
          >
            {/* Beat 1: And one last thing, Gheli... */}
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "clamp(1.18rem, 3.2vw, 1.62rem)",
                color: "#FFF8EE",
                textShadow:
                  "0 0 18px rgba(255, 224, 165, 0.65), 0 0 36px rgba(233, 199, 125, 0.35), 0 2px 14px rgba(0, 0, 0, 0.98)",
                lineHeight: 1.32,
                margin: 0,
                opacity: finalMessageStep >= 1 ? 1 : 0,
                animation: "galaxyTextFade 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
              }}
            >
              And one last thing, Gheli...
            </p>

            {/* Beat 2: You don't have to remember every little thing in here. */}
            {finalMessageStep >= 2 && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(0.95rem, 2.4vw, 1.22rem)",
                  color: "#FFF4E6",
                  textShadow:
                    "0 0 14px rgba(255, 240, 215, 0.45), 0 0 28px rgba(217, 166, 183, 0.28), 0 2px 14px rgba(0, 0, 0, 0.98)",
                  lineHeight: 1.42,
                  margin: 0,
                  opacity: 1,
                  animation: "galaxyTextFade 1.3s ease forwards",
                }}
              >
                You don&apos;t have to remember every little thing in here.
              </p>
            )}

            {/* Beat 3: Just remember that, somewhere, someone thought you were worth making an entire universe for. */}
            {finalMessageStep >= 3 && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(0.95rem, 2.45vw, 1.25rem)",
                  color: "#FFE09E",
                  textShadow:
                    "0 0 18px rgba(255, 210, 120, 0.65), 0 0 38px rgba(233, 199, 125, 0.4), 0 2px 16px rgba(0, 0, 0, 0.98)",
                  lineHeight: 1.44,
                  margin: 0,
                  opacity: 1,
                  animation: "galaxyTextFade 1.4s ease forwards",
                }}
              >
                Just remember that, somewhere, someone thought you were worth making an entire universe for.
              </p>
            )}

            {/* Beat 4: And I hope, whenever you look up at the stars, one of them makes you smile. */}
            {finalMessageStep >= 4 && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: "clamp(0.96rem, 2.5vw, 1.26rem)",
                  color: "#F6D1E6",
                  textShadow:
                    "0 0 18px rgba(235, 165, 210, 0.6), 0 0 34px rgba(185, 117, 245, 0.35), 0 2px 14px rgba(0, 0, 0, 0.98)",
                  lineHeight: 1.42,
                  marginTop: "0.15rem",
                  marginBottom: 0,
                  opacity: 1,
                  animation: "galaxyTextFade 1.4s ease forwards",
                }}
              >
                And I hope, whenever you look up at the stars, one of them makes you smile.
              </p>
            )}

            {/* Beat 5: Signature */}
            {finalMessageStep >= 5 && (
              <div
                style={{
                  marginTop: "0.28rem",
                  opacity: 1,
                  animation: "galaxyTextFade 1.5s ease forwards",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: "clamp(1.15rem, 3.1vw, 1.5rem)",
                    letterSpacing: "0.08em",
                    color: "#FFE3A3",
                    textShadow:
                      "0 0 20px rgba(255, 215, 130, 0.72), 0 0 36px rgba(233, 199, 125, 0.42), 0 2px 12px rgba(0, 0, 0, 0.98)",
                  }}
                >
                  — Umar
                </span>
              </div>
            )}
          </div>
        </div>
      )}

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
          opacity: finalMessageStep >= 1 ? 0.72 : 1,
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
        @keyframes galaxyTextFade {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
