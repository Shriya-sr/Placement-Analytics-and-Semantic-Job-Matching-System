'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RecruiterPostJobPage() {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [experienceMin, setExperienceMin] = useState('0');
  const [experienceMax, setExperienceMax] = useState('2');
  const [payrate, setPayrate] = useState('INR 8,00,000 - 14,00,000 P.A');
  const [location, setLocation] = useState('Bengaluru');
  const [numPositions, setNumPositions] = useState('2');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle,
          jobDescription,
          experienceMin: parseFloat(experienceMin),
          experienceMax: parseFloat(experienceMax),
          payrate,
          location,
          numPositions: parseInt(numPositions, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to post job');
      }

      setMessage('Job published successfully via ACID Stored Procedure sp_post_job_with_audit!');
      setTimeout(() => {
        router.push('/recruiter');
      }, 1500);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center space-x-2">
        <Link href="/recruiter" className="text-emerald-600 text-xs font-semibold hover:underline">
          ← Back to Recruiter Dashboard
        </Link>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Post New Career Opening</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Executes MySQL Transactional Stored Procedure <code className="bg-slate-100 px-1 rounded">sp_post_job_with_audit</code>
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-semibold border ${
            message.startsWith('Job')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Senior Machine Learning Engineer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Description (Vectorized by ChromaDB for matching)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Describe technical responsibilities, required skills (Python, PyTorch, SQL), and qualifications..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Min Experience (Years)
              </label>
              <input
                type="number"
                step="0.5"
                value={experienceMin}
                onChange={(e) => setExperienceMin(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Experience (Years)
              </label>
              <input
                type="number"
                step="0.5"
                value={experienceMax}
                onChange={(e) => setExperienceMax(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Compensation / Payrate
              </label>
              <input
                type="text"
                value={payrate}
                onChange={(e) => setPayrate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vacancies (num_positions)
              </label>
              <input
                type="number"
                value={numPositions}
                onChange={(e) => setNumPositions(e.target.value)}
                required
                min="1"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-md transition"
          >
            {loading ? 'Executing Transaction...' : 'Publish Job Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
