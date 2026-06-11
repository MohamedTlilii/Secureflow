import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'SecureFlow CRM',
  description: 'Gestion clients Solution Express — Mohamed Tlili',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
              success: { iconTheme: { primary: '#12b76a', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
