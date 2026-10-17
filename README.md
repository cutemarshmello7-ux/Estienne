# Terrain — Estienne material film

A new 18-second camera study following cotton fibres, blind emboss, champagne foil, the layered edge and the complete card. The original outlined CE monogram remains the canonical brand asset. Warm ivory, stone and oxblood replace the earlier green default.

This is a motion study: 433 rendered frames at 24 fps, 960 × 540, plus three 1600 × 900 look-development stills. It is not the final production master. Camera timing, transitions, paper detail, foil reflection and the final envelope tuck should be reviewed before a higher-resolution render.

## Preview

Serve this directory with any static web server. Open index.html, scroll directly through the film, use the timeline or select Play the film. Adjacent rendered frames blend at display refresh rate, with no scroll spring or autonomous camera drift. The middle section keeps decorated landmarks in view, and captions cover the whole journey. Mobile displays the complete landscape frame with captions below. Reduced-motion visitors receive a static four-image journey without sequence preloading.

The player keeps compressed WebP frames in memory and decodes only a bounded window around the current frame. It closes evicted bitmaps and pauses playback when the page becomes hidden. It has no production JavaScript dependencies.

## Render

Blender 5.2 / Cycles source: tools/render-terrain.py. Run with -- animatic for the 24 fps study or -- keys for three high-quality stills. The development machine uses NVIDIA OptiX; adapt the device selection for other machines. The script expects Windows Garamond fonts at C:/Windows/Fonts/GARA.TTF and GARAIT.TTF; use licensed local equivalents if unavailable.

The logo heightmap derives deterministically from assets/estienne-monogram.svg, never from an AI redraw. tools/prepare-assets.py converts the canonical SVG with a local sharp installation, softens its height shoulders and writes a 16-bit displacement map. tools/package-frames.py converts completed PNG renders to website WebPs.

The scene uses metres, an 85 × 55 mm card, a continuous deformed paper surface, fine cotton fibres, a three-layer oxblood edge, native text curves and a physical envelope. Reference videos, original stationery sheets, private consultations and full-sheet previews must not be committed.

## Export and validation

After both render modes finish, run tools/package-frames.py and tools/export-preview.py. The latter creates a standalone HTML preview and a static-site ZIP in render-work/export by default; pass another output directory as its first argument if needed.

Run `node tests/player.test.mjs` to exercise bidirectional and rapid scrubbing, image-cache bounds, complete caption coverage, adjacent-frame blending, replay, hidden-page pause and reduced-motion cleanup. Browser QA covers composition and real image loading separately.
