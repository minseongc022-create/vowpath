import { SignJWT, jwtVerify } from "jose";

const RESET_MAX_AGE = 60 * 15;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }
    return new TextEncoder().encode("dev-only-change-auth-secret-32chars");
  }
  return new TextEncoder().encode(secret);
}

export async function createPasswordResetToken(userId: string) {
  return new SignJWT({ purpose: "password_reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${RESET_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "password_reset" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
