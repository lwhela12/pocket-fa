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
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (isChatPanelVisible) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }

    return () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isChatPanelVisible]);

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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 sticky top-0">
        <Navbar />

        <div className="container mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
          {/* Main Content - Always full width */}
          <main className="w-full">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 sm:p-6 min-h-[calc(100vh-12rem)]">
              {children}
            </div>
          </main>

          {/* Desktop Chat Panel - Fixed Overlay */}
          {isChatPanelVisible && (
            <div className="hidden md:block fixed inset-0 z-40">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                onClick={() => {}} // Prevent click-through
              />

              {/* Chat Panel - Right side overlay */}
              <div className="absolute right-0 top-0 bottom-0 w-[450px] bg-white shadow-2xl">
                <div className="h-full flex flex-col">
                  <ChatInterface />
                </div>
              </div>
            </div>
          )}

          {/* Mobile Chat Panel - Slides up from bottom */}
          {isChatPanelVisible && (
            <div className="fixed inset-0 z-40 md:hidden">
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/50" />

              {/* Chat Panel */}
              <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out">
                <ChatInterface />
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-gray-200 bg-white py-4 sm:py-6">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Pocket Financial Advisor. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}