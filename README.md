# ✨ GHELI — *The Art of Being You*

> *A birthday experience handcrafted for one person. Not a card. Not a playlist. Something else entirely.*

---

```
 ██████╗ ██╗  ██╗███████╗██╗     ██╗
██╔════╝ ██║  ██║██╔════╝██║     ██║
██║  ███╗███████║█████╗  ██║     ██║
██║   ██║██╔══██║██╔══╝  ██║     ██║
╚██████╔╝██║  ██║███████╗███████╗██║
 ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝
        — for Shruti. 26 November 2026 —
```

---

## 🌌 What is this?

**GHELI** is a fully interactive, cinematic, 12-chapter birthday experience built as a Next.js web application.

It is not a template. It is not a birthday card generator. It was designed, written, animated and timed specifically for one person — with her photographs, her conversations, her inside jokes, and her name.

It includes:
- A Spider-Man drawing that assembles itself contour by contour
- A reconstructed Instagram DM thread from memory
- A universe of luminous flowers filling the screen
- Her photos arranged as planets in a living 3D galaxy
- A birthday cake you blow out by touching the flame
- A handwritten letter that writes itself, word by word
- A continuous unbroken music track that never cuts between scenes
- And a sky full of constellations shaped like her

---

## 🎬 The 12 Chapters

| # | Scene | What Happens |
|---|-------|--------------|
| 01 | **Hey, Gheli** | A quiet black screen. Three lines. Then: *"Ready?"* |
| 02 | **Spider-Man** | A Python Turtle Engine sketches Spider-Man, contour by contour, in real time |
| 03 | **But That's Gheli** | Kinetic typography. Interactive letters. A line about not losing yourself |
| 04 | **Two Years Ago** | A nostalgic timestamp. *Somewhere, two years ago.* |
| 05 | **Where It Began** | A reconstructed OLED Instagram DM — the first birthday reply, then 3 moments |
| 06 | **Little Garden** | A canvas-rendered flower universe — aurora, meadow, animated botanical blossoms |
| 07 | **Moments** | Her photos in a spatial constellation that morphs into a 3D elliptical orbit |
| 08 | **One Little Moment** | A bow, an arrow, a heart tree, a bloom, a handwritten signature |
| 09 | **This Moment** | A birthday cake. Touch the flame. Close your eyes. Make a wish |
| 10 | **A Little Note** | A deckled cotton letter that writes itself with a traveling fountain-pen nib |
| 11 | **Let's Wrap This Up** | *Alright, Gheli…* → Star-warp launch into the galaxy |
| 12 | **Memory Galaxy** | A Three.js 3-arm spiral galaxy with her photos as spherical planets |

---

## ⚙️ Tech Stack

```
Next.js 15.5  ·  React 19  ·  TypeScript 5.7
Three.js       ·  GSAP 3    ·  Zustand
Canvas 2D API  ·  Web Audio API  ·  CSS Custom Properties
canvas-confetti · Lucide React
```

**Zero external UI libraries.** Every scene, animation, layout and interaction is hand-authored.

---

## 🏗️ Architecture

```
📁 app/                   Next.js App Router entry + globals.css
📁 components/
  📁 experience/          Shell, Orchestrator, Audio Controller, Progress HUD
  📁 scenes/              12 scene components + their CSS
  📁 animations/          Reusable canvas animations (confetti, smoke, starfield)
📁 content/               Birthday letter, gallery manifest, chat conversations
📁 experience/            Scene graph (transitions, metadata, constants)
📁 lib/audio/             Music cue manager + Web Audio synthesizer
📁 state/                 Zustand experience store (scene, sound, dev override)
📁 public/                Audio, images, fonts
📁 docs/                  Implementation log + verification report
```

---

## 🎵 Continuous Soundtrack

The music — *Lut Gaye* — plays as a single unbroken `HTMLAudioElement` from the moment `"Ready?"` is tapped. Scene transitions never seek, restart or interrupt it. Volume is ducked and swelled gently per chapter using a central `MusicCueManager`.

---

## 📱 Mobile-First, Not Mobile-Scaled

Every scene has its own considered mobile composition:
- Spider-Man fills the portrait viewport without shrinking a desktop canvas
- The constellation displays uncropped portrait S-curves that morph into 3D orbit
- The flower garden fills the full screen edge-to-edge
- The letter fits on one screen without scrolling
- The galaxy shows a tilt hint on portrait phones

Tested at **360×800**, **390×844**, **430×932**, **844×390** (landscape), and **1440×900**.

---

## 🚀 Running Locally

```bash
npm install
npm run build
npm run start
# → http://localhost:3000
```

**Dev scene jump (localhost or LAN):**
```
/?scene=SPIDERMAN
/?scene=INSTAGRAM_ARCHIVE
/?scene=BIRTHDAY_CAKE
/?scene=MEMORY_GALAXY
# ... etc.
```

---

## 🔗 All Scene Links (Local Dev)

| Scene | URL |
|-------|-----|
| 01 · Hey, Gheli | `/?scene=BLACK_INTRO` |
| 02 · Spider-Man | `/?scene=SPIDERMAN` |
| 03 · But That's Gheli | `/?scene=GIRL_BEHIND_NAME` |
| 04 · Two Years Ago | `/?scene=TWO_YEARS_AGO` |
| 05 · Where It Began | `/?scene=INSTAGRAM_ARCHIVE` |
| 06 · Little Garden | `/?scene=FLOWER_GARDEN` |
| 07 · Moments | `/?scene=MEMORY_CONSTELLATION` |
| 08 · One Little Moment | `/?scene=HEART_TREE` |
| 09 · This Moment | `/?scene=BIRTHDAY_CAKE` |
| 10 · A Little Note | `/?scene=LETTER` |
| 11 · Let's Wrap This Up | `/?scene=WRAP_UP` |
| 12 · Memory Galaxy | `/?scene=MEMORY_GALAXY` |

---

## 📋 Verification

```
npx tsc --noEmit   →  0 errors
npm run lint       →  0 errors (img warnings acknowledged)
npm run build      →  ✓ Compiled in 9.3s — / 87.9 kB, First Load JS 191 kB
E2E Journey        →  TRACE_TOTAL: 13 (01→12→01), CONSOLE_ERRORS: []
Overflow Matrix    →  0 failures across 40 viewport × scene combinations
```

---

## 🪐 Version History

| Version | Description |
|---------|-------------|
| 4.0 | Initial 12-chapter architecture |
| 4.1 | Spider-Man contour engine + Instagram DM reconstruction |
| 4.2 | Full letter scene + mobile layout audit |
| 4.4 | Instagram scroll preservation + galaxy photo planets |
| 4.5 | Galaxy cinematic motion + Spider-Man composition |
| 4.6 | IG blur fixes, full-screen flowers, 3-mode gallery |
| 4.7 | Audio timing, crisp intros, 60fps canvas flower universe |
| 4.8 | Calligraphic letter, auto-morphing constellation, confetti cake |
| **4.9** | **Mobile-portrait compositions, botanical flowers, cotton paper letter, galaxy tilt hint** |

---

<div align="center">

*Built with patience, attention and a lot of care.*

*Happy Birthday, Shruti.* 🌸

</div>
