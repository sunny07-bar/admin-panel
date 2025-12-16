import { Outfit } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';

import { SidebarProvider } from '@/context/SidebarContext';

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${outfit.className} bg-gray-900`}>
          <SidebarProvider>{children}</SidebarProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
