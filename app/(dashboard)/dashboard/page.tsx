import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import React from "react";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import { getFloridaNow, getFloridaMonthStartUTC, getFloridaMonthEndUTC } from "@/lib/utils/timezone";
import { parseISO } from "date-fns";

export const metadata: Metadata = {
  title: "Dashboard | Restaurant Admin",
  description: "Restaurant management dashboard overview",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch stats
  const [
    ticketOrdersResult, 
    reservationsResult, 
    ticketRevenueResult, 
    reservationRevenueResult,
    recentTicketOrdersResult,
    monthlyTicketDataResult,
    monthlyReservationDataResult
  ] = await Promise.all([
    // Count of ticket orders
    supabase.from("ticket_orders").select("id", { count: "exact", head: true }),
    // Count of reservations
    supabase.from("reservations").select("id", { count: "exact", head: true }),
    // Revenue from paid ticket orders
    supabase
      .from("ticket_orders")
      .select("total_amount")
      .eq("payment_status", "paid"),
    // Revenue from paid reservations (prepayment_amount where prepayment_status = 'paid' or payment_status = 'paid')
    supabase
      .from("reservations")
      .select("prepayment_amount, payment_status, prepayment_status")
      .or("prepayment_status.eq.paid,payment_status.eq.paid"),
    // Recent ticket orders for recent orders display
    supabase
      .from("ticket_orders")
      .select("id, order_number, customer_name, total_amount, status, created_at, events(title)")
      .order("created_at", { ascending: false })
      .limit(5),
    // Ticket orders for monthly revenue (last 1000 paid orders)
    supabase
      .from("ticket_orders")
      .select("total_amount, created_at, payment_status")
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(1000),
    // Reservations for monthly revenue (last 1000 paid reservations)
    supabase
      .from("reservations")
      .select("prepayment_amount, created_at, prepayment_status, payment_status")
      .or("prepayment_status.eq.paid,payment_status.eq.paid")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const totalOrders = ticketOrdersResult.count || 0;
  const totalReservations = reservationsResult.count || 0;
  
  // Calculate total revenue from ticket orders
  const ticketRevenue = ticketRevenueResult.data?.reduce(
    (sum, order) => sum + (parseFloat(order.total_amount?.toString() || "0") || 0), 
    0
  ) || 0;
  
  // Calculate total revenue from reservations (prepayment_amount)
  const reservationRevenue = reservationRevenueResult.data?.reduce(
    (sum, res) => sum + (parseFloat(res.prepayment_amount?.toString() || "0") || 0), 
    0
  ) || 0;
  
  const totalRevenue = ticketRevenue + reservationRevenue;
  
  // Format recent orders for display (ticket orders)
  const recentOrders = (recentTicketOrdersResult.data || []).map((order) => ({
    id: order.id,
    order_number: order.order_number,
    customer_name: order.customer_name,
    total_amount: parseFloat(order.total_amount?.toString() || "0"),
    status: order.status,
    placed_at: order.created_at,
    type: "ticket",
    event_title: (Array.isArray(order.events) && order.events.length > 0) ? order.events[0].title : (order.events as any)?.title || null,
  }));
  
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
    
    // Filter ticket orders for this month
    const monthTicketOrders = monthlyTicketDataResult.data?.filter((order) => {
      if (!order.created_at) return false;
      const orderDateUTC = parseISO(order.created_at);
      if (isNaN(orderDateUTC.getTime())) return false;
      // Compare UTC timestamps
      return orderDateUTC >= parseISO(monthStartUTC) && orderDateUTC <= parseISO(monthEndUTC);
    }) || [];
    
    // Filter reservations for this month
    const monthReservations = monthlyReservationDataResult.data?.filter((res) => {
      if (!res.created_at) return false;
      const resDateUTC = parseISO(res.created_at);
      if (isNaN(resDateUTC.getTime())) return false;
      // Compare UTC timestamps
      return resDateUTC >= parseISO(monthStartUTC) && resDateUTC <= parseISO(monthEndUTC);
    }) || [];
    
    // Sum ticket revenue
    const ticketRevenue = monthTicketOrders.reduce(
      (sum, order) => sum + (parseFloat(order.total_amount?.toString() || "0") || 0), 
      0
    );
    
    // Sum reservation revenue (prepayment_amount)
    const resRevenue = monthReservations.reduce(
      (sum, res) => sum + (parseFloat(res.prepayment_amount?.toString() || "0") || 0), 
      0
    );
    
    return ticketRevenue + resRevenue;
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

