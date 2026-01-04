import Link from "next/link";
import React from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  pageTitle?: string;
  items?: BreadcrumbItem[];
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle, items }) => {
  const displayTitle = pageTitle || items?.[items.length - 1]?.label || "Page";
  
  return (
    <nav className="flex items-center">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
            href="/dashboard"
          >
            Home
            <svg
              className="stroke-current"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                stroke=""
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </li>
        {items?.map((item, index) => (
          <React.Fragment key={index}>
            <svg
              className="stroke-current text-gray-400"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                stroke=""
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <li className="text-sm text-gray-800 dark:text-white/90">
              {item.href ? (
                <Link href={item.href} className="hover:text-brand-500">
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </li>
          </React.Fragment>
        ))}
        {!items && (
          <li className="text-sm text-gray-800 dark:text-white/90">
            {displayTitle}
          </li>
        )}
      </ol>
    </nav>
  );
};

export default PageBreadcrumb;
