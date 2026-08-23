/**
 * Session & credential handling for the current phase.
 *
 * Passwords: scrypt (memory-hard KDF) with per-user salt and constant-time
 * comparison. Sessions: HMAC-SHA256-signed httpOnly cookie carrying
 * userId + expiry — stateless, so no session table yet; production layers in
 * Auth.js with passkeys + TOTP and a device list per docs/SECURITY.md, behind
 * the same three functions the rest of the app already uses.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export { hashPassword, verifyPassword } from "./password";

const COOKIE = "sage_session";
const TTL_MS = 7 * 24 * 3600 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return s ?? "sage-dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSession(userId: string): void {
  const expires = Date.now() + TTL_MS;
  const payload = `${userId}.${expires}`;
  cookies().set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export function clearSession(): void {
  cookies().delete(COOKIE);
}

/** Verified userId from the session cookie, or null. */
export function getSessionUserId(): string | null {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx <= 0) return null;
  const payload = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const expected = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  const [userId, expiry] = payload.split(".");
  if (!userId || !expiry || Number(expiry) < Date.now()) return null;
  return userId;
}
