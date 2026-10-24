'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RecruiterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillDemoRecruiter = () => {
    setEmail('recruiter@tcs.com');
    setPassword('password123');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'recruiter' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Recruiter login failed');
      }

      router.push('/recruiter');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <span>🏢 Corporate Recruiter</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Recruiter Sign In</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Publish job openings, review candidate pipelines, and make transactional hiring decisions.
          </p>
        </div>

        {/* Demo Fast Login */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div className="text-xs text-emerald-900">
            <span className="font-bold block">Demo Recruiter Seed:</span>
            <span className="text-[11px] text-emerald-700">recruiter@tcs.com (Tata Consultancy Services)</span>
          </div>
          <button
            type="button"
            onClick={fillDemoRecruiter}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition whitespace-nowrap"
          >
            Fill Demo
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. recruiter@tcs.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In as Recruiter'}
          </button>
        </form>

        {/* Links */}
        <div className="pt-2 border-t border-slate-100 flex flex-col space-y-2 text-center text-xs text-slate-500">
          <p>
            New partner company?{' '}
            <Link href="/register?role=recruiter" className="text-emerald-600 font-semibold hover:underline">
              Register as Recruiter
            </Link>
          </p>
          <p>
            Are you a student?{' '}
            <Link href="/login/student" className="text-blue-600 font-semibold hover:underline">
              Switch to Student Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
