import bcrypt from "bcryptjs";

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

export function isBcryptHash(hash: string): boolean {
  return Boolean(hash && BCRYPT_HASH.test(hash));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  if (!password || !isBcryptHash(hash)) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
