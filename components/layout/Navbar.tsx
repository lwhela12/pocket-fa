import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useFinancialAssistant } from '../../lib/financial-assistant-context';

export default function Navbar() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toggleChatPanel, isChatPanelVisible } = useFinancialAssistant();

  const handleLogout = () => {
    logout();
  };

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
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/analyzer" className="text-xl font-bold text-primary">
                Pocket FA
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/analyzer"
                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                  router.pathname === '/analyzer'
                    ? 'border-primary text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Statement Analyzer
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <button
              type="button"
              onClick={toggleChatPanel}
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              {isChatPanelVisible ? 'Hide Chat' : 'Show Chat'}
            </button>
            <div className="relative ml-3">
              <div>
                <button
                  type="button"
                  className="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  id="user-menu-button"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="true"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary text-center leading-8 text-white">
                    {getInitial()}
                  </div>
                </button>
              </div>

              {isProfileMenuOpen && (
                <div
                  className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabIndex={-1}
                >
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    tabIndex={-1}
                    id="user-menu-item-0"
                  >
                    Your Profile
                  </Link>
                  <Link
                    href="/profile/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    tabIndex={-1}
                    id="user-menu-item-1"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    tabIndex={-1}
                    id="user-menu-item-2"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="sm:hidden" id="mobile-menu">
        <div className="space-y-1 pt-2 pb-3">
          <Link
            href="/analyzer"
            className={`block border-l-4 py-2 pl-3 pr-4 text-base font-medium ${
              router.pathname === '/analyzer'
                ? 'border-primary bg-primary-50 text-primary'
                : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            Statement Analyzer
          </Link>
          <button
            onClick={toggleChatPanel}
            className="block w-full text-left border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
          >
            {isChatPanelVisible ? 'Hide Chat' : 'Show Chat'}
          </button>
        </div>
        <div className="border-t border-gray-200 pt-4 pb-3">
          <div className="flex items-center px-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary text-center leading-10 text-white">
                {getInitial()}
              </div>
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800">{user?.name || 'User'}</div>
              <div className="text-sm font-medium text-gray-500">{user?.email}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Link
              href="/profile"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              Your Profile
            </Link>
            <Link
              href="/profile/settings"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}