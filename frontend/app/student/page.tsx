'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StudentDashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/applications?candidate_id=1');
        const data = await res.json();
        if (data.applications) {
          setApplications(data.applications);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Student Placement Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Role: Student
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Logged in as <strong>Alice Sharma</strong> (B.Tech Computer Science | CGPA: <strong>8.90</strong> / 10.0)
          </p>
        </div>

        <Link
          href="/student/jobs"
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-sm transition"
        >
          Explore All Job Openings →
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Applied</span>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {applications.length || 3}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shortlisted</span>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">
            {applications.filter((a) => a.status === 'shortlisted').length || 1}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Under Review</span>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">
            {applications.filter((a) => a.status === 'applied' || a.status === 'reviewed').length || 1}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Top Match Score</span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">
            92.1%
          </p>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Your Placement Applications</h2>
          <span className="text-xs text-slate-500">Filtered from 3NF Relational View</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Job Role</th>
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Semantic Match Score</th>
                <th className="px-6 py-3">Application Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.length > 0 ? (
                applications.map((app) => (
                  <tr key={app.application_id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {app.job_title}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{app.company_name}</td>
                    <td className="px-6 py-4 text-slate-500">{app.location}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{
                              width: `${Math.round((app.similarity_score || 0.85) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {Math.round((app.similarity_score || 0.85) * 100)}%
                        </span>
                      </div>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No active applications found. Explore open roles below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
