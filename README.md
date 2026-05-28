# Virtual Try-On v3

A fully browser-based virtual try-on app built with React 19, TypeScript, and Vite.  
No backend required — all ML inference runs in the browser via WebAssembly and WebGL (GPU delegate).

---

## Features

### Real-time overlays
- **Glasses** — 6 frame styles (Wayfarer, Round, Cat-Eye, Aviator, Square, Sporty) with face-width calibrated fit
- **Makeup** — 8 looks (Classic Lip, Full Glam, Soft Blush, Smokey Eye, Bold Liner, Nude, Ombré Lip, Contour)
- **Clothing** — 4 garments (T-Shirt, Hoodie, Jacket, Dress) warped onto the body with perspective-correct quad mapping
- **Accessories** — Watch, Ring, Necklace placed on hands/neck using wrist and finger landmarks

### ML tracking
| Task | Model | Framerate |
|---|---|---|
| Face mesh (468 points) | MediaPipe FaceLandmarker | every frame |
| Body pose (33 points) | MediaPipe PoseLandmarker Lite | every 2nd frame |
| Hand landmarks (21 points per hand) | MediaPipe HandLandmarker | every 2nd frame |

All three models share a single WebAssembly/GPU context and are loaded in parallel at startup. Landmark positions are smoothed with an exponential moving average (EMA) smoother to eliminate jitter.

### Skin tone adaptive makeup
Every 10 seconds the app samples three face patches (cheeks and forehead) from the live video frame and classifies skin tone as fair → deep. Makeup blend modes and opacity are then adjusted automatically:
- `multiply` (smokey eye, contour) is softened on dark skin to prevent the effect disappearing
- `screen` (blush, eye shadow) is reduced on light skin to prevent washout

### HD Try-On (photorealistic)
In Clothing mode the **HD** tab generates a photorealistic still using the [CatVTON](https://huggingface.co/spaces/zhengchong/CatVTON) diffusion model hosted on Hugging Face Spaces. A torso mask is derived from pose landmarks, a garment flat-lay is rendered from the SVG, and both are sent to the Gradio API. Generation takes 30–60 seconds. Results are automatically saved to the History tab.

### AI Style Advisor
The **AI** tab sends the current look, face shape (detected from landmarks), and any free-text prompt to `claude-sonnet-4-6` via the Anthropic API. The response includes three recommendations with item, color, vibe tag, and reason — each is one-click to apply. The static system prompt is sent with Anthropic prompt caching to reduce latency on repeat requests.

### UI
- **Desktop** (≥ 769 px): three-column layout — sidebar | camera | right panel
- **Mobile** (≤ 768 px): full-screen camera, bottom items strip, bottom nav (category switch, capture, adjust), bottom sheet for controls
- Settings persist in `localStorage` across page reloads (mode, item, config, history)

---

## Getting Started

```bash
npm install
cp .env.example .env
```

Edit `.env` and fill in the keys you need (see [Environment variables](#environment-variables) below).

```bash
npm run dev       # development server with HMR
npm run build     # production build
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

The app requires:
- A browser with **WebAssembly + WebGL 2** support (Chrome 90+, Firefox 89+, Safari 15.4+)
- **Camera permission** — the overlay canvas is composited over the live video feed
- **HTTPS or localhost** — `getUserMedia` is blocked on plain HTTP in most browsers

MediaPipe model assets (~10 MB total) are fetched from CDN on first camera start and then cached by the browser.

---

## Environment variables

All variables are optional unless noted. Copy `.env.example` to `.env` to set them.

| Variable | Required | Description |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | For AI tab | Anthropic API key (`sk-ant-…`). Without it the AI advisor shows a disabled state. |
| `VITE_ANTHROPIC_API_URL` | No | Override the Anthropic endpoint. Defaults to `https://api.anthropic.com/v1/messages`. |
| `VITE_HF_TOKEN` | No | Hugging Face token (`hf_…`) for higher rate limits on the CatVTON Space. |
| `VITE_CATVTON_SPACE` | No | HF Space slug for HD try-on. Defaults to `zhengchong/CatVTON`. |

> **Security note** — these keys are embedded in the client bundle at build time. Use only in private/local deployments or behind a CORS proxy for production.

---

## Usage

### Desktop
1. Select a category from the left sidebar (Glasses / Makeup / Clothing / Accessories).
2. Click an item in the grid to select it.
3. Click **▶ Start Camera** in the center — face detection begins automatically.
4. Use the **Adjust** tab on the right to change scale, offset, opacity, intensity, and color.
5. Click **📸 Capture** to save a screenshot; view it under **History**.
6. Switch to **✦ HD** (Clothing mode only) to generate a photorealistic still.
7. Open **✦ AI** to get style recommendations based on your face shape and current look.

### Mobile
1. Tap a category icon in the bottom nav.
2. Scroll the horizontal items strip above the nav to select an item.
3. Tap **▶ Start Camera** in the viewport.
4. Tap **📸** in the bottom nav to capture.
5. Tap **⚙️** in the bottom nav to open the adjust / HD / AI / history sheet.

---

## Project structure

```
src/
├── assets/
│   └── catalog.ts            — item catalog (ids, names, categories, color palettes)
├── components/
│   ├── AIStyleAdvisor.tsx    — Claude-powered style advisor with face shape detection
│   ├── CameraViewport.tsx    — camera feed, overlay canvas, RAF loop coordination
│   ├── HDTryOnPanel.tsx      — CatVTON HD try-on panel (Clothing mode)
│   ├── HistoryPanel.tsx      — snapshot grid with download / delete
│   ├── ItemThumbnail.tsx     — sidebar grid thumbnail + mobile strip chip
│   ├── LeftSidebar.tsx       — desktop category sidebar + mobile bottom nav
│   └── RightPanel.tsx        — tabbed right panel / mobile bottom sheet
├── hooks/
│   ├── useHandTracking.ts    — HandLandmark type + HAND_LM constants (shared)
│   └── useTracking.ts        — unified MediaPipe Tasks Vision tracking loop
├── renderers/
│   ├── accessoryRenderer.ts  — watch / ring / necklace placement from hand landmarks
│   ├── clothingRenderer.ts   — legacy canvas clothing (used for thumbnail fallback)
│   ├── clothingRendererV3.ts — SVG + perspective-quad clothing warp (live renderer)
│   ├── glassesRenderer.ts    — 6 glasses styles drawn directly to canvas
│   ├── index.ts              — renderFrame() dispatcher
│   └── makeupRenderer.ts     — 8 makeup looks with skin-tone adaptive blend modes
├── store/
│   ├── cameraRefs.ts         — shared mutable refs for video/canvas elements
│   ├── useHistory.ts         — Zustand snapshot history store (persists to localStorage)
│   └── useStore.ts           — Zustand app state store (mode, config, detection…)
├── types/
│   ├── index.ts              — shared types (Landmark, OverlayConfig, AppState…)
│   └── pose.ts               — PoseLandmark, BodyGeometry, extractBodyGeometry()
└── utils/
    ├── AssetGenerator.ts     — SVG garment/glasses/accessory generators + image cache
    ├── LandmarkSmoother.ts   — EMA landmark smoother for jitter-free overlays
    ├── PerspectiveWarper.ts  — affine-triangle mesh warp for garment perspective
    ├── hdTryOn.ts            — CatVTON Gradio API client + torso mask generator
    └── skinTone.ts           — skin tone sampling + darkenScale / screenScale helpers
```

---

## How rendering works

### Glasses
Eye corner landmarks (33, 133, 362, 263) give the inter-pupillary distance (IPD). Ear landmarks (234, 454) give face width. The final glasses span blends both (35% IPD, 65% face width) to produce a naturally fitting frame. Six styles are drawn directly to the overlay canvas using Canvas 2D primitives.

### Makeup
Face contour and feature landmarks (eyes, brows, lips, cheeks) are used to trace paths. Each makeup style picks blend modes (`multiply`, `screen`, `source-over`) that suit the effect. Blend mode strength is then scaled by the skin tone classifier to maintain visibility across complexions.

### Clothing
SVG garments are rendered to `HTMLImageElement` objects and cached. The image is then mapped onto a quadrilateral defined by shoulder and hip pose landmarks using an affine-triangle subdivision warp (16 × 20 cells). This gives perspective-correct draping without a 3-D engine.

### Accessories
Wrist and finger MCP landmarks place the watch and ring. The necklace uses chin/ear landmarks from the face mesh. All accessories are drawn with `drawImageAnchored()` (translate + rotate, no warping).

---

## Dependencies

| Package | Purpose |
|---|---|
| `react` / `react-dom` | UI framework |
| `typescript` | Type safety |
| `vite` | Build tool + dev server |
| `zustand` | Lightweight state management |
| `@mediapipe/tasks-vision` | Face, pose, and hand landmark detection (GPU delegate) |
| `@gradio/client` | Gradio Spaces API client for CatVTON HD try-on |
| `framer-motion` | Animation (reserved for future UI transitions) |

---

## License

No license is included. Add one before publishing or distributing this project.
