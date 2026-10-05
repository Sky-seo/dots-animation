# Dots Animation — p5.js

Open **dots-animation.html** in a browser. p5.js is bundled locally; no build or internet connection is required.

This version follows the supplied `Dots Animation.mp4`: staggered dotted rings continuously emerge at the inner edge, travel straight outward, shrink, and disappear. Each dot keeps the same angle throughout its lifetime, so there is no rotation. A brief fade-in keeps new rings from popping into view.

Movement choices take inspiration from `index.html` and `sketch.js`:

- **Emanate:** steady circular outward flow.
- **Wave:** travelling waves of dot size around the rings; positions do not rotate.
- **Pulse:** outward surges with pauses in the travel rhythm, without reversing direction.
- **Flower:** five-lobed petal contours expanding outward.
- **Diamond:** expanding diamond contours.

Switching movements smoothly blends their shapes and dot sizes. While paused, the selected movement appears immediately. All movements support the four parameters; Reset returns to Emanate.

Files:

- `dots-animation.html`: the dedicated entry page
- `dots-animation.js`: p5.js sketch and controls
- `dots-animation.css`: dedicated responsive styles
- `vendor/p5.min.js`: local p5.js library

The existing `index.html`, `sketch.js`, and `style.css` are separate files.

Controls adjust flow speed, dot size, center distance, and travel distance. **Center distance** sets where dots appear: 0–30% of the shorter canvas side (default 20%). It changes the ring's inner radius independently of dot size and outward travel distance, including while paused. Reset restores 20%. Pause (or Space), reset, fullscreen, and PNG export are available. Reduced-motion preferences start the animation paused.

To serve locally: `python3 -m http.server 8001`, then open `http://localhost:8001/dots-animation.html`.

In `dots-animation.js`, `DOT_FLOW.interval` controls how often a ring appears, `DOT_FLOW.lifetime` controls how long it lives, and `sampleDot()` defines the outward travel and shrinking.
