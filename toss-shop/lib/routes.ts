/** Public URL base — 셀러펄스 (Seller Pulse) */
export const SP_BASE = "/sellerpulse";

export const SP_ROUTES = {
  home: SP_BASE,
  login: `${SP_BASE}/login`,
  dashboard: `${SP_BASE}/dashboard`,
  rankings: `${SP_BASE}/dashboard/rankings`,
  keywords: `${SP_BASE}/dashboard/keywords`,
  competitors: `${SP_BASE}/dashboard/competitors`,
  settlements: `${SP_BASE}/dashboard/settlements`,
  settings: `${SP_BASE}/dashboard/settings`,
} as const;
