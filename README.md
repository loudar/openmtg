# OpenMTG

Pixi.js-based prototype UI for a Magic: The Gathering play engine.

## Prerequisites
- Bun 1.2+ (use `bun --version` to confirm)

## Install
```bash
bun install
```

## Development (web)
Start a local dev server (Vite) and open the app in your browser:
```bash
bun run dev
```
Then visit the URL printed in the terminal (e.g., http://localhost:5173/).

## Build for production
```bash
bun run build
```
The output will be generated in `dist/`.

## Preview production build
```bash
bun run preview
```

## Notes
- Rendering is via Pixi.js. The canvas is appended to the document body on page load.
- The UI provides basics: a deck you can tap to draw, draggable card tiles, and a life counter.
