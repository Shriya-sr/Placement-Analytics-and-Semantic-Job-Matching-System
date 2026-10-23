'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SemanticMatcherPage() {
  const [jobDescription, setJobDescription] = useState(
    'Seeking a Senior Machine Learning Engineer with deep expertise in Python, TensorFlow, PyTorch, and Natural Language Processing (NLP). Must have strong SQL and data pipeline experience.'
  );
  const [topK, setTopK] = useState(5);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [shortlistedIds, setShortlistedIds] = useState<number[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          topK,
          categoryFilter: categoryFilter || null,
        }),
      });

      const data = await res.json();
      if (data.matches) {
        setMatches(data.matches);
        setSource(data.source);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShortlist = (candId: number) => {
    if (!shortlistedIds.includes(candId)) {
      setShortlistedIds([...shortlistedIds, candId]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <Link href="/recruiter" className="text-purple-600 text-xs font-semibold hover:underline">
            ← Back to Recruiter Dashboard
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Semantic Resume Matcher
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              ChromaDB High-Dimensional Vector Search Engine (Cosine Similarity Metric)
            </p>
          </div>
          {source && (
            <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold rounded-full">
              Engine: {source}
            </span>
          )}
        </div>
      </div>

      {/* Query Form */}
      <form onSubmit={handleSearch} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Job Description / Required Candidate Profile (Unstructured Text)
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={4}
            required
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Type or paste the role requirements, technical skills, or project experience..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Domain Filter (Optional Metadata Filter)
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            >
              <option value="">All Technical Domains</option>
              <option value="Data Science">Data Science</option>
              <option value="Java Developer">Java Developer</option>
              <option value="Web Development">Web Development</option>
              <option value="Python Developer">Python Developer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Top-K Candidate Results: {topK}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              className="w-full mt-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm shadow-md transition flex items-center justify-center space-x-2"
        >
          <span>{loading ? 'Embedding & Querying Vector Index...' : 'Run ChromaDB Semantic Search 🔍'}</span>
        </button>
      </form>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">
            Ranked Candidate Matches {matches.length > 0 && `(${matches.length} profiles retrieved)`}
          </h2>
          <span className="text-xs text-slate-500">
            Sorted by Cosine Similarity (1 - Cosine Distance)
          </span>
        </div>

        {matches.length === 0 && !loading && (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
            Enter a job description above and click &quot;Run ChromaDB Semantic Search&quot; to inspect high-dimensional vector matches.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {matches.map((cand, idx) => (
            <div
              key={cand.candidate_id || idx}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      #{idx + 1}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{cand.full_name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {cand.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      CGPA: {cand.cgpa}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600">
                      {cand.match_percentage}%
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      score: {cand.similarity_score}
                    </span>
                  </div>

                  <button
                    onClick={() => handleShortlist(cand.candidate_id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      shortlistedIds.includes(cand.candidate_id)
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {shortlistedIds.includes(cand.candidate_id) ? '✓ Shortlisted' : 'Shortlist Candidate'}
                  </button>
                </div>
              </div>

              {cand.skills && (
                <div className="text-xs">
                  <span className="font-semibold text-slate-700">Indexed Skills: </span>
                  <span className="text-slate-600">{cand.skills}</span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 italic">
                &quot;{cand.resume_snippet}&quot;
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
