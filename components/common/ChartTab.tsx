import React, { useState } from "react";

export type PeriodType = "monthly" | "quarterly" | "annually";

interface ChartTabProps {
  onChange?: (period: PeriodType) => void;
  defaultPeriod?: PeriodType;
}

const ChartTab: React.FC<ChartTabProps> = ({ onChange, defaultPeriod = "monthly" }) => {
  const [selected, setSelected] = useState<PeriodType>(defaultPeriod);

  const getButtonClass = (option: PeriodType) =>
    selected === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  const handleClick = (period: PeriodType) => {
    setSelected(period);
    if (onChange) {
      onChange(period);
    }
  };

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        onClick={() => handleClick("monthly")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900   dark:hover:text-white ${getButtonClass(
          "monthly"
        )}`}
      >
        Monthly
      </button>

      <button
        onClick={() => handleClick("quarterly")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900   dark:hover:text-white ${getButtonClass(
          "quarterly"
        )}`}
      >
        Quarterly
      </button>

      <button
        onClick={() => handleClick("annually")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900   dark:hover:text-white ${getButtonClass(
          "annually"
        )}`}
      >
        Annually
      </button>
    </div>
  );
};

export default ChartTab;
