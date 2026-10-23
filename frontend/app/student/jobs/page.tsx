'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StudentJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (location) params.append('location', location);

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleApply = async (jobId: number) => {
    setApplyingJobId(jobId);
    setToast(null);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          candidateId: 1, // Alice Sharma demo candidate
          similarityScore: 0.8850,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setToast(`Error: ${data.error || 'Application failed'}`);
      } else {
        setToast(`Success: Application recorded via Stored Procedure sp_apply_job!`);
        fetchJobs();
      }
    } catch (err: any) {
      setToast(`Error: ${err.message}`);
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link href="/student" className="text-blue-600 text-xs font-semibold hover:underline">
              ← Back to Student Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Explore Open Job Opportunities
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Powered by MySQL Relational View <code className="bg-slate-100 px-1 rounded">vw_active_jobs</code>
          </p>
        </div>
      </div>

      {toast && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          toast.startsWith('Success')
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          {toast}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job title or company name..."
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Filter by city (e.g. Bengaluru, Hyderabad)..."
          className="sm:w-64 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={fetchJobs}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
        >
          Search
        </button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobs.map((job) => (
          <div
            key={job.job_id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{job.job_title}</h3>
                  <p className="text-sm font-medium text-blue-600">{job.company_name}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  {job.num_positions} Openings
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">
                {job.job_description}
              </p>

              <div className="flex flex-wrap gap-2 text-xs text-slate-500 pt-1">
                <span className="bg-slate-100 px-2.5 py-1 rounded-md">
                  📍 {job.location || 'Pan-India'}
                </span>
                <span className="bg-slate-100 px-2.5 py-1 rounded-md">
                  💼 {job.experience_min} - {job.experience_max || 'Any'} yrs exp
                </span>
                <span className="bg-slate-100 px-2.5 py-1 rounded-md font-medium text-slate-700">
                  💰 {job.payrate || 'Best in Industry'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {job.total_applicants || 0} applicants so far
              </span>
              <button
                onClick={() => handleApply(job.job_id)}
                disabled={applyingJobId === job.job_id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {applyingJobId === job.job_id ? 'Submitting...' : 'Apply via Transaction'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
