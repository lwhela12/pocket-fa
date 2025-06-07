import { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';

export default function MFASetup() {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<'app' | 'sms' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleMethodSelect = (selectedMethod: 'app' | 'sms') => {
    setMethod(selectedMethod);
    setStep(2);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
    }, 1000);
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate verification
    setTimeout(() => {
      if (verificationCode === '123456') {
        router.push('/profile/setup');
      } else {
        setError('Invalid verification code. Please try again.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <>
      <Head>
        <title>Set Up Multi-Factor Authentication | Pocket Financial Advisor</title>
        <meta name="description" content="Set up multi-factor authentication for your account" />
      </Head>

      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Set Up Two-Factor Authentication
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enhance your account security with an additional layer of protection
            </p>
          </motion.div>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute left-0 top-2 w-full border-t border-gray-300"></div>
              <div className="relative flex justify-center">
                <div className="flex items-center space-x-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                    1
                  </div>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                    2
                  </div>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                    3
                  </div>
                </div>
              </div>
            </div>
          </div>
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

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Choose Authentication Method</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Select how you'd like to receive your verification codes
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div 
                    className="flex cursor-pointer flex-col rounded-lg border p-4 hover:border-primary hover:bg-blue-50"
                    onClick={() => handleMethodSelect('app')}
                  >
                    <div className="text-lg font-medium text-gray-900">Authenticator App</div>
                    <div className="mt-1 text-sm text-gray-600">
                      Use an app like Google Authenticator or Authy
                    </div>
                  </div>

                  <div 
                    className="flex cursor-pointer flex-col rounded-lg border p-4 hover:border-primary hover:bg-blue-50"
                    onClick={() => handleMethodSelect('sms')}
                  >
                    <div className="text-lg font-medium text-gray-900">SMS Text Message</div>
                    <div className="mt-1 text-sm text-gray-600">
                      Receive verification codes via text message
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && method === 'app' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Authenticator App Setup</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Scan this QR code with your authenticator app
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="h-56 w-56 rounded-lg bg-gray-200 p-4">
                    <div className="flex h-full items-center justify-center">
                      <p className="text-center text-sm text-gray-600">
                        [QR Code placeholder]<br />
                        In a real app, this would be a QR code
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary w-full py-2"
                  onClick={() => setStep(3)}
                >
                  I've scanned the code
                </button>
              </div>
            )}

            {step === 2 && method === 'sms' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900">SMS Verification Setup</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Enter your phone number to receive verification codes
                  </p>
                </div>

                <form onSubmit={handlePhoneSubmit}>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <div className="mt-1">
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        placeholder="+1 555 123 4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="input w-full"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      className="btn btn-primary w-full py-2"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending code...' : 'Send verification code'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Verify Your Code</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Enter the 6-digit code from your {method === 'app' ? 'authenticator app' : 'text message'}
                  </p>
                </div>

                <form onSubmit={handleVerificationSubmit}>
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                      Verification Code
                    </label>
                    <div className="mt-1">
                      <input
                        id="code"
                        name="code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="input w-full text-center text-xl tracking-widest"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      For demo purposes, enter "123456" to continue
                    </p>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      className="btn btn-primary w-full py-2"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Verifying...' : 'Verify and continue'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}