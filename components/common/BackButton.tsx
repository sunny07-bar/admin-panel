"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";

interface BackButtonProps {
  href?: string; // Optional href to go to a specific route instead of browser back
  label?: string; // Optional label text (default: "Back")
}

const BackButton: React.FC<BackButtonProps> = ({ href, label = "Back" }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Determine the back route
  // If href is provided, use it
  // Otherwise, try to determine parent route from current path
  // If on a list page (no /new or /[id]), go to dashboard
  // If on /new or /[id], go to parent list page
  const getBackRoute = (): string => {
    if (href) return href;

    // Get role prefix
    const rolePrefix = pathname.startsWith("/admin") ? "/admin" : pathname.startsWith("/manager") ? "/manager" : "/dashboard";
    
    // Remove role prefix to get the path segment
    const pathWithoutRole = pathname.replace(/^\/(admin|manager|dashboard)/, "");

    // If on a detail/edit page (has /new or /[id] or UUID), go to parent list
    if (pathWithoutRole.includes("/new") || /\/[a-f0-9-]{36}$/.test(pathWithoutRole) || pathWithoutRole.match(/\/[^\/]+$/)) {
      // Get parent route by removing last segment
      const segments = pathWithoutRole.split("/").filter(Boolean);
      if (segments.length > 1) {
        segments.pop(); // Remove last segment (new or id)
        const parentPath = segments.length > 0 ? `/${segments.join("/")}` : "";
        return `${rolePrefix}${parentPath}`;
      }
    }

    // Default to dashboard
    return `${rolePrefix}/dashboard`;
  };

  const backRoute = getBackRoute();

  return (
    <Link
      href={backRoute}
      className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      <span>{label}</span>
    </Link>
  );
};

export default BackButton;

