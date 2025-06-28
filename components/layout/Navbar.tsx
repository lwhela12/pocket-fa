import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useFinancialAssistant } from '../../lib/financial-assistant-context';
import Modal from './Modal';

export default function Navbar() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDashModalOpen, setIsDashModalOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toggleChatPanel, isChatPanelVisible } = useFinancialAssistant();

  const handleLogout = () => {
    logout();
  };

  const closeDashModal = () => setIsDashModalOpen(false);

  const getInitial = () => {
    if (user?.name) {
      return user.name.charAt(0);
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <nav className="bg-white/90 backdrop-blur-md border-b border-white/20 shadow-lg sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/analyzer" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Pocket FA
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden sm:flex items-center space-x-2">
            <div className="flex bg-gray-100/80 p-1 rounded-xl">
              <Link
                href="/analyzer"
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  router.pathname === '/analyzer'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                Statement Analyzer
              </Link>
              <Link
                href="/dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  setIsDashModalOpen(true);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  router.pathname === '/dashboard'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                Dashboard
              </Link>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Chat Toggle */}
            <button
              type="button"
              onClick={toggleChatPanel}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isChatPanelVisible 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {isChatPanelVisible ? 'Hide Chat' : 'Show Chat'}
            </button>

            {/* Profile Menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-semibold">
                  {getInitial()}
                </div>
              </button>

              {isProfileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-xl bg-white/95 backdrop-blur-md py-2 shadow-xl ring-1 ring-black/5 border border-white/20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                      <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                    </div>
                    
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Your Profile
                    </Link>
                    <Link
                      href="/profile/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsProfileMenuOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden border-t border-white/20 bg-white/80">
        <div className="space-y-1 px-4 py-3">
          <Link
            href="/analyzer"
            className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors duration-200 ${
              router.pathname === '/analyzer'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            Statement Analyzer
          </Link>
          <Link
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              setIsDashModalOpen(true);
            }}
            className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors duration-200 ${
              router.pathname === '/dashboard'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            Dashboard
          </Link>
          <button
            onClick={toggleChatPanel}
            className="block w-full text-left rounded-lg px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
          >
            {isChatPanelVisible ? 'Hide Chat' : 'Show Chat'}
          </button>
        </div>
      </div>
      </nav>
      <Modal isOpen={isDashModalOpen} onClose={closeDashModal} title="Coming Soon">
        <p className="text-center text-gray-700">The Dashboard feature is coming soon!</p>
      </Modal>
    </>
  );
}
