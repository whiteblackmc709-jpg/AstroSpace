import assert from "node:assert/strict";
import {
  chooseSurfaceSize,
  createPlanetPbrMaps,
  createPlanetPbrMaterial
} from "../assets/pbr-surfaces.js";

const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const rafDescriptor = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { deviceMemory: 4 }
});
globalThis.requestAnimationFrame = (callback) => setImmediate(callback);

try {
  const renderer = {
    capabilities: {
      maxTextureSize: 4096,
      getMaxAnisotropy: () => 8
    }
  };
  assert.deepEqual(chooseSurfaceSize(renderer, "performance", "tile"), {
    width: 1024, height: 1024
  });
  assert.deepEqual(chooseSurfaceSize(renderer, "balanced", "tile"), {
    width: 2048, height: 2048
  });
  assert.deepEqual(chooseSurfaceSize(renderer, "balanced", "equirectangular"), {
    width: 2048, height: 1024
  });
  assert.deepEqual(chooseSurfaceSize(renderer, "cinematic", "tile"), {
    width: 2048, height: 2048
  });

  Object.defineProperty(globalThis, "navigator", {
    configurable: true, value: { deviceMemory: 8 }
  });
  assert.deepEqual(chooseSurfaceSize(renderer, "cinematic", "tile"), {
    width: 4096, height: 4096
  });
  assert.deepEqual(chooseSurfaceSize(renderer, "cinematic", "equirectangular"), {
    width: 4096, height: 2048
  });
  assert.deepEqual(chooseSurfaceSize({
    capabilities: { maxTextureSize: 2048 }
  }, "cinematic", "tile"), { width: 2048, height: 2048 });

  class DataTexture {
    constructor(data, width, height, format) {
      this.image = { data, width, height };
      this.format = format;
      this.repeat = { set: (x, y) => { this.repeatX = x; this.repeatY = y; } };
      this.disposed = false;
    }
    dispose() { this.disposed = true; }
  }
  class Vector2 {
    constructor(x, y) { this.x = x; this.y = y; }
  }
  class MeshPhysicalMaterial {
    constructor(options) { Object.assign(this, options); }
  }
  const THREE = {
    DataTexture, Vector2, MeshPhysicalMaterial,
    RGBAFormat: "rgba", RedFormat: "red",
    SRGBColorSpace: "srgb", NoColorSpace: "",
    RepeatWrapping: "repeat",
    LinearFilter: "linear", LinearMipmapLinearFilter: "linear-mipmap-linear"
  };
  const world = {
    id: "elyndra", kind: 0, seed: 41,
    colors: ["#071f3e", "#176b79", "#4fa66f", "#e0d6a5"]
  };
  const generationQuality = process.env.PBR_TEST_QUALITY || "performance";
  const generationAspect = process.env.PBR_TEST_ASPECT || "equirectangular";
  const expectedSize = chooseSurfaceSize(renderer, generationQuality, generationAspect);
  const maps = await createPlanetPbrMaps(THREE, renderer, world, {
    quality: generationQuality, aspect: generationAspect
  });
  let cancelAfterFirstBatch = 0;
  const cancelled = await createPlanetPbrMaps(THREE, renderer, world, {
    quality: "performance", aspect: "tile",
    shouldCancel: () => ++cancelAfterFirstBatch >= 1
  });
  assert.equal(cancelled, null, "Stale texture generation should abort between frame batches.");
  assert.equal(maps.width, expectedSize.width);
  assert.equal(maps.height, expectedSize.height);
  assert.equal(maps.albedo.image.data.length, expectedSize.width * expectedSize.height * 4);
  assert.equal(maps.normal.image.data.length, expectedSize.width * expectedSize.height * 4);
  assert.equal(maps.roughness.image.data.length, expectedSize.width * expectedSize.height * 4);
  assert.equal(maps.albedo.format, "rgba");
  assert.equal(maps.normal.format, "rgba");
  assert.equal(maps.roughness.format, "rgba");
  assert.equal(maps.roughness.image.data[0], maps.roughness.image.data[1]);
  assert.equal(maps.heightMap.image.data.length, expectedSize.width * expectedSize.height);
  assert.equal(maps.albedo.colorSpace, "srgb");
  assert.equal(maps.normal.colorSpace, "");
  assert.equal(maps.roughness.repeatX, 1);
  assert.equal(maps.heightMap.repeatY, 1);
  assert.equal(maps.height, expectedSize.height);

  const material = createPlanetPbrMaterial(THREE, maps, world, { surface: "planet" });
  assert.equal(material.map, maps.albedo);
  assert.equal(material.normalMap, maps.normal);
  assert.equal(material.bumpMap, maps.heightMap);
  assert.equal(material.roughnessMap, maps.roughness);
  assert.equal(material.displacementMap, maps.heightMap);
  assert.ok(material.displacementScale > 0);

  maps.dispose();
  for (const texture of [maps.albedo, maps.normal, maps.roughness, maps.heightMap]) {
    assert.equal(texture.disposed, true);
  }

  for (const kind of [1, 2, 3, 4, 5]) {
    const biomeMaps = await createPlanetPbrMaps(THREE, renderer, {
      ...world, kind, seed: world.seed + kind * 19
    }, { quality: "performance", aspect: "tile" });
    assert.equal(biomeMaps.width, 1024);
    assert.equal(biomeMaps.height, 1024);
    assert.equal(biomeMaps.albedo.image.data.length, 1024 * 1024 * 4);
    biomeMaps.dispose();
  }
  console.log("PBR contract: PASS — "+maps.width+"×"+maps.height+" "+generationAspect+" generation; all six biomes; 1K/2K/4K tier selection, GPU caps, four map channels and disposal.");
} finally {
  if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
  else delete globalThis.navigator;
  if (rafDescriptor) Object.defineProperty(globalThis, "requestAnimationFrame", rafDescriptor);
  else delete globalThis.requestAnimationFrame;
}
