import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      password,
      role,
      fullName,
      category,
      cgpa,
      educationLevel,
      companyName,
      industry,
      location,
    } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required fields.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await query<any[]>('SELECT user_id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: `An account with email '${email}' already exists. Please sign in instead.` },
        { status: 409 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(password, salt);

    // Perform atomic user registration within transaction
    const result = await withTransaction(async (conn) => {
      // 1. Insert into users
      const [userRes]: any = await conn.execute(
        'INSERT INTO users (email, pass_hash, role) VALUES (?, ?, ?)',
        [email.trim().toLowerCase(), passHash, role]
      );
      const newUserId = userRes.insertId;

      // 2. Insert role-specific profile
      if (role === 'student') {
        const studentName = fullName?.trim() || email.split('@')[0];
        const studentCategory = category || 'Data Science';
        const parsedCgpa = cgpa ? parseFloat(cgpa) : 8.50;
        const edu = educationLevel || 'B.E. / B.Tech';

        const [candRes]: any = await conn.execute(
          'INSERT INTO candidates (user_id, full_name, category, cgpa, education_level) VALUES (?, ?, ?, ?, ?)',
          [newUserId, studentName, studentCategory, parsedCgpa, edu]
        );
        return { userId: newUserId, candidateId: candRes.insertId };
      } else if (role === 'recruiter') {
        const compName = companyName?.trim() || 'New Enterprise Hiring';
        const ind = industry?.trim() || 'IT Services';
        const loc = location?.trim() || 'Bengaluru';

        const [compRes]: any = await conn.execute(
          'INSERT INTO companies (user_id, company_name, industry, location) VALUES (?, ?, ?, ?)',
          [newUserId, compName, ind, loc]
        );
        return { userId: newUserId, companyId: compRes.insertId };
      }

      return { userId: newUserId };
    });

    return NextResponse.json({
      success: true,
      message: `Account created successfully! You can now log in as ${role === 'student' ? 'a Student' : 'a Recruiter'}.`,
      ...result,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    const isDuplicate = err.code === 'ER_DUP_ENTRY';
    return NextResponse.json(
      { error: isDuplicate ? 'An account with this email already exists.' : (err.message || 'Registration failed') },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
