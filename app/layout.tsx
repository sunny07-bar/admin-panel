import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { Toaster } from '@/components/ui/toast/Toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.className} bg-gray-900`}>
        <ErrorBoundary>
          <SidebarProvider>{children}</SidebarProvider>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
