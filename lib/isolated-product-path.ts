/** Routes that use their own shell — never show Effiroad marketing assistant. */
export function isIsolatedProductPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/learn") || pathname.startsWith("/topik");
}
