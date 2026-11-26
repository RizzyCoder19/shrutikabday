"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SHRUTI_PHOTOS } from "@/content/gallery";
import { FIRST_CHAT_SCREENSHOTS, MOMENTS_CHAT_SCREENSHOTS } from "@/content/chats";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
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
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.18, "rgba(255, 250, 240, 0.95)");
  grad.addColorStop(0.38, "rgba(245, 218, 160, 0.65)");
  grad.addColorStop(0.68, "rgba(215, 175, 220, 0.28)");
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
  const [orientationAccepted, setOrientationAccepted] = useState(false);

  // Check if user is on portrait mobile initially
  useEffect(() => {
    const isPortraitMobile = window.innerWidth < 768 && window.innerHeight >= window.innerWidth;
    if (!isPortraitMobile) {
      setOrientationAccepted(true);
      return;
    }

    const checkOrientation = () => {
      if (window.innerWidth > window.innerHeight || window.innerWidth >= 768) {
        setOrientationAccepted(true);
      }
    };

    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  const handleEnterGalaxy = useCallback(() => {
    setOrientationAccepted(true);
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
    // On portrait mobile, tilt the galaxy dynamically across the diagonal with steeper pitch/elevation
    const overviewCamPos = isPortrait
      ? new THREE.Vector3(2.35, 3.65, 2.75)
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

    // 1. Galaxy-main spiral math: structured 3-arm spiral galaxy with natural density & depth
    const params = {
      count: isMobile ? 18000 : 30000,
      size: isMobile ? 0.034 : 0.026,
      radius: 2.55,
      branches: 3,
      spin: 3.35,
      randomness: 1.58,
      randomnessPower: 3.45,
      insideColor: "#FFF8EA",
      midColor: "#F5CE86",
      roseColor: "#E09AB2",
      outsideColor: "#867EE0",
    };

    const starGlowTex = createStarGlowTexture();

    const pointsGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const colorInside = new THREE.Color(params.insideColor);
    const colorMid = new THREE.Color(params.midColor);
    const colorRose = new THREE.Color(params.roseColor);
    const colorOutside = new THREE.Color(params.outsideColor);

    for (let i = 0; i < params.count; i++) {
      const i3 = i * 3;
      const isOuterHaloStar = i % 9 === 0;
      const r = Math.pow(Math.random(), isOuterHaloStar ? 1.1 : 1.42) * params.radius;
      const spinAngle = r * params.spin;
      const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2;

      const neg = () => (Math.random() < 0.5 ? 1 : -1);
      const radialSpread = isOuterHaloStar
        ? 0.28 + 0.18 * (r / params.radius)
        : 0.1 + 0.21 * (1 - r / params.radius);
      const rx =
        Math.pow(Math.random(), params.randomnessPower) *
        neg() *
        params.randomness *
        radialSpread;
      const bulgeHeight = 0.036 + 0.17 * Math.exp(-r * 1.85);
      const diskWarp = Math.sin(branchAngle * 2 + r * 1.8) * 0.022;
      const ry =
        Math.pow(Math.random(), params.randomnessPower) *
        neg() *
        params.randomness *
        bulgeHeight +
        diskWarp;
      const rz =
        Math.pow(Math.random(), params.randomnessPower) *
        neg() *
        params.randomness *
        radialSpread;

      positions[i3] = Math.cos(branchAngle + spinAngle) * r + rx;
      positions[i3 + 1] = ry;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rz;

      const t = r / params.radius;
      const mixed = colorInside.clone();
      if (t < 0.22) {
        mixed.lerp(colorMid, t / 0.22);
      } else if (t < 0.56) {
        mixed.copy(colorMid).lerp(colorRose, (t - 0.22) / 0.34);
      } else {
        mixed.copy(colorRose).lerp(colorOutside, (t - 0.56) / 0.44);
      }

      colors[i3] = mixed.r;
      colors[i3 + 1] = mixed.g;
      colors[i3 + 2] = mixed.b;
    }

    pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const pointsMat = new THREE.PointsMaterial({
      size: params.size,
      map: starGlowTex,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const starPoints = new THREE.Points(pointsGeo, pointsMat);
    scene.add(starPoints);

    // Apply an authentic cinematic tilt to the galaxy disk on mobile portrait screens
    if (isPortrait) {
      starPoints.rotation.z = 0.22;
      starPoints.rotation.x = 0.12;
    }

    // Highly luminous warm core bulge creating a radiant galactic nucleus
    const coreGeo = new THREE.BufferGeometry();
    const coreCount = isMobile ? 480 : 920;
    const corePos = new Float32Array(coreCount * 3);
    const coreCol = new Float32Array(coreCount * 3);
    for (let i = 0; i < coreCount; i++) {
      const i3 = i * 3;
      const rr = Math.pow(Math.random(), 2.0) * 0.62;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      corePos[i3] = Math.sin(phi) * Math.cos(theta) * rr;
      corePos[i3 + 1] = Math.cos(phi) * rr * 0.38;
      corePos[i3 + 2] = Math.sin(phi) * Math.sin(theta) * rr;
      const c = colorInside.clone().lerp(colorMid, Math.min(1, rr / 0.62));
      coreCol[i3] = c.r;
      coreCol[i3 + 1] = c.g;
      coreCol[i3 + 2] = c.b;
    }
    coreGeo.setAttribute("position", new THREE.BufferAttribute(corePos, 3));
    coreGeo.setAttribute("color", new THREE.BufferAttribute(coreCol, 3));
    const coreMat = new THREE.PointsMaterial({
      size: isMobile ? 0.088 : 0.076,
      map: starGlowTex,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const corePoints = new THREE.Points(coreGeo, coreMat);
    scene.add(corePoints);
    if (isPortrait) {
      corePoints.rotation.z = 0.22;
      corePoints.rotation.x = 0.12;
    }

    // 2. Luminous miniature celestial photo planets embedded across all 3 spiral arms
    // Each planet uses spherical curvature projection, limb darkening, atmospheric Fresnel rim lighting,
    // and champagne/ivory/lavender/rose cosmic corona matching surrounding stars.
    const spritesGroup = new THREE.Group();
    scene.add(spritesGroup);
    if (isPortrait) {
      spritesGroup.rotation.z = 0.22;
      spritesGroup.rotation.x = 0.12;
    }

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
      { core: "rgba(255, 245, 228, 0.96)", glow: "rgba(245, 214, 142, 0.58)", outer: "rgba(233, 199, 125, 0)" }, // Warm Champagne Glow
      { core: "rgba(242, 234, 255, 0.95)", glow: "rgba(198, 180, 255, 0.54)", outer: "rgba(182, 164, 240, 0)" }, // Soft Lavender Glow
      { core: "rgba(255, 232, 242, 0.95)", glow: "rgba(242, 168, 190, 0.56)", outer: "rgba(227, 154, 174, 0)" }, // Dusty Rose Glow
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
          const dim = 192;
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
          const sphereR = Math.floor(dim * 0.37);
          const outerR = dim * 0.5;

          // Atmospheric outer planetary halo matching star glow softly
          const halo = c.createRadialGradient(cx, cy, sphereR * 0.78, cx, cy, outerR);
          halo.addColorStop(0, rimVariant.core);
          halo.addColorStop(0.35, rimVariant.glow);
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

          // Gentle spherical projection (k=0.12) + limb darkening + top-left sunlight + Fresnel rim
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

              const warp = 1 - 0.12 * (1 - nz);
              const sx = Math.min(
                cropSize - 1,
                Math.max(0, Math.round((nx * warp + 1) * 0.5 * (cropSize - 1)))
              );
              const sy = Math.min(
                cropSize - 1,
                Math.max(0, Math.round((ny * warp + 1) * 0.5 * (cropSize - 1)))
              );
              const srcIdx = (sy * cropSize + sx) * 4;

              // Lambert directional + limb darkening + subtle specular rim
              const lightDot = Math.max(0, nx * -0.35 + ny * -0.38 + nz * 0.85);
              const limb = 0.54 + 0.46 * Math.pow(nz, 0.55) * (0.72 + 0.36 * lightDot);
              const fresnel = Math.pow(1 - nz, 2.7) * 0.65;

              out[outIdx] = Math.min(255, Math.round(srcData[srcIdx] * limb + 255 * fresnel));
              out[outIdx + 1] = Math.min(
                255,
                Math.round(srcData[srcIdx + 1] * limb + 236 * fresnel)
              );
              out[outIdx + 2] = Math.min(
                255,
                Math.round(srcData[srcIdx + 2] * limb + 218 * fresnel)
              );
              // Feather outermost 1.5px edge smoothly into atmospheric glow
              const edgeAlpha = r > 0.94 ? Math.max(0, (1 - r) / 0.06) : 1;
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
            cx - sphereR * 0.38,
            cy - sphereR * 0.38,
            0,
            cx - sphereR * 0.38,
            cy - sphereR * 0.38,
            sphereR * 0.72
          );
          spec.addColorStop(0, "rgba(255, 252, 245, 0.24)");
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

      // Weight Shruti's photographs ~90% of all planets so her portraits fill all 3 spiral arms
      const weightedPool: typeof valid = [];
      for (const entry of valid) {
        const isShrutiPhoto = entry.item.src.includes("/images/shruti/");
        const repeats = isShrutiPhoto ? 6 : 1;
        for (let rIdx = 0; rIdx < repeats; rIdx++) {
          weightedPool.push(entry);
        }
      }

      for (let i = 0; i < spriteCount; i++) {
        const entry = weightedPool[i % weightedPool.length];
        const r = 0.24 + Math.pow(Math.random(), 1.05) * (params.radius - 0.12);
        const spinAngle = r * params.spin;
        const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2;
        const spread = 0.23 * (0.52 + r / params.radius);
        const scatterX = (Math.random() - 0.5) * spread;
        const scatterZ = (Math.random() - 0.5) * spread;
        const heightJitter = (Math.random() - 0.5) * 0.26;

        const sprite = new THREE.Sprite(entry.mat);
        sprite.position.set(
          Math.cos(branchAngle + spinAngle) * r + scatterX,
          heightJitter,
          Math.sin(branchAngle + spinAngle) * r + scatterZ
        );

        // Tiered planetary sizes & brightness feel like depth across the spiral disk
        const isHeroPlanet = i % 7 === 0;
        const baseScale = isMobile
          ? isHeroPlanet
            ? 0.088 + Math.random() * 0.024
            : 0.048 + Math.random() * 0.028
          : isHeroPlanet
            ? 0.08 + Math.random() * 0.024
            : 0.044 + Math.random() * 0.026;
        sprite.scale.set(baseScale, baseScale, 1);
        sprite.userData = { src: entry.item.src };

        spritesGroup.add(sprite);
        raycastSprites.push(sprite);
        spriteObjects.push({
          sprite,
          orbitSpeed: (0.015 + Math.random() * 0.018) * (1 - Math.min(0.65, r / params.radius)),
          bobPhase: Math.random() * Math.PI * 2,
          baseY: heightJitter,
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
        // Serene cosmic spiral drift resembling a true living galaxy
        const rotSpeed = 0.048 * dt;
        starPoints.rotation.y += rotSpeed;
        corePoints.rotation.y += rotSpeed * 0.72;
        spritesGroup.rotation.y += rotSpeed;

        const tSec = now * 0.001;
        for (let i = 0; i < spriteObjects.length; i += 5) {
          const item = spriteObjects[i];
          item.sprite.position.y =
            item.baseY + Math.sin(tSec * item.pulseSpeed * 0.65 + item.bobPhase) * 0.008;
          const shimmer = 1 + Math.sin(tSec * 1.1 + item.bobPhase) * 0.04;
          const s = item.baseScale * shimmer;
          item.sprite.scale.set(s, s, 1);
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
      coreGeo.dispose();
      coreMat.dispose();
      starGlowTex.dispose();
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
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          touchAction: "none",
          opacity: orientationAccepted ? 1 : 0,
          transition: "opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />

      {/* Pre-Galaxy Orientation Warning: black canvas with phone tilt prompt before galaxy appears */}
      {!orientationAccepted && (
        <div
          className="galaxy-pre-tilt-canvas"
          role="dialog"
          aria-label="Orientation suggestion"
        >
          <div className="galaxy-pre-tilt-content">
            <div className="galaxy-tilt-phone" aria-hidden="true">
              <svg width="44" height="66" viewBox="0 0 34 52" fill="none">
                <rect
                  x="2"
                  y="2"
                  width="30"
                  height="48"
                  rx="6"
                  stroke="#E9C77D"
                  strokeWidth="1.8"
                  fill="rgba(22, 16, 38, 0.88)"
                />
                <line x1="12" y1="6.5" x2="22" y2="6.5" stroke="rgba(255,242,228,0.6)" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="17" cy="26" r="3.5" fill="#E9C77D" />
                <circle cx="17" cy="26" r="8" stroke="rgba(233, 199, 125, 0.45)" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="13" y1="45" x2="21" y2="45" stroke="rgba(255,242,228,0.55)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>

            <p className="galaxy-pre-tilt-title">Tilt your phone sideways.</p>
            <p className="galaxy-pre-tilt-sub">
              Rotate to landscape for the full cosmic view...
            </p>

            <button
              type="button"
              onClick={handleEnterGalaxy}
              className="btn-cinematic"
              style={{
                marginTop: "1.2rem",
                padding: "0.75rem 1.75rem",
                borderColor: "rgba(233, 199, 125, 0.65)",
                color: "#E9C77D",
                fontSize: "0.85rem",
                letterSpacing: "0.14em",
              }}
            >
              Enter Galaxy
            </button>
          </div>
        </div>
      )}

      {/* Poetic Caption Overlay */}
      {orientationAccepted && (
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
            animation: "galaxyTiltFadeIn 1s ease forwards",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 2.5vw, 1.55rem)",
              color: "rgba(255, 242, 228, 0.88)",
              textShadow: "0 2px 18px rgba(0, 0, 0, 0.95)",
            }}
          >
            All these little moments, together, make one beautiful universe.
          </p>
          <p
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(233, 199, 125, 0.65)",
              marginTop: "0.35rem",
            }}
          >
            Drag to orbit • Zoom in to discover • Tap any star
          </p>
        </div>
      )}

      {/* Galaxy Controls */}
      {orientationAccepted && (
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
            animation: "galaxyTiltFadeIn 1s ease forwards",
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
      )}

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
        .galaxy-pre-tilt-canvas {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at center, #07060f 0%, #020205 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          z-index: 50;
          animation: galaxyTiltFadeIn 0.75s ease forwards;
        }

        .galaxy-pre-tilt-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 22rem;
          padding: 2.2rem 1.6rem;
          border-radius: 28px;
          background: radial-gradient(ellipse at center, rgba(28, 20, 52, 0.72) 0%, rgba(10, 8, 22, 0.6) 100%);
          border: 1px solid rgba(233, 199, 125, 0.35);
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.8), 0 0 35px rgba(233, 199, 125, 0.18);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .galaxy-pre-tilt-title {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: clamp(1.75rem, 6.8vw, 2.2rem);
          font-weight: 400;
          line-height: 1.18;
          color: #FFF5E8;
          margin-top: 1.1rem;
          text-shadow: 0 0 24px rgba(233, 199, 125, 0.5), 0 2px 14px rgba(0, 0, 0, 0.9);
        }

        .galaxy-pre-tilt-sub {
          font-size: 0.86rem;
          line-height: 1.45;
          letter-spacing: 0.04em;
          color: rgba(236, 224, 245, 0.82);
          margin-top: 0.55rem;
        }

        .galaxy-tilt-wrap {
          position: fixed;
          top: max(4.6rem, calc(var(--safe-top) + 3.9rem));
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          padding-inline: 1.25rem;
          pointer-events: none;
          z-index: 28;
          animation: galaxyTiltFadeIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .galaxy-tilt-card {
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.35rem;
          padding: 0.9rem 1.45rem 0.95rem;
          border-radius: 22px;
          background: radial-gradient(ellipse at center, rgba(22, 16, 40, 0.68) 0%, rgba(8, 7, 18, 0.48) 100%);
          border: 1px solid rgba(233, 199, 125, 0.24);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55), 0 0 28px rgba(233, 199, 125, 0.12);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          cursor: pointer;
        }

        .galaxy-tilt-phone {
          margin-bottom: 0.2rem;
          filter: drop-shadow(0 0 12px rgba(233, 199, 125, 0.35));
          transform-origin: center center;
          animation: galaxyPhoneTilt 4.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }

        .galaxy-tilt-title {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: clamp(1.5rem, 6vw, 1.95rem);
          font-weight: 400;
          line-height: 1.15;
          color: #FFF4E6;
          text-shadow: 0 0 22px rgba(233, 199, 125, 0.45), 0 2px 12px rgba(0, 0, 0, 0.9);
        }

        .galaxy-tilt-sub {
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          color: rgba(236, 224, 245, 0.78);
        }

        @keyframes galaxyTiltFadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes galaxyPhoneTilt {
          0%, 14% {
            transform: rotate(0deg);
          }
          34%, 58% {
            transform: rotate(-76deg);
          }
          78%, 100% {
            transform: rotate(0deg);
          }
        }
      `}</style>
    </section>
  );
}
