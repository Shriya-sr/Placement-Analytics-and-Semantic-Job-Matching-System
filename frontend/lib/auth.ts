/**
 * frontend/lib/auth.ts -- Authentication & RBAC Session Management
 * ================================================================
 * Target: Person 2 - RBAC Authentication (Student & Recruiter roles) (4 marks)
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'pes-dbms-level3-secret-key-384-bit-security'
);

export interface UserSession {
  userId: number;
  email: string;
  role: 'student' | 'recruiter' | 'admin';
  name?: string;
  candidateId?: number;
  companyId?: number;
}

const COOKIE_NAME = 'placement_auth_token';

/**
 * Signs a JWT session token valid for 24 hours.
 */
export async function signSessionToken(payload: UserSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT token and returns the decoded session payload.
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSession;
  } catch (err) {
    return null;
  }
}

/**
 * Server-side helper to get current session from Next.js request cookies.
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export { COOKIE_NAME };
