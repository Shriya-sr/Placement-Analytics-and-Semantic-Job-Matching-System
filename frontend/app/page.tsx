'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardHomePage() {
  const [stats, setStats] = useState({
    activeJobs: 21349,
    companies: 8196,
    candidates: 962,
    applications: 12,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check current session
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setUser(d.user);
      })
      .catch(console.error);

    // 2. Fetch top recent jobs for live dashboard showcase
    fetch('/api/jobs?limit=4')
      .then((r) => r.json())
      .then((d) => {
        if (d.jobs) setRecentJobs(d.jobs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <span>PES University • DBMS Experiential Learning (Level 3)</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Placement Analytics &amp; <span className="text-blue-400">Semantic Job Matching</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            A unified hybrid database platform powering campus recruitment. Combines a <strong>3NF MySQL Relational Engine</strong> for ACID transactional applications with <strong>ChromaDB Vector Embeddings</strong> for cosine similarity resume ranking.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {user ? (
              <Link
                href={user.role === 'recruiter' ? '/recruiter' : '/student'}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition"
              >
                Go to Your {user.role === 'recruiter' ? 'Recruiter Console' : 'Student Dashboard'} &rarr;
              </Link>
            ) : (
              <>
                <Link
                  href="/login/student"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition"
                >
                  🎓 Enter Student Portal
                </Link>
                <Link
                  href="/login/recruiter"
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition"
                >
                  🏢 Enter Recruiter Console
                </Link>
              </>
            )}
            <Link
              href="/student/jobs"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition backdrop-blur-sm"
            >
              Explore Job Openings
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Real-time System Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Open Positions</span>
          <p className="text-3xl font-extrabold text-blue-600">{stats.activeJobs.toLocaleString()}+</p>
          <p className="text-xs text-slate-400">Indexed from Naukri dataset</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Partner Companies</span>
          <p className="text-3xl font-extrabold text-emerald-600">{stats.companies.toLocaleString()}+</p>
          <p className="text-xs text-slate-400">Enterprise hiring recruiters</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Profiles</span>
          <p className="text-3xl font-extrabold text-purple-600">{stats.candidates.toLocaleString()}+</p>
          <p className="text-xs text-slate-400">Verified student resumes</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Semantic Vector Space</span>
          <p className="text-3xl font-extrabold text-slate-900">384-Dim</p>
          <p className="text-xs text-slate-400">ChromaDB Cosine HNSW</p>
        </div>
      </div>

      {/* Main Portals Gateway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Student Portal */}
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl">
              🎓
            </div>
            <h3 className="text-xl font-bold text-slate-900">Student Portal</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Explore 21,000+ career listings, submit applications with ACID rollback guarantees via MySQL Stored Procedures, and monitor shortlisting status.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/student"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center"
            >
              Open Student Portal &rarr;
            </Link>
            <Link
              href="/student/jobs"
              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
            >
              Browse Jobs
            </Link>
          </div>
        </div>

        {/* Card 2: Recruiter Console */}
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl">
              🏢
            </div>
            <h3 className="text-xl font-bold text-slate-900">Recruiter Console</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Post new career openings with automated audit logging, inspect applied candidate pipelines, and execute ACID candidate hiring workflows.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/recruiter"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center"
            >
              Open Recruiter Console &rarr;
            </Link>
            <Link
              href="/recruiter/jobs"
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition"
            >
              + Post Job
            </Link>
          </div>
        </div>

        {/* Card 3: Semantic Matcher & Analytics */}
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl">
              🔮
            </div>
            <h3 className="text-xl font-bold text-slate-900">Semantic AI Matcher</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Query ChromaDB vector database with Top-K Cosine Similarity to discover best-fit candidates and analyze SQL skill demand vs. supply metrics.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/recruiter/match"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline inline-flex items-center"
            >
              Launch Vector Matcher &rarr;
            </Link>
            <Link
              href="/analytics"
              className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
            >
              SQL Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Open Career Openings Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Live Career Opportunities
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Recent vacancies posted by corporate recruiters and synchronized across MySQL &amp; Vector indexes.
            </p>
          </div>
          <Link
            href="/student/jobs"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
          >
            View All Openings &rarr;
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-8 text-sm">Loading latest job listings...</p>
        ) : recentJobs.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">No active job listings found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentJobs.map((job) => (
              <div
                key={job.job_id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{job.job_title}</h4>
                      <p className="text-xs font-medium text-blue-600">{job.company_name}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      {job.num_positions} Vacancies
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-2">
                    {job.job_description || 'Competitive position in engineering and analytics with end-to-end responsibilities.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span>📍 {job.location || 'Bengaluru'}</span>
                  <Link
                    href="/student/jobs"
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Apply Now &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PES University Deliverables Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900">PES University DBMS Evaluation Framework</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="font-bold text-slate-900 block">1. 3NF Relational DB</span>
            <p className="text-slate-600">9 normalized tables with PKs, FKs, CHECK constraints, and fulltext search.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="font-bold text-slate-900 block">2. ChromaDB Vector DB</span>
            <p className="text-slate-600">384-dim semantic embeddings with cosine similarity for candidate ranking.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="font-bold text-slate-900 block">3. ACID Transactions</span>
            <p className="text-slate-600">Stored procedures (<code className="text-blue-600 font-mono">sp_apply_job</code>, <code className="text-blue-600 font-mono">sp_hire_candidate</code>) with automatic rollback.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="font-bold text-slate-900 block">4. RBAC &amp; Audit Triggers</span>
            <p className="text-slate-600">Automated triggers on <code className="text-blue-600 font-mono">audit_logs</code> with Next.js App Router middleware security.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
