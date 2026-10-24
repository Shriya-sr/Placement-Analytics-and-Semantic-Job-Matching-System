'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Get current session
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (!meData.authenticated) return;

        const sessionUser = meData.user;
        setUser(sessionUser);

        // 2. Load candidate profile from DB
        if (sessionUser.candidateId) {
          const profRes = await fetch(`/api/applications?candidate_id=${sessionUser.candidateId}`);
          const profData = await profRes.json();
          if (profData.applications) setApplications(profData.applications);

          // Get candidate profile details
          const cRes = await fetch(`/api/candidates?candidate_id=${sessionUser.candidateId}`);
          const cData = await cRes.json();
          if (cData.candidate) setProfile(cData.candidate);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading your placement dashboard...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-600 font-medium">You are not signed in as a student.</p>
        <Link href="/login/student" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm transition">
          Sign In as Student
        </Link>
      </div>
    );
  }

  const shortlisted = applications.filter((a) => a.status === 'shortlisted').length;
  const underReview = applications.filter((a) => a.status === 'applied' || a.status === 'reviewed').length;
  const bestScore = applications.length > 0
    ? Math.round(Math.max(...applications.map((a) => a.similarity_score || 0)) * 100)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
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
            Welcome back, <strong>{user.name}</strong>
            {profile && (
              <>
                {' '}· {profile.education_level || 'Student'}
                {profile.cgpa != null && (
                  <> | CGPA: <strong>{parseFloat(profile.cgpa).toFixed(2)}</strong> / 10.0</>
                )}
              </>
            )}
          </p>
        </div>
        <Link
          href="/student/jobs"
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-sm transition"
        >
          Explore All Job Openings →
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Applied</span>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{applications.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shortlisted</span>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">{shortlisted}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Under Review</span>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">{underReview}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Top Match Score</span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">
            {bestScore != null ? `${bestScore}%` : 'N/A'}
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
                <th className="px-6 py-3">Semantic Match</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.length > 0 ? (
                applications.map((app) => (
                  <tr key={app.application_id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">{app.job_title}</td>
                    <td className="px-6 py-4 text-slate-600">{app.company_name}</td>
                    <td className="px-6 py-4 text-slate-500">{app.location}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.round((app.similarity_score || 0) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {Math.round((app.similarity_score || 0) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        app.status === 'shortlisted' ? 'bg-blue-100 text-blue-800' :
                        app.status === 'hired'       ? 'bg-emerald-100 text-emerald-800' :
                        app.status === 'rejected'    ? 'bg-red-100 text-red-800' :
                                                       'bg-amber-100 text-amber-800'
                      }`}>
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No applications yet.{' '}
                    <Link href="/student/jobs" className="text-blue-600 font-semibold hover:underline">
                      Explore open roles →
                    </Link>
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
