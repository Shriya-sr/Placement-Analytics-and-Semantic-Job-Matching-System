'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillDemoStudent = () => {
    setEmail('alice@pes.edu');
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
        body: JSON.stringify({ email, password, role: 'student' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Student login failed');
      }

      router.push('/student');
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
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            <span>🎓 Student Access</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Student Sign In</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Access your placement applications, track status, and apply for open positions.
          </p>
        </div>

        {/* Demo Fast Login */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div className="text-xs text-blue-900">
            <span className="font-bold block">Demo Student Seed:</span>
            <span className="text-[11px] text-blue-700">alice@pes.edu (Data Science, 8.9 CGPA)</span>
          </div>
          <button
            type="button"
            onClick={fillDemoStudent}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition whitespace-nowrap"
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
              Student Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. alice@pes.edu"
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
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In as Student'}
          </button>
        </form>

        {/* Links */}
        <div className="pt-2 border-t border-slate-100 flex flex-col space-y-2 text-center text-xs text-slate-500">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/register?role=student" className="text-blue-600 font-semibold hover:underline">
              Register as Student
            </Link>
          </p>
          <p>
            Are you a recruiter?{' '}
            <Link href="/login/recruiter" className="text-emerald-600 font-semibold hover:underline">
              Switch to Recruiter Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
