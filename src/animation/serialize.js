import { normalizeAnimation } from "./schema";
import { log as logAnimDebug } from "./debugLogger";

/**
 * Converts an animation object to a JSON string, normalizing first.
 * @param {Object} animation - Animation data.
 * @param {Object} [opts] - Options. `pretty` enables indentation.
 * @returns {string} JSON string.
 */
export const serializeAnimation = (animation, { pretty = true } = {}) => {
  const normalized = normalizeAnimation(animation);
  return JSON.stringify(normalized, null, pretty ? 2 : 0);
};

/**
 * Parses a JSON string or object into a normalized animation object.
 * @param {string|Object} value - JSON string or plain object.
 * @returns {Object} Normalized animation.
 * @throws On invalid input.
 */
export const deserializeAnimation = (value) => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return normalizeAnimation(parsed);
  } catch (error) {
    logAnimDebug(`import failed err=${error?.message || "unknown"}`);
    throw error;
  }
};
