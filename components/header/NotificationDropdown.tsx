"use client";

import Link from "next/link";
import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { EnvelopeIcon, CalenderIcon, DollarLineIcon, CheckCircleIcon } from "@/icons";
import { formatDistanceToNow, parseISO } from "date-fns";

interface NotificationItem {
  id: string;
  type: "message" | "reservation" | "order";
  title: string;
  subtitle: string;
  link: string;
  createdAt: string;
  timeAgo: string;
  isNew: boolean;
}

export default function NotificationDropdown() {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      // 1. Fetch recent contact messages
      const { data: messages } = await supabase
        .from("contact_messages")
        .select("id, name, subject, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // 2. Fetch recent pending reservations
      const { data: reservations } = await supabase
        .from("reservations")
        .select("id, customer_name, guests_count, reservation_date, reservation_time, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // 3. Fetch recent ticket orders
      const { data: orders } = await supabase
        .from("ticket_orders")
        .select("id, customer_name, total_amount, payment_status, created_at")
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(5);

      const items: NotificationItem[] = [];

      // Process messages
      (messages || []).forEach((m) => {
        let timeAgo = "";
        try {
          timeAgo = formatDistanceToNow(parseISO(m.created_at), { addSuffix: true });
        } catch {
          timeAgo = "Recently";
        }
        items.push({
          id: `msg-${m.id}`,
          type: "message",
          title: m.name || "Customer Message",
          subtitle: m.subject ? `Subject: ${m.subject}` : (m.message ? m.message.slice(0, 45) + "..." : "New message received"),
          link: `/admin/contact-messages`,
          createdAt: m.created_at,
          timeAgo,
          isNew: m.status === "new",
        });
      });

      // Process reservations
      (reservations || []).forEach((r) => {
        let timeAgo = "";
        try {
          timeAgo = formatDistanceToNow(parseISO(r.created_at), { addSuffix: true });
        } catch {
          timeAgo = "Recently";
        }
        items.push({
          id: `res-${r.id}`,
          type: "reservation",
          title: r.customer_name || "Guest Reservation",
          subtitle: `Table for ${r.guests_count || 1} • ${r.reservation_date || ""}`,
          link: `/admin/reservations`,
          createdAt: r.created_at,
          timeAgo,
          isNew: r.status === "pending",
        });
      });

      // Process orders
      (orders || []).forEach((o) => {
        let timeAgo = "";
        try {
          timeAgo = formatDistanceToNow(parseISO(o.created_at), { addSuffix: true });
        } catch {
          timeAgo = "Recently";
        }
        items.push({
          id: `ord-${o.id}`,
          type: "order",
          title: o.customer_name || "Ticket Order",
          subtitle: `Ticket purchase: $${parseFloat(o.total_amount?.toString() || "0").toFixed(2)}`,
          link: `/admin/orders`,
          createdAt: o.created_at,
          timeAgo,
          isNew: false,
        });
      });

      // Sort by createdAt descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const topItems = items.slice(0, 6);
      setNotifications(topItems);
      setUnreadCount(topItems.filter((i) => i.isNew).length);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  function toggleDropdown() {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
        onClick={toggleDropdown}
        title="Notifications"
      >
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0.5 z-10 h-2.5 w-2.5 rounded-full bg-[#F59E0B] flex">
            <span className="absolute inline-flex w-full h-full bg-[#F59E0B] rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex max-h-[500px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-800 dark:bg-gray-dark sm:w-[380px] lg:right-0 z-50"
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h5 className="text-base font-bold text-gray-800 dark:text-gray-100">
              Notifications
            </h5>
            {unreadCount > 0 ? (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                {unreadCount} New
              </span>
            ) : (
              <span className="text-[11px] text-gray-400 font-medium">All caught up</span>
            )}
          </div>
          <button
            onClick={closeDropdown}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm p-1 rounded-md transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <ul className="flex flex-col h-auto max-h-[360px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 custom-scrollbar">
          {loading ? (
            <li className="py-8 text-center text-xs text-gray-400">Loading notifications...</li>
          ) : notifications.length === 0 ? (
            <li className="py-8 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2 text-gray-400">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No new notifications</p>
              <p className="text-xs text-gray-400 mt-1">Customer messages, reservations, and orders will appear here.</p>
            </li>
          ) : (
            notifications.map((item) => (
              <li key={item.id}>
                <DropdownItem
                  tag="a"
                  href={item.link}
                  onItemClick={closeDropdown}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors w-full text-left"
                >
                  {/* Icon badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      item.type === "message"
                        ? "bg-blue-500/15 text-blue-500 border border-blue-500/20"
                        : item.type === "reservation"
                        ? "bg-amber-500/15 text-[#F59E0B] border border-amber-500/20"
                        : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                    }`}
                  >
                    {item.type === "message" && <EnvelopeIcon className="w-4 h-4" />}
                    {item.type === "reservation" && <CalenderIcon className="w-4 h-4" />}
                    {item.type === "order" && <DollarLineIcon className="w-4 h-4" />}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                        {item.title}
                      </span>
                      {item.isNew && (
                        <span className="h-2 w-2 rounded-full bg-[#F59E0B] shrink-0" title="New"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {item.subtitle}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {item.timeAgo}
                    </span>
                  </div>
                </DropdownItem>
              </li>
            ))
          )}
        </ul>

        {/* Footer Quick Links */}
        <div className="pt-2.5 mt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs px-1">
          <Link
            href="/admin/contact-messages"
            onClick={closeDropdown}
            className="text-[#F59E0B] hover:text-amber-400 font-medium transition-colors"
          >
            Messages →
          </Link>
          <Link
            href="/admin/reservations"
            onClick={closeDropdown}
            className="text-[#F59E0B] hover:text-amber-400 font-medium transition-colors"
          >
            Reservations →
          </Link>
        </div>
      </Dropdown>
    </div>
  );
}
