import { ReactElement, ReactNode } from 'react';
import { NextPage } from 'next';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../hooks/useAuth';
import '../styles/globals.css';
import { FinancialAssistantProvider } from '../lib/financial-assistant-context';

export type NextPageWithLayout<P = unknown, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

// Create a client
const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FinancialAssistantProvider>
          {getLayout(<Component {...pageProps} />)}
        </FinancialAssistantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default MyApp;