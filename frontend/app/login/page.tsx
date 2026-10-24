'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'recruiter'>('student');
  const [email, setEmail] = useState('alice@pes.edu');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleToggle = (selectedRole: 'student' | 'recruiter') => {
    setRole(selectedRole);
    if (selectedRole === 'student') {
      setEmail('alice@pes.edu');
    } else {
      setEmail('recruiter@tcs.com');
    }
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
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (role === 'recruiter') {
        router.push('/recruiter');
      } else {
        router.push('/student');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Role Portal Selection Cards */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">Choose Your Portal</h1>
        <p className="text-sm text-slate-600">
          Select your role to access your dedicated placement portal.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Student Gateway Card */}
        <Link
          href="/login/student"
          className="bg-white p-6 rounded-2xl border-2 border-blue-200 hover:border-blue-600 hover:shadow-md transition text-left group flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <span className="text-3xl">🎓</span>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
              Student Sign In →
            </h3>
            <p className="text-xs text-slate-500">
              Browse openings, submit job applications with ACID transactions, and track interview statuses.
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600">
            Open Student Login Page &rarr;
          </span>
        </Link>

        {/* Recruiter Gateway Card */}
        <Link
          href="/login/recruiter"
          className="bg-white p-6 rounded-2xl border-2 border-emerald-200 hover:border-emerald-600 hover:shadow-md transition text-left group flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <span className="text-3xl">🏢</span>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition">
              Recruiter Sign In →
            </h3>
            <p className="text-xs text-slate-500">
              Post new career openings, review applied candidates, and hire candidates with automated audit logs.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-600">
            Open Recruiter Login Page &rarr;
          </span>
        </Link>
      </div>

      {/* Quick Sign In Form Box */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Quick Sign In</h2>
            <p className="text-xs text-slate-500">Or sign in right here directly</p>
          </div>
          {/* Role Toggle Selector */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => handleRoleToggle('student')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                role === 'student'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => handleRoleToggle('recruiter')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                role === 'recruiter'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recruiter
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="name@pes.edu"
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
            className={`w-full py-2.5 rounded-lg text-white font-semibold text-sm shadow-sm transition ${
              role === 'student'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {loading ? 'Authenticating...' : `Enter as ${role === 'student' ? 'Student' : 'Recruiter'}`}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Don&apos;t have an account yet?{' '}
          <Link href={`/register?role=${role}`} className="text-blue-600 font-semibold hover:underline">
            Register as {role === 'student' ? 'Student' : 'Recruiter'}
          </Link>
        </div>
      </div>
    </div>
  );
}
