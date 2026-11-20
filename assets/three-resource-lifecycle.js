// Three.js resource disposal with scene-scope reference checks.
// A geometry/material/texture shared by sibling chunks is disposed only after
// the final in-scene reference has been detached.
const disposedResources = new WeakSet();

function collectTextures(value, resources, visited, depth = 0) {
  if (!value || typeof value !== "object" || depth > 7) return;
  if (value.isTexture) {
    resources.add(value);
    return;
  }
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return;
  if (visited.has(value)) return;
  visited.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectTextures(item, resources, visited, depth + 1);
    return;
  }
  for (const item of Object.values(value)) {
    collectTextures(item, resources, visited, depth + 1);
  }
}

function addMaterialResources(material, resources) {
  if (!material) return;
  if (typeof material.dispose === "function") resources.add(material);
  for (const value of Object.values(material)) {
    if (value?.isTexture) resources.add(value);
  }
  if (material.uniforms) collectTextures(material.uniforms, resources, new WeakSet());
}

function visitObject(root, excluded, callback) {
  if (!root || excluded?.has(root)) return;
  callback(root);
  for (const child of root.children || []) visitObject(child, excluded, callback);
}

function collectTreeResources(root, excluded = null) {
  const resources = new Set();
  visitObject(root, excluded, object => {
    if (object.geometry && typeof object.geometry.dispose === "function") {
      resources.add(object.geometry);
    }
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) addMaterialResources(material, resources);
  });
  return resources;
}

function collectSubtreeNodes(root) {
  const nodes = new Set();
  visitObject(root, null, object => nodes.add(object));
  return nodes;
}

function getTreeRoot(root) {
  let current = root;
  while (current?.parent) current = current.parent;
  return current;
}

function disposeUnreferenced(resources, retained) {
  let disposed = 0;
  for (const resource of new Set(resources || [])) {
    if (!resource || typeof resource.dispose !== "function" ||
        retained?.has(resource) || disposedResources.has(resource)) continue;
    disposedResources.add(resource);
    try {
      resource.dispose();
      disposed++;
    } catch (error) {
      disposedResources.delete(resource);
      throw error;
    }
  }
  return disposed;
}

export function disposeResourcesIfUnreferenced(resources, referenceRoot, excludeRoot = null) {
  const excluded = excludeRoot ? collectSubtreeNodes(excludeRoot) : null;
  const retained = referenceRoot ? collectTreeResources(referenceRoot, excluded) : new Set();
  return disposeUnreferenced(resources, retained);
}

export function disposeObject3DResources(root) {
  if (!root || root.userData?.__astrospaceResourcesDisposed) {
    return { geometries: 0, materials: 0, textures: 0 };
  }

  const own = collectTreeResources(root);
  const treeRoot = getTreeRoot(root);
  const excluded = collectSubtreeNodes(root);
  const retained = collectTreeResources(treeRoot, excluded);
  let geometries = 0, materials = 0, textures = 0;

  for (const resource of own) {
    if (!resource || retained.has(resource) || disposedResources.has(resource)) continue;
    if (resource.isBufferGeometry) geometries++;
    else if (resource.isMaterial) materials++;
    else if (resource.isTexture) textures++;
    disposeUnreferenced([resource], retained);
  }

  root.userData ||= {};
  root.userData.__astrospaceResourcesDisposed = true;
  root.removeFromParent?.();
  root.clear?.();
  return { geometries, materials, textures };
}
