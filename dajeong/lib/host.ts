const HARUWITH_HOSTS = new Set(["haruwith.com", "www.haruwith.com"]);

/**
 * HaruWith owns only its public domains. Vercel preview hosts and local hosts
 * remain available so branch deployments and automated checks still work.
 * The caller should pass a normalized hostname without a port.
 */
export function isHaruwithHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    HARUWITH_HOSTS.has(normalized) ||
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".vercel.app")
  );
}
