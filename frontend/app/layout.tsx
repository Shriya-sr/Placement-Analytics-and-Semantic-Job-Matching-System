import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Placement Analytics & Semantic Job Matching System',
  description: 'PES University DBMS Level 3 Experiential Learning System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

            <nav className="flex items-center space-x-2 sm:space-x-4 text-sm font-medium">
              <Link
                href="/student"
                className="px-3 py-1.5 rounded-md text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition"
              >
                Student Portal
              </Link>
              <Link
                href="/recruiter"
                className="px-3 py-1.5 rounded-md text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition"
              >
                Recruiter Portal
              </Link>
              <Link
                href="/recruiter/match"
                className="px-3 py-1.5 rounded-md text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition"
              >
                Semantic Matcher
              </Link>
              <Link
                href="/analytics"
                className="px-3 py-1.5 rounded-md text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition"
              >
                SQL Analytics
              </Link>
              <Link
                href="/login"
                className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition text-xs sm:text-sm"
              >
                Sign In
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4">
            <p className="font-semibold text-slate-700">
              Department of Computer Science & Engineering - PES University
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
