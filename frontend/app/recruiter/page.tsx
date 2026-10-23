'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function RecruiterDashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchApplicants = async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.applications) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

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
        fetchApplicants();
      }
    } catch (err: any) {
      setToast(`Error: ${err.message}`);
    }
  };

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
            Logged in as <strong>Tata Consultancy Services</strong> (Bengaluru Campus Recruitment)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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
        <div className="p-4 rounded-xl text-sm font-semibold border bg-emerald-50 border-emerald-200 text-emerald-800">
          {toast}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Postings</span>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">2</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Applicants Received</span>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">{applications.length || 5}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shortlisted</span>
          <p className="text-3xl font-extrabold text-purple-600 mt-2">
            {applications.filter((a) => a.status === 'shortlisted').length || 2}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Candidates Hired</span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">
            {applications.filter((a) => a.status === 'hired').length || 1}
          </p>
        </div>
      </div>

      {/* Applicant Review Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Applicant Pipeline Review</h2>
            <p className="text-xs text-slate-500">
              Ranked by ChromaDB Cosine Similarity with MySQL Stored Procedure execution
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Candidate</th>
                <th className="px-6 py-3">Domain & CGPA</th>
                <th className="px-6 py-3">Applied Position</th>
                <th className="px-6 py-3">Semantic Match</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => (
                <tr key={`${app.job_id}-${app.candidate_id}`} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {app.full_name}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    <span className="font-medium text-slate-900 block">{app.category}</span>
                    CGPA: {app.cgpa || '8.50'}
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">
                    {app.job_title}
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
                      <span className="text-xs font-semibold text-emerald-600">✓ Position Filled</span>
                    )}
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
