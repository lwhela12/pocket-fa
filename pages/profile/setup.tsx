import { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';

export default function ProfileSetup() {
  const [age, setAge] = useState('');
  const [retirementAge, setRetirementAge] = useState('65');
  const [riskTolerance, setRiskTolerance] = useState<'Conservative' | 'Moderate' | 'Aggressive'>('Moderate');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (parseInt(age) < 18 || parseInt(age) > 100) {
      setError('Age must be between 18 and 100');
      setIsLoading(false);
      return;
    }
    
    try {
      // TODO: Implement actual profile setup API call
      console.log('Profile setup with:', { age, retirementAge, riskTolerance });
      
      // For now, simulate a successful setup
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err) {
      setError('Profile setup failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Set Up Your Profile | Pocket Financial Advisor</title>
        <meta name="description" content="Complete your profile setup" />
      </Head>

      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Complete Your Profile
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              This information helps us provide personalized financial advice
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
                <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                  Your Age
                </label>
                <div className="mt-1">
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min="18"
                    max="100"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Used to calculate your investment horizon</p>
              </div>

              <div>
                <label htmlFor="retirement-age" className="block text-sm font-medium text-gray-700">
                  Target Retirement Age
                </label>
                <div className="mt-1">
                  <select
                    id="retirement-age"
                    name="retirement-age"
                    value={retirementAge}
                    onChange={(e) => setRetirementAge(e.target.value)}
                    className="input w-full"
                  >
                    <option value="40">40</option>
                    <option value="45">45</option>
                    <option value="50">50</option>
                    <option value="55">55</option>
                    <option value="60">60</option>
                    <option value="65">65</option>
                    <option value="70">70</option>
                    <option value="75">75</option>
                    <option value="80">80</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">Defines your planning timeline</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Risk Tolerance
                </label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <div 
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 ${riskTolerance === 'Conservative' ? 'border-primary bg-blue-50' : 'border-gray-300'} hover:border-primary hover:bg-blue-50`}
                    onClick={() => setRiskTolerance('Conservative')}
                  >
                    <span className="block text-sm font-medium text-gray-900">Conservative</span>
                    <span className="mt-1 text-xs text-gray-500">Low risk, stable returns</span>
                  </div>
                  <div 
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 ${riskTolerance === 'Moderate' ? 'border-primary bg-blue-50' : 'border-gray-300'} hover:border-primary hover:bg-blue-50`}
                    onClick={() => setRiskTolerance('Moderate')}
                  >
                    <span className="block text-sm font-medium text-gray-900">Moderate</span>
                    <span className="mt-1 text-xs text-gray-500">Balanced growth</span>
                  </div>
                  <div 
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 ${riskTolerance === 'Aggressive' ? 'border-primary bg-blue-50' : 'border-gray-300'} hover:border-primary hover:bg-blue-50`}
                    onClick={() => setRiskTolerance('Aggressive')}
                  >
                    <span className="block text-sm font-medium text-gray-900">Aggressive</span>
                    <span className="mt-1 text-xs text-gray-500">High risk, high reward</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Impacts asset allocation recommendations</p>
              </div>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary w-full py-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving profile...' : 'Save and continue'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
}