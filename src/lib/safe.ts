/**
 * Fail-open wrapper. Catches any error from `fn`, logs it in debug mode,
 * and returns undefined. The SIGAA page remains intact and functional.
 *
 * This is principle #1: if anything fails, the extension silently disables.
 * It NEVER blocks the user from using SIGAA.
 */
export function safe(fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.catch((err: unknown) => {
        logSafeError(err);
      });
    }
  } catch (err: unknown) {
    logSafeError(err);
  }
}

function logSafeError(err: unknown): void {
  try {
    if ((globalThis as Record<string, unknown>)['__BETTERUI_DEBUG__']) {
      console.debug('[betterUI] safe() caught:', err);
    }
  } catch {
    // Even the error logger failed. Truly silent.
  }
}
