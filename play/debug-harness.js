const BOOKMARKS = Object.freeze({
 near: Object.freeze({ yaw: -0.28, pitch: 0.13, distance: 11.5, flight: false, altitude: 0 }),
 mid: Object.freeze({ yaw: -0.34, pitch: 0.17, distance: 18.0, flight: false, altitude: 0 }),
 far: Object.freeze({ yaw: -0.42, pitch: 0.22, distance: 31.0, flight: false, altitude: 0 }),
 orbit: Object.freeze({ yaw: 0.34, pitch: 0.64, distance: 66.0, flight: false, altitude: 0 }),
 aether: Object.freeze({ yaw: -0.31, pitch: 0.28, distance: 26.0, flight: true, altitude: 145 })
});

export const PLAY_DEBUG_BOOKMARKS = BOOKMARKS;

export const PLAY_DEBUG_OFF_FLAGS = Object.freeze([
  "shadows", "terrainpbr", "grass", "foliage", "river", "post"
]);

export const PLAY_DEBUG_TRIANGLE_GROUPS = Object.freeze([
  "terrain", "foliage", "grass", "rocks", "character", "sky", "other"
]);

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
  const off = [...new Set(params.getAll("off")
    .flatMap(value => value.split(","))
    .map(value => value.trim().toLowerCase())
    .filter(value => PLAY_DEBUG_OFF_FLAGS.includes(value)))];
  return Object.freeze({
    debug: params.get("debug") === "1",
    seed,
    bookmark,
    off: Object.freeze(off)
  });
}

function geometryTriangleCount(geometry, instanceCount = 1) {
  if (!geometry?.attributes?.position) return 0;
  const drawCount = geometry.index?.count ?? geometry.attributes.position.count;
  const drawRange = geometry.drawRange || { start: 0, count: Infinity };
  const drawStart = Math.max(0, drawRange.start || 0);
  const drawEnd = Math.min(drawCount, Number.isFinite(drawRange.count)
    ? drawStart + Math.max(0, drawRange.count)
    : drawCount);
  let primitiveIndices = 0;
  const groups = Array.isArray(geometry.groups) ? geometry.groups : [];
  if (groups.length) {
    for (const group of groups) {
      const start = Math.max(drawStart, group.start || 0);
      const end = Math.min(drawEnd, (group.start || 0) + (group.count || 0));
      primitiveIndices += Math.max(0, end - start);
    }
  } else {
    primitiveIndices = Math.max(0, drawEnd - drawStart);
  }
  return Math.floor(primitiveIndices / 3) * Math.max(0, instanceCount);
}

/**
 * Geometry-cost estimate grouped by tagged scene object. It deliberately reports
 * scene-visible geometry, not renderer.info's frustum-culled submitted triangles.
 */
export function collectTriangleBreakdown(root) {
  const triangles = Object.fromEntries(PLAY_DEBUG_TRIANGLE_GROUPS.map(group => [group, 0]));
  const visit = (object, inheritedGroup = "other", parentVisible = true) => {
    if (!object) return;
    const visible = parentVisible && object.visible !== false;
    if (!visible) return;
    const ownGroup = object.userData?.renderGroup;
    const group = PLAY_DEBUG_TRIANGLE_GROUPS.includes(ownGroup) ? ownGroup : inheritedGroup;
    if (object.isMesh && object.geometry) {
      const instances = object.isInstancedMesh ? object.count : 1;
      triangles[group] += geometryTriangleCount(object.geometry, instances);
    }
    for (const child of object.children || []) visit(child, group, visible);
  };
  visit(root);
  const total = PLAY_DEBUG_TRIANGLE_GROUPS.reduce((sum, group) => sum + triangles[group], 0);
  return Object.freeze({ ...triangles, total });
}

export function createSeededRandom(seed) {
  if (!Number.isInteger(seed)) return Math.random;
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createGpuTimer(renderer) {
  let gl, extension, query;
  try {
    gl = renderer?.getContext?.();
    extension = gl?.getExtension?.("EXT_disjoint_timer_query_webgl2");
    if (!extension || typeof gl.createQuery !== "function" ||
        typeof gl.beginQuery !== "function" || typeof gl.endQuery !== "function" ||
        typeof gl.getQueryParameter !== "function") {
      return { beginFrame() {}, endFrame() {}, read() { return null; }, dispose() {} };
    }
    query = gl.createQuery();
    if (!query) return { beginFrame() {}, endFrame() {}, read() { return null; }, dispose() {} };
  } catch {
    return { beginFrame() {}, endFrame() {}, read() { return null; }, dispose() {} };
  }

  let active = false;
  let pending = false;
  let latestMilliseconds = null;
  let failed = false;

  function poll() {
    if (!pending || failed) return;
    try {
      if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return;
      const disjoint = gl.getParameter(extension.GPU_DISJOINT_EXT);
      const nanoseconds = gl.getQueryParameter(query, gl.QUERY_RESULT);
      latestMilliseconds = disjoint || !Number.isFinite(nanoseconds)
        ? null
        : nanoseconds / 1e6;
      pending = false;
    } catch {
      latestMilliseconds = null;
      pending = false;
      failed = true;
    }
  }

  return {
    beginFrame() {
      poll();
      if (failed || pending || active) return;
      try {
        gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
        active = true;
      } catch {
        failed = true;
      }
    },
    endFrame() {
      if (!active) return;
      try {
        gl.endQuery(extension.TIME_ELAPSED_EXT);
        active = false;
        pending = true;
      } catch {
        active = false;
        failed = true;
        latestMilliseconds = null;
      }
    },
    read() {
      poll();
      return latestMilliseconds;
    },
    dispose() {
      if (active) {
        try { gl.endQuery(extension.TIME_ELAPSED_EXT); } catch {}
        active = false;
      }
      try { gl.deleteQuery?.(query); } catch {}
      pending = false;
    }
  };
}

export function createPlayDebugOverlay({
  renderer,
  options,
  getQuality = () => "unknown",
  getTriangleBreakdown = () => null
} = {}) {
  if (!options?.debug || !renderer || typeof document === "undefined") return null;

  const panel = document.createElement("pre");
  panel.id = "astrospace-runtime-debug";
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-label", "AstroSpace renderer measurements");
  panel.style.cssText = [
    "position:fixed",
    "top:auto",
    "right:10px",
    "bottom:88px",
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
  const gpuTimer = createGpuTimer(renderer);
  let sampleCount = 0;
  let sampleIndex = 0;
  let lastPaint = 0;
  let latestUpdateMs = null;
  let latestRenderSubmitMs = null;

  function update(deltaSeconds, updateMs = null, renderSubmitMs = null) {
    gpuTimer.read();
    latestUpdateMs = Number.isFinite(updateMs) ? updateMs : null;
    latestRenderSubmitMs = Number.isFinite(renderSubmitMs) ? renderSubmitMs : null;
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
    const triangleGroups = getTriangleBreakdown() || {};
    const count = value => Number(value || 0).toLocaleString("en-US");
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
      "JS UPDATE: " + (latestUpdateMs === null ? "n/a" : latestUpdateMs.toFixed(2) + " ms") +
        " | JS RENDER SUBMIT: " + (latestRenderSubmitMs === null ? "n/a" : latestRenderSubmitMs.toFixed(2) + " ms"),
      "GPU: " + (gpuTimer.read() === null ? "n/a" : gpuTimer.read().toFixed(2) + " ms (timer query)"),
      "JS timings are CPU-side; GPU time requires a supported timer query.",
      "TRIANGLES BY GROUP (scene-visible estimate):",
      "TERRAIN " + count(triangleGroups.terrain) + " | FOLIAGE " + count(triangleGroups.foliage) + " | GRASS " + count(triangleGroups.grass),
      "ROCKS " + count(triangleGroups.rocks) + " | CHARACTER " + count(triangleGroups.character) + " | SKY " + count(triangleGroups.sky) + " | OTHER " + count(triangleGroups.other),
      "GROUP ESTIMATE TOTAL: " + count(triangleGroups.total),
      "OFF: " + (options.off?.length ? options.off.join(", ").toUpperCase() : "NONE") +
        (options.off?.includes("post") ? " | POST FX: NOT PRESENT IN CURRENT RUNTIME" : ""),
      "RENDER SCALE: " + renderScale + "% DPR | PIXEL RATIO: " + pixelRatio.toFixed(2),
      "QUALITY: " + String(getQuality()).toUpperCase(),
      "SEED: " + seedLabel + " | BOOKMARK: " + bookmarkLabel,
      "Resource counts are renderer counters, not VRAM."
    ].join("\n");
  }

  return {
    beginGpuFrame() {
      gpuTimer.beginFrame();
    },
    endGpuFrame() {
      gpuTimer.endFrame();
    },
    update,
    dispose() {
      gpuTimer.dispose();
      panel.remove();
    }
  };
}
