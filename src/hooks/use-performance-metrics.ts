/**
 * Hook to automatically capture and log performance metrics for a route.
 * Measures: shell paint time, content visible time, request counts, auth latency.
 *
 * DEVELOPMENT ONLY: This hook logs only in process.env.NODE_ENV === 'development'
 * to avoid console logging in production. Use the staging smoke test runner
 * instead for production validation.
 */

import { useEffect, useRef } from "react";
import {
  capturePerformanceMetrics,
  logPerformanceMetrics,
  PerformanceMetrics,
} from "@/lib/performance-budgets";

export interface UsePerformanceMetricsOptions {
  route: string;
  /** Selector to detect when shell is painted (e.g. header, banner) */
  shellSelector?: string;
  /** Selector to detect when main content is visible (e.g. main, list items) */
  contentSelector?: string;
  /** Enable logging to console (only effective in development) */
  enableLogging?: boolean;
  /** Callback when metrics are captured */
  onMetricsCaptured?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMetrics(
  options: UsePerformanceMetricsOptions
): void {
  const {
    route,
    shellSelector = "header, banner, [role='banner']",
    contentSelector = "main",
    enableLogging = true,
    onMetricsCaptured,
  } = options;

  const metricsRef = useRef<PerformanceMetrics | null>(null);
  const navigationStartRef = useRef<number>(0);
  const isDev = typeof window !== "undefined" &&
    process.env.NODE_ENV === "development";

  useEffect(() => {
    // Start timing
    navigationStartRef.current = performance.now();

    // Function to capture metrics
    const captureMetrics = () => {
      // Get shell paint time
      let shellPaintTime: number | undefined;
      if (shellSelector) {
        const shellElem = document.querySelector(shellSelector);
        if (shellElem) {
          const rect = shellElem.getBoundingClientRect();
          // If visible, estimate paint time as distance to first paint
          if (rect.height > 0) {
            shellPaintTime =
              performance.now() - navigationStartRef.current;
          }
        }
      }

      // Get content visible time
      let contentVisibleTime: number | undefined;
      if (contentSelector) {
        const contentElem = document.querySelector(contentSelector);
        if (contentElem) {
          const text = contentElem.textContent || "";
          // If content has meaningful text
          if (text.trim().length > 50) {
            contentVisibleTime =
              performance.now() - navigationStartRef.current;
          }
        }
      }

      // Get all backend requests
      const resourceMetrics = performance
        .getEntriesByType("resource")
        .filter(
          (e): e is PerformanceResourceTiming =>
            typeof e.name === "string" &&
            e.name.includes("omnicore-backend") &&
            e.duration > 0
        )
        .map((e) => ({
          url: e.name,
          duration: e.duration,
          startTime: e.startTime,
        }));

      // Capture metrics
      const metrics = capturePerformanceMetrics(
        route,
        navigationStartRef.current,
        resourceMetrics,
        shellPaintTime,
        contentVisibleTime
      );

      metricsRef.current = metrics;

      // Only log in development mode
      if (isDev && enableLogging) {
        logPerformanceMetrics(metrics);
      }

      if (onMetricsCaptured) {
        onMetricsCaptured(metrics);
      }
    };

    // Capture after content settles (2 seconds after navigation)
    const timer = setTimeout(captureMetrics, 2000);

    return () => clearTimeout(timer);
  }, [route, shellSelector, contentSelector, enableLogging, onMetricsCaptured, isDev]);
}
