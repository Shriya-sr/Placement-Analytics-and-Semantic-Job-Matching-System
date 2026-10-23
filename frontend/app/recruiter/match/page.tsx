'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SemanticMatcherPage() {
  const [existingJobs, setExistingJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState(
    'Seeking a Senior Machine Learning Engineer with deep expertise in Python, TensorFlow, PyTorch, and Natural Language Processing (NLP). Must have strong SQL and data pipeline experience.'
  );
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(40); // min % match threshold
  const [minCgpa, setMinCgpa] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Candidate comparison modal state
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Resume detail modal state
  const [activeResumeCandidate, setActiveResumeCandidate] = useState<any | null>(null);

  // Fetch active jobs from SQL View to allow 1-click loading of real job listings
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        if (data.jobs) {
          setExistingJobs(data.jobs);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadJobs();
  }, []);

  const handleJobSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const jId = e.target.value;
    setSelectedJobId(jId);
    if (!jId) return;

    const found = existingJobs.find((j) => String(j.job_id) === jId);
    if (found) {
      setJobDescription(`${found.job_title} at ${found.company_name} (${found.location}).\n\nRequirements & Description:\n${found.job_description}\n\nExperience: ${found.experience_min} - ${found.experience_max || 'Any'} years. Compensation: ${found.payrate}`);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setToast(null);

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
    } catch (err: any) {
      setToast({ type: 'error', message: `Search failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleShortlist = async (candidateId: number) => {
    try {
      const jobId = selectedJobId ? parseInt(selectedJobId, 10) : 1;
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          candidateId,
          action: 'shortlisted',
        }),
      });
      const data = await res.json();
      setToast({
        type: 'success',
        message: `Candidate #${candidateId} shortlisted successfully for Job #${jobId}! (Audited in audit_logs)`,
      });
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    }
  };

  const handleHireCandidate = async (candidateId: number) => {
    try {
      const jobId = selectedJobId ? parseInt(selectedJobId, 10) : 1;
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          candidateId,
          action: 'hire',
        }),
      });
      const data = await res.json();
      setToast({
        type: 'success',
        message: `Hiring finalized via Stored Procedure sp_hire_candidate! Vacancy count updated atomically.`,
      });
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    }
  };

  const toggleCompare = (candidateId: number) => {
    if (selectedForCompare.includes(candidateId)) {
      setSelectedForCompare(selectedForCompare.filter((id) => id !== candidateId));
    } else {
      if (selectedForCompare.length >= 3) {
        setToast({ type: 'error', message: 'You can compare up to 3 candidates simultaneously.' });
        return;
      }
      setSelectedForCompare([...selectedForCompare, candidateId]);
    }
  };

  // Filter matches based on client-side threshold sliders
  const filteredMatches = matches.filter((m) => {
    const passesScore = (m.match_percentage || 0) >= minScore;
    const passesCgpa = minCgpa === 0 || (m.cgpa || 0) >= minCgpa;
    return passesScore && passesCgpa;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div>
        <div className="flex items-center space-x-2">
          <Link href="/recruiter" className="text-purple-600 text-xs font-semibold hover:underline">
            ← Back to Recruiter Console
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-2">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Recruiter Semantic Resume Matcher
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                Phase 5 (Person 1)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              ChromaDB High-Dimensional Vector Search Engine (Cosine Similarity Metric)
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {source && (
              <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold rounded-full shadow-sm">
                Engine: {source}
              </span>
            )}
            {selectedForCompare.length > 0 && (
              <button
                onClick={() => setShowCompareModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-md transition"
              >
                Compare Candidates ({selectedForCompare.length}) ⚖️
              </button>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold border flex justify-between items-center ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Query & Search Tuning Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Job Requirement Source
          </span>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500">Auto-fill from open posting:</span>
            <select
              value={selectedJobId}
              onChange={handleJobSelect}
              className="text-xs font-medium border border-slate-300 rounded-md px-2 py-1 bg-slate-50 focus:outline-none"
            >
              <option value="">-- Choose Existing Job Posting --</option>
              {existingJobs.map((j) => (
                <option key={j.job_id} value={j.job_id}>
                  #{j.job_id} {j.job_title} ({j.company_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Job Description & Skill Requirements (Unstructured Input)
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={4}
            required
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans"
            placeholder="Type or paste the role requirements, technical skills, or project experience..."
          />
        </div>

        {/* Hyperparameter Sliders & Metadata Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Domain Filter
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="">All Technical Domains</option>
              <option value="Data Science">Data Science & AI/ML</option>
              <option value="Java Developer">Java Developer</option>
              <option value="Web Development">Web Development</option>
              <option value="Python Developer">Python Developer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Top-K Candidates: <span className="text-purple-600">{topK}</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              className="w-full accent-purple-600 mt-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Min Match Score: <span className="text-emerald-600">{minScore}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600 mt-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Min CGPA Filter
            </label>
            <select
              value={minCgpa}
              onChange={(e) => setMinCgpa(parseFloat(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="0">All CGPA Scores</option>
              <option value="7.0">CGPA ≥ 7.00</option>
              <option value="8.0">CGPA ≥ 8.00</option>
              <option value="8.5">CGPA ≥ 8.50</option>
              <option value="9.0">CGPA ≥ 9.00</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => handleSearch()}
          disabled={loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2"
        >
          <span>{loading ? 'Embedding & Querying ChromaDB...' : 'Run Semantic Vector Matcher 🔮'}</span>
        </button>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Ranked Talent Pool {filteredMatches.length > 0 && `(${filteredMatches.length} candidates qualified)`}
            </h2>
            <p className="text-xs text-slate-500">
              Cosine Similarity Metric: Cosine Score = 1.0 - Cosine Distance
            </p>
          </div>
          <span className="text-xs text-slate-400">
            Select checkboxes to compare candidates side-by-side
          </span>
        </div>

        {filteredMatches.length === 0 && !loading && (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 space-y-2">
            <p className="text-base font-semibold">No candidates meet the active filters.</p>
            <p className="text-xs text-slate-400">
              Try adjusting the Minimum Match Score or Minimum CGPA slider above, or click &quot;Run Semantic Vector Matcher&quot;.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {filteredMatches.map((cand, idx) => {
            const isCompared = selectedForCompare.includes(cand.candidate_id);
            const scoreColor =
              cand.match_percentage >= 80
                ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                : cand.match_percentage >= 50
                ? 'text-blue-600 bg-blue-50 border-blue-200'
                : 'text-amber-600 bg-amber-50 border-amber-200';

            return (
              <div
                key={cand.candidate_id || idx}
                className={`bg-white border rounded-2xl p-6 shadow-sm transition space-y-4 ${
                  isCompared ? 'border-purple-400 ring-2 ring-purple-100' : 'border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={isCompared}
                      onChange={() => toggleCompare(cand.candidate_id)}
                      className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                      title="Select for comparison"
                    />
                    <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-slate-900">{cand.full_name}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {cand.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          CGPA: <strong>{cand.cgpa}</strong>
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Vector Document ID: cand_{cand.candidate_id}
                      </span>
                    </div>
                  </div>

                  {/* Semantic Score Meter */}
                  <div className="flex items-center space-x-4 self-end sm:self-auto">
                    <div className={`px-4 py-2 rounded-xl border text-right ${scoreColor}`}>
                      <span className="text-2xl font-black block leading-none">
                        {cand.match_percentage}%
                      </span>
                      <span className="text-[10px] font-mono opacity-80">
                        Cosine Sim: {cand.similarity_score}
                      </span>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleShortlist(cand.candidate_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                      >
                        Shortlist
                      </button>
                      <button
                        onClick={() => handleHireCandidate(cand.candidate_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                      >
                        Hire (ACID)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Skills tags */}
                {cand.skills && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-600 mr-1">Matched Competencies:</span>
                    {cand.skills.split(',').map((sk: string) => (
                      <span
                        key={sk.trim()}
                        className="px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-700 text-[11px]"
                      >
                        {sk.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Snippet preview with full resume modal trigger */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 flex justify-between items-center gap-4">
                  <p className="line-clamp-2 italic">
                    &quot;{cand.resume_snippet}&quot;
                  </p>
                  <button
                    onClick={() => setActiveResumeCandidate(cand)}
                    className="shrink-0 text-xs text-purple-600 font-bold hover:underline"
                  >
                    View Full Resume ↗
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Candidate Semantic Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  Side-by-side metric comparison across top matched talent
                </p>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {selectedForCompare.map((id) => {
                const cand = matches.find((m) => m.candidate_id === id);
                if (!cand) return null;
                return (
                  <div key={id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900">{cand.full_name}</h4>
                      <span className="text-xs font-black text-purple-600">
                        {cand.match_percentage}%
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      <p><strong>Domain:</strong> {cand.category}</p>
                      <p><strong>CGPA:</strong> {cand.cgpa} / 10.0</p>
                      <p><strong>Cosine Sim:</strong> {cand.similarity_score}</p>
                    </div>
                    <div className="text-xs pt-2 border-t border-slate-200">
                      <strong>Skills:</strong>
                      <p className="text-slate-600 mt-1">{cand.skills}</p>
                    </div>
                    <button
                      onClick={() => {
                        handleShortlist(cand.candidate_id);
                        setShowCompareModal(false);
                      }}
                      className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                    >
                      Shortlist Candidate
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Full Resume Detail Modal */}
      {activeResumeCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {activeResumeCandidate.full_name} — Candidate Resume
                </h3>
                <span className="text-xs text-purple-600 font-medium">
                  {activeResumeCandidate.category} | CGPA: {activeResumeCandidate.cgpa} | Match: {activeResumeCandidate.match_percentage}%
                </span>
              </div>
              <button
                onClick={() => setActiveResumeCandidate(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
              {activeResumeCandidate.resume_snippet}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => {
                  handleShortlist(activeResumeCandidate.candidate_id);
                  setActiveResumeCandidate(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                Shortlist Candidate
              </button>
              <button
                onClick={() => setActiveResumeCandidate(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
