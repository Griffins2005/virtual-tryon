# Virtual Try-On App

A browser-based virtual try-on prototype built with React, TypeScript, and Vite.

This app uses MediaPipe to track the user’s face, pose, and hands, then renders live try-on overlays for:
- Glasses
- Makeup
- Clothing
- Accessories

It also includes an experimental AI Style Advisor and a snapshot history panel.

---

## Features

- Real-time camera try-on with MediaPipe `FaceMesh`, `Pose`, and `Hands`
- Four interactive categories: Glasses, Makeup, Clothing, Accessories
- Adjustable overlay controls: scale, offset, opacity, intensity, and color
- Capture and download the current try-on view as PNG
- Save recent snapshots to an in-app history panel
- AI Style Advisor recommends items based on user input and current selection

---

## Getting Started

Install dependencies:

```bash
npm install
cp .env.example .env
```

Open `.env` and add your Anthropic API key:

```bash
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Lint the project:

```bash
npm run lint
```

---

## Usage

1. Use the left sidebar to select a try-on category and item.
2. Click **Start Camera** in the center viewport.
3. Adjust the overlay in the **Adjust** tab on the right.
4. Open **AI** to request styling advice and apply a recommended item.
5. Capture a frame with the camera control and review it in **History**.

### Notes

- The app requires a modern browser and permission to access the camera.
  - If camera startup fails, check browser permission, HTTPS access, and camera support.
- MediaPipe assets are loaded dynamically from CDN.
- Snapshot history persists in local storage for recent captures.
- App mode, selected item, and overlay settings also persist in local storage.
- The AI Style Advisor uses `VITE_ANTHROPIC_API_KEY` from `.env`.
  - Create `.env` from `.env.example` and add a valid Anthropic API key.
  - Optionally, override `VITE_ANTHROPIC_API_URL` if you need a custom Anthropic endpoint.
  - If the API key or network connection is missing, the advisor will show an error.

---

## Project Structure

- `src/components` — UI components for sidebar, viewport, history, and advisor
- `src/hooks` — tracking hooks and MediaPipe integration
- `src/renderers` — overlay renderers for glasses, makeup, clothing, and accessories
- `src/store` — Zustand stores for app state and snapshot history
- `src/assets` — item catalog and SVG assets
- `src/types` — shared TypeScript types

---

## Dependencies

- React 19
- TypeScript
- Vite
- Zustand
- MediaPipe FaceMesh, Pose, Hands
- Anthropic API (AI Style Advisor)

---

## Development Notes

- This project is a prototype with experimental AI support.
- Camera tracking quality is dependent on browser support and lighting.
- Snapshot history is stored in memory and resets when the page is refreshed.

---

## License

No license is included in this repository. Add a license if you intend to publish or share this project.
