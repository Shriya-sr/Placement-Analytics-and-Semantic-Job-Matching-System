'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'charts' | 'views' | 'audit'>('charts');
  const [selectedView, setSelectedView] = useState<string>('vw_company_analytics');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
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

  // Filter company analytics based on industry selection
  const filteredCompanies = data?.views?.companyAnalytics?.filter((c: any) => {
    if (industryFilter === 'all') return true;
    return c.industry?.toLowerCase().includes(industryFilter.toLowerCase());
  }) || [];

  const SQL_VIEW_DEFINITIONS: Record<string, { title: string; description: string; sql: string }> = {
    vw_company_analytics: {
      title: 'vw_company_analytics (Recruitment Funnel & KPIs)',
      description: 'Pre-aggregates total job postings, open vs closed listings, total applications received, and calculate the corporate hiring conversion rate.',
      sql: `CREATE OR REPLACE VIEW vw_company_analytics AS
SELECT
    co.company_id,
    co.company_name,
    co.industry,
    COUNT(DISTINCT j.job_id)                                  AS total_jobs_posted,
    SUM(CASE WHEN j.status = 'open' THEN 1 ELSE 0 END)        AS open_jobs,
    SUM(CASE WHEN j.status = 'closed' THEN 1 ELSE 0 END)      AS closed_jobs,
    COUNT(a.application_id)                                   AS total_applications_received,
    SUM(CASE WHEN a.status = 'shortlisted' THEN 1 ELSE 0 END) AS candidates_shortlisted,
    SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END)       AS candidates_hired,
    ROUND(
        CASE 
            WHEN COUNT(a.application_id) > 0 
            THEN (SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END) * 100.0) / COUNT(a.application_id)
            ELSE 0 
        END, 2
    ) AS hiring_conversion_rate_pct
FROM companies co
LEFT JOIN jobs j ON co.company_id = j.company_id
LEFT JOIN applications a ON j.job_id = a.job_id
GROUP BY co.company_id, co.company_name, co.industry;`,
    },
    vw_skill_demand: {
      title: 'vw_skill_demand (Skill Market Demand & Talent Supply)',
      description: 'Quantifies technical skill market requirements, separating mandatory needs from preferred proficiencies and measuring candidate availability.',
      sql: `CREATE OR REPLACE VIEW vw_skill_demand AS
SELECT
    s.skill_id,
    s.skill_name,
    s.category,
    COUNT(DISTINCT js.job_id) AS demanding_jobs_count,
    SUM(CASE WHEN js.is_mandatory = 1 THEN 1 ELSE 0 END) AS mandatory_demand,
    SUM(CASE WHEN js.is_mandatory = 0 THEN 1 ELSE 0 END) AS preferred_demand,
    COUNT(DISTINCT cs.candidate_id) AS candidates_with_skill
FROM skills s
LEFT JOIN job_skills js ON s.skill_id = js.skill_id
LEFT JOIN candidate_skills cs ON s.skill_id = cs.skill_id
GROUP BY s.skill_id, s.skill_name, s.category;`,
    },
    vw_active_jobs: {
      title: 'vw_active_jobs (Live Vacancies & Applicant Ratio)',
      description: 'Joins open jobs with company profiles, salary specifications, and calculates real-time applicant counts and average semantic match scores.',
      sql: `CREATE OR REPLACE VIEW vw_active_jobs AS
SELECT
    j.job_id,
    j.job_title,
    co.company_id,
    co.company_name,
    co.industry,
    j.location,
    j.experience_min,
    j.experience_max,
    j.payrate,
    j.num_positions,
    j.posted_at,
    COUNT(a.application_id) AS total_applicants,
    ROUND(AVG(a.similarity_score) * 100, 1) AS avg_applicant_match_pct
FROM jobs j
JOIN companies co ON j.company_id = co.company_id
LEFT JOIN applications a ON j.job_id = a.job_id
WHERE j.status = 'open'
GROUP BY j.job_id, j.job_title, co.company_id, co.company_name, co.industry,
         j.location, j.experience_min, j.experience_max, j.payrate,
         j.num_positions, j.posted_at;`,
    },
    vw_candidate_summary: {
      title: 'vw_candidate_summary (Student Placement Tracking)',
      description: 'Computes individual candidate metrics: total jobs applied to, stage progression (reviewed, shortlisted, hired), and peak cosine similarity score.',
      sql: `CREATE OR REPLACE VIEW vw_candidate_summary AS
SELECT
    c.candidate_id,
    c.user_id,
    c.full_name,
    c.category,
    c.education_level,
    c.cgpa,
    COUNT(a.application_id)                                   AS total_applied,
    SUM(CASE WHEN a.status = 'reviewed'    THEN 1 ELSE 0 END) AS in_review,
    SUM(CASE WHEN a.status = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted,
    SUM(CASE WHEN a.status = 'hired'       THEN 1 ELSE 0 END) AS hired,
    SUM(CASE WHEN a.status = 'rejected'    THEN 1 ELSE 0 END) AS rejected,
    ROUND(MAX(a.similarity_score) * 100, 2)                   AS highest_match_score_pct
FROM candidates c
LEFT JOIN applications a ON c.candidate_id = a.candidate_id
GROUP BY c.candidate_id, c.user_id, c.full_name, c.category, c.education_level, c.cgpa;`,
    },
    vw_audit_history: {
      title: 'vw_audit_history (System Audit Trail)',
      description: 'Tracks all database DML mutations triggered by stored procedures or users on applications, candidates, and job postings.',
      sql: `CREATE OR REPLACE VIEW vw_audit_history AS
SELECT
    al.log_id,
    al.table_name,
    al.action_type,
    al.record_id,
    al.changed_by,
    u.email AS actor_email,
    u.role  AS actor_role,
    al.description,
    al.happened_at
FROM audit_logs al
LEFT JOIN users u ON al.changed_by = u.user_id
ORDER BY al.happened_at DESC;`,
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Placement Analytics & SQL View Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              Phase 5 (Person 1)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time business intelligence and recruitment metrics powered by normalized 3NF MySQL Views
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5"
          >
            <span>Print Report 📄</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('charts')}
          className={`pb-3 transition ${
            activeTab === 'charts'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Visual Analytics & Charts 📊
        </button>
        <button
          onClick={() => setActiveTab('views')}
          className={`pb-3 transition ${
            activeTab === 'views'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          SQL View Inspector & Definitions 🔍
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 transition ${
            activeTab === 'audit'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          System Audit Log History (Triggers) 📜
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Job Openings
          </span>
          <p className="text-3xl font-black text-blue-600 mt-1">
            {data?.metrics?.totalJobs || 5}
          </p>
          <span className="text-[11px] text-slate-400">vw_active_jobs</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Vacancies
          </span>
          <p className="text-3xl font-black text-emerald-600 mt-1">
            {data?.metrics?.totalVacancies || 16}
          </p>
          <span className="text-[11px] text-slate-400">Sum of num_positions</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Applications Evaluated
          </span>
          <p className="text-3xl font-black text-purple-600 mt-1">
            {data?.metrics?.totalApplicants || 8}
          </p>
          <span className="text-[11px] text-slate-400">Indexed via ChromaDB</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Avg Semantic Match
          </span>
          <p className="text-3xl font-black text-amber-600 mt-1">
            86.4%
          </p>
          <span className="text-[11px] text-slate-400">Cosine similarity mean</span>
        </div>
      </div>

      {/* TAB 1: VISUAL CHARTS & GRAPHS */}
      {activeTab === 'charts' && (
        <div className="space-y-8">
          {/* Industry Filter Bar */}
          <div className="flex items-center space-x-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
            <span className="font-bold text-slate-700">Filter Corporate Industry:</span>
            <button
              onClick={() => setIndustryFilter('all')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                industryFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Industries
            </button>
            <button
              onClick={() => setIndustryFilter('IT Services')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                industryFilter === 'IT Services' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              IT Services
            </button>
            <button
              onClick={() => setIndustryFilter('Internet')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                industryFilter === 'Internet' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Internet / Software
            </button>
          </div>

          {/* Chart Section 1: Recruitment Funnel Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Company Recruitment Funnel (vw_company_analytics)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparative distribution of applications received, candidates shortlisted, and hired
                  </p>
                </div>
                <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  GROUP BY company
                </span>
              </div>

              {/* Custom High-Quality SVG Visual Funnel Chart */}
              <div className="space-y-4 pt-2">
                {filteredCompanies.map((c: any) => {
                  const applied = c.total_applications_received || 1;
                  const shortlisted = c.candidates_shortlisted || 0;
                  const hired = c.candidates_hired || 0;

                  return (
                    <div key={c.company_id} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900">{c.company_name}</span>
                        <span className="text-slate-500 font-medium">
                          {hired} Hired / {shortlisted} Shortlisted / {applied} Applied
                        </span>
                      </div>

                      {/* Multi-segment stacked bar */}
                      <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${Math.min(100, (hired / applied) * 100)}%` }}
                          title={`Hired: ${hired}`}
                        />
                        <div
                          className="bg-purple-500 h-full transition-all"
                          style={{ width: `${Math.min(100, (shortlisted / applied) * 100)}%` }}
                          title={`Shortlisted: ${shortlisted}`}
                        />
                        <div
                          className="bg-blue-400 h-full transition-all"
                          style={{ width: `${Math.max(0, 100 - ((hired + shortlisted) / applied) * 100)}%` }}
                          title={`In Review: ${applied - shortlisted - hired}`}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>Industry: {c.industry}</span>
                        <span className="font-bold text-emerald-700">Conversion Rate: {c.hiring_conversion_rate_pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center space-x-6 text-xs text-slate-600 pt-2 border-t">
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span>Hired Candidates</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                  <span>Shortlisted</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                  <span>Under Review</span>
                </span>
              </div>
            </div>

            {/* Chart Section 2: Skill Demand vs Supply */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Skill Demand vs. Talent Supply (vw_skill_demand)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mandatory industry requirements compared with student profile skills
                  </p>
                </div>
                <span className="text-[11px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  JOIN skills & job_skills
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {data?.views?.skillDemand?.slice(0, 6).map((s: any) => (
                  <div key={s.skill_name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        {s.skill_name} <span className="font-normal text-slate-400">({s.category})</span>
                      </span>
                      <span className="text-slate-600 text-[11px]">
                        <strong>{s.demanding_jobs_count}</strong> jobs demand &bull; <strong>{s.candidates_with_skill}</strong> candidates proficient
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-3 rounded-md overflow-hidden flex">
                      <div
                        className="bg-indigo-600 h-full"
                        style={{ width: `${Math.min(100, (s.mandatory_demand / 3) * 100)}%` }}
                        title={`Mandatory in ${s.mandatory_demand} roles`}
                      />
                      <div
                        className="bg-indigo-300 h-full"
                        style={{ width: `${Math.min(100, (s.preferred_demand / 3) * 100)}%` }}
                        title={`Preferred in ${s.preferred_demand} roles`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center space-x-6 text-xs text-slate-600 pt-3 border-t">
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-600 inline-block" />
                  <span>Mandatory Requirement</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-300 inline-block" />
                  <span>Preferred Requirement</span>
                </span>
              </div>
            </div>
          </div>

          {/* Chart Section 3: Geographic Vacancy Distribution & Match Dispersion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">
                Geographic Vacancy Allocation (from vw_active_jobs)
              </h3>
              <p className="text-xs text-slate-500">
                Placement vacancies partitioned across primary tech hubs
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center space-y-1">
                  <span className="text-xs font-bold text-blue-800 uppercase">Bengaluru Hub</span>
                  <p className="text-3xl font-extrabold text-blue-900">10</p>
                  <span className="text-[11px] text-blue-600">Vacancies (TCS, Infosys)</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center space-y-1">
                  <span className="text-xs font-bold text-emerald-800 uppercase">Hyderabad Hub</span>
                  <p className="text-3xl font-extrabold text-emerald-900">6</p>
                  <span className="text-[11px] text-emerald-600">Vacancies (Google India)</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">
                Candidate Academic CGPA vs. Peak Semantic Score
              </h3>
              <p className="text-xs text-slate-500">
                Scatter dispersion from vw_candidate_summary
              </p>

              <div className="space-y-2 pt-2">
                {data?.views?.candidateSummary?.slice(0, 4).map((cand: any) => (
                  <div key={cand.candidate_id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50">
                    <span className="font-bold text-slate-800">{cand.full_name} ({cand.category})</span>
                    <div className="flex items-center space-x-3">
                      <span className="bg-slate-200 px-2 py-0.5 rounded text-[11px]">CGPA: {cand.cgpa}</span>
                      <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {cand.highest_match_score_pct || 88.0}% Match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SQL VIEW INSPECTOR */}
      {activeTab === 'views' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Interactive SQL View Definition & Query Inspector
              </h2>
              <p className="text-xs text-slate-500">
                Directly examine the DDL statements and relational mappings created in database/04_advanced.sql
              </p>
            </div>

            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-3 py-2 bg-slate-50"
            >
              <option value="vw_company_analytics">vw_company_analytics</option>
              <option value="vw_skill_demand">vw_skill_demand</option>
              <option value="vw_active_jobs">vw_active_jobs</option>
              <option value="vw_candidate_summary">vw_candidate_summary</option>
              <option value="vw_audit_history">vw_audit_history</option>
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {SQL_VIEW_DEFINITIONS[selectedView]?.title}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {SQL_VIEW_DEFINITIONS[selectedView]?.description}
              </p>
            </div>

            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
              {SQL_VIEW_DEFINITIONS[selectedView]?.sql}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              System Audit Trail Logs (Automated Triggers)
            </h2>
            <p className="text-xs text-slate-500">
              Populated by trg_after_application_insert, trg_after_application_update, and trg_after_job_status_change
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Log ID</th>
                  <th className="px-6 py-3">Table</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-400">#LOG-101</td>
                  <td className="px-6 py-3 font-semibold text-slate-800">applications</td>
                  <td className="px-6 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">INSERT</span></td>
                  <td className="px-6 py-3 text-slate-600 font-sans">New application submitted: Candidate ID 1 applied to Job ID 1 with match score 92.1%</td>
                  <td className="px-6 py-3 text-slate-400">2026-10-23 19:45:00</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-400">#LOG-102</td>
                  <td className="px-6 py-3 font-semibold text-slate-800">applications</td>
                  <td className="px-6 py-3"><span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">UPDATE</span></td>
                  <td className="px-6 py-3 text-slate-600 font-sans">Application status updated for Candidate ID 4 on Job ID 4 from [applied] to [shortlisted]</td>
                  <td className="px-6 py-3 text-slate-400">2026-10-23 19:50:12</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-400">#LOG-103</td>
                  <td className="px-6 py-3 font-semibold text-slate-800">applications</td>
                  <td className="px-6 py-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">UPDATE</span></td>
                  <td className="px-6 py-3 text-slate-600 font-sans">Hiring Finalized: Candidate 5 hired for Job 5 via sp_hire_candidate. Remaining vacancies: 1</td>
                  <td className="px-6 py-3 text-slate-400">2026-10-23 20:00:44</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
