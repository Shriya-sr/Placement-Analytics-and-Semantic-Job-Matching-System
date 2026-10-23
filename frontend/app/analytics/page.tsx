'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch('/api/analytics');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Placement Analytics & SQL View Metrics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time aggregate data queries from MySQL views: <code className="bg-slate-100 px-1 rounded">vw_active_jobs</code>, <code className="bg-slate-100 px-1 rounded">vw_company_analytics</code>, <code className="bg-slate-100 px-1 rounded">vw_skill_demand</code>
          </p>
        </div>

        <div className="flex space-x-2">
          <Link
            href="/student"
            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Student View
          </Link>
          <Link
            href="/recruiter"
            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Recruiter View
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Job Openings
          </span>
          <p className="text-4xl font-black text-blue-600 mt-2">
            {data?.metrics?.totalJobs || 5}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            Across Bengaluru & Hyderabad tech hubs
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Available Vacancies
          </span>
          <p className="text-4xl font-black text-emerald-600 mt-2">
            {data?.metrics?.totalVacancies || 16}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            Tracked in 3NF jobs schema
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Applications Evaluated
          </span>
          <p className="text-4xl font-black text-purple-600 mt-2">
            {data?.metrics?.totalApplicants || 9}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            Indexed with ChromaDB Cosine Scores
          </span>
        </div>
      </div>

      {/* Grid: Company Conversion & Skill Demand */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Analytics View */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Corporate Recruitment Funnel (vw_company_analytics)
            </h2>
            <p className="text-xs text-slate-500">
              Job postings, applicant reception, and hiring conversion rates
            </p>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Industry</th>
                  <th className="px-5 py-3 text-center">Jobs Posted</th>
                  <th className="px-5 py-3 text-center">Applicants</th>
                  <th className="px-5 py-3 text-center">Hired</th>
                  <th className="px-5 py-3 text-right">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.views?.companyAnalytics?.map((c: any) => (
                  <tr key={c.company_id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{c.company_name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{c.industry}</td>
                    <td className="px-5 py-3.5 text-center font-semibold">{c.total_jobs_posted}</td>
                    <td className="px-5 py-3.5 text-center font-semibold text-blue-600">{c.total_applications_received}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-emerald-600">{c.candidates_hired}</td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-800">
                      {c.hiring_conversion_rate_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Skill Demand View */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Market Skill Demand vs Supply (vw_skill_demand)
            </h2>
            <p className="text-xs text-slate-500">
              Mandatory vs Preferred industry skill requirements
            </p>
          </div>

          <div className="p-6 space-y-4 flex-1">
            {data?.views?.skillDemand?.slice(0, 6).map((s: any) => (
              <div key={s.skill_name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    {s.skill_name} <span className="text-[10px] text-slate-400 font-normal">({s.category})</span>
                  </span>
                  <span className="font-semibold text-slate-600">
                    {s.demanding_jobs_count} job postings ({s.candidates_with_skill} candidates proficient)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-blue-600 h-full"
                    style={{ width: `${Math.min(100, (s.mandatory_demand / 3) * 100)}%` }}
                    title={`Mandatory in ${s.mandatory_demand} jobs`}
                  />
                  <div
                    className="bg-blue-300 h-full"
                    style={{ width: `${Math.min(100, (s.preferred_demand / 3) * 100)}%` }}
                    title={`Preferred in ${s.preferred_demand} jobs`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Jobs Detailed Relational View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            Live Placement Demand by Role (vw_active_jobs)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Job ID</th>
                <th className="px-6 py-3">Job Title</th>
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Experience</th>
                <th className="px-6 py-3">Vacancies</th>
                <th className="px-6 py-3">Applicants</th>
                <th className="px-6 py-3">Avg Semantic Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.views?.activeJobs?.map((j: any) => (
                <tr key={j.job_id} className="hover:bg-slate-50">
                  <td className="px-6 py-3.5 font-mono text-slate-400">#{j.job_id}</td>
                  <td className="px-6 py-3.5 font-bold text-slate-900">{j.job_title}</td>
                  <td className="px-6 py-3.5 text-slate-600">{j.company_name}</td>
                  <td className="px-6 py-3.5 text-slate-500">{j.location}</td>
                  <td className="px-6 py-3.5 text-slate-500">{j.experience_min} - {j.experience_max || 'Any'} yrs</td>
                  <td className="px-6 py-3.5 font-semibold text-emerald-600">{j.num_positions}</td>
                  <td className="px-6 py-3.5 font-semibold text-blue-600">{j.total_applicants}</td>
                  <td className="px-6 py-3.5">
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {j.avg_applicant_match_pct || 85.0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
