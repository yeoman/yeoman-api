/**
 * Aborts when a given signal aborts, with its reason: at once when it is already aborted. An adapter given the signal of
 * an operation is aborted with it, like the environments and the prompts using the adapter's signal.
 */
export const abortWithSignal = (signal: AbortSignal | undefined, abort: (reason: unknown) => void): void => {
  if (!signal) {
    return;
  }
  if (signal.aborted) {
    abort(signal.reason);
    return;
  }
  signal.addEventListener('abort', () => abort(signal.reason), { once: true });
};
