/**
 * Debug-only logger. Silent by default.
 * Activate via: chrome.storage.local.set({ betterui_debug: true })
 *
 * No console.log anywhere in the codebase — only log.debug() / log.warn().
 */

const PREFIX = '[betterUI]';

let debugEnabled: boolean | null = null;

async function isDebug(): Promise<boolean> {
  if (debugEnabled !== null) return debugEnabled;
  try {
    const result = await chrome.storage.local.get('betterui_debug');
    debugEnabled = result['betterui_debug'] === true;
  } catch {
    debugEnabled = false;
  }
  return debugEnabled;
}

export const log = {
  debug: async (...args: unknown[]): Promise<void> => {
    if (await isDebug()) {
      console.debug(PREFIX, ...args);
    }
  },

  warn: async (...args: unknown[]): Promise<void> => {
    if (await isDebug()) {
      console.warn(PREFIX, ...args);
    }
  },

  /**
   * Synchronous version for hot paths where await is unacceptable.
   * Only logs if debug was already resolved via initLog().
   */
  debugSync: (...args: unknown[]): void => {
    if (debugEnabled) {
      console.debug(PREFIX, ...args);
    }
  },
};

/** Call once at startup to prime the debug cache. */
export async function initLog(): Promise<void> {
  await isDebug();
  (globalThis as Record<string, unknown>)['__BETTERUI_DEBUG__'] = debugEnabled;
}
