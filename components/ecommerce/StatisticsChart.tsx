"use client";
import React, { useState, useMemo } from "react";
// import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ChartTab, { PeriodType } from "../common/ChartTab";
import dynamic from "next/dynamic";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface StatisticsChartProps {
  monthlyRevenue?: number[];
}

export default function StatisticsChart({ monthlyRevenue }: StatisticsChartProps) {
  const [period, setPeriod] = useState<PeriodType>("monthly");

  const baseRevenueData = monthlyRevenue || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  
  // Process data based on selected period
  const { categories, revenueData, ordersData } = useMemo(() => {
    if (period === "monthly") {
      const orders = baseRevenueData.map((revenue) => Math.floor(revenue / 50));
      return {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        revenueData: baseRevenueData,
        ordersData: orders,
      };
    } else if (period === "quarterly") {
      // Aggregate into quarters: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
      const q1 = baseRevenueData.slice(0, 3).reduce((sum, val) => sum + val, 0);
      const q2 = baseRevenueData.slice(3, 6).reduce((sum, val) => sum + val, 0);
      const q3 = baseRevenueData.slice(6, 9).reduce((sum, val) => sum + val, 0);
      const q4 = baseRevenueData.slice(9, 12).reduce((sum, val) => sum + val, 0);
      const quarterlyRevenue = [q1, q2, q3, q4];
      const quarterlyOrders = quarterlyRevenue.map((revenue) => Math.floor(revenue / 50));
      return {
        categories: ["Q1", "Q2", "Q3", "Q4"],
        revenueData: quarterlyRevenue,
        ordersData: quarterlyOrders,
      };
    } else {
      // Annually - sum all months
      const annualRevenue = baseRevenueData.reduce((sum, val) => sum + val, 0);
      const annualOrders = Math.floor(annualRevenue / 50);
      return {
        categories: ["Year"],
        revenueData: [annualRevenue],
        ordersData: [annualOrders],
      };
    }
  }, [period, baseRevenueData]);

  const options: ApexOptions = useMemo(() => ({
    legend: {
      show: false, // Hide legend
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#465FFF", "#9CB9FF"], // Define line colors
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line", // Set the chart type to 'line'
      toolbar: {
        show: false, // Hide chart toolbar
      },
    },
    stroke: {
      curve: "straight", // Define the line style (straight, smooth, or step)
      width: [2, 2], // Line width for each dataset
    },

    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0, // Size of the marker points
      strokeColors: "#fff", // Marker border color
      strokeWidth: 2,
      hover: {
        size: 6, // Marker size on hover
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false, // Hide grid lines on x-axis
        },
      },
      yaxis: {
        lines: {
          show: true, // Show grid lines on y-axis
        },
      },
    },
    dataLabels: {
      enabled: false, // Disable data labels
    },
    tooltip: {
      enabled: true, // Enable tooltip
      x: {
        format: "dd MMM yyyy", // Format for x-axis tooltip
      },
    },
    xaxis: {
      type: "category", // Category-based x-axis
      categories: categories,
      axisBorder: {
        show: false, // Hide x-axis border
      },
      axisTicks: {
        show: false, // Hide x-axis ticks
      },
      tooltip: {
        enabled: false, // Disable tooltip for x-axis points
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px", // Adjust font size for y-axis labels
          colors: ["#6B7280"], // Color of the labels
        },
      },
      title: {
        text: "", // Remove y-axis title
        style: {
          fontSize: "0px",
        },
      },
    },
  }), [categories]);

  const series = [
    {
      name: "Orders",
      data: ordersData,
    },
    {
      name: "Revenue",
      data: revenueData,
    },
  ];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Target you’ve set for each month
          </p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          <ChartTab onChange={setPeriod} defaultPeriod={period} />
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <ReactApexChart
            options={options}
            series={series}
            type="area"
            height={310}
          />
        </div>
      </div>
    </div>
  );
}
