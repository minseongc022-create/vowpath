import { NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const shopName = String(body.shopName ?? "").trim();

    if (!email.includes("@") || password.length < 6) {
      return NextResponse.json({ error: "Valid email and 6+ char password required" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, passwordHash, shopName });
    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      shopName: user.shopName,
    });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(
      { error: msg === "EMAIL_TAKEN" ? "Email already registered" : msg },
      { status: msg === "EMAIL_TAKEN" ? 409 : 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      shopName: user.shopName,
    });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const { clearSessionCookie } = await import("@/lib/auth");
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
