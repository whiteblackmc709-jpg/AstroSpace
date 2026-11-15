// Canonical quality profiles are a presentation/adapter layer over the five legacy tiers.
// Keep legacyQuality intact: terrain, biome, PBR and foliage budgets still key off it.
const LEGACY_TO_PROFILE = Object.freeze({
  performance: "low",
  balanced: "medium",
  cinematic: "high",
  "4k": "ultra",
  "8k": "ultra"
});

const PROFILE_LABELS = Object.freeze({
  low: "Low",
  medium: "Medium",
  high: "High",
  ultra: "Ultra"
});

export const LEGACY_QUALITY_VALUES = Object.freeze(Object.keys(LEGACY_TO_PROFILE));

export function normalizeLegacyQuality(value, fallback = "balanced") {
  if (Object.prototype.hasOwnProperty.call(LEGACY_TO_PROFILE, value)) return value;
  if (Object.prototype.hasOwnProperty.call(LEGACY_TO_PROFILE, fallback)) return fallback;
  return "balanced";
}

export function resolveQualityProfile(legacyValue) {
  const legacyQuality = normalizeLegacyQuality(legacyValue);
  const id = LEGACY_TO_PROFILE[legacyQuality];
  return Object.freeze({
    id,
    label: PROFILE_LABELS[id],
    legacyQuality
  });
}
