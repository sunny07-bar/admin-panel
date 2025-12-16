"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import StatusFilter from "@/components/common/StatusFilter";

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*")
      .order("placed_at", { ascending: false })
      .limit(50);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (dateFilter) {
      const startDate = new Date(dateFilter);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateFilter);
      endDate.setHours(23, 59, 59, 999);
      query = query
        .gte("placed_at", startDate.toISOString())
        .lte("placed_at", endDate.toISOString());
    }

    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Orders" }]} />

      <div className="flex items-center gap-4">
        <StatusFilter
          options={[
            { value: "", label: "All Status" },
            { value: "pending", label: "Pending" },
            { value: "accepted", label: "Accepted" },
            { value: "preparing", label: "Preparing" },
            { value: "ready", label: "Ready" },
            { value: "out_for_delivery", label: "Out for Delivery" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          onFilterChange={(value) => setStatusFilter(value)}
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
        />
        {(statusFilter || dateFilter) && (
          <Button variant="outline" size="sm" onClick={() => {
            setStatusFilter("");
            setDateFilter("");
          }}>
            Clear Filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-dark">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Order #
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-6 py-4 text-theme-sm font-medium text-gray-900 dark:text-white">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-theme-sm font-medium text-gray-900 dark:text-white">
                            {order.customer_name}
                          </p>
                          <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                            {order.customer_phone}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-theme-sm text-gray-600 dark:text-gray-400">
                        {(order.order_type || "").replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4 text-theme-sm font-medium text-gray-900 dark:text-white">
                        ${order.total_amount}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            order.status === "completed"
                              ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                              : order.status === "pending"
                              ? "bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {(order.status || "pending").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

