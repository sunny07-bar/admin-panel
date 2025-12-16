import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import React from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";

export const metadata: Metadata = {
  title: "Order Details | Restaurant Admin",
  description: "View order details",
};

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(`
      *,
      order_items(*)
    `)
    .eq("id", id)
    .single();

  if (!order) {
    return <div>Order not found</div>;
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[{ label: "Orders", href: "/orders" }, { label: "Details" }]} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Order Information
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-theme-xs text-gray-600 dark:text-gray-400">Order Number</p>
              <p className="text-theme-sm font-medium text-gray-900 dark:text-white">
                {order.order_number}
              </p>
            </div>
            <div>
              <p className="text-theme-xs text-gray-600 dark:text-gray-400">Customer</p>
              <p className="text-theme-sm font-medium text-gray-900 dark:text-white">
                {order.customer_name}
              </p>
              <p className="text-theme-xs text-gray-600 dark:text-gray-400">{order.customer_phone}</p>
            </div>
            <div>
              <p className="text-theme-xs text-gray-600 dark:text-gray-400">Order Type</p>
              <p className="text-theme-sm font-medium text-gray-900 dark:text-white">
                {(order.order_type || "").replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-theme-xs text-gray-600 dark:text-gray-400">Status</p>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  order.status === "completed"
                    ? "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400"
                    : "bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400"
                }`}
              >
                {(order.status || "pending").replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-dark">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Order Items</h3>
          <div className="space-y-3">
            {order.order_items?.map((item: any) => (
              <div key={item.id} className="flex justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
                <div>
                  <p className="text-theme-sm font-medium text-gray-900 dark:text-white">
                    {item.name_snapshot}
                  </p>
                  {item.variant_name_snapshot && (
                    <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                      {item.variant_name_snapshot}
                    </p>
                  )}
                  <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                    Qty: {item.quantity}
                  </p>
                </div>
                <p className="text-theme-sm font-medium text-gray-900 dark:text-white">
                  ${item.total_line_amount}
                </p>
              </div>
            ))}
            <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
              <div className="flex justify-between">
                <span className="text-theme-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-theme-sm font-medium text-gray-900 dark:text-white">
                  ${order.subtotal_amount}
                </span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-theme-sm text-gray-600 dark:text-gray-400">Discount</span>
                  <span className="text-theme-sm font-medium text-gray-900 dark:text-white">
                    -${order.discount_amount}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-theme-sm font-semibold text-gray-900 dark:text-white">
                  Total
                </span>
                <span className="text-theme-sm font-semibold text-gray-900 dark:text-white">
                  ${order.total_amount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

