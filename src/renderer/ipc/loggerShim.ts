/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
const loggerShim = {
  info: (...args: any[]) => console.info('[FluigMonitor]', ...args),
  warn: (...args: any[]) => console.warn('[FluigMonitor]', ...args),
  error: (...args: any[]) => console.error('[FluigMonitor]', ...args),
  debug: (...args: any[]) => console.debug('[FluigMonitor]', ...args),
  log: (...args: any[]) => console.log('[FluigMonitor]', ...args),
  transports: {
    file: {
      fileName: '',
      format: '',
      maxSize: 1024 * 1024,
    },
    console: {
      format: '',
    },
  },
};

export default loggerShim;
