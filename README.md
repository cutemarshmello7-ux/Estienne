# Terrain — Estienne material film

An 18-second continuous camera film follows cotton paper, the original CE blind emboss, champagne foil, a layered oxblood edge, the complete card and its envelope. The approved camera path and timing are unchanged.

## Native 4K master

The film is rendered directly in Blender Cycles at 3840 × 2160, 24 fps, 433 frames. It is not an upscale. The master uses up to 192 adaptive samples (minimum 24, noise threshold 0.012), finer emboss geometry, a short 0.10-frame motion shutter and slightly stronger material separation. Depth of field remains disabled to keep material details readable throughout the shot.

The H.264 master uses Blender's perceptually lossless quality preset, a 12-frame GOP and no B frames. The mobile 1920 × 1080 encode derives from the same native 4K PNGs. Five supporting stills are also native 4K.

## Preview

Run `python tools/serve-preview.py` and open its localhost URL, or use static hosting with HTTP byte-range support. Video seeking requires byte ranges; Python’s plain http.server does not provide them. Scroll directly, scrub in either direction or select Play the film. Desktop visitors play the native 4K movie; narrow mobile views use the 1080p movie. The native video decoder replaces the previous low-resolution canvas-frame player. It does not keep hundreds of decoded 4K images in JavaScript memory.

The latest requested seek wins, captions follow the media clock, hidden pages pause playback and reduced-motion visitors receive a still-image journey without loading a movie. No JavaScript production dependencies are required.

## Reproduce

Use Blender 5.2 / Cycles with NVIDIA OptiX to run tools/render-terrain.py with `-- master`. The source uses metres, an 85 × 55 mm card, a continuous displaced paper surface, real cotton fibres and a physical envelope. The Garamond fonts are loaded from C:/Windows/Fonts/GARA.TTF and GARAIT.TTF; use licensed local equivalents when adapting to another machine.

After all 433 native PNGs exist, run tools/encode-film.py with Blender, passing `-- output.mp4 master` for 4K or `-- output.mp4 web` for 1080p. Put the resulting website movies at assets/film/terrain-4k.mp4 and terrain-1080.mp4. Run tools/package-frames.py for the stills and tools/export-preview.py for an offline HTML with its two adjacent movies, a portable preview ZIP, four original PNG stills and the source ZIP. Pass the desired export directory as its first argument; the default is render-work/export.

The logo heightmap derives deterministically from assets/estienne-monogram.svg with tools/prepare-assets.py (Pillow, numpy, Node.js and sharp). The logo must never be redrawn or substituted. Reference videos, private stationery sheets, full-sheet previews and consultation transcripts must stay out of the repository.

## Validation

`node tests/player.test.mjs` covers native 4K/mobile source selection, bidirectional and coalesced seeking, complete caption coverage, media-frame synchronization, replay, hidden-page pause and reduced-motion resource release. Browser checks confirm actual movie dimensions, playback, seeking and composition. Encoded video metadata and decoded spot checks are verified separately.
