import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
          <span>DBMS Experiential Learning - Level 3</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          Placement Analytics & <span className="text-blue-600">Semantic Job Matching</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600">
          A hybrid multi-model database platform combining a <strong>MySQL 3NF Relational Database</strong> for ACID transactions and relational analytics with a <strong>ChromaDB Vector Database</strong> for cosine-similarity semantic resume matching.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/student"
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md transition"
          >
            Launch Student Portal
          </Link>
          <Link
            href="/recruiter"
            className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-md transition"
          >
            Launch Recruiter Portal
          </Link>
          <Link
            href="/analytics"
            className="px-6 py-3 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-900 shadow-md transition"
          >
            View SQL Analytics
          </Link>
        </div>
      </div>

      {/* Architecture Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
            1
          </div>
          <h3 className="text-lg font-bold text-slate-900">Phase 1 & 2: 3NF Relational DB</h3>
          <p className="text-sm text-slate-600">
            9 normalized tables adhering to 1NF, 2NF, and 3NF. Ingests 22,000+ Naukri job postings and 960+ candidate resumes via automated ETL pipelines.
          </p>
          <div className="text-xs text-blue-600 font-semibold">
            Target: schema.sql, 02_dml.sql, 03_queries.sql
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xl">
            2
          </div>
          <h3 className="text-lg font-bold text-slate-900">Phase 3: ChromaDB Vector Pipeline</h3>
          <p className="text-sm text-slate-600">
            Persistent ChromaDB vector database with Cosine similarity space. Embeds student resumes and job descriptions for semantic match ranking.
          </p>
          <div className="text-xs text-purple-600 font-semibold">
            Target: 04_advanced.sql, vector_service.py
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl">
            3
          </div>
          <h3 className="text-lg font-bold text-slate-900">Phase 4: Next.js App Router & RBAC</h3>
          <p className="text-sm text-slate-600">
            Next.js App Router with connection pooling (<code className="bg-slate-100 px-1 rounded">mysql2/promise</code>), protected routes via middleware, and student & recruiter RBAC authentication.
          </p>
          <div className="text-xs text-emerald-600 font-semibold">
            Target: frontend/app/, lib/db.ts, middleware.ts
          </div>
        </div>
      </div>

      {/* Database Integration Features */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Integrated DBMS Concepts Demonstrated</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="border border-slate-100 bg-slate-50 p-4 rounded-lg">
            <span className="font-semibold text-slate-900 block mb-1">ACID Transactions</span>
            <p className="text-xs text-slate-600">
              Stored procedures (<code className="text-blue-600">sp_apply_job</code>, <code className="text-blue-600">sp_hire_candidate</code>) with automatic rollback on error.
            </p>
          </div>
          <div className="border border-slate-100 bg-slate-50 p-4 rounded-lg">
            <span className="font-semibold text-slate-900 block mb-1">Audit Triggers</span>
            <p className="text-xs text-slate-600">
              Triggers logging all lifecycle changes (insert, status update, deletion) into <code className="text-blue-600">audit_logs</code>.
            </p>
          </div>
          <div className="border border-slate-100 bg-slate-50 p-4 rounded-lg">
            <span className="font-semibold text-slate-900 block mb-1">SQL Views</span>
            <p className="text-xs text-slate-600">
              Pre-computed relational views (<code className="text-blue-600">vw_active_jobs</code>, <code className="text-blue-600">vw_company_analytics</code>, <code className="text-blue-600">vw_skill_demand</code>).
            </p>
          </div>
          <div className="border border-slate-100 bg-slate-50 p-4 rounded-lg">
            <span className="font-semibold text-slate-900 block mb-1">Vector Search</span>
            <p className="text-xs text-slate-600">
              ChromaDB HNSW index using Cosine Distance with real-time score synchronization back to MySQL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
