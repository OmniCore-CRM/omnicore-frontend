/**
 * Minimal JWT utilities for checking token expiry
 * Does NOT validate signature - only checks structure and expiry
 * Signature validation happens on backend
 */

export interface DecodedJWT {
  exp?: number;
  iat?: number;
  userId?: string;
  companyId?: string;
  role?: string;
  sessionId?: string;
}

/**
 * Decode JWT payload WITHOUT signature verification
 * Used only to check expiry locally - backend validates signature on every request
 */
export function decodeJWT(token: string): DecodedJWT | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8")
    ) as DecodedJWT;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 * Includes 30-second safety buffer to avoid using token right before expiry
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;

  const decoded = decodeJWT(token);
  if (!decoded?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = 30;

  return decoded.exp <= now + bufferSeconds;
}

/**
 * Get seconds until token expires
 */
export function getTokenExpiryIn(token: string | null): number | null {
  if (!token) return null;

  const decoded = decodeJWT(token);
  if (!decoded?.exp) return null;

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - now);
}
