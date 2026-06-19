export class TenantAccessError extends Error {
  constructor() {
    super("TENANT_FORBIDDEN");
    this.name = "TenantAccessError";
  }
}

export function assertTenantOwner(
  sessionUserId: string,
  resourceUserId: string | null | undefined,
): void {
  if (!resourceUserId || sessionUserId !== resourceUserId) {
    throw new TenantAccessError();
  }
}

export function stripInternalTenantFields<T extends { userId?: unknown }>(
  value: T,
): Omit<T, "userId"> {
  const { userId: _userId, ...rest } = value;
  return rest;
}
