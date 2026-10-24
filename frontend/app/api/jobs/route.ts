import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const location = searchParams.get('location');
    const companyId = searchParams.get('company_id');
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(1, limitParam), 200);

    let sql = `
      SELECT 
        v.job_id, v.job_title, v.company_id, v.company_name, v.industry,
        v.location, v.experience_min, v.experience_max, v.payrate, v.num_positions,
        v.posted_at, v.total_applicants, v.avg_applicant_match_pct,
        j.job_description
      FROM vw_active_jobs v
      JOIN jobs j ON v.job_id = j.job_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ' AND (v.job_title LIKE ? OR v.company_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (location) {
      sql += ' AND v.location LIKE ?';
      params.push(`%${location}%`);
    }

    if (companyId) {
      sql += ' AND v.company_id = ?';
      params.push(companyId);
    }

    // Always sort newest first so newly posted jobs appear at the top immediately
    sql += ' ORDER BY v.posted_at DESC, v.job_id DESC LIMIT ?';
    params.push(limit);

    const jobs = await query(sql, params);
    return NextResponse.json({ success: true, count: jobs.length, jobs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'recruiter' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized: Only recruiters can post jobs' }, { status: 403 });
    }

    const { jobTitle, jobDescription, experienceMin, experienceMax, payrate, location, numPositions } = await req.json();

    if (!jobTitle || !jobDescription) {
      return NextResponse.json({ error: 'Job title and description are required' }, { status: 400 });
    }

    let companyId = session.companyId;
    if (!companyId) {
      const comps = await query<any[]>('SELECT company_id FROM companies WHERE user_id = ? LIMIT 1', [session.userId]);
      if (comps && comps.length > 0) {
        companyId = comps[0].company_id;
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Session error: No company profile linked to your account. Please log in again.' }, { status: 403 });
    }

    // Call stored procedure sp_post_job_with_audit
    const callSql = 'CALL sp_post_job_with_audit(?, ?, ?, ?, ?, ?, ?, ?, @out_job_id, @out_status)';
    await query(callSql, [
      companyId,
      jobTitle,
      jobDescription,
      experienceMin || 0,
      experienceMax || null,
      payrate || 'Competitive',
      location || 'Bengaluru',
      numPositions || 1,
    ]);

    const outRes = await query('SELECT @out_job_id AS new_job_id, @out_status AS status_message');
    const out = outRes && outRes[0] ? outRes[0] : { new_job_id: null, status_message: 'Job created' };

    return NextResponse.json({ success: true, ...out });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
