"use client";

import React from "react";
import { SignIn } from "@clerk/nextjs";
import GridShape from "@/components/common/GridShape";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <GridShape />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark",
                headerTitle: "text-title-md font-semibold text-gray-900 dark:text-white",
                headerSubtitle: "text-theme-sm text-gray-600 dark:text-gray-400",
                socialButtonsBlockButton: "border border-gray-200 dark:border-gray-800",
                formButtonPrimary: "bg-brand-500 hover:bg-brand-600",
                footerActionLink: "text-brand-500 hover:text-brand-600",
              },
            }}
            routing="path"
            path="/login"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}

