// @ts-nocheck
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <>
      <Head>
        <title>Pocket Financial Advisor</title>
        <meta name="description" content="Personalized financial insights to optimize your savings, investments, and retirement planning." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <h1 className="mb-6 text-4xl font-bold text-gray-900 sm:text-6xl">
            Pocket Financial Advisor
          </h1>
          <p className="mb-8 text-xl text-gray-600">
            Your personalized financial companion, providing actionable insights for your financial journey.
          </p>

          <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <Link 
              href="/auth/login"
              className="btn btn-primary px-8 py-3 text-base"
            >
              Login
            </Link>
            <Link 
              href="/auth/register"
              className="btn bg-white px-8 py-3 text-base text-primary ring-1 ring-primary hover:bg-gray-50"
            >
              Sign Up
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3"
        >
          <div className="card">
            <h3 className="mb-2 text-lg font-medium text-gray-900">Financial Data Input</h3>
            <p className="text-gray-600">Easily input your financial data manually or upload your statements.</p>
          </div>

          <div className="card">
            <h3 className="mb-2 text-lg font-medium text-gray-900">Goal Setting & Tracking</h3>
            <p className="text-gray-600">Define your financial goals and track your progress over time.</p>
          </div>

          <div className="card">
            <h3 className="mb-2 text-lg font-medium text-gray-900">AI-Driven Insights</h3>
            <p className="text-gray-600">Get personalized financial advice through our intuitive chat interface.</p>
          </div>
        </motion.div>
      </main>
    </>
  );
}