"use client";

import { useState, useEffect } from "react";

export const use_elapsed_time = (start_time: string | null) => {
  const [elapsed_seconds, set_elapsed_seconds] = useState<number>(0);

  useEffect(() => {
    if (!start_time) {
      set_elapsed_seconds(0);
      return;
    }

    const calculate_elapsed = () => {
      const start = new Date(start_time).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      set_elapsed_seconds(Math.max(0, diff));
    };

    calculate_elapsed();
    const interval = setInterval(calculate_elapsed, 1000);

    return () => clearInterval(interval);
  }, [start_time]);

  return elapsed_seconds;
};

export const format_elapsed_time = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remaining_seconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remaining_seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining_minutes = minutes % 60;
  return `${hours}h ${remaining_minutes}m`;
};

export const format_duration = (seconds: number | null): string => {
  if (seconds === null) return "-";
  return format_elapsed_time(Math.round(seconds));
};
