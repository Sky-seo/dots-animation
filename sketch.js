'use strict';

// A polar lattice: staggered concentric rings, born at the centre and drifting outward.
// Everything is procedural; the supplied video is a visual reference only.
new p5((p) => {
  const canvas = document.querySelector('#canvas');
  const $ = (selector) => document.querySelector(selector);
  const TAU = Math.PI * 2;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { mode: 'orbit', speed: 1, rotation: 1, size: 3.5, spread: 50, paused: reducedMotion.matches, time: 0 };
  let width = 0, height = 0, lastTime = null;
  let ready = false;
  let exporting = false;
  let transition = 1;
  let previousMode = 'orbit';

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    p.resizeCanvas(Math.round(width), Math.round(height), true);
    renderField();
  }

  // Measured from the reference: 13 dots per ring, ~8 rings visible, a new ring
  // born at the inner edge every ~3 s. Rings travel outward, decelerating, and
  // their dots swell then shrink to nothing at the outer edge. The video also
  // turns counter-clockwise by half a dot step per ring (~4.6°/s).
  const RINGS = 8;
  const DOTS = 13;
  const PERIOD = 3;
  // Each ring is turned a fraction num/den of a dot step from the one before.
  // A rational step makes the lattice repeat every `den` rings, so the whole
  // field returns to exactly the same frame after den × PERIOD seconds.
  // Rotation can cancel that stagger: if the field turns by a whole number of
  // dot steps minus the stagger each ring period, every period looks identical,
  // so any non-zero rotation loops in a single PERIOD (3 s) — as the video does.
  const STEPS = { 2: [1, 2], 3: [1, 3], 5: [3, 5] };
  let STEP_NUM = 3, STEP_DEN = 5, LOOP = PERIOD;  // ⅗: the original spiral shape
  function updateLoop() {
    LOOP = state.rotation ? PERIOD : PERIOD * STEP_DEN;
    state.time %= LOOP;
  }
  function setStagger(rings) {
    [STEP_NUM, STEP_DEN] = STEPS[rings];
    updateLoop();
  }
  // Rotation in dot steps per ring period. Screen y points down, so a negative
  // angle is counter-clockwise. Level +n: CCW, -(s + n - 1). Level -n: CW, n - s.
  // Either way stagger + rotation is a whole number of steps, so it loops.
  function spinPerPeriod() {
    const level = state.rotation, s = STEP_NUM / STEP_DEN;
    if (level > 0) return -(s + level - 1);
    if (level < 0) return -level - s;
    return 0;
  }
  const mod = (a, n) => ((a % n) + n) % n;

  const smoothstep = (a, b, x) => {
    const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };

  // Dot size along the journey: quick grow-in, fullest about a third of the
  // way out, then a long taper that vanishes at the outer edge.
  function sizeProfile(u) {
    const shape = u < 0.38 ? 0.78 + 0.22 * (u / 0.38) : 1 - 0.55 * Math.min(1, (u - 0.38) / 0.55);
    return shape * smoothstep(0, 0.08, u) * (1 - smoothstep(0.88, 1, u));
  }

  // `slot` 0 is the youngest ring. Its progress u runs 0 → 1 from inner to outer edge.
  function point(mode, slot, index, t, unit) {
    const cycles = t / PERIOD;
    let f = cycles - Math.floor(cycles);
    const birth = Math.floor(cycles) - slot;   // fixed for a ring's whole life
    let scale = 1;
    if (mode === 'pulse') {
      // Rings surge outward once per cycle, then nearly stop (still monotonic).
      scale = 1 + 0.14 * Math.cos(f * TAU);
      f -= Math.sin(f * TAU) / TAU * 0.9;
    }
    const u = (slot + f) / RINGS;
    const offset = mod(birth * STEP_NUM, STEP_DEN) / STEP_DEN;
    const angle = (index + offset + spinPerPeriod() * cycles) / DOTS * TAU - Math.PI / 2;
    if (mode === 'wave') {
      // Depends only on screen angle, ring progress and whole turns per loop,
      // so it repeats with the field whatever the rotation.
      const turns = Math.max(1, Math.round(LOOP * 1.6 / TAU));
      scale = 0.72 + 0.28 * Math.cos(angle * 3 - TAU * turns * t / LOOP + u * TAU);
    }

    const outer = unit;
    const inner = unit * (0.62 - state.spread / 100 * 0.24);
    const radius = inner + (outer - inner) * Math.sin(u * Math.PI / 2);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      r: state.size * unit / 90 * sizeProfile(u) * scale,
    };
  }

  // Draws one frame at time t into any p5 surface (the live canvas or an export buffer).
  function drawField(g, w, h, t, prevMode, blend) {
    g.background('#050505');
    g.noStroke();
    g.fill('#efefea');
    const cx = w / 2, cy = h / 2;
    const unit = Math.min(w, h) * 0.335;
    for (let slot = 0; slot < RINGS; slot++) {
      for (let index = 0; index < DOTS; index++) {
        const next = point(state.mode, slot, index, t, unit);
        const prev = blend < 1 ? point(prevMode, slot, index, t, unit) : next;
        if (next.r < 0.05 && prev.r < 0.05) continue;
        const x = cx + prev.x + (next.x - prev.x) * blend;
        const y = cy + prev.y + (next.y - prev.y) * blend;
        const radius = prev.r + (next.r - prev.r) * blend;
        g.circle(x, y, radius * 2);
      }
    }
  }

  function renderField() {
    if (!ready) return;
    const blend = transition * transition * (3 - 2 * transition);
    drawField(p, width, height, state.time, previousMode, blend);
  }

  p.draw = () => {
    const timestamp = p.millis();
    const dt = lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    if (!state.paused && !document.hidden) {
      state.time = (state.time + dt * state.speed) % LOOP;
      transition = Math.min(1, transition + dt * 1.8);
      renderField();
    }
  };

  function updatePause() {
    if (ready) {
      lastTime = null;
      if (state.paused) p.noLoop();
      else p.loop();
    }
    $('#play-label').textContent = state.paused ? 'Play' : 'Pause';
    $('#play-icon').textContent = state.paused ? '▷' : 'Ⅱ';
    $('#pause').setAttribute('aria-label', state.paused ? 'Play animation' : 'Pause animation');
  }
  function setMode(mode) {
    previousMode = state.mode;
    state.mode = mode;
    transition = state.paused ? 1 : 0;
    const labels = { orbit: ['01', 'EMANATING FIELD'], wave: ['02', 'HARMONIC FIELD'], pulse: ['03', 'PULSE FIELD'] };
    $('#figure').textContent = labels[mode][0];
    $('#mode-label').textContent = labels[mode][1];
    renderField();
  }

  document.querySelectorAll('[name=mode]').forEach(input => input.addEventListener('change', () => setMode(input.value)));
  const formatValue = (key, value) =>
    key === 'speed' ? `${value.toFixed(1)}×`
    : key === 'spread' ? `${value}%`
    : key === 'rotation' ? (value === 0 ? 'Off' : `${(Math.abs(spinPerPeriod()) * 360 / DOTS / PERIOD * state.speed).toFixed(1)}°/s ${value > 0 ? '↺' : '↻'}`)
    : value.toFixed(1);
  for (const key of ['speed', 'rotation', 'size', 'spread']) {
    $(`#${key}`).addEventListener('input', event => {
      state[key] = Number(event.target.value);
      $(`#${key}-value`).textContent = formatValue(key, state[key]);
      if (key === 'rotation') updateLoop();
      if (key === 'speed') $('#rotation-value').textContent = formatValue('rotation', state.rotation);
      if (key === 'speed' || key === 'rotation') updateExportNote();
      renderField();
    });
  }
  $('#pause').addEventListener('click', () => { state.paused = !state.paused; updatePause(); });
  $('#reset').addEventListener('click', () => {
    Object.assign(state, { speed: 1, rotation: 1, size: 3.5, spread: 50, time: 0, paused: reducedMotion.matches });
    for (const key of ['speed', 'rotation', 'size', 'spread']) { $(`#${key}`).value = state[key]; $(`#${key}`).dispatchEvent(new Event('input')); }
    $('[name=mode][value=orbit]').checked = true;
    setMode('orbit'); transition = 1; updatePause(); renderField();
  });
  // ---- Loop video export ------------------------------------------------
  // Frames are rendered at exact times (i mod N) * LOOP / N, never in real time.
  // Frames 0 … N-1 are exactly one loop. With "closing frame" on, frame N is
  // appended and is pixel-identical to frame 0 (first = last).
  function exportPlan() {
    const [w, h] = $('#export-size').value.split('x').map(Number);
    const fps = Number($('#export-fps').value);
    const seconds = state.speed > 0 ? LOOP / state.speed : 0;
    const loopFrames = Math.round(seconds * fps);
    const frames = loopFrames && $('#export-closing').checked ? loopFrames + 1 : loopFrames;
    return { w, h, fps, seconds, loopFrames, frames };
  }
  const frameTime = (plan, i) => (i % plan.loopFrames) * LOOP / plan.loopFrames;

  function updateExportNote() {
    const { seconds, frames, loopFrames, fps } = exportPlan();
    $('#loop-length').textContent = seconds ? `${seconds.toFixed(1)} s` : '—';
    $('#export-note').textContent = seconds
      ? `${(frames / fps).toFixed(2)} s · ${frames} frames` + (frames > loopFrames ? ' · last = first' : ' · seamless repeat')
      : 'Set speed above 0 to export.';
    $('#export').disabled = exporting || !seconds;
  }

  async function pickCodec(w, h, fps, bitrate) {
    // High → Main → Baseline; isConfigSupported picks one that fits the size and frame rate.
    for (const codec of ['avc1.640033', 'avc1.64002a', 'avc1.640028', 'avc1.4d0028', 'avc1.42e01f']) {
      const config = { codec, width: w, height: h, bitrate, framerate: fps };
      try { if ((await VideoEncoder.isConfigSupported(config)).supported) return config; } catch {}
    }
    return null;
  }

  async function encodeMp4(g, plan, progress) {
    const { w, h, fps, frames } = plan;
    const config = await pickCodec(w, h, fps, Math.round(w * h * fps * 0.2));
    if (!config) throw new Error(`This browser cannot encode ${w} × ${h} at ${fps} fps.`);
    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width: w, height: h, frameRate: fps },
      fastStart: 'in-memory',
    });
    let failure = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (error) => { failure = error; },
    });
    encoder.configure(config);
    const frameDuration = 1e6 / fps;
    for (let i = 0; i < frames && !failure; i++) {
      drawField(g, w, h, frameTime(plan, i), state.mode, 1);
      const frame = new VideoFrame(g.elt, { timestamp: Math.round(i * frameDuration), duration: Math.round(frameDuration) });
      encoder.encode(frame, { keyFrame: i % fps === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 6) await new Promise(resolve => setTimeout(resolve, 0));
      if (i % 10 === 0) { progress(i / frames); await new Promise(resolve => setTimeout(resolve, 0)); }
    }
    await encoder.flush();
    encoder.close();
    if (failure) throw failure;
    muxer.finalize();
    return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), ext: 'mp4' };
  }

  // Fallback for browsers without WebCodecs: still frame-stepped, but MediaRecorder
  // records in real time, so timing is only approximate and the file is WebM.
  async function recordWebm(g, plan, progress) {
    const { fps, frames } = plan;
    const stream = g.elt.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('This browser cannot record video.');
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 16e6 });
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    const start = performance.now();
    for (let i = 0; i < frames; i++) {
      drawField(g, plan.w, plan.h, frameTime(plan, i), state.mode, 1);
      track.requestFrame();
      progress(i / frames);
      const wait = start + (i + 1) * 1000 / fps - performance.now();
      await new Promise(resolve => setTimeout(resolve, Math.max(0, wait)));
    }
    recorder.stop();
    await stopped;
    return { blob: new Blob(chunks, { type: 'video/webm' }), ext: 'webm' };
  }

  async function exportVideo() {
    const plan = exportPlan();
    if (!plan.frames || exporting) return;
    exporting = true;
    const button = $('#export');
    const wasPaused = state.paused;
    state.paused = true; updatePause();
    for (const id of ['#export', '#pause', '#reset']) $(id).disabled = true;
    const progress = (fraction) => { button.firstChild.textContent = `Exporting ${Math.round(fraction * 100)}% `; };
    progress(0);
    const g = p.createGraphics(plan.w, plan.h);
    g.pixelDensity(1);
    let failure = null;
    try {
      const { blob, ext } = window.VideoEncoder && window.VideoFrame
        ? await encodeMp4(g, plan, progress)
        : await recordWebm(g, plan, progress);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dots-${state.mode}-${plan.w}x${plan.h}-${plan.fps}fps-${plan.seconds.toFixed(1)}s-loop.${ext}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      $('#status').textContent = `Loop video exported (${plan.seconds.toFixed(1)} s).`;
      g.remove();
    } catch (error) {
      g.remove();
      console.error(error);
      failure = `Export failed: ${error.message}`;
    }
    exporting = false;
    button.firstChild.textContent = 'Export loop video ';
    $('#pause').disabled = $('#reset').disabled = false;
    state.paused = wasPaused; updatePause();
    updateExportNote();
    if (failure) $('#status').textContent = $('#export-note').textContent = failure;
  }

  $('#export').addEventListener('click', exportVideo);
  $('#export-size').addEventListener('change', updateExportNote);
  $('#export-fps').addEventListener('change', updateExportNote);
  $('#export-closing').addEventListener('change', updateExportNote);
  $('#stagger').addEventListener('change', event => {
    setStagger(event.target.value);
    $('#rotation-value').textContent = formatValue('rotation', state.rotation);
    updateExportNote(); renderField();
  });

  $('#save').addEventListener('click', () => {
    renderField();
    p.saveCanvas(`dots-${state.mode}-${Date.now()}`, 'png');
    $('#status').textContent = 'Frame saved.';
  });
  $('#fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else { $('#status').textContent = 'Fullscreen is unavailable in this browser.'; }
    } catch { $('#status').textContent = 'Fullscreen is unavailable in this browser.'; }
  });
  document.addEventListener('fullscreenchange', () => {
    $('#fullscreen').innerHTML = `${document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'} <span aria-hidden="true">⛶</span>`;
    $('#fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
  });
  document.addEventListener('keydown', event => {
    if (event.code === 'Space' && !['INPUT', 'BUTTON', 'A', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault(); $('#pause').click();
    }
  });
  document.addEventListener('visibilitychange', () => { lastTime = null; });
  reducedMotion.addEventListener('change', event => { if (event.matches) { state.paused = true; updatePause(); } });
  p.setup = () => {
    const bounds = canvas.getBoundingClientRect();
    p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    p.createCanvas(Math.round(bounds.width), Math.round(bounds.height), p.P2D, canvas);
    ready = true;
    new ResizeObserver(resize).observe(canvas);
    resize();
    updatePause();
    updateExportNote();
    $('#rotation-value').textContent = formatValue('rotation', state.rotation);
  };
});
