import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signSessionToken, COOKIE_NAME } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Look up user in database
    const users = await query<any[]>(
      'SELECT user_id, email, pass_hash, role FROM users WHERE LOWER(email) = ?',
      [cleanEmail]
    );

    const user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      return NextResponse.json(
        { error: `No account found with email '${cleanEmail}'. Please register first.` },
        { status: 401 }
      );
    }

    // 2. Verify password (auto-generated ETL accounts have placeholder hashes — allow password123)
    const isETLAccount = user.pass_hash?.startsWith('$2b$12$auto_hash') ||
                         user.pass_hash?.startsWith('$2b$12$admin_hash') ||
                         user.pass_hash?.startsWith('$2b$12$recruiter') ||
                         user.pass_hash?.startsWith('$2b$12$student_') ||
                         user.pass_hash?.startsWith('$2b$12$demo');
    let passwordValid = false;
    if (isETLAccount && password === 'password123') {
      passwordValid = true;
    } else {
      passwordValid = await bcrypt.compare(password, user.pass_hash || '');
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Incorrect password. Please verify and try again.' },
        { status: 401 }
      );
    }

    // 3. Role mismatch check
    if (role && user.role !== role && user.role !== 'admin') {
      return NextResponse.json(
        { error: `This account is registered as '${user.role}', not '${role}'. Please use the ${user.role} sign in page.` },
        { status: 403 }
      );
    }

    // 4. Fetch role-specific profile
    let candidateId: number | undefined;
    let companyId: number | undefined;
    let fullName = user.email.split('@')[0];

    if (user.role === 'student') {
      const cands = await query<any[]>(
        'SELECT candidate_id, full_name FROM candidates WHERE user_id = ?',
        [user.user_id]
      );
      if (cands && cands.length > 0) {
        candidateId = cands[0].candidate_id;
        fullName = cands[0].full_name;
      }
    } else if (user.role === 'recruiter') {
      const comps = await query<any[]>(
        'SELECT company_id, company_name FROM companies WHERE user_id = ?',
        [user.user_id]
      );
      if (comps && comps.length > 0) {
        companyId = comps[0].company_id;
        fullName = comps[0].company_name;
      }
    }

    // 5. Sign JWT
    const token = await signSessionToken({
      userId: user.user_id,
      email: user.email,
      role: user.role,
      name: fullName,
      candidateId,
      companyId,
    });

    const response = NextResponse.json({
      success: true,
      user: { userId: user.user_id, email: user.email, role: user.role, name: fullName, candidateId, companyId },
      redirect: user.role === 'recruiter' ? '/recruiter' : '/student',
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during login' },
      { status: 500 }
    );
  }
}
