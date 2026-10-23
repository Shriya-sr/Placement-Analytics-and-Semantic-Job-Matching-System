import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const [activeJobs, companyAnalytics, skillDemand, candidateSummary] = await Promise.all([
      query('SELECT * FROM vw_active_jobs LIMIT 10'),
      query('SELECT * FROM vw_company_analytics'),
      query('SELECT * FROM vw_skill_demand ORDER BY demanding_jobs_count DESC, mandatory_demand DESC LIMIT 15'),
      query('SELECT * FROM vw_candidate_summary LIMIT 10'),
    ]);

    // Compute key summary indicators
    const totalJobs = activeJobs?.length || 0;
    const totalVacancies = activeJobs?.reduce((acc: number, curr: any) => acc + (curr.num_positions || 0), 0) || 0;
    const totalApplicants = activeJobs?.reduce((acc: number, curr: any) => acc + (curr.total_applicants || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      metrics: {
        totalJobs,
        totalVacancies,
        totalApplicants,
      },
      views: {
        activeJobs,
        companyAnalytics,
        skillDemand,
        candidateSummary,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
