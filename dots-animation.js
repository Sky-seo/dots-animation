'use strict';

// Reference: Dots Animation.mp4. A new ring is born every 0.48 seconds.
// Dots travel on fixed radial rays. There is no angular velocity or rotation.
const DOT_FLOW = { count: 32, interval: 0.48, lifetime: 2.88 };

function smoothStep(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}

function sampleDot(cohort, index, time, side, size, spread, centerDistance = 20, mode = 'emanate') {
  const age = time - cohort * DOT_FLOW.interval;
  if (age < 0 || age >= DOT_FLOW.lifetime) return null;
  const progress = age / DOT_FLOW.lifetime;
  // Alternating rings are staggered by half a dot, fixed for their entire life.
  const stagger = ((cohort % 2) + 2) % 2;
  const angle = (index + stagger * 0.5) / DOT_FLOW.count * Math.PI * 2;
  // Center distance is the birth radius, in percent of the shorter canvas side.
  // Like Pulse in sketch.js, this easing surges outward but never reverses.
  const travel = mode === 'pulse' ? progress - 0.85 * Math.sin(progress * Math.PI * 2) / (Math.PI * 2) : progress;
  let contour = 1;
  if (mode === 'flower') contour = 0.85 + 0.15 * Math.cos(angle * 5);
  if (mode === 'diamond') contour = 1 / (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));
  const radius = side * (centerDistance / 100 + travel * (0.10 + spread / 100 * 0.06)) * contour;
  const birth = smoothStep(progress / 0.10);
  // Wave travels through dot sizes, as in the reference sketch; angles stay fixed.
  const scale = mode === 'wave' ? 0.72 + 0.28 * Math.cos(angle * 3 - time * Math.PI * 2 / 2.4 + cohort * Math.PI * 0.8) : 1;
  const diameter = size * 2 * side / 640 * birth * Math.pow(1 - progress, 0.85) * scale;
  const opacity = birth * smoothStep((1 - progress) / 0.16);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, diameter, opacity };
}

new p5((p) => {
  const $ = selector => document.querySelector(selector);
  const canvas = $('#canvas');
  const stage = canvas.parentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const defaults = { speed: 1, size: 3.5, centerDistance: 20, spread: 50 };
  const state = { ...defaults, mode: 'emanate', time: 0, paused: reducedMotion.matches };
  const modeLabels = {
    emanate: ['01', 'OUTWARD FLOW'], wave: ['02', 'HARMONIC FIELD'],
    pulse: ['03', 'PULSE FIELD'], flower: ['04', 'PETAL FIELD'], diamond: ['05', 'DIAMOND FIELD'],
  };
  let previousMode = state.mode;
  let transition = 1;
  let ready = false;
  let lastTime = null;

  function renderField() {
    if (!ready) return;
    p.background('#050505');
    p.noStroke();
    const side = Math.min(p.width, p.height);
    const newest = Math.floor(state.time / DOT_FLOW.interval);
    const ringCount = Math.ceil(DOT_FLOW.lifetime / DOT_FLOW.interval);
    const blend = smoothStep(transition);
    // Negative birth times prefill the field, so the first frame is complete.
    for (let cohort = newest - ringCount; cohort <= newest; cohort++) {
      for (let index = 0; index < DOT_FLOW.count; index++) {
        const dot = sampleDot(cohort, index, state.time, side, state.size, state.spread, state.centerDistance, state.mode);
        if (dot && blend < 1) {
          const previous = sampleDot(cohort, index, state.time, side, state.size, state.spread, state.centerDistance, previousMode);
          for (const key of ['x', 'y', 'diameter']) dot[key] = previous[key] + (dot[key] - previous[key]) * blend;
        }
        if (!dot || dot.diameter <= 0 || dot.opacity <= 0) continue;
        p.fill(239, 239, 234, dot.opacity * 255);
        p.circle(p.width / 2 + dot.x, p.height / 2 + dot.y, dot.diameter);
      }
    }
  }

  function resize() {
    if (!ready) return;
    const bounds = stage.getBoundingClientRect();
    // Match the stage's inner area, excluding its border.
    p.resizeCanvas(Math.max(1, Math.round(bounds.width - 2)), Math.max(1, Math.round(bounds.height - 2)), true);
    renderField();
  }

  function updatePause() {
    lastTime = null;
    if (ready) {
      if (state.paused) p.noLoop();
      else p.loop();
    }
    $('#play-label').textContent = state.paused ? 'Play' : 'Pause';
    $('#play-icon').textContent = state.paused ? '▷' : 'Ⅱ';
    $('#pause').setAttribute('aria-label', state.paused ? 'Play animation' : 'Pause animation');
  }

  p.setup = () => {
    const bounds = stage.getBoundingClientRect();
    p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    p.createCanvas(Math.max(1, Math.round(bounds.width - 2)), Math.max(1, Math.round(bounds.height - 2)), p.P2D, canvas);
    ready = true;
    new ResizeObserver(resize).observe(stage);
    renderField();
    updatePause();
  };

  p.draw = () => {
    const now = p.millis();
    const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!state.paused && !document.hidden) {
      state.time += dt * state.speed;
      transition = Math.min(1, transition + dt * 1.8);
      renderField();
    }
  };

  function setMode(mode, immediate = false) {
    if (!modeLabels[mode]) return;
    previousMode = state.mode;
    state.mode = mode;
    transition = immediate || state.paused ? 1 : 0;
    $('#figure').textContent = modeLabels[mode][0];
    $('#mode-label').textContent = modeLabels[mode][1];
    document.querySelectorAll('[name=movement]').forEach(input => { input.checked = input.value === mode; });
    renderField();
  }
  document.querySelectorAll('[name=movement]').forEach(input => {
    input.addEventListener('change', () => setMode(input.value));
  });

  for (const key of Object.keys(defaults)) {
    $(`#${key}`).addEventListener('input', event => {
      state[key] = Number(event.target.value);
      $(`#${key}-value`).textContent = key === 'speed' ? `${state[key].toFixed(1)}×` : ['spread', 'centerDistance'].includes(key) ? `${state[key]}%` : state[key].toFixed(1);
      renderField();
    });
  }
  $('#pause').addEventListener('click', () => { state.paused = !state.paused; updatePause(); });
  $('#reset').addEventListener('click', () => {
    Object.assign(state, defaults, { time: 0, paused: reducedMotion.matches });
    for (const key of Object.keys(defaults)) {
      $(`#${key}`).value = state[key];
      $(`#${key}`).dispatchEvent(new Event('input'));
    }
    setMode('emanate', true);
    updatePause();
    renderField();
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
      else $('#status').textContent = 'Fullscreen is unavailable in this browser.';
    } catch { $('#status').textContent = 'Fullscreen is unavailable in this browser.'; }
  });
  document.addEventListener('fullscreenchange', () => {
    const label = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
    $('#fullscreen').innerHTML = `${label} <span aria-hidden="true">⛶</span>`;
    $('#fullscreen').setAttribute('aria-label', label);
  });
  document.addEventListener('keydown', event => {
    if (event.code === 'Space' && !['INPUT', 'BUTTON', 'A', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      $('#pause').click();
    }
  });
  document.addEventListener('visibilitychange', () => { lastTime = null; });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) { state.paused = true; updatePause(); }
  });
});
