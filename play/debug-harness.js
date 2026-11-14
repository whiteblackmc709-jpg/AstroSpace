const BOOKMARKS = Object.freeze({
 near: Object.freeze({ yaw: -0.28, pitch: 0.13, distance: 11.5, flight: false, altitude: 0 }),
 mid: Object.freeze({ yaw: -0.34, pitch: 0.17, distance: 18.0, flight: false, altitude: 0 }),
 far: Object.freeze({ yaw: -0.42, pitch: 0.22, distance: 31.0, flight: false, altitude: 0 }),
 orbit: Object.freeze({ yaw: 0.34, pitch: 0.64, distance: 66.0, flight: false, altitude: 0 }),
 aether: Object.freeze({ yaw: -0.31, pitch: 0.28, distance: 26.0, flight: true, altitude: 145 })
});

export const PLAY_DEBUG_BOOKMARKS = BOOKMARKS;

export function parsePlayDebugOptions(search = "") {
  const params = new URLSearchParams(search);
  const rawSeed = params.get("seed");
  let seed = null;
  if (rawSeed !== null && /^-?\d+$/.test(rawSeed)) {
    const parsed = Number(rawSeed);
    if (Number.isSafeInteger(parsed)) seed = parsed | 0;
  }
  const requestedBookmark = String(params.get("bookmark") || "").toLowerCase();
  const bookmark = Object.prototype.hasOwnProperty.call(BOOKMARKS, requestedBookmark)
    ? requestedBookmark
    : null;
  return Object.freeze({
    debug: params.get("debug") === "1",
    seed,
    bookmark
  });
}

export function createSeededRandom(seed) {
  if (!Number.isInteger(seed)) return Math.random;
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createPlayDebugOverlay({ renderer, options, getQuality = () => "unknown" } = {}) {
  if (!options?.debug || !renderer || typeof document === "undefined") return null;

  const panel = document.createElement("pre");
  panel.id = "astrospace-runtime-debug";
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-label", "AstroSpace renderer measurements");
  panel.style.cssText = [
    "position:fixed",
    "top:10px",
    "right:10px",
    "z-index:99999",
    "max-width:min(390px,calc(100vw - 20px))",
    "margin:0",
    "padding:10px 12px",
    "overflow:hidden",
    "border:1px solid rgba(134,231,226,.38)",
    "border-radius:7px",
    "background:rgba(3,10,18,.88)",
    "box-shadow:0 8px 30px rgba(0,0,0,.28)",
    "color:#d7f5f1",
    "font:11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace",
    "white-space:pre-wrap",
    "pointer-events:none",
    "user-select:none"
  ].join(";");

  document.body.appendChild(panel);
  const frameSamples = new Float32Array(120);
  let sampleCount = 0;
  let sampleIndex = 0;
  let lastPaint = 0;

  function update(deltaSeconds) {
    if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      frameSamples[sampleIndex] = deltaSeconds;
      sampleIndex = (sampleIndex + 1) % frameSamples.length;
      sampleCount = Math.min(sampleCount + 1, frameSamples.length);
    }

    const now = performance.now();
    if (now - lastPaint < 250) return;
    lastPaint = now;

    let total = 0;
    const sorted = [];
    for (let i = 0; i < sampleCount; i++) {
      const value = frameSamples[i];
      total += value;
      sorted.push(value * 1000);
    }
    sorted.sort((a, b) => a - b);
    const averageMs = sampleCount ? (total / sampleCount) * 1000 : 0;
    const p95Ms = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
    const fps = total > 0 ? sampleCount / total : 0;

    const info = renderer.info || {};
    const render = info.render || {};
    const memory = info.memory || {};
    const pixelRatio = renderer.getPixelRatio?.() || 1;
    const deviceRatio = window.devicePixelRatio || 1;
    const renderScale = Math.round((pixelRatio / deviceRatio) * 100);
    const seedLabel = options.seed === null ? "default" : String(options.seed);
    const bookmarkLabel = options.bookmark || "none";

    panel.textContent = [
      "ASTROSPACE // RUNTIME DEBUG",
      "FPS: " + (fps ? fps.toFixed(1) : "--") + " | FRAME: " + (averageMs ? averageMs.toFixed(2) : "--") + " ms | P95: " + (p95Ms ? p95Ms.toFixed(2) : "--") + " ms",
      "CALLS: " + (render.calls ?? "--") + " | TRIANGLES: " + (render.triangles ?? "--"),
      "GEOMETRIES: " + (memory.geometries ?? "--") + " | TEXTURES: " + (memory.textures ?? "--"),
      "RENDER SCALE: " + renderScale + "% DPR | PIXEL RATIO: " + pixelRatio.toFixed(2),
      "QUALITY: " + String(getQuality()).toUpperCase(),
      "SEED: " + seedLabel + " | BOOKMARK: " + bookmarkLabel,
      "Resource counts are renderer counters, not VRAM."
    ].join("\n");
  }

  return {
    update,
    dispose() {
      panel.remove();
    }
  };
}
