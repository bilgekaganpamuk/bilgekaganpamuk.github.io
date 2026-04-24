# bilgekagan.site — Portfolio

Dark premium redesign. Editorial typography (Instrument Serif + Geist), quiet-luxury palette, soft studio lighting on hero 3D scene, static renders for project showcases.

## Pages
- `index.html` — Home (hero, about, work, capabilities, experience, contact)
- `morfo.html` — MORFO 3D Simulation case study (with live screenshots)
- `NeuroSurgery.html` — VR Neurosurgery Training case study (🏆 2023)
- `AstonMartin.html` — Aston Martin VR HMI case study
- `TMJ.html` — TMJ Simulation System case study

## Assets
- `assets/css/main.css` — Complete design system
- `assets/js/main.js` — Nav, reveals, mobile menu, scroll
- `assets/js/hero-scene.js` — Hero 3D (cursor parallax, soft IBL lighting)
- `assets/js/project-scene.js` — Case-page 3D (slow turntable, non-interactive)
- `models/` — GLB assets (preserved from previous site)
- `Morfoimage/` — MORFO screenshots (preserved)

## Design tokens
- Colors: `#0A0A0B` (bg), `#EDEDEF` (ink), `#E8D5B7` (champagne accent)
- Fonts: Instrument Serif (display) · Geist (sans) · Geist Mono (labels)
- One accent, soft warm wash behind hero, subtle noise overlay for grain

## Deployment
Drop all files at the root of `bilgekagan.site`. The CNAME is preserved. Works on GitHub Pages without any build step.

## Tech
Pure HTML + CSS + vanilla JS. Three.js r128 via CDN for 3D scenes. No framework, no build pipeline.
