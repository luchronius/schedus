'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function NavigationHeader() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  const navItems = [
    { href: '/', label: 'RESP Calculator', key: 'resp' },
    { href: '/compound-interest', label: 'Compound Interest', key: 'compound' },
    { href: '/loan-amortization', label: 'Loan Calculator', key: 'loan' },
    { href: '/cashflow-tracker', label: 'Cashflow Tracker', key: 'cashflow' },
    { href: '/mortgage', label: 'Mortgage Calculator', key: 'mortgage' },
    { href: '/asset-tracker', label: 'Asset Tracker', key: 'assets' }
  ];

  return (
    <header className="bg-white shadow-md border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              Financial Calculators
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <nav className="flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            
            <div className="border-l border-gray-200 pl-4">
              {status === 'loading' ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : session ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-700">
                    {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    href="/auth/signin"
                    className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600 hover:text-blue-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            <div className="border-t border-gray-200 pt-2 mt-2">
              {session ? (
                <div className="space-y-2">
                  <div className="px-4 py-2 text-sm text-gray-700">
                    {session.user?.name || session.user?.email}
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/auth/signin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 mx-4"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}