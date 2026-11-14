// Minimal, dependency-free logger. Swap for pino/winston in production if needed.
const ts = () => new Date().toISOString();

export default {
  info: (msg) => console.log(`[${ts()}] INFO  ${msg}`),
  warn: (msg) => console.warn(`[${ts()}] WARN  ${msg}`),
  error: (msg) => console.error(`[${ts()}] ERROR ${msg}`),
};
