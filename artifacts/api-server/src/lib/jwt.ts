/**
 * Minimal HS256 JWT implementation using Node.js built-in crypto.
 * No external dependencies. Used for native-app (Capacitor) sessions.
 *
 * Payload: { sub: telegramId, type: "native", iat, exp }
 * Expiry:  30 days
 * Secret:  SESSION_SECRET env var (falls back to a hard error in production)
 */
import { createHmac, timingSafeEqual } from "crypto";

const EXPIRY_SECS  = 30 * 24 * 60 * 60; // 30 days

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set — cannot sign native JWT");
  return s;
}

export function signNativeJwt(telegramId: string): string {
  const header  = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(Buffer.from(JSON.stringify({
    sub:  telegramId,
    type: "native",
    iat:  Math.floor(Date.now() / 1000),
    exp:  Math.floor(Date.now() / 1000) + EXPIRY_SECS,
  })));
  const signing = `${header}.${payload}`;
  const sig     = b64url(createHmac("sha256", secret()).update(signing).digest());
  return `${signing}.${sig}`;
}

export interface NativeJwtPayload {
  telegramId: string;
}

export function verifyNativeJwt(token: string): NativeJwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, sig] = parts;
    const signing = `${header}.${payload}`;

    const expectedSig  = b64url(createHmac("sha256", secret()).update(signing).digest());
    const actualBuf    = b64urlDecode(sig);
    const expectedBuf  = b64urlDecode(expectedSig);

    if (actualBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(actualBuf, expectedBuf))  return null;

    const claims = JSON.parse(b64urlDecode(payload).toString()) as {
      sub?:  string;
      type?: string;
      exp?:  number;
    };

    if (claims.type !== "native")                                return null;
    if (!claims.sub)                                             return null;
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) return null;

    return { telegramId: claims.sub };
  } catch {
    return null;
  }
}
