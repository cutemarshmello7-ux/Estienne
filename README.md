# ESTIENNE - A study in touch

A buildless, scroll-controlled 3D film about cotton paper, blind embossing, champagne foil, a painted edge and the finished stationery pair. Press **Play the film** for the 26-second camera journey, scroll to scrub, or select a chapter. Paper colors are ivory (default), stone and ink.

## Run locally

Serve this directory with any static HTTP server. For example: `python -m http.server 8000`, then open `http://localhost:8000`. Opening index.html directly as a file does not support the ES-module imports and asset loading. GitHub Pages serves the project without a build step.

## Implementation

- `assets/film.js`: actual 3D card, bevelled original logo geometry, physical cotton/foil materials, studio lighting and play/scroll controls.
- `assets/motion.js`: a single continuously differentiable camera path and a refresh-rate-independent critically damped spring.
- `assets/film.css`: responsive editorial layout and chapter transitions.
- `assets/estienne-monogram.svg`: canonical original vector artwork. See AGENTS.md before changing branding.
- `assets/cotton-paper.webp`: generated cotton texture, used as a subtle bump map.
- `assets/vendor/`: locally served Three.js 0.180.0 and its SVG loader / room environment, distributed under the included MIT license. No external JavaScript CDN is required at runtime.

The scene stops rendering at rest, offscreen and when the tab is hidden. Reduced-motion mode replaces the moving camera with a fixed composition and hides film playback. WebGL2 is required for the 3D view; a text-and-logo fallback is shown if rendering cannot initialize. Fonts fall back to local serif/sans-serif fonts if Google Fonts is unavailable.

## Validation

The camera path was sampled at 1,001 progress positions, its velocity was checked on both sides of every internal join, and the spring was verified to produce the same result at 60 and 144 Hz. Desktop and a 390 x 650 embedded viewport were reviewed in the browser. Physical mobile-device performance has not been tested.
