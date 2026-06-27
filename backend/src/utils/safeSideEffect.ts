export async function safeSideEffect<T>(
  fn: () => T | Promise<T>,
  label: string
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[safeSideEffect] ${label} failed:`, err);
    return undefined;
  }
}
