'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        action: isSignUp ? 'signup' : 'signin',
        redirect: false
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/mortgage');
        router.refresh();
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Enter your email"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Enter your password"
          />
          {isSignUp && (
            <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
          className="text-orange-600 hover:text-orange-700 text-sm"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  );
}