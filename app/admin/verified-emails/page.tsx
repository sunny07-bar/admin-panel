"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import BackButton from "@/components/common/BackButton";
import Button from "@/components/ui/button/Button";
import { formatFloridaTime } from "@/lib/utils/timezone";
import { TrashBinIcon } from "@/icons";
import toast from "react-hot-toast";

export default function VerifiedEmailsPage() {
  const supabase = createClient();
  const [verifiedEmails, setVerifiedEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchVerifiedEmails();
  }, [searchTerm]);

  const fetchVerifiedEmails = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("verified_emails")
        .select("*")
        .order("verified_at", { ascending: false });

      if (searchTerm) {
        query = query.ilike("email", `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching verified emails:", error);
        toast.error("Failed to load verified emails");
        setVerifiedEmails([]);
      } else {
        // Calculate days remaining for each email
        const now = new Date();
        const emailsWithStatus = (data || []).map((email: any) => {
          const expiresAt = new Date(email.expires_at);
          const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            ...email,
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
            isExpired: daysRemaining <= 0,
          };
        });
        setVerifiedEmails(emailsWithStatus);
      }
    } catch (error: any) {
      console.error("Error fetching verified emails:", error);
      toast.error("Failed to load verified emails");
      setVerifiedEmails([]);
    }
    setLoading(false);
  };

  const handleDeleteClick = (email: string) => {
    setEmailToDelete(email);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!emailToDelete) return;

    setDeletingId(emailToDelete);
    try {
      const { error } = await supabase
        .from("verified_emails")
        .delete()
        .eq("email", emailToDelete);

      if (error) {
        throw error;
      }

      toast.success("Verified email deleted successfully");
      setShowDeleteModal(false);
      setEmailToDelete(null);
      fetchVerifiedEmails();
    } catch (error: any) {
      console.error("Error deleting verified email:", error);
      toast.error("Failed to delete verified email: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (daysRemaining: number, isExpired: boolean) => {
    if (isExpired) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Expired
        </span>
      );
    } else if (daysRemaining <= 7) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Expiring Soon ({daysRemaining}d)
        </span>
      );
    } else {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Active ({daysRemaining}d left)
        </span>
      );
    }
  };

  return (
    <div>
      <BackButton />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Verified Emails
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View all email addresses that have been verified via OTP
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading verified emails...</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Verified At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Expires At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {verifiedEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? "No verified emails found matching your search" : "No verified emails found"}
                    </td>
                  </tr>
                ) : (
                  verifiedEmails.map((email) => (
                    <tr key={email.email} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {email.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatFloridaTime(email.verified_at, 'MM-dd-yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatFloridaTime(email.expires_at, 'MM-dd-yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(email.daysRemaining, email.isExpired)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteClick(email.email)}
                          disabled={deletingId === email.email}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          title="Delete verified email"
                        >
                          <TrashBinIcon />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && emailToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Delete Verified Email
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to remove <strong>{emailToDelete}</strong> from the verified emails list? 
              The user will need to verify their email again for future bookings.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setEmailToDelete(null);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deletingId === emailToDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {deletingId === emailToDelete ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

