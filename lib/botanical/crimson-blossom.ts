/**
 * Shared botanical definitions and articulated renderers derived from
 * `bhadwikabday-main/experiences/crimson-blossom/` (8 asymmetric petals,
 * crimson stem & leaf geometry, natural stagger sequence) plus multi-depth
 * articulated butterflies for Chapter 3 & Chapter 6.
 */

export interface CrimsonPetalSpec {
  id: number;
  /** Target open angle in radians around blossom receptacle */
  angleRad: number;
  /** Length multiplier matching original petal scales (0.8 .. 1.1) */
  lengthScale: number;
  /** Width asymmetry multiplier */
  widthScale: number;
  /** Layer draw order (0 = back whorl, 1 = front inner whorl) */
  layer: 0 | 1;
  /** Slight organic asymmetry factor on petal curve */
  skew: number;
  /** Normalized stagger offset [0..1] in original order: __3,__2,__4,__7,__8,__6,__5,__1 */
  openOrder: number;
}

/**
 * Exact 8-petal structure & bloom cadence preserved from crimson-blossom/style.css:
 * Petal open order: #3 (0.00) -> #2 (0.14) -> #4 (0.28) -> #7 (0.42) ->
 *                   #8 (0.56) -> #6 (0.70) -> #5 (0.84) -> #1 (1.00)
 */
export const CRIMSON_PETAL_SPECS: readonly CrimsonPetalSpec[] = [
  // __1 (bottom-left upper, -10deg, scale 0.82, delay 3.9s -> order 1.00)
  { id: 1, angleRad: -0.95, lengthScale: 0.84, widthScale: 0.86, layer: 1, skew: -0.06, openOrder: 1.0 },
  // __2 (upper-right, 100deg, scale 0.82, delay 3.3s -> order 0.14)
  { id: 2, angleRad: 0.82, lengthScale: 0.84, widthScale: 0.85, layer: 0, skew: 0.05, openOrder: 0.14 },
  // __3 (center-top crest, 45deg, scale 0.80, delay 3.2s -> order 0.00)
  { id: 3, angleRad: 0.02, lengthScale: 0.82, widthScale: 0.9, layer: 0, skew: -0.04, openOrder: 0.0 },
  // __4 (mid-right outer, 135deg, scale 0.90, delay 3.4s -> order 0.28)
  { id: 4, angleRad: 1.62, lengthScale: 0.92, widthScale: 0.88, layer: 0, skew: 0.08, openOrder: 0.28 },
  // __5 (mid-left outer, 315deg, scale 0.90, delay 3.8s -> order 0.84)
  { id: 5, angleRad: -1.68, lengthScale: 0.92, widthScale: 0.88, layer: 1, skew: -0.07, openOrder: 0.84 },
  // __6 (lower-left full, 270deg, scale 1.10, delay 3.7s -> order 0.70)
  { id: 6, angleRad: -2.42, lengthScale: 1.08, widthScale: 1.02, layer: 1, skew: -0.05, openOrder: 0.7 },
  // __7 (lower-right full, 180deg, scale 1.10, delay 3.5s -> order 0.42)
  { id: 7, angleRad: 2.38, lengthScale: 1.08, widthScale: 1.02, layer: 1, skew: 0.05, openOrder: 0.42 },
  // __8 (bottom anchor, 225deg, scale 1.00, delay 3.6s -> order 0.56)
  { id: 8, angleRad: Math.PI, lengthScale: 1.0, widthScale: 0.96, layer: 0, skew: 0.02, openOrder: 0.56 },
] as const;

export interface CrimsonPalette {
  outerTip: string;
  midTone: string;
  innerBase: string;
  innerShadow: string;
  veinColor: string;
  coreCenter: string;
  coreEdge: string;
  stemDark: string;
  stemLight: string;
  leafDark: string;
  leafLight: string;
}

export const CRIMSON_PALETTES: Record<"crimson" | "deepCrimson" | "velvetRose", CrimsonPalette> = {
  crimson: {
    outerTip: "#ff4d6d",
    midTone: "#e80c42",
    innerBase: "#8a0022",
    innerShadow: "#4a0013",
    veinColor: "rgba(255, 204, 213, 0.26)",
    coreCenter: "#ffccd5",
    coreEdge: "#80001a",
    stemDark: "#4e081f",
    stemLight: "#b3002d",
    leafDark: "#4a0013",
    leafLight: "#990026",
  },
  deepCrimson: {
    outerTip: "#f0365e",
    midTone: "#c40837",
    innerBase: "#6e001b",
    innerShadow: "#38000d",
    veinColor: "rgba(255, 198, 212, 0.22)",
    coreCenter: "#ffd6de",
    coreEdge: "#6e0016",
    stemDark: "#3e071a",
    stemLight: "#8f0a2a",
    leafDark: "#3a0414",
    leafLight: "#7c0b27",
  },
  velvetRose: {
    outerTip: "#ff7292",
    midTone: "#df1b50",
    innerBase: "#7a0a28",
    innerShadow: "#400315",
    veinColor: "rgba(255, 225, 232, 0.28)",
    coreCenter: "#ffe3d8",
    coreEdge: "#911234",
    stemDark: "#460a22",
    stemLight: "#a61c45",
    leafDark: "#42091d",
    leafLight: "#8c1539",
  },
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function easeOutCubic(x: number): number {
  const t = clamp01(x);
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutSine(x: number): number {
  const t = clamp01(x);
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export interface ArticulatedFlowerDrawParams {
  rootX: number;
  rootY: number;
  headX: number;
  headY: number;
  ctrlX: number;
  ctrlY: number;
  /** Stem growth 0..1 */
  stemProgress: number;
  /** Petal unfolding timeline 0..1 (0 = tight closed bud, 1 = fully unfurled crimson flower) */
  bloomProgress: number;
  /** Radius at full bloom */
  petalRadius: number;
  /** 0 (far) .. 1 (foreground) */
  depth: number;
  /** Gentle sway offset / tilt in radians */
  headTilt: number;
  perspectiveY: number;
  swayOffsetPx: number;
  palette: CrimsonPalette;
  /** Asymmetric timing shift per flower so no two blooms open identically */
  petalPhaseShift?: number;
  /** Subtle touch/aurora rim catch [0..1] */
  rimLight?: number;
  /** Leaves tilt/scale multiplier */
  scaleFactor: number;
  /** Alpha for atmospheric haze distance blending */
  alpha?: number;
}

interface CrimsonSpriteSet {
  petalBack: HTMLCanvasElement;
  petalFront: HTMLCanvasElement;
  leaf: HTMLCanvasElement;
  core: HTMLCanvasElement;
  crimsonAura: HTMLCanvasElement;
  settledHead: HTMLCanvasElement;
}

const crimsonSpriteCache = new Map<CrimsonPalette, CrimsonSpriteSet>();
const butterflyWingCache = new Map<string, HTMLCanvasElement>();

interface TwilightOrchidSpriteSet {
  petal: HTMLCanvasElement;
  leaf: HTMLCanvasElement;
  dome: HTMLCanvasElement;
  halo: HTMLCanvasElement;
  moteGold: HTMLCanvasElement;
  moteOrchid: HTMLCanvasElement;
}

let twilightOrchidSprites: TwilightOrchidSpriteSet | null = null;

function createOffscreen(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function getCrimsonSprites(palette: CrimsonPalette): CrimsonSpriteSet {
  const existing = crimsonSpriteCache.get(palette);
  if (existing) return existing;

  const makePetalSprite = (isFront: boolean): HTMLCanvasElement => {
    const W = 72;
    const H = 104;
    const [cv, ctx] = createOffscreen(W, H);
    const ox = W * 0.5;
    const oy = H - 6;
    const curLen = H - 14;
    const curWid = W * 0.38;

    ctx.translate(ox, oy);
    const pg = ctx.createRadialGradient(
      curWid * 0.12,
      -curLen * 0.25,
      2,
      0,
      -curLen * 0.58,
      curLen * 0.98
    );
    pg.addColorStop(0, isFront ? palette.innerBase : palette.innerShadow);
    pg.addColorStop(0.54, palette.midTone);
    pg.addColorStop(1, palette.outerTip);

    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.bezierCurveTo(
      -curWid * 0.94,
      -curLen * 0.24,
      -curWid * 1.12,
      -curLen * 0.8,
      -curWid * 0.14,
      -curLen * 0.97
    );
    ctx.quadraticCurveTo(0, -curLen * 1.03, curWid * 0.16, -curLen * 0.96);
    ctx.bezierCurveTo(
      curWid * 1.08,
      -curLen * 0.78,
      curWid * 0.92,
      -curLen * 0.22,
      0,
      2
    );
    ctx.closePath();
    ctx.fill();

    // Subtle dark fold crease between overlapping petals
    ctx.strokeStyle = "rgba(42, 0, 12, 0.36)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Delicate velvety inner highlight ridge + botanical central vein
    ctx.beginPath();
    ctx.moveTo(-curWid * 0.38, -curLen * 0.86);
    ctx.quadraticCurveTo(0, -curLen * 0.99, curWid * 0.38, -curLen * 0.85);
    ctx.strokeStyle = "rgba(255, 196, 212, 0.24)";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -curLen * 0.14);
    ctx.quadraticCurveTo(curWid * 0.05, -curLen * 0.48, 0, -curLen * 0.78);
    ctx.strokeStyle = palette.veinColor;
    ctx.lineWidth = 1.15;
    ctx.stroke();

    return cv;
  };

  // Pre-rendered leaf sprite extending along +X from (4, H/2)
  const leaf = (() => {
    const W = 72;
    const H = 36;
    const [cv, ctx] = createOffscreen(W, H);
    const leafLen = W - 10;
    const leafWid = H * 0.38;
    ctx.translate(4, H * 0.56);

    const lg = ctx.createLinearGradient(0, 0, leafLen, -leafWid);
    lg.addColorStop(0, palette.leafLight);
    lg.addColorStop(0.72, palette.leafDark);
    lg.addColorStop(1, "rgba(74, 0, 19, 0.12)");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      leafLen * 0.35,
      -leafWid * 1.15,
      leafLen * 0.82,
      -leafWid * 0.75,
      leafLen,
      -leafWid * 0.18
    );
    ctx.bezierCurveTo(
      leafLen * 0.75,
      leafWid * 0.55,
      leafLen * 0.25,
      leafWid * 0.45,
      0,
      0
    );
    ctx.closePath();
    ctx.fill();
    return cv;
  })();

  // Pre-rendered receptacle core + pollen anthers
  const core = (() => {
    const D = 56;
    const [cv, ctx] = createOffscreen(D, D);
    const r = D * 0.4;
    ctx.translate(D * 0.5, D * 0.5);
    const cg = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 1, 0, 0, r);
    cg.addColorStop(0, palette.coreCenter);
    cg.addColorStop(0.55, "#ff3b6b");
    cg.addColorStop(1, palette.coreEdge);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 232, 200, 0.86)";
    for (let aIdx = 0; aIdx < 7; aIdx++) {
      const ang = (aIdx / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * r * 0.94, Math.sin(ang) * r * 0.94, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    return cv;
  })();

  // Soft radial crimson inner luminescence aura for completed blooms (never flat neon)
  const crimsonAura = (() => {
    const D = 128;
    const [cv, ctx] = createOffscreen(D, D);
    const g = ctx.createRadialGradient(D * 0.5, D * 0.5, 4, D * 0.5, D * 0.5, D * 0.5);
    g.addColorStop(0, "rgba(255, 62, 108, 0.36)");
    g.addColorStop(0.32, "rgba(232, 16, 68, 0.2)");
    g.addColorStop(0.68, "rgba(155, 6, 44, 0.07)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, D, D);
    return cv;
  })();

  const petalBack = makePetalSprite(false);
  const petalFront = makePetalSprite(true);

  // Pre-rendered mature settled 8-petal crimson blossom head with organic crimson glow (canonical r = 52)
  const settledHead = (() => {
    const D = 192;
    const R = 52;
    const [cv, ctx] = createOffscreen(D, D);
    ctx.translate(D * 0.5, D * 0.5);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.44;
    const auraSz = R * 3.2;
    ctx.drawImage(crimsonAura, -auraSz * 0.5, -auraSz * 0.5, auraSz, auraSz);
    ctx.restore();

    ctx.fillStyle = palette.stemDark;
    ctx.beginPath();
    ctx.ellipse(0, R * 0.14, R * 0.3, R * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const layerIdx of [0, 1] as const) {
      const sprite = layerIdx === 0 ? petalBack : petalFront;
      for (const spec of CRIMSON_PETAL_SPECS) {
        if (spec.layer !== layerIdx) continue;
        const curLen = R * spec.lengthScale;
        const curWid = R * 1.18 * spec.widthScale;
        ctx.save();
        ctx.rotate(spec.angleRad);
        if (spec.skew < 0) ctx.scale(-1, 1);
        ctx.drawImage(sprite, -curWid * 0.5, -curLen, curWid, curLen * 1.07);

        if (layerIdx === 1) {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = "#ff5e84";
          ctx.beginPath();
          ctx.ellipse(0, -curLen * 0.45, curWid * 0.2, curLen * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
    }

    const coreD = R * 0.54;
    ctx.drawImage(core, -coreD * 0.5, -coreD * 0.5, coreD, coreD);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.36;
    const glowD = coreD * 1.9;
    ctx.drawImage(crimsonAura, -glowD * 0.5, -glowD * 0.5, glowD, glowD);
    ctx.restore();

    return cv;
  })();

  const set: CrimsonSpriteSet = {
    petalBack,
    petalFront,
    leaf,
    core,
    crimsonAura,
    settledHead,
  };
  crimsonSpriteCache.set(palette, set);
  return set;
}

/**
 * Draws the articulated multi-petal crimson-blossom specimen using cached palette sprites
 * (zero per-frame CanvasGradient allocations, preserving individual petal unfolding, veins & crimson glow).
 */
export function drawArticulatedCrimsonFlower(
  ctx: CanvasRenderingContext2D,
  p: ArticulatedFlowerDrawParams
): void {
  const {
    rootX,
    rootY,
    headX,
    headY,
    ctrlX,
    ctrlY,
    stemProgress,
    bloomProgress,
    petalRadius,
    depth,
    headTilt,
    perspectiveY,
    swayOffsetPx,
    palette,
    petalPhaseShift = 0,
    rimLight = 0.28,
    scaleFactor,
    alpha = 1,
  } = p;

  if (stemProgress <= 0.01) return;

  const sprites = getCrimsonSprites(palette);
  const completedGlow = bloomProgress > 0.8 ? easeInOutSine((bloomProgress - 0.8) / 0.2) : 0;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 1. Stem from root up toward blossom head (two-pass natural stem shading, zero gradient allocs)
  const curHeadX = rootX + (headX - rootX) * stemProgress;
  const curHeadY = rootY + (headY - rootY) * stemProgress;
  const curCtrlX = rootX + (ctrlX - rootX) * stemProgress;
  const curCtrlY = rootY + (ctrlY - rootY) * stemProgress;
  const baseLineW = Math.max(1.5, (1.8 + depth * 2.4) * (0.65 + 0.35 * stemProgress));

  ctx.lineCap = "round";
  ctx.strokeStyle = palette.stemDark;
  ctx.lineWidth = baseLineW;
  ctx.beginPath();
  ctx.moveTo(rootX, rootY);
  ctx.quadraticCurveTo(curCtrlX, curCtrlY, curHeadX, curHeadY);
  ctx.stroke();

  ctx.strokeStyle = palette.stemLight;
  ctx.lineWidth = baseLineW * 0.48;
  ctx.globalAlpha = alpha * 0.72;
  ctx.beginPath();
  ctx.moveTo(rootX + (curCtrlX - rootX) * 0.28, rootY + (curCtrlY - rootY) * 0.28);
  ctx.quadraticCurveTo(curCtrlX, curCtrlY, curHeadX, curHeadY);
  ctx.stroke();
  ctx.globalAlpha = alpha;

  // 2. Six alternating stem leaves (.flower-leaf__1..6) using cached leaf sprite
  const leafConfigs = [
    { frac: 0.72, side: 1, size: 0.82, threshold: 0.48 },
    { frac: 0.68, side: -1, size: 0.82, threshold: 0.44 },
    { frac: 0.56, side: 1, size: 0.96, threshold: 0.38 },
    { frac: 0.52, side: -1, size: 0.96, threshold: 0.34 },
    { frac: 0.41, side: 1, size: 1.12, threshold: 0.28 },
    { frac: 0.36, side: -1, size: 1.12, threshold: 0.24 },
  ];

  for (const lf of leafConfigs) {
    if (stemProgress <= lf.threshold) continue;
    const localGrowth = easeOutCubic((stemProgress - lf.threshold) / 0.32);
    const t = lf.frac * stemProgress;
    const inv = 1 - t;
    const lx = inv * inv * rootX + 2 * inv * t * curCtrlX + t * t * curHeadX;
    const ly = inv * inv * rootY + 2 * inv * t * curCtrlY + t * t * curHeadY;
    const leafLen = 24 * scaleFactor * lf.size * localGrowth;
    const leafH = 17 * scaleFactor * lf.size * localGrowth;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(lf.side * 0.56 + swayOffsetPx * 0.012);
    ctx.scale(lf.side, 1);
    ctx.drawImage(sprites.leaf, -leafLen * 0.05, -leafH * 0.56, leafLen, leafH);
    ctx.restore();
  }

  // 3. Articulated Crimson Bud -> 8-Petal Progressive Unfolding Head
  if (stemProgress > 0.32) {
    const budGrow = easeOutCubic((stemProgress - 0.32) / 0.68);
    ctx.save();
    ctx.translate(curHeadX, curHeadY);
    const headPitch = perspectiveY + (1 - perspectiveY) * (1 - clamp01(bloomProgress)) * 0.3;
    ctx.rotate(headTilt + swayOffsetPx * 0.016);
    ctx.scale(1, headPitch);

    // Fast path for fully settled mature blossoms (single sprite blit instead of 10+ petal draws)
    if (bloomProgress >= 0.99 && stemProgress >= 0.99) {
      const s = petalRadius * (192 / 52);
      ctx.drawImage(sprites.settledHead, -s * 0.5, -s * 0.5, s, s);
      ctx.restore();
      ctx.restore();
      return;
    }

    // Subtle organic crimson illumination glow around fully opened blossoms
    if (completedGlow > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * completedGlow * (0.28 + depth * 0.24);
      const auraSz = petalRadius * 3.1;
      ctx.drawImage(sprites.crimsonAura, -auraSz * 0.5, -auraSz * 0.5, auraSz, auraSz);
      ctx.restore();
    }

    // Subtle botanical calyx cup under the petals
    const calyxR = petalRadius * (0.24 + 0.1 * budGrow);
    ctx.fillStyle = palette.stemDark;
    ctx.beginPath();
    ctx.ellipse(0, calyxR * 0.45, calyxR * 0.9, calyxR * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    const layers: Array<0 | 1> = [0, 1];
    for (const layerIdx of layers) {
      const sprite = layerIdx === 0 ? sprites.petalBack : sprites.petalFront;
      for (const spec of CRIMSON_PETAL_SPECS) {
        if (spec.layer !== layerIdx) continue;

        const delayNorm = clamp01(
          spec.openOrder * 0.54 + petalPhaseShift * (spec.id % 2 === 0 ? 0.06 : -0.04)
        );
        const localOpen = easeInOutSine((bloomProgress - delayNorm) / Math.max(0.28, 1 - delayNorm));

        const budClusterAng =
          (spec.angleRad >= 0 ? 1 : -1) * Math.min(0.28, Math.abs(spec.angleRad) * 0.16);
        const curAng = budClusterAng + (spec.angleRad - budClusterAng) * localOpen;

        const curLen = petalRadius * spec.lengthScale * budGrow * (0.44 + 0.56 * localOpen);
        const curWid = petalRadius * 1.18 * spec.widthScale * budGrow * (0.34 + 0.66 * localOpen);

        ctx.save();
        ctx.rotate(curAng);
        if (spec.skew < 0) {
          ctx.scale(-1, 1);
        }
        ctx.drawImage(sprite, -curWid * 0.5, -curLen, curWid, curLen * 1.07);

        // Soft inner crimson petal highlight when mature + aurora catch on upper petal rims
        if (completedGlow > 0.08 && layerIdx === 1) {
          ctx.globalAlpha = alpha * completedGlow * 0.18;
          ctx.fillStyle = "#ff5e84";
          ctx.beginPath();
          ctx.ellipse(0, -curLen * 0.45, curWid * 0.2, curLen * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = alpha;
        }

        if (rimLight > 0.08 && Math.cos(curAng) > -0.2 && localOpen > 0.35) {
          ctx.strokeStyle = `rgba(148, 240, 212, ${(rimLight * 0.24 * localOpen).toFixed(2)})`;
          ctx.lineWidth = Math.max(0.7, depth * 0.9);
          ctx.beginPath();
          ctx.moveTo(-curWid * 0.22, -curLen * 0.86);
          ctx.quadraticCurveTo(0, -curLen * 1.0, curWid * 0.22, -curLen * 0.85);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // Central glowing blush-crimson core receptacle (.flower-circle), cached sprite
    if (bloomProgress > 0.2) {
      const coreScale = easeOutCubic((bloomProgress - 0.2) / 0.55) * budGrow;
      const coreD = petalRadius * 0.54 * coreScale;
      ctx.drawImage(sprites.core, -coreD * 0.5, -coreD * 0.5, coreD, coreD);

      if (completedGlow > 0.08) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha * completedGlow * 0.38;
        const glowD = coreD * 1.9;
        ctx.drawImage(sprites.crimsonAura, -glowD * 0.5, -glowD * 0.5, glowD, glowD);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

export interface RealisticButterflyDrawParams {
  x: number;
  y: number;
  headingRad: number;
  scale: number;
  /** Smooth asymmetric flap curve (-0.2 .. 1.0) */
  flapOpen: number;
  alpha: number;
  wingLight: string;
  wingMid: string;
  wingDeep: string;
  wingEdge: string;
  wingDot: string;
}

function getButterflyWingSprite(b: RealisticButterflyDrawParams): HTMLCanvasElement {
  const key = `${b.wingLight}|${b.wingMid}|${b.wingDeep}|${b.wingEdge}|${b.wingDot}`;
  const existing = butterflyWingCache.get(key);
  if (existing) return existing;

  // Render right half-wings in crisp 2x resolution sprite (origin at (2, 32))
  const S = 2;
  const [cv, ctx] = createOffscreen(56, 64);
  ctx.scale(S, S);
  ctx.translate(1, 16);

  // Forewing (upper large scalloped wing)
  const fwGrad = ctx.createLinearGradient(0, -14, 20, 4);
  fwGrad.addColorStop(0, b.wingDeep);
  fwGrad.addColorStop(0.45, b.wingMid);
  fwGrad.addColorStop(0.84, b.wingLight);
  fwGrad.addColorStop(1, b.wingEdge);

  ctx.fillStyle = fwGrad;
  ctx.beginPath();
  ctx.moveTo(0.8, -2.5);
  ctx.bezierCurveTo(6, -15, 16, -15, 19.5, -8.5);
  ctx.bezierCurveTo(21, -4, 17, 1.5, 11, 2.5);
  ctx.quadraticCurveTo(5, 3, 0.8, 0.8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = b.wingEdge;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  ctx.strokeStyle = "rgba(26, 12, 16, 0.34)";
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(2, -1);
  ctx.lineTo(14.5, -8.5);
  ctx.moveTo(2, 0);
  ctx.lineTo(15.5, -3.5);
  ctx.stroke();

  ctx.fillStyle = b.wingDot;
  ctx.beginPath();
  ctx.arc(15.5, -7.8, 1.15, 0, Math.PI * 2);
  ctx.fill();

  // Hindwing (lower rounded-scalloped wing)
  const hwGrad = ctx.createLinearGradient(0, 0, 14, 13);
  hwGrad.addColorStop(0, b.wingDeep);
  hwGrad.addColorStop(0.55, b.wingMid);
  hwGrad.addColorStop(0.88, b.wingLight);
  hwGrad.addColorStop(1, b.wingEdge);

  ctx.fillStyle = hwGrad;
  ctx.beginPath();
  ctx.moveTo(0.8, 0.5);
  ctx.bezierCurveTo(9, 1.5, 15.5, 5, 13, 10.5);
  ctx.bezierCurveTo(10.5, 14.2, 4.5, 12.2, 1, 6.2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = b.wingEdge;
  ctx.lineWidth = 0.85;
  ctx.stroke();

  butterflyWingCache.set(key, cv);
  return cv;
}

/**
 * Draws an anatomically faithful 4-wing butterfly using cached half-wing sprites:
 * zero per-frame CanvasGradient creation while preserving realistic asymmetric flap perspective.
 */
export function drawRealisticButterfly(
  ctx: CanvasRenderingContext2D,
  b: RealisticButterflyDrawParams
): void {
  if (b.alpha <= 0.01) return;

  const wingSprite = getButterflyWingSprite(b);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.headingRad);
  ctx.scale(b.scale, b.scale);
  ctx.globalAlpha = b.alpha;

  const wingSpread = 0.16 + 0.84 * clamp01(b.flapOpen);

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side * wingSpread, 1);
    ctx.drawImage(wingSprite, -1, -16, 28, 32);
    ctx.restore();
  }

  // Slender dark thorax, abdomen & delicate curved antennae
  ctx.fillStyle = "#1b1016";
  ctx.beginPath();
  ctx.ellipse(0, -1, 1.35, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 4.5, 0.95, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(42, 24, 30, 0.9)";
  ctx.lineWidth = 0.7;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 0.4, -4.5);
    ctx.quadraticCurveTo(side * 2.5, -9, side * 4.4, -10.4);
    ctx.stroke();
  }

  ctx.restore();
}

function getTwilightOrchidSprites(): TwilightOrchidSpriteSet {
  if (twilightOrchidSprites) return twilightOrchidSprites;

  // Violet-orchid cupped petal (#ba55d3 -> #da70d6 + white inner shimmer) from animated-flower/style.css
  const petal = (() => {
    const W = 56;
    const H = 64;
    const [cv, ctx] = createOffscreen(W, H);
    ctx.translate(W * 0.5, H - 6);
    const pg = ctx.createLinearGradient(0, -H + 8, 0, 0);
    pg.addColorStop(0, "#e589e4");
    pg.addColorStop(0.42, "#da70d6");
    pg.addColorStop(1, "#8b2ca8");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-W * 0.46, -H * 0.14, -W * 0.42, -H * 0.84, 0, -H * 0.88);
    ctx.bezierCurveTo(W * 0.42, -H * 0.84, W * 0.46, -H * 0.14, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Inner specular translucent white overlay matching animated-flower ::after highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, -H * 0.45, W * 0.18, H * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    return cv;
  })();

  // Teal-sage arched stem leaf harmonious with both animated-flower & twilight crimson meadow
  const leaf = (() => {
    const W = 56;
    const H = 26;
    const [cv, ctx] = createOffscreen(W, H);
    ctx.translate(3, H * 0.55);
    const lg = ctx.createLinearGradient(0, 0, W - 8, 0);
    lg.addColorStop(0, "#248f9a");
    lg.addColorStop(0.7, "#115961");
    lg.addColorStop(1, "rgba(17, 89, 97, 0.12)");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(W * 0.3, -H * 0.52, W * 0.72, -H * 0.35, W - 8, -H * 0.1);
    ctx.bezierCurveTo(W * 0.65, H * 0.35, W * 0.24, H * 0.32, 0, 0);
    ctx.closePath();
    ctx.fill();
    return cv;
  })();

  // Rounded golden yellow stamen dome (#ffeb12 -> #ffce00) matching .flower__white-circle
  const dome = (() => {
    const D = 40;
    const [cv, ctx] = createOffscreen(D, D);
    ctx.translate(D * 0.5, D * 0.5);
    const dg = ctx.createRadialGradient(-D * 0.1, -D * 0.1, 1, 0, 0, D * 0.42);
    dg.addColorStop(0, "#fff9b8");
    dg.addColorStop(0.45, "#ffeb12");
    dg.addColorStop(0.85, "#ffce00");
    dg.addColorStop(1, "rgba(186, 112, 0, 0.6)");
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.ellipse(0, 0, D * 0.42, D * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    return cv;
  })();

  const halo = (() => {
    const D = 96;
    const [cv, ctx] = createOffscreen(D, D);
    const g = ctx.createRadialGradient(D * 0.5, D * 0.5, 2, D * 0.5, D * 0.5, D * 0.5);
    g.addColorStop(0, "rgba(218, 112, 214, 0.32)");
    g.addColorStop(0.45, "rgba(186, 85, 211, 0.12)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, D, D);
    return cv;
  })();

  const makeMote = (rgba0: string, rgba1: string) => {
    const D = 24;
    const [cv, ctx] = createOffscreen(D, D);
    const g = ctx.createRadialGradient(12, 12, 0.5, 12, 12, 12);
    g.addColorStop(0, rgba0);
    g.addColorStop(0.4, rgba1);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, D, D);
    return cv;
  };

  twilightOrchidSprites = {
    petal,
    leaf,
    dome,
    halo,
    moteGold: makeMote("rgba(255, 251, 120, 0.95)", "rgba(255, 235, 18, 0.45)"),
    moteOrchid: makeMote("rgba(255, 210, 255, 0.9)", "rgba(218, 112, 214, 0.4)"),
  };
  return twilightOrchidSprites;
}

export interface AnimatedTwilightFlowerParams {
  rootX: number;
  rootY: number;
  headX: number;
  headY: number;
  ctrlX: number;
  ctrlY: number;
  growProgress: number; // 0..1 stem + bloom growth after Stage 3 completes
  radius: number;
  depth: number;
  swayOffsetPx: number;
  phase: number;
  elapsed: number;
  alpha?: number;
  reducedMotion?: boolean;
}

/**
 * Integrates the twilight violet-orchid `animated-flower` species (#ba55d3/#da70d6 cupped flower
 * + warm #ffeb12/#ffce00 stamen dome + floating pollen motes) into the Garden Canvas2D loop.
 */
export function drawAnimatedTwilightFlower(
  ctx: CanvasRenderingContext2D,
  p: AnimatedTwilightFlowerParams
): void {
  if (p.growProgress <= 0.01) return;
  const sprites = getTwilightOrchidSprites();
  const stemP = easeOutCubic(Math.min(1, p.growProgress * 1.35));
  const headP = p.growProgress > 0.35 ? easeOutCubic((p.growProgress - 0.35) / 0.65) : 0;

  const curHeadX = p.rootX + (p.headX - p.rootX) * stemP;
  const curHeadY = p.rootY + (p.headY - p.rootY) * stemP;
  const curCtrlX = p.rootX + (p.ctrlX - p.rootX) * stemP;
  const curCtrlY = p.rootY + (p.ctrlY - p.rootY) * stemP;
  const alpha = p.alpha ?? 0.92;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Slender twilight-teal stem (#159faa dark -> soft cyan crest)
  ctx.lineCap = "round";
  ctx.strokeStyle = "#105c64";
  ctx.lineWidth = Math.max(1.2, (1.4 + p.depth * 1.6) * (0.65 + 0.35 * stemP));
  ctx.beginPath();
  ctx.moveTo(p.rootX, p.rootY);
  ctx.quadraticCurveTo(curCtrlX, curCtrlY, curHeadX, curHeadY);
  ctx.stroke();

  // Two opposing curved stem leaves
  if (stemP > 0.42) {
    const lfP = easeOutCubic((stemP - 0.42) / 0.58);
    for (const [frac, side] of [[0.46, 1], [0.62, -1]] as const) {
      const t = frac * stemP;
      const inv = 1 - t;
      const lx = inv * inv * p.rootX + 2 * inv * t * curCtrlX + t * t * curHeadX;
      const ly = inv * inv * p.rootY + 2 * inv * t * curCtrlY + t * t * curHeadY;
      const lw = p.radius * 1.15 * lfP;
      const lh = p.radius * 0.52 * lfP;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(side * 0.62 + p.swayOffsetPx * 0.014);
      ctx.scale(side, 1);
      ctx.drawImage(sprites.leaf, -lw * 0.04, -lh * 0.52, lw, lh);
      ctx.restore();
    }
  }

  // Cupped 4-petal violet-orchid corolla + golden dome + floating pollen wisps
  if (headP > 0.05) {
    ctx.save();
    ctx.translate(curHeadX, curHeadY);
    ctx.rotate(p.swayOffsetPx * 0.018);

    // Subtle twilight orchid glow aura when open
    if (headP > 0.65) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * ((headP - 0.65) / 0.35) * 0.34;
      const haloSz = p.radius * 2.9;
      ctx.drawImage(sprites.halo, -haloSz * 0.5, -haloSz * 0.55, haloSz, haloSz);
      ctx.restore();
    }

    const r = p.radius * (0.35 + 0.65 * headP);
    const petalAngles = [-0.88, 0.88, -0.34, 0.34]; // Back pair + cupped front pair
    const petalScales = [0.95, 0.95, 1.04, 1.04];

    for (let i = 0; i < 4; i++) {
      const ang = petalAngles[i] * (0.35 + 0.65 * headP);
      const pw = r * 1.08 * petalScales[i];
      const ph = r * 1.24 * petalScales[i];
      ctx.save();
      ctx.rotate(ang);
      ctx.drawImage(sprites.petal, -pw * 0.5, -ph * 0.92, pw, ph);
      ctx.restore();
    }

    // Golden #ffeb12 / #ffce00 stamen dome at cup center
    const dw = r * 0.78;
    const dh = r * 0.74;
    ctx.drawImage(sprites.dome, -dw * 0.5, -dh * 0.45, dw, dh);

    // Subtle rising floating light motes (.flower__light)
    if (headP > 0.7) {
      const moteAlpha = alpha * ((headP - 0.7) / 0.3) * 0.78;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let m = 0; m < 3; m++) {
        const cycle = p.reducedMotion
          ? 0.3 + m * 0.25
          : ((p.elapsed * (0.36 + m * 0.07) + p.phase + m * 0.33) % 1);
        const mx = Math.sin(cycle * Math.PI * 2 + m * 1.9 + p.phase) * (r * 0.55);
        const my = -r * 0.3 - cycle * (r * 1.9);
        const fade = Math.sin(cycle * Math.PI);
        ctx.globalAlpha = moteAlpha * fade;
        const mSz = Math.max(4, r * 0.34);
        ctx.drawImage(m % 2 === 0 ? sprites.moteGold : sprites.moteOrchid, mx - mSz * 0.5, my - mSz * 0.5, mSz, mSz);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
}
