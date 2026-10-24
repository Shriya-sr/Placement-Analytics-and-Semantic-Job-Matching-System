'use client';

import './globals.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string; email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) setUser(data.user);
        else setUser(null);
      })
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        {/* Navigation Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                PA
              </span>
              <div>
                <span className="font-bold text-slate-900 text-lg leading-tight block">
                  Placement Analytics
                </span>
                <span className="text-xs text-blue-600 font-medium">
                  Semantic Job Matcher (Level 3)
                </span>
              </div>
            </Link>

            <nav className="flex items-center space-x-1 sm:space-x-3 text-sm font-medium">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm transition ${
                  pathname === '/' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/student/jobs"
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm transition ${
                  pathname.startsWith('/student/jobs') ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                }`}
              >
                Job Board
              </Link>
              <Link
                href="/student"
                className={`hidden md:inline px-3 py-1.5 rounded-md text-xs sm:text-sm transition ${
                  pathname === '/student' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                }`}
              >
                Student Portal
              </Link>
              <Link
                href="/recruiter"
                className={`hidden md:inline px-3 py-1.5 rounded-md text-xs sm:text-sm transition ${
                  pathname === '/recruiter' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-700 hover:text-emerald-600 hover:bg-slate-100'
                }`}
              >
                Recruiter Console
              </Link>
              <Link
                href="/analytics"
                className={`hidden lg:inline px-3 py-1.5 rounded-md text-xs sm:text-sm transition ${
                  pathname === '/analytics' ? 'text-slate-900 font-bold bg-slate-100' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                SQL Analytics
              </Link>

              {user ? (
                <div className="relative ml-2 flex items-center space-x-2">
                  <Link
                    href={user.role === 'recruiter' ? '/recruiter' : '/student'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition ${
                      user.role === 'recruiter'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    My {user.role === 'recruiter' ? 'Console' : 'Portal'}
                  </Link>

                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen((v) => !v)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-xs"
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                          user.role === 'recruiter' ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                      >
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-semibold text-slate-800 max-w-[80px] truncate hidden sm:block">
                        {user.name}
                      </span>
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                          <span
                            className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              user.role === 'recruiter' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {user.role.toUpperCase()}
                          </span>
                        </div>
                        <Link
                          href={user.role === 'recruiter' ? '/recruiter' : '/student'}
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          My Portal Dashboard
                        </Link>
                        {user.role === 'recruiter' && (
                          <Link
                            href="/recruiter/jobs"
                            onClick={() => setMenuOpen(false)}
                            className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            + Post New Opening
                          </Link>
                        )}
                        <button
                          onClick={() => { setMenuOpen(false); handleLogout(); }}
                          className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-semibold border-t border-slate-100"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 ml-2">
                  <Link
                    href="/login/student"
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition"
                  >
                    Student Login
                  </Link>
                  <Link
                    href="/login/recruiter"
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                  >
                    Recruiter Login
                  </Link>
                  <Link
                    href="/register"
                    className="hidden sm:inline px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-xs font-semibold transition shadow-sm"
                  >
                    Register
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4">
            <p className="font-semibold text-slate-700">
              Department of Computer Science &amp; Engineering - PES University
            </p>
            <p className="mt-1">
              Database Management Systems (Level 3 Experiential Learning) - MySQL 3NF Relational DB + ChromaDB Vector Engine + Next.js App Router
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
