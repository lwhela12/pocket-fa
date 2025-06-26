import { ReactNode, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import { useAuth } from '../../hooks/useAuth';
import ChatInterface from '../dashboard/ChatInterface';
import { useFinancialAssistant } from '../../lib/financial-assistant-context';

type DashboardLayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function DashboardLayout({ 
  children,
  title = 'Dashboard | Pocket Financial Advisor',
}: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const { isChatPanelVisible } = useFinancialAssistant();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Show nothing while checking authentication
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Pocket Financial Advisor dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <main>{children}</main>
          <div
            className={`${isChatPanelVisible ? 'block' : 'hidden'} h-[calc(100vh-7rem)] overflow-y-auto`}
          >
            <ChatInterface />
          </div>
        </div>

        <footer className="border-t border-gray-200 bg-white py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Pocket Financial Advisor. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}