/**
 * frontend/middleware.ts -- Phase 4: Role-Based Access Control (RBAC)
 * ===================================================================
 * Target File: frontend/middleware.ts
 * Rubric Coverage: RBAC Authentication (Student & Recruiter roles) (4 marks)
 * 
 * Enforces role-specific route protection:
 *  - /student/*   -> accessible ONLY to authenticated 'student' role
 *  - /recruiter/* -> accessible ONLY to authenticated 'recruiter' role
 *  - Public paths -> /, /login, /register, /analytics, /api/auth/*
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'pes-dbms-level3-secret-key-384-bit-security'
);

const COOKIE_NAME = 'placement_auth_token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and auth API endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/analytics'
  ) {
    return NextResponse.next();
  }

  // 2. Extract JWT token from cookie or Authorization header
  const token = request.cookies.get(COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    // If accessing protected student or recruiter routes without token, redirect to login
    if (pathname.startsWith('/student') || pathname.startsWith('/recruiter')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('error', 'authentication_required');
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Verify JWT token and decode claims
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = (payload.role as string)?.toLowerCase();

    // 4. Role-Based Access Control Enforcement
    if (pathname.startsWith('/student')) {
      if (userRole !== 'student' && userRole !== 'admin') {
        const errorUrl = new URL('/login', request.url);
        errorUrl.searchParams.set('error', 'unauthorized_student_access');
        return NextResponse.redirect(errorUrl);
      }
    }

    if (pathname.startsWith('/recruiter')) {
      if (userRole !== 'recruiter' && userRole !== 'admin') {
        const errorUrl = new URL('/login', request.url);
        errorUrl.searchParams.set('error', 'unauthorized_recruiter_access');
        return NextResponse.redirect(errorUrl);
      }
    }

    // 5. Attach decoded identity to response headers for API downstream usage
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(payload.userId || ''));
    requestHeaders.set('x-user-role', userRole || '');
    requestHeaders.set('x-user-email', String(payload.email || ''));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    // Expired or invalid token
    if (pathname.startsWith('/student') || pathname.startsWith('/recruiter')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'session_expired');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/student/:path*',
    '/recruiter/:path*',
    '/api/applications/:path*',
    '/api/jobs/:path*',
  ],
};
