# Dots — a motion study

A p5.js sketch inspired by `Dots Animation.mp4`: white dots in staggered concentric rings that are born at the centre, drift outward, shrink and disappear. Like the video, the field turns slowly counter-clockwise and loops seamlessly every 3 seconds.

Open `index.html` directly in a modern browser. No installation or build is required. p5.js 1.11.11 is bundled locally, so the sketch also works offline.

Alternatively, run `python3 -m http.server 8001` in this folder and visit `http://localhost:8001`.

## Explore

- **Emanate / Wave / Pulse:** smoothly transition between three non-rotating movements.
- **Speed / Dot size / Spread:** adjust the field in real time. Speed changes the loop length (loop ÷ speed).
- **Rotation:** −6 … +6, shown in °/s. Right of centre turns counter-clockwise, left clockwise; the first step right (4.6°/s) matches the video, higher steps spin visibly faster. Any non-zero rotation loops in 3 s; with rotation off the loop is 6–15 s depending on stagger.
- **Stagger:** how far each new ring is turned from the previous one (⅗ step is the default spiral shape; ⅓ is another spiral, ½ a zigzag).
- **Video export:** renders exactly one loop frame by frame and downloads an H.264 MP4 (WebCodecs). With *Closing frame* on, the last frame is identical to the first; turn it off for clips that will repeat in a player, so the shared frame isn't shown twice. Browsers without WebCodecs fall back to a real-time WebM recording.
- **Pause:** freeze the composition; Space also toggles playback when no control is focused.
- **Save a frame:** download the current canvas as a PNG.
- **Reset:** restore the starting composition and settings.

The sketch respects the system's reduced-motion preference by starting paused. Controls remain usable while paused. The layout adapts to mobile screens.

## Files

- `index.html` — interface and accessible controls
- `style.css` — responsive layout
- `sketch.js` — p5.js instance-mode sketch with `setup()`, `draw()`, `circle()`, and `saveCanvas()`
- `vendor/p5.min.js` — bundled p5.js 1.11.11 (LGPL-2.1)
- `vendor/mp4-muxer.min.js` — bundled mp4-muxer 5.2.2 (MIT), used for MP4 export

Change the `point()` function in `sketch.js` to experiment with the movement equations. p5.js owns the canvas, rendering, and animation loop. The animation is generated with code; it does not play or require the reference video.
