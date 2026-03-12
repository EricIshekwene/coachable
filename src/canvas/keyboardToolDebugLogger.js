const MAX_LOG_LINES = 800;

const ringBuffer = [];

const toErrorString = (value) => {
  if (!value) return "unknown";
  if (value instanceof Error) return value.message || value.name || "error";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const formatLine = (message) => {
  const timestamp = new Date().toISOString();
  return `[KEYDBG] ${timestamp} ${message}`;
};

export const log = (message, meta) => {
  const suffix = meta === undefined ? "" : ` ${toErrorString(meta)}`;
  const line = formatLine(`${message}${suffix}`);
  ringBuffer.push(line);
  if (ringBuffer.length > MAX_LOG_LINES) {
    ringBuffer.splice(0, ringBuffer.length - MAX_LOG_LINES);
  }
  console.log(line);
  return line;
};

export const getLogs = (limit = 300) => {
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit) || numericLimit <= 0) return [];
  return ringBuffer.slice(-Math.floor(numericLimit));
};

export const clearLogs = () => {
  ringBuffer.length = 0;
};

export default {
  log,
  getLogs,
  clearLogs,
};
