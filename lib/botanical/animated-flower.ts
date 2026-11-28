/**
 * Faithful Canvas2D integration of `bhadwikabday-main/experiences/animated-flower/`
 * preserving exact geometry, proportions, colors (#ba55d3 -> #da70d6 luminous orchid stems,
 * translucent stem leaves, 4-petal 3D-cupped blossom crown, white glowing .flower__white-circle
 * cushion with #ffeb12 -> #ffce00 crosshatched golden center, arching .flower__grass fronds,
 * and floating .flower__light motes) without DOM/CSS filter compositing stalls.
 */

import { easeOutCubic } from "./crimson-blossom";

export interface OriginalAnimatedFlowerStem {
  /** Horizontal offset from bouquet root anchor as fraction of cluster width (-1 .. +1) */
  offsetXFrac: number;
  /** Stem base Y offset from cluster root anchor in vmin-equivalent units */
  baseYOffsetFrac: number;
  /** Stem height in vmin-equivalent pixels relative to cluster scale */
  heightFrac: number;
  /** Resting lean angle in radians (e.g. flower--1: 0, flower--2: +20deg, flower--3: -15deg) */
  leanRad: number;
  /** Gentle sway speed & phase matching moving-flower-1..5 */
  swaySpeed: number;
  swayAmpRad: number;
  swayPhase: number;
  /** Individual staggered delay relative to cluster startSec */
  delaySec: number;
  /** Leaf count on stem: flower--1 uses 6 leaves, flower--2..5 use 4 leaves */
  leafCount: 4 | 6;
  /** Head scale multiplier matching flower--1..5 & gardenRows */
  headScale: number;
  /** Optional hue shift tint (matching gardenRows in original script.js) */
  hueTintDeg: number;
  /** Whether to spawn the signature rising .flower__light particles */
  hasLights: boolean;
}

interface OriginalFlowerSprites {
  /** Pre-rendered 4-petal 3D cupped orchid flower head + white halo + golden hatched center */
  crownSprites: Map<number, HTMLCanvasElement>;
  /** Orchid translucent rounded stem leaf (.flower__line__leaf) */
  stemLeafSprites: Map<number, HTMLCanvasElement>;
  /** Arching .flower__grass blade frond */
  grassBlade: HTMLCanvasElement;
  /** Glowing .flower__light motes (#da70d6 & #ba55d3) */
  lightBright: HTMLCanvasElement;
  lightDeep: HTMLCanvasElement;
}

let cachedOriginalSprites: OriginalFlowerSprites | null = null;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function shiftOrchidHex(baseHex: string, hueDeg: number): string {
  if (hueDeg === 0) return baseHex;
  // Subtle hue modulation matching original script.js (-16deg cooler violet .. +24deg warmer magenta-orchid)
  if (hueDeg > 10) return baseHex === "#da70d6" ? "#e472c8" : "#c64ec4";
  if (hueDeg < -8) return baseHex === "#da70d6" ? "#c574e4" : "#9d52d8";
  return baseHex;
}

function getOriginalCrownSprite(hueDeg: number): HTMLCanvasElement {
  if (!cachedOriginalSprites) {
    cachedOriginalSprites = {
      crownSprites: new Map(),
      stemLeafSprites: new Map(),
      grassBlade: buildGrassBladeSprite(),
      lightBright: buildLightMoteSprite("rgba(236, 152, 232, 0.96)", "rgba(218, 112, 214, 0.48)"),
      lightDeep: buildLightMoteSprite("rgba(210, 128, 240, 0.94)", "rgba(186, 85, 211, 0.44)"),
    };
  }
  const existing = cachedOriginalSprites.crownSprites.get(hueDeg);
  if (existing) return existing;

  // Render exact .flower__leafs assembly from animated-flower/style.css lines 248-323 at 2x resolution
  const D = 192;
  const [cv, ctx] = makeCanvas(D, D);
  const cx = D * 0.5;
  const cy = D * 0.62;
  const lightCol = shiftOrchidHex("#da70d6", hueDeg);
  const deepCol = shiftOrchidHex("#ba55d3", hueDeg);

  // Soft outer orchid glow (.flower__leafs::after)
  const glow = ctx.createRadialGradient(cx, cy - 16, 4, cx, cy - 16, 76);
  glow.addColorStop(0, "rgba(218, 112, 214, 0.42)");
  glow.addColorStop(0.45, "rgba(186, 85, 211, 0.16)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, D, D);

  // Helper drawing cupped orchid petal (rounded teardrop with frosted inset white glow)
  const drawCuppedPetal = (
    tx: number,
    ty: number,
    rot: number,
    scaleX: number,
    scaleY: number,
    w: number,
    h: number,
    alpha: number,
    lipRounded = false
  ) => {
    ctx.save();
    ctx.translate(cx + tx, cy + ty);
    ctx.rotate(rot);
    ctx.scale(scaleX, scaleY);
    ctx.globalAlpha = alpha;

    const pg = ctx.createLinearGradient(0, -h, 0, 0);
    pg.addColorStop(0, lightCol);
    pg.addColorStop(0.7, deepCol);
    pg.addColorStop(1, "#892da8");
    ctx.fillStyle = pg;

    ctx.beginPath();
    if (lipRounded) {
      // .flower__leaf--4 asymmetric foreground cupped lip
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-w * 0.56, -h * 0.15, -w * 0.5, -h * 0.88, -w * 0.04, -h * 0.96);
      ctx.bezierCurveTo(w * 0.48, -h * 0.94, w * 0.58, -h * 0.36, 0, 0);
    } else {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-w * 0.54, -h * 0.18, -w * 0.52, -h * 0.86, 0, -h);
      ctx.bezierCurveTo(w * 0.52, -h * 0.86, w * 0.54, -h * 0.18, 0, 0);
    }
    ctx.closePath();
    ctx.fill();

    // Inset inner frosted white glow (inset 0 0 2vmin rgba(255,255,255,0.5))
    ctx.strokeStyle = "rgba(255, 255, 255, 0.46)";
    ctx.lineWidth = 2.0;
    ctx.stroke();

    const innerGlow = ctx.createRadialGradient(0, -h * 0.42, 2, 0, -h * 0.45, w * 0.55);
    innerGlow.addColorStop(0, "rgba(255, 255, 255, 0.24)");
    innerGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = innerGlow;
    ctx.fill();
    ctx.restore();
  };

  // Exact 4 petals matching .flower__leaf--1, --2, --3, --4
  drawCuppedPetal(0, 0, 0, 1.0, 0.92, 42, 58, 0.92);             // --2 back upright cupped petal
  drawCuppedPetal(-8, 2, -0.58, 0.88, 0.84, 42, 56, 0.9);         // --3 left 3D tilted petal
  drawCuppedPetal(8, 2, 0.58, 0.88, 0.84, 42, 56, 0.9);           // --1 right 3D tilted petal

  // Signature glowing WHITE outer oval rim (.flower__white-circle)
  ctx.save();
  ctx.translate(cx, cy - 11);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 11.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Golden #ffeb12 -> #ffce00 inner stamen pad (.flower__white-circle::after) + crosshatch grain
  ctx.save();
  ctx.translate(cx, cy - 12.5);
  const cg = ctx.createLinearGradient(-14, 0, 14, 0);
  cg.addColorStop(0, "#ffeb12");
  cg.addColorStop(1, "#ffce00");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14.5, 7.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle crosshatch texture lines matching repeating-linear-gradients in original CSS line 322
  ctx.strokeStyle = "rgba(120, 82, 0, 0.14)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let o = -10; o <= 10; o += 4.5) {
    ctx.moveTo(o - 5, -5);
    ctx.lineTo(o + 5, 5);
    ctx.moveTo(o + 5, -5);
    ctx.lineTo(o - 5, 5);
  }
  ctx.stroke();
  ctx.restore();

  // Foreground overlapping cupped lip (.flower__leaf--4, rotated forward cup at base)
  drawCuppedPetal(-2, 12, 0.25, 0.98, 0.62, 46, 44, 0.82, true);

  cachedOriginalSprites.crownSprites.set(hueDeg, cv);
  return cv;
}

function getOriginalStemLeafSprite(hueDeg: number): HTMLCanvasElement {
  getOriginalCrownSprite(hueDeg);
  const existing = cachedOriginalSprites!.stemLeafSprites.get(hueDeg);
  if (existing) return existing;

  // Exact .flower__line__leaf teardrop-leaf shape extending outward-up along +X from (3, 38)
  const W = 68;
  const H = 48;
  const [cv, ctx] = makeCanvas(W, H);
  const lightCol = shiftOrchidHex("#da70d6", hueDeg);

  ctx.translate(3, H - 6);
  const lg = ctx.createLinearGradient(0, 0, W - 10, -H + 12);
  lg.addColorStop(0, "rgba(218, 112, 214, 0.36)");
  lg.addColorStop(1, lightCol);
  ctx.fillStyle = lg;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(W * 0.42, -H * 0.92, W - 8, -H * 0.72);
  ctx.quadraticCurveTo(W * 0.56, H * 0.14, 0, 0);
  ctx.closePath();
  ctx.fill();

  cachedOriginalSprites!.stemLeafSprites.set(hueDeg, cv);
  return cv;
}

function buildGrassBladeSprite(): HTMLCanvasElement {
  const W = 48;
  const H = 96;
  const [cv, ctx] = makeCanvas(W, H);
  const g = ctx.createLinearGradient(0, H, 0, 6);
  g.addColorStop(0, "rgba(186, 85, 211, 0)");
  g.addColorStop(0.28, "rgba(186, 85, 211, 0.78)");
  g.addColorStop(1, "#da70d6");
  ctx.strokeStyle = g;
  ctx.lineCap = "round";
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(8, H - 2);
  ctx.quadraticCurveTo(10, H * 0.36, W - 6, 8);
  ctx.stroke();
  return cv;
}

function buildLightMoteSprite(c0: string, c1: string): HTMLCanvasElement {
  const D = 24;
  const [cv, ctx] = makeCanvas(D, D);
  const g = ctx.createRadialGradient(12, 12, 0.5, 12, 12, 12);
  g.addColorStop(0, c0);
  g.addColorStop(0.45, c1);
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, D, D);
  return cv;
}

/**
 * Canonical 5-stem bouquet from `bhadwikabday-main/experiences/animated-flower/index.html` + `script.js`:
 * flower--1 (center tall), flower--2 (+20deg), flower--3 (-15deg), flower--4, flower--5,
 * plus flanking companion stems and signature violet .flower__grass fronds.
 */
export const ORIGINAL_BOUQUET_STEMS: readonly OriginalAnimatedFlowerStem[] = [
  // Primary 3 bouquet stems (index.html lines 16-94)
  {
    offsetXFrac: 0,
    baseYOffsetFrac: 0,
    heightFrac: 0.96,
    leanRad: 0,
    swaySpeed: 1.55,
    swayAmpRad: 0.032,
    swayPhase: 0,
    delaySec: 0,
    leafCount: 6,
    headScale: 1.04,
    hueTintDeg: 0,
    hasLights: true,
  },
  {
    offsetXFrac: 0.04,
    baseYOffsetFrac: 0.02,
    heightFrac: 0.83,
    leanRad: 0.34, // +20deg right lean
    swaySpeed: 1.5,
    swayAmpRad: 0.03,
    swayPhase: 1.1,
    delaySec: 0.35,
    leafCount: 4,
    headScale: 0.94,
    hueTintDeg: 0,
    hasLights: true,
  },
  {
    offsetXFrac: -0.04,
    baseYOffsetFrac: 0.02,
    heightFrac: 0.78,
    leanRad: -0.27, // -15deg left lean
    swaySpeed: 1.48,
    swayAmpRad: 0.03,
    swayPhase: 2.3,
    delaySec: 0.65,
    leafCount: 4,
    headScale: 0.9,
    hueTintDeg: 0,
    hasLights: true,
  },
  // Cloned companions flower--4 & flower--5 (script.js lines 29-43, style.css 205-234)
  {
    offsetXFrac: -0.34,
    baseYOffsetFrac: 0.06,
    heightFrac: 0.64,
    leanRad: -0.14,
    swaySpeed: 1.24,
    swayAmpRad: 0.028,
    swayPhase: 0.8,
    delaySec: 1.0,
    leafCount: 4,
    headScale: 0.66,
    hueTintDeg: 14,
    hasLights: false,
  },
  {
    offsetXFrac: 0.34,
    baseYOffsetFrac: 0.05,
    heightFrac: 0.7,
    leanRad: 0.13,
    swaySpeed: 1.15,
    swayAmpRad: 0.026,
    swayPhase: 1.8,
    delaySec: 1.25,
    leafCount: 4,
    headScale: 0.62,
    hueTintDeg: -10,
    hasLights: false,
  },
];

export interface DrawOriginalBouquetParams {
  anchorX: number;
  anchorY: number;
  /** Cluster height reference (e.g. H * 0.31 desktop / H * 0.27 mobile) */
  bouquetScalePx: number;
  /** Elapsed time specifically after crimson garden completed */
  stageElapsedSec: number;
  /** Global clock for smooth idle sway and motes */
  elapsedSec: number;
  alpha?: number;
  reducedMotion?: boolean;
}

export function drawOriginalAnimatedFlowerBouquet(
  ctx: CanvasRenderingContext2D,
  p: DrawOriginalBouquetParams
): void {
  const { anchorX, anchorY, bouquetScalePx, stageElapsedSec, elapsedSec, alpha = 1, reducedMotion = false } = p;
  if (stageElapsedSec <= 0.02) return;

  const grassSprite = (() => {
    getOriginalCrownSprite(0);
    return cachedOriginalSprites!.grassBlade;
  })();

  ctx.save();
  ctx.globalAlpha = alpha;

  // 1. Signature curving .flower__grass orchid grass tufts framing the cluster base
  const grassGrow = easeOutCubic(Math.min(1, stageElapsedSec / 1.8));
  if (grassGrow > 0.04) {
    const grassConfigs = [
      { dx: -0.18, rot: -0.58, scaleX: 1, scale: 0.92 },
      { dx: 0.14, rot: 0.56, scaleX: -1, scale: 0.78 },
      { dx: -0.06, rot: -0.28, scaleX: 1, scale: 0.74 },
      { dx: 0.28, rot: 0.36, scaleX: -1, scale: 0.65 },
    ];
    for (let i = 0; i < grassConfigs.length; i++) {
      const gc = grassConfigs[i];
      const sway = reducedMotion ? 0 : Math.sin(elapsedSec * 2.1 + i * 1.3) * 0.03;
      const gw = bouquetScalePx * 0.24 * gc.scale * grassGrow;
      const gh = bouquetScalePx * 0.46 * gc.scale * grassGrow;
      ctx.save();
      ctx.translate(anchorX + gc.dx * bouquetScalePx * 0.55, anchorY + bouquetScalePx * 0.04);
      ctx.rotate(gc.rot + sway);
      ctx.scale(gc.scaleX, 1);
      ctx.drawImage(grassSprite, -gw * 0.18, -gh, gw, gh);
      ctx.restore();
    }
  }

  // 2. Render stems back-to-front (outer companions first, upright flower--1 hero in front)
  const renderOrder = [3, 4, 2, 1, 0];
  for (const idx of renderOrder) {
    const stem = ORIGINAL_BOUQUET_STEMS[idx];
    const localAge = stageElapsedSec - stem.delaySec;
    if (localAge <= 0) continue;

    // Stem height growth -> leaf unfurl -> crown blooming-flower choreography
    const stemP = easeOutCubic(Math.min(1, localAge / 2.2));
    const headP = localAge > 1.05 ? easeOutCubic(Math.min(1, (localAge - 1.05) / 1.45)) : 0;

    const swayAngle = reducedMotion ? 0 : Math.sin(elapsedSec * stem.swaySpeed + stem.swayPhase) * stem.swayAmpRad;
    const totalAngle = stem.leanRad + swayAngle;

    const sx = anchorX + stem.offsetXFrac * bouquetScalePx * 0.6;
    const sy = anchorY + stem.baseYOffsetFrac * bouquetScalePx;
    const stemLen = bouquetScalePx * stem.heightFrac * stemP;
    const stemThick = Math.max(2.2, bouquetScalePx * 0.022 * stem.headScale);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(totalAngle);

    // Glossy #ba55d3 -> #da70d6 orchid stem (shaded left edge + bright center-right sheen)
    const lightHex = shiftOrchidHex("#da70d6", stem.hueTintDeg);
    const deepHex = shiftOrchidHex("#ba55d3", stem.hueTintDeg);

    ctx.lineCap = "round";
    ctx.strokeStyle = deepHex;
    ctx.lineWidth = stemThick;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -stemLen);
    ctx.stroke();

    ctx.strokeStyle = lightHex;
    ctx.lineWidth = stemThick * 0.52;
    ctx.beginPath();
    ctx.moveTo(stemThick * 0.14, -stemLen * 0.12);
    ctx.lineTo(stemThick * 0.14, -stemLen);
    ctx.stroke();

    // Alternating rounded orchid stem leaves (.flower__line__leaf--1..6)
    const leafSprite = getOriginalStemLeafSprite(stem.hueTintDeg);
    const leavesMeta =
      stem.leafCount === 6
        ? [
            { yFrac: 0.88, side: 1, delay: 0.7, scale: 1.0 },
            { yFrac: 0.72, side: -1, delay: 0.55, scale: 1.0 },
            { yFrac: 0.55, side: 1, delay: 0.85, scale: 0.96 },
            { yFrac: 0.38, side: -1, delay: 0.4, scale: 0.96 },
            { yFrac: 0.96, side: 1, delay: 1.0, scale: 0.62 },
            { yFrac: 0.98, side: -1, delay: 1.15, scale: 0.62 },
          ]
        : [
            { yFrac: 0.84, side: 1, delay: 0.85, scale: 0.95 },
            { yFrac: 0.64, side: -1, delay: 0.65, scale: 0.95 },
            { yFrac: 0.44, side: 1, delay: 0.5, scale: 0.9 },
            { yFrac: 0.28, side: -1, delay: 0.35, scale: 0.9 },
          ];

    for (const lf of leavesMeta) {
      const leafAge = localAge - lf.delay;
      if (leafAge <= 0) continue;
      const lfP = easeOutCubic(Math.min(1, leafAge / 0.75));
      const ly = -stemLen * lf.yFrac;
      const lw = bouquetScalePx * 0.125 * stem.headScale * lf.scale * lfP;
      const lh = bouquetScalePx * 0.088 * stem.headScale * lf.scale * lfP;
      ctx.save();
      ctx.translate(lf.side * stemThick * 0.35, ly);
      ctx.scale(lf.side, 1);
      ctx.rotate(0.28);
      ctx.drawImage(leafSprite, -lw * 0.04, -lh * 0.88, lw, lh);
      ctx.restore();
    }

    // 4-petal 3D-cupped orchid crown + white cushion + golden center + rising .flower__light motes
    if (headP > 0.02) {
      const crown = getOriginalCrownSprite(stem.hueTintDeg);
      const crownSize = bouquetScalePx * 0.46 * stem.headScale * headP;
      ctx.save();
      ctx.translate(0, -stemLen);
      ctx.drawImage(crown, -crownSize * 0.5, -crownSize * 0.66, crownSize, crownSize);

      // Rising luminous .flower__light particles around the 3 main bouquet stems
      if (stem.hasLights && headP > 0.55) {
        const lightFade = (headP - 0.55) / 0.45;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let m = 0; m < 6; m++) {
          const cycle = reducedMotion ? 0.25 + m * 0.12 : (elapsedSec * 0.25 + m * 0.165 + idx * 0.31) % 1;
          const mx = Math.sin(cycle * Math.PI * 3 + m * 1.4) * (crownSize * 0.26);
          const my = -cycle * (crownSize * 0.95);
          const a = Math.sin(cycle * Math.PI) * lightFade * 0.92;
          ctx.globalAlpha = alpha * a;
          const mSz = Math.max(5, crownSize * 0.14);
          ctx.drawImage(
            m % 2 === 0 ? cachedOriginalSprites!.lightBright : cachedOriginalSprites!.lightDeep,
            mx - mSz * 0.5,
            my - mSz * 0.5,
            mSz,
            mSz
          );
        }
        ctx.restore();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
}
