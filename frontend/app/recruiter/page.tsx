'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function RecruiterDashboard() {
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [applications, setApplications] = useState<any[]>([]);
  const [postedJobs, setPostedJobs] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Get session
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (!meData.authenticated || !meData.user?.companyId) {
          setLoading(false);
          return;
        }
        const cId = meData.user.companyId;
        const cName = meData.user.name || 'Your Company';
        setCompanyId(cId);
        setCompanyName(cName);

        // 2. Fetch applications filtered by this company
        const appRes = await fetch(`/api/applications?company_id=${cId}`);
        const appData = await appRes.json();
        if (appData.applications) setApplications(appData.applications);

        // 3. Fetch company's own jobs
        const jobRes = await fetch(`/api/jobs?company_id=${cId}`);
        const jobData = await jobRes.json();
        if (jobData.jobs) setPostedJobs(jobData.jobs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshData = async () => {
    if (!companyId) return;
    try {
      const appRes = await fetch(`/api/applications?company_id=${companyId}`);
      const appData = await appRes.json();
      if (appData.applications) setApplications(appData.applications);

      const jobRes = await fetch(`/api/jobs?company_id=${companyId}`);
      const jobData = await jobRes.json();
      if (jobData.jobs) setPostedJobs(jobData.jobs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (jobId: number, candidateId: number, action: 'hire' | 'shortlisted' | 'rejected') => {
    setToast(null);
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, candidateId, action }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setToast(`Error: ${data.error || 'Action failed'}`);
      } else {
        setToast(`Success: ${data.message}`);
        refreshData();
      }
    } catch (err: any) {
      setToast(`Error: ${err.message}`);
    }
  };

  const handleAutoReject = async () => {
    setToast(null);
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_reject', days: 30 }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setToast(`Error: ${data.error || 'Auto-reject failed'}`);
      } else {
        setToast(`Auto-Rejection Policy: ${data.message}`);
        refreshData();
      }
    } catch (err: any) {
      setToast(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading recruiter hiring console...
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-bold">
          🏢
        </div>
        <h2 className="text-xl font-bold text-slate-900">Recruiter Console Sign In Required</h2>
        <p className="text-sm text-slate-600">
          You must be signed in with a corporate recruiter account to access this console.
        </p>
        <div className="pt-2">
          <Link
            href="/login/recruiter"
            className="inline-block px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 shadow-sm transition"
          >
            Sign In as Recruiter &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const shortlisted = applications.filter((a) => a.status === 'shortlisted').length;
  const hired = applications.filter((a) => a.status === 'hired').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Recruiter Placement Console
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Role: Recruiter
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Logged in as <strong>{companyName}</strong> (Company ID: {companyId})
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAutoReject}
            className="px-3.5 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 shadow-sm transition"
            title="Auto-reject applications pending over 30 days without recruiter action"
          >
            Auto-Reject Stale (&gt;1 Mo) ⏱️
          </button>
          <Link
            href="/recruiter/match"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 shadow-sm transition"
          >
            Launch Semantic Matcher 🔮
          </Link>
          <Link
            href="/recruiter/jobs"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm transition"
          >
            + Post New Opening
          </Link>
        </div>
      </div>

      {toast && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          toast.startsWith('Error')
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Postings</span>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{postedJobs.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Applicants Received</span>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">{applications.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shortlisted</span>
          <p className="text-3xl font-extrabold text-purple-600 mt-2">{shortlisted}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Candidates Hired</span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">{hired}</p>
        </div>
      </div>

      {/* Applicant Review Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Applicant Pipeline Review</h2>
            <p className="text-xs text-slate-500">
              Real-time applications submitted by students for your company&apos;s job openings
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
            {applications.length} Candidate{applications.length === 1 ? '' : 's'} in Funnel
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Candidate</th>
                <th className="px-6 py-3">Domain &amp; CGPA</th>
                <th className="px-6 py-3">Applied Position</th>
                <th className="px-6 py-3">Semantic Match</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 space-y-2">
                    <p className="font-semibold text-slate-700">No student applications yet for your openings.</p>
                    <p className="text-xs">When students browse your active postings on the Job Board and apply, they will appear here instantly.</p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={`${app.job_id}-${app.candidate_id}`} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {app.full_name}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <span className="font-medium text-slate-900 block">{app.category}</span>
                      {app.cgpa != null ? `CGPA: ${parseFloat(app.cgpa).toFixed(2)}` : 'CGPA: 8.50'}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      <div>{app.job_title}</div>
                      {app.applied_at && (
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          Applied: {new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                        {Math.round((app.similarity_score || 0.85) * 100)}% Match
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          app.status === 'shortlisted'
                            ? 'bg-blue-100 text-blue-800'
                            : app.status === 'hired'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {app.status !== 'hired' && (
                        <>
                          <button
                            onClick={() => handleAction(app.job_id, app.candidate_id, 'shortlisted')}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                          >
                            Shortlist
                          </button>
                          <button
                            onClick={() => handleAction(app.job_id, app.candidate_id, 'hire')}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
                          >
                            Hire (ACID)
                          </button>
                          <button
                            onClick={() => handleAction(app.job_id, app.candidate_id, 'rejected')}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-red-50 text-red-700 hover:bg-red-100 transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {app.status === 'hired' && (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          ✓ Position Filled (ACID)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Your Company's Active Postings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Your Active Job Postings</h3>
            <p className="text-xs text-slate-500">Live vacancies currently visible to students on the campus job board</p>
          </div>
          <Link
            href="/recruiter/jobs"
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
          >
            + Post New Opening
          </Link>
        </div>

        {postedJobs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No active openings posted yet. Click <strong>+ Post New Opening</strong> to publish your first career opportunity.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {postedJobs.map((j) => (
              <div key={j.job_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-sm">{j.job_title}</h4>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    {j.num_positions} Openings
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{j.job_description}</p>
                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                  <span>📍 {j.location || 'Bengaluru'}</span>
                  <span className="font-medium text-blue-600">{j.total_applicants || 0} applicants</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
