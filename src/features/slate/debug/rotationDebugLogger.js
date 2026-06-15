const MAX_LOG_LINES = 800;

const ringBuffer = [];

const formatLine = (message) => {
  const timestamp = new Date().toISOString();
  return `[ROTATION] ${timestamp} ${message}`;
};

export const log = (message) => {
  const line = formatLine(message);
  ringBuffer.push(line);
  if (ringBuffer.length > MAX_LOG_LINES) {
    ringBuffer.splice(0, ringBuffer.length - MAX_LOG_LINES);
  }
  return line;
};

export const getLogs = (limit = 400) => {
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit) || numericLimit <= 0) return [];
  return ringBuffer.slice(-Math.floor(numericLimit));
};

export const clearLogs = () => {
  ringBuffer.length = 0;
};

export default { log, getLogs, clearLogs };
