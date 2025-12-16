"use client";

import React from "react";
import Select from "@/components/form/Select";

interface StatusFilterProps {
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  onFilterChange?: (value: string) => void;
  currentValue?: string;
}

export default function StatusFilter({
  options,
  placeholder = "Filter by status",
  className = "w-48",
  onFilterChange,
  currentValue,
}: StatusFilterProps) {
  const handleChange = (value: string) => {
    if (onFilterChange) {
      onFilterChange(value);
    }
  };

  return (
    <Select
      placeholder={placeholder}
      className={className}
      options={options}
      onChange={handleChange}
      value={currentValue}
      defaultValue={currentValue}
    />
  );
}

