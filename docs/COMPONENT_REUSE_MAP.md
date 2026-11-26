# Component Reuse & Adaptation Map — GHELI (Version 4)

Updated to reflect the Version 4 twelve-chapter interactive architecture and newly verified personal assets (`chats/`, `chats/moments/`, `pictures/`).

---

| Target Unified Component | Source Origin | Status | Adaptation & Engineering Notes |
|---|---|---|---|
| **ExperienceOrchestrator & Store** | `Casa-Tanvi-main` | **Adapted** | Deterministic 12-chapter state machine (`BLACK_INTRO` → `MEMORY_GALAXY`), transition validation, URL `?scene=` dev jump, zero auto-advance locks. |
| **AudioSynthesizer & Controller** | `bhadwikabday-main` + `Casa-Tanvi-main` | **Rebuilt** | Central Web Audio synthesizer (breath puff, celestial chimes, balloon pops, arrow whoosh, DM tap/arrival tones, transition swells). Zero autoplay, mute toggle, proper node cleanup. |
| **BlackIntroScene** | *New* | **Built New** | Pure black full-viewport editorial opener with restrained opacity/scale beats and `"Ready?"` trigger. |
| **SpidermanScene** | `bhadwikabday-main/experiences/spiderman/` | **Ported & Improved** | Migrated exact `CONTOURS` data, offscreen `inkCanvas`, live stroke, `evenodd` eye/negative-space carving, and SVG turtle cursor into responsive high-DPI React Canvas with cleanup & reduced-motion support. |
| **GirlBehindNameScene** | *New* | **Built New** | Kinetic typography portrait with interactive `G H E L I` letter physics (hover/touch scatter, tilt, spring return). |
| **TwoYearsAgoScene** | *New* | **Built New** | Minimalist nostalgic timeline anchored strictly to verified `25 NOV 2024` → `25 NOV 2026` milestone. |
| **InstagramArchiveScene** | `Casa-Tanvi-main/components/fragments/fragment01/` + `chats/` | **Rebuilt & Adapted** | Rebuilt Casa-Tanvi's OLED phone frame, status bar, DM header, typing indicator, and GSAP self-constructing conversation for Shruti's real `25 NOV 2024` first chat (`chats/`), strictly separated from Part Two's individual reveal of `chats/moments/*.jpg`. |
| **FlowerGardenScene** | `bhadwikabday-main/experiences/animated-flower/` & `crimson-blossom/` | **Ported & Enhanced** | Preserved multi-layer CSS stems, leaves, glowing petals, aurora veil, and 3D CSS butterflies; added pointer fireflies, interactive blossom petal bursts, and React lifecycle cleanup. |
| **MemoryConstellationScene** | *New* | **Built New** | Spatial depth-layered floating gallery of 12 verified Shruti photos (`public/images/shruti/`), gentle orbital parallax, full-size focus inspection without cropping faces. |
| **HeartTreeScene** | `bhadwikabday-main/experiences/birthday-gift/` | **Ported to React** | Preserved full wooden bow, dynamic bowstring + serving, winged arrow, GSAP trajectory, heart burst, rose flood, and recursive Canvas2D heart-blossom tree with falling petals & god-rays. |
| **BirthdayCakeScene** | `bhadwikabday-main/experiences/birthday-cake/` | **Ported & Upgraded** | Restored ALL 6 original SVG SMIL `<animate>` cake tiers/frosting paths (`bizcocho_1..3`, `relleno_1..2`, `crema`), scaled up prominently, preserved 5-layer flame, smoke canvas, pop-able balloons, confetti, and audio; removed auto-blowout timer. |
| **BirthdayLetterScene** | *New* | **Built New** | Interactive envelope & unfolding parchment reveal with natural, warm personal letter. |
| **WrapUpScene** | *New* | **Built New** | Quiet settling transition with `"LET'S WRAP THIS UP"` button launching the 3D galaxy camera dive. |
| **MemoryGalaxyScene** | `Galaxy-main` | **Ported to Three.js** | Preserved original spiral arm math (`branches`, `spin`, `randomnessPower`), OrbitControls damping, and camera sweep; transformed particles into GPU-efficient image sprites using Shruti's approved photos & chat screenshots, with WebGL fallback. |
