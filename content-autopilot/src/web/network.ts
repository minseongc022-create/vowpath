import { networkInterfaces } from "node:os";

export function getLanAddresses(port: number): string[] {
  const urls: string[] = [];
  const ifaces = networkInterfaces();
  for (const entries of Object.values(ifaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      urls.push(`http://${entry.address}:${port}`);
    }
  }
  return urls;
}

export function getDashboardUrls(port: number): { local: string; lan: string[] } {
  return {
    local: `http://127.0.0.1:${port}`,
    lan: getLanAddresses(port),
  };
}
