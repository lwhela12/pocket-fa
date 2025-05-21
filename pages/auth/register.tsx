// @ts-nocheck
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  const checkPasswordStrength = (password: string) => {
    // Password strength criteria
    const minLength = password.length >= 12 ? 1 : 0;
    const hasUppercase = /[A-Z]/.test(password) ? 1 : 0;
    const hasLowercase = /[a-z]/.test(password) ? 1 : 0;
    const hasNumbers = /[0-9]/.test(password) ? 1 : 0;
    const hasSpecialChars = /[^A-Za-z0-9]/.test(password) ? 1 : 0;
    
    const strength = minLength + hasUppercase + hasLowercase + hasNumbers + hasSpecialChars;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    checkPasswordStrength(newPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    if (passwordStrength < 3) {
      setError('Password is not strong enough');
      setIsLoading(false);
      return;
    }
    
    try {
      // Use the register function from useAuth hook
      await register(email, password);
      // No need for redirect here as it's handled in the useAuth hook
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create an Account | Pocket Financial Advisor</title>
        <meta name="description" content="Create a new Pocket Financial Advisor account" />
      </Head>

      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                href="/auth/login" 
                className="font-medium text-primary hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div 
            className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    value={password}
                    onChange={handlePasswordChange}
                    className="input w-full"
                  />
                </div>
                
                {password && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Password strength:</p>
                    <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                      <div 
                        className={`h-2 rounded-full ${
                          passwordStrength <= 2 ? 'bg-red-500' :
                          passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${passwordStrength * 20}%` }}
                      ></div>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Password must be at least 12 characters and include uppercase, lowercase, numbers, and special characters.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="password-confirm" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1">
                  <input
                    id="password-confirm"
                    name="password-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary w-full py-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
}