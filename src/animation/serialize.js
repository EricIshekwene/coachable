import { normalizeAnimation } from "./schema";
import { log as logAnimDebug } from "./debugLogger";

export const serializeAnimation = (animation, { pretty = true } = {}) => {
  const normalized = normalizeAnimation(animation);
  return JSON.stringify(normalized, null, pretty ? 2 : 0);
};

export const deserializeAnimation = (value) => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return normalizeAnimation(parsed);
  } catch (error) {
    logAnimDebug(`import failed err=${error?.message || "unknown"}`);
    throw error;
  }
};
