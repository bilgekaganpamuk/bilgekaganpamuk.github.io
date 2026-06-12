# bilgekagan.site — Portfolio

Dark premium redesign. Editorial typography (Instrument Serif + Geist), quiet-luxury palette, soft studio lighting on hero 3D scene, static renders for project showcases.

## Pages
- `index.html` — Home (hero, about, work, capabilities, experience, contact)
- `morfo.html` — Case 01 · MORFO 3D Simulation (with live screenshots)
- `NeuroSurgery.html` — Case 02 · VR Neurosurgery Training
- `AstonMartin.html` — Case 03 · Aston Martin VR HMI
- `TMJ.html` — Case 04 · TMJ Simulation System
- `DigitalTwin.html` — Case 05 · Digital Twin Mixed Reality System
- `MediBot.html` — Case 06 · MediBot AI Health Assistant
- `DynamicMusicIsland.html` — Case 07 · Dynamic Music Island
- `cv.html` — Self-contained, print-first online CV (light theme, A4 print CSS)
- `404.html` — Not-found page served by GitHub Pages

## Assets
- `assets/css/main.css` — Complete design system
- `assets/js/main.js` — Nav, reveals, mobile menu, scroll
- `assets/js/hero-scene.js` — Hero 3D (cursor parallax, soft IBL lighting)
- `assets/js/project-scene.js` — Case-page 3D (slow turntable, non-interactive)
- `assets/vendor/three.min.js` + `assets/vendor/GLTFLoader.js` — three.js r128, vendored locally (no CDN)
- `assets/Bilge_Kagan_Pamuk_CV.pdf` — Downloadable CV
- `models/` — GLB assets (preserved from previous site)
- `Morfoimage/` — MORFO screenshots (preserved)

## SEO & icons
- `favicon.svg` — SVG favicon (italic serif "B" on dark)
- `apple-touch-icon.png` — iOS home-screen icon (source artboard: `assets/icon-source.html`, 180×180)
- `assets/og-image.png` — 1200×630 social share image (source artboard: `assets/og-image-source.html`)
- `sitemap.xml` — All 9 public pages
- `robots.txt` — Allow all, points to sitemap
- Every page carries canonical, theme-color, Open Graph and Twitter card metadata

## Design tokens
- Colors: `#FAFAF8` (bg, warm white), `#16181D` (ink), `#F2B24C` (amber accent — fills only), `#9A6B14` (dark amber — small text accents)
- Fonts: Instrument Serif (display) · Geist (sans) · Geist Mono (labels)
- One accent, soft warm wash behind hero, subtle noise overlay for grain
- Native system cursor everywhere — the custom cursor was removed
- 3D models are Draco-compressed (decoder at `assets/vendor/draco/`)
- `cv.html` is white-paper print-first: `#141416` text, `#9A6B14` dark-amber accent

## Deployment
Drop all files at the root of `bilgekagan.site`. The CNAME is preserved. Works on GitHub Pages without any build step.

## Tech
Pure HTML + CSS + vanilla JS. three.js r128 is vendored locally at `assets/vendor/three.min.js` (not loaded from a CDN) — only r128-era APIs apply. No framework, no build pipeline.
