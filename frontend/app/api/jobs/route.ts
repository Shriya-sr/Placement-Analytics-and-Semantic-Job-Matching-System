import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const location = searchParams.get('location');

    let sql = 'SELECT * FROM vw_active_jobs WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (job_title LIKE ? OR company_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (location) {
      sql += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }

    sql += ' ORDER BY total_applicants DESC, posted_at DESC';

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

    const companyId = session.companyId || 1;

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
    const out = outRes && outRes[0] ? outRes[0] : { new_job_id: 99, status_message: 'Job created' };

    return NextResponse.json({ success: true, ...out });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
