# Source Inventory: Gheli — The Art of Being You

**Inspection Date**: 24 November 2026  
**Target Recipient**: Shruti ("Gheli")  
**Occasion**: Birthday — 25 November 2026  
**Lead Architect / Lead Engineer**: Antigravity  

---

## 1. Executive Summary

Four distinct source repositories were provided within the workspace (`C:\Users\ADMIN\Desktop\Ghelikabday`):
1. **bhadwikabday-main**: Pure HTML5/CSS3/JavaScript cinematic birthday film, using an iframe-and-postMessage architecture.
2. **Casa-Tanvi-main**: Modern Next.js (App Router, TypeScript, React 19) experimental architecture containing state machines, GSAP choreography, and extensive specification docs.
3. **Aaki-ka-weird-tohfa-main**: Next.js 15 App Router project using Framer Motion and sequential card-based presentation screens.
4. **Galaxy-main**: Single-page Three.js 100k-particle canvas with external CDN dependencies.

All four repositories remain **completely preserved and untouched** as historical references. The unified production application is established at the root workspace (`C:\Users\ADMIN\Desktop\Ghelikabday`) as a high-performance Next.js React 19 TypeScript application.

---

## 2. Source Repositories Inventory

### A. bhadwikabday-main
* **Primary Tech**: Vanilla HTML5, CSS3, ES6 JavaScript, Web Audio API, HTML5 Canvas, jQuery (legacy), Canvas-Confetti, GSAP.
* **Core Architecture**: Single master frame (`index.html` + `script.js`) hosting 7 external sub-experiences inside an `<iframe>` and communicating via `window.postMessage`.
* **Sub-Experiences Analyzed**:
  - `experiences/birthday-cake/`: SVG cake morphing animations (`<animate>`), CSS candle/flame, Web Audio synthesizer (air puff whoosh + C5-E5-G5-C6 harmonic celestial chimes), HTML5 smoke simulation canvas, interactive floating balloons, confetti bursts, stardust cursor. **[PRIORITY ASSET — ADAPTED & REBUILT]**
  - `experiences/animated-flower/`: Multi-element CSS botanical growth, aurora veil, layered stems/petals/leaves, glow lights. **[PRIORITY ASSET — ADAPTED]**
  - `experiences/crimson-blossom/`: Complementary botanical blooming with canvas particles. **[MERGED WITH FLOWER GARDEN]**
  - `experiences/birthday-gift/`: GSAP bow-and-arrow aiming interaction and canvas heart-tree blooming. **[TECHNICAL REFERENCE]**
  - `experiences/heartbeat-sync/` & `experiences/love-heart/`: Canvas heartbeat particle pulses. **[TECHNICAL REFERENCE]**
  - `experiences/spiderman/`: Canvas particle contour renderer using `contours.json`. **[EXCLUDED — Unrelated narrative]**
* **Media Assets**:
  - `Bhadwi.m4a`: Personal voice recording belonging to previous project. **[STRICTLY EXCLUDED]**
  - `lut-gaye.mp3`: Copyrighted audio track. **[EXCLUDED from default runtime]**
  - `photos/`: 40+ personal photographs of Tanvi and Umar. **[STRICTLY ISOLATED & EXCLUDED]**

---

### B. Casa-Tanvi-main
* **Primary Tech**: Next.js 16 (App Router), React 19, TypeScript, Zustand 5, GSAP 3, Howler, Three.js / React Three Fiber (in draft state).
* **Core Architecture**:
  - Deterministic state machine (`state/experience-store.ts`, `experience/scenes.ts`).
  - Scene orchestrator pattern (`components/experience-orchestrator.tsx`).
  - Design system with luxury typography (Cinzel, Cormorant Garamond, Outfit).
  - Luxury color tokens and ambient lighting layers.
  - Incomplete implementation: Stopped at transition gate; `ESTATE`, `BIRTHDAY`, `AFTERGLOW` were unbuilt stubs.
* **Content & Media**:
  - `chat memories/`, `photos/tanvi/`, `photos/me/`, `photos/together/`: Personal photos and WhatsApp/Instagram chat screenshots of Tanvi & Umar. **[STRICTLY EXCLUDED]**
  - `public/assets/audio/`: Voice memos and specific audio assets. **[STRICTLY EXCLUDED]**
* **Reused Engineering**:
  - Deterministic scene state machine and transition gating.
  - Scene orchestrator architecture.
  - Typography system (Cormorant Garamond + Outfit/Inter).
  - Sound controller architecture pattern.

---

### C. Aaki-ka-weird-tohfa-main
* **Primary Tech**: Next.js 15, React 19, Framer Motion, Tailwind CSS v4, Lucide React.
* **Core Architecture**: Sequential screen stepper (`Screen1` through `Screen5` + `VideoScreen`).
* **Content & Media**:
  - Personal video and Aakriti-specific greetings. **[STRICTLY EXCLUDED]**
  - Repetitive "Next" button patterns and playful dialogs. **[REPLACED with mature narrative flow]**
* **Reused Engineering**:
  - Smooth layout transitions and envelope/card unboxing concepts.

---

### D. Galaxy-main
* **Primary Tech**: HTML5, Three.js (0.132 via Skypack CDN), OrbitControls.
* **Core Architecture**: 100,000-particle point cloud simulation with spiral arm math and camera animation.
* **Evaluation**: Heavyweight (100k points), CDN-dependent, high GPU drain on mobile devices.
* **Reused Engineering**:
  - Adapted into an ultra-lightweight, 60fps Canvas2D / CSS stardust and starfield particle system requiring zero external CDNs and minimal battery/GPU overhead.
