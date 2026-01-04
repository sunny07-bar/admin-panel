import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import React from "react";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import { getFloridaNow, getFloridaMonthStartUTC, getFloridaMonthEndUTC, toFloridaTime } from "@/lib/utils/timezone";
import { parseISO } from "date-fns";

export const metadata: Metadata = {
  title: "Dashboard | Restaurant Admin",
  description: "Restaurant management dashboard overview",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch stats
  const [ordersResult, reservationsResult, revenueResult, recentOrdersResult, monthlyDataResult] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("reservations").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("total_amount")
      .eq("payment_status", "paid"),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total_amount, status, placed_at")
      .order("placed_at", { ascending: false })
      .limit(5),
    supabase
      .from("orders")
      .select("total_amount, placed_at, payment_status")
      .eq("payment_status", "paid")
      .order("placed_at", { ascending: false })
      .limit(1000),
  ]);

  const totalOrders = ordersResult.count || 0;
  const totalReservations = reservationsResult.count || 0;
  const totalRevenue =
    revenueResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
  
  const recentOrders = recentOrdersResult.data || [];
  
  // Calculate monthly revenue for the last 12 months (using Florida timezone)
  const floridaNow = getFloridaNow();
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    // Calculate month in Florida timezone
    const targetDate = new Date(floridaNow);
    targetDate.setMonth(targetDate.getMonth() - (11 - i));
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed
    
    // Get month start and end in Florida timezone, converted to UTC for comparison
    const monthStartUTC = getFloridaMonthStartUTC(year, month);
    const monthEndUTC = getFloridaMonthEndUTC(year, month);
    
    const monthOrders = monthlyDataResult.data?.filter((order) => {
      if (!order.placed_at) return false;
      const orderDateUTC = parseISO(order.placed_at);
      if (isNaN(orderDateUTC.getTime())) return false;
      // Compare UTC timestamps
      return orderDateUTC >= parseISO(monthStartUTC) && orderDateUTC <= parseISO(monthEndUTC);
    }) || [];
    
    return monthOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  });

  // Calculate monthly target progress (75% of target)
  const monthlyTarget = 20000; // $20K target
  const currentRevenue = monthlyRevenue[monthlyRevenue.length - 1] || 0;
  const targetProgress = Math.min((currentRevenue / monthlyTarget) * 100, 100);

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7 animate-fade-in-up">
        <EcommerceMetrics 
          totalOrders={totalOrders}
          totalReservations={totalReservations}
          totalRevenue={totalRevenue}
        />

        <MonthlySalesChart monthlyRevenue={monthlyRevenue} />
      </div>

      <div className="col-span-12 xl:col-span-5 animate-fade-in-up stagger-1">
        <MonthlyTarget 
          targetProgress={targetProgress}
          currentRevenue={currentRevenue}
          monthlyTarget={monthlyTarget}
        />
      </div>

      <div className="col-span-12 animate-fade-in-up stagger-2">
        <StatisticsChart monthlyRevenue={monthlyRevenue} />
      </div>

      <div className="col-span-12 xl:col-span-5 animate-fade-in-up stagger-3">
        <DemographicCard />
      </div>

      <div className="col-span-12 xl:col-span-7 animate-fade-in-up stagger-4">
        <RecentOrders orders={recentOrders} />
      </div>
    </div>
  );
}

