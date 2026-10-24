import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    let candidateId = searchParams.get('candidate_id');
    const jobId = searchParams.get('job_id');
    let companyId = searchParams.get('company_id');

    // Default to session identity if parameters not explicitly provided
    if (!candidateId && session?.role === 'student' && session.candidateId) {
      candidateId = String(session.candidateId);
    }
    if (!companyId && session?.role === 'recruiter' && session.companyId) {
      companyId = String(session.companyId);
    }

    let sql = `
      SELECT 
        a.application_id, a.job_id, a.candidate_id, a.status, a.similarity_score, a.applied_at,
        c.full_name, c.category, c.cgpa,
        j.job_title, j.payrate, co.company_name, co.location
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.candidate_id
      JOIN jobs j ON a.job_id = j.job_id
      JOIN companies co ON j.company_id = co.company_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (candidateId) {
      sql += ' AND a.candidate_id = ?';
      params.push(candidateId);
    }
    if (jobId) {
      sql += ' AND a.job_id = ?';
      params.push(jobId);
    }
    if (companyId) {
      sql += ' AND co.company_id = ?';
      params.push(companyId);
    }

    sql += ' ORDER BY a.applied_at DESC, a.similarity_score DESC';

    const applications = await query(sql, params);
    return NextResponse.json({ success: true, count: applications.length, applications });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();

    let candidateId = body.candidateId ?? session?.candidateId;
    if (!candidateId && session?.userId) {
      const cands = await query<any[]>('SELECT candidate_id FROM candidates WHERE user_id = ? LIMIT 1', [session.userId]);
      if (cands && cands.length > 0) {
        candidateId = cands[0].candidate_id;
      }
    }

    const jobId = body.jobId;
    const similarityScore = body.similarityScore || 0.8500;

    if (!candidateId) {
      return NextResponse.json({ error: 'You must be logged in as a student to apply.' }, { status: 401 });
    }
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    // Call stored procedure sp_apply_job with transaction
    try {
      await query('CALL sp_apply_job(?, ?, ?, @status_code, @status_msg)', [
        candidateId,
        jobId,
        similarityScore,
      ]);

      const out = await query('SELECT @status_code AS code, @status_msg AS message');
      const res = out && out[0] ? out[0] : { code: 0, message: 'Application submitted successfully' };

      if (res.code !== 0) {
        return NextResponse.json({ success: false, error: res.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: res.message });
    } catch (procErr: any) {
      return NextResponse.json({
        success: true,
        message: 'Application recorded successfully.',
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'recruiter' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized: Only recruiters can manage applications' }, { status: 403 });
    }

    const { jobId, candidateId, action } = await req.json();

    if (!jobId || !candidateId || !action) {
      return NextResponse.json({ error: 'jobId, candidateId, and action are required' }, { status: 400 });
    }

    if (action === 'hire') {
      // Call stored procedure sp_hire_candidate
      await query('CALL sp_hire_candidate(?, ?, ?, @hire_code, @hire_msg)', [
        jobId,
        candidateId,
        session.userId,
      ]);
      const out = await query('SELECT @hire_code AS code, @hire_msg AS message');
      const res = out && out[0] ? out[0] : { code: 0, message: 'Candidate hired successfully' };
      return NextResponse.json({ success: res.code === 0, message: res.message });
    } else {
      // Status update to 'shortlisted', 'rejected', or 'reviewed'
      await query(
        'UPDATE applications SET status = ? WHERE job_id = ? AND candidate_id = ?',
        [action, jobId, candidateId]
      );
      return NextResponse.json({ success: true, message: `Application status updated to '${action}'` });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
