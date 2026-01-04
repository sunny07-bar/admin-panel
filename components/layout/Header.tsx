"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import { getCurrentUser, signOut } from "@/lib/auth/client";
import type { User } from "@/lib/auth/client";
import Image from "next/image";

const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    }
    fetchUser();
  }, []);

  const navItems = [
    { name: "Events", path: "/manager/events" },
    { name: "Tickets", path: "/manager/events/tickets" },
    { name: "Scan", path: "/manager/events/scan" },
    { name: "Reservations", path: "/manager/reservations" },
  ];

  const isActive = (path: string) => {
    if (path === "/manager/events") {
      return pathname === "/manager/events";
    }
    return pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 flex w-full bg-white border-b border-gray-200 z-99999 dark:border-gray-800 dark:bg-gray-900 shadow-lg">
      <div className="flex items-center justify-between w-full px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-1 sm:gap-4">
          <Link href="/manager/events" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Manager Panel
          </Link>
          <nav className="hidden md:flex items-center gap-2 ml-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "bg-brand-500 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.full_name || user.email.split('@')[0]}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {user.role}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

