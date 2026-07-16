/**
 * Performance budgets for critical routes.
 * Used to track and enforce latency targets.
 */

export interface PerformanceBudget {
  route: string;
  /** Maximum time to first contentful paint (auth + shell) in ms */
  shellBudgetMs: number;
  /** Maximum time to meaningful content visible in ms */
  contentBudgetMs: number;
  /** Maximum API request count on initial load */
  requestBudgetCount: number;
  /** Expected range for auth refresh time */
  authRefreshBudgetMs: { min: number; max: number };
  /** Expected range for data queries time */
  dataBudgetMs: { min: number; max: number };
}

export const PERFORMANCE_BUDGETS: Record<string, PerformanceBudget> = {
  "/inbox": {
    route: "/inbox",
    shellBudgetMs: 2000, // Auth + shell should paint within 2s
    contentBudgetMs: 8000, // Conversation list should be visible within 8s
    requestBudgetCount: 5, // auth, conversations, unread-count, teams, tags max
    authRefreshBudgetMs: { min: 1000, max: 7000 },
    dataBudgetMs: { min: 3000, max: 8000 },
  },
  "/analytics": {
    route: "/analytics",
    shellBudgetMs: 2000,
    contentBudgetMs: 5000, // Analytics should show within 5s due to SWR cache
    requestBudgetCount: 3, // auth, refresh, analytics overview
    authRefreshBudgetMs: { min: 1000, max: 7000 },
    dataBudgetMs: { min: 2000, max: 3000 }, // Cached response should be fast
  },
  "/feedback": {
    route: "/feedback",
    shellBudgetMs: 2000,
    contentBudgetMs: 8000, // Feedback data can take time
    requestBudgetCount: 6, // auth, feedback data, teams, users, notifications
    authRefreshBudgetMs: { min: 1000, max: 7000 },
    dataBudgetMs: { min: 3000, max: 8000 },
  },
};

export interface PerformanceMetrics {
  route: string;
  timestamp: string;
  navigationStarted: number;
  shellPainted?: number; // Time until app shell is visible
  contentVisible?: number; // Time until meaningful content is visible
  navigationComplete: number;
  totalDurationMs: number;
  requestMetrics: {
    count: number;
    byEndpoint: Record<string, { count: number; totalDurationMs: number }>;
    authRefreshDurationMs?: number;
    dataTotalDurationMs?: number;
  };
  budgetStatus: {
    shellOnBudget: boolean;
    contentOnBudget: boolean;
    requestCountOnBudget: boolean;
    authRefreshOnBudget: boolean;
    dataBudgetOnBudget: boolean;
    overallOnBudget: boolean;
  };
  violations: string[];
}

export function capturePerformanceMetrics(
  route: string,
  navigationStartTime: number,
  resourceMetrics: Array<{ url: string; duration: number; startTime: number }>,
  shellPaintTime?: number,
  contentVisibleTime?: number
): PerformanceMetrics {
  const budget = PERFORMANCE_BUDGETS[route];
  const navigationComplete = performance.now();
  const totalDurationMs = navigationComplete - navigationStartTime;

  // Calculate request metrics
  let authRefreshDuration = 0;
  let dataTotalDuration = 0;
  const byEndpoint: Record<string, { count: number; totalDurationMs: number }> =
    {};

  for (const metric of resourceMetrics) {
    const endpoint = metric.url.split("/").slice(-1)[0];

    if (!byEndpoint[endpoint]) {
      byEndpoint[endpoint] = { count: 0, totalDurationMs: 0 };
    }
    byEndpoint[endpoint].count += 1;
    byEndpoint[endpoint].totalDurationMs += metric.duration;

    if (endpoint === "refresh" || endpoint.includes("auth")) {
      authRefreshDuration = Math.max(authRefreshDuration, metric.duration);
    } else {
      dataTotalDuration += metric.duration;
    }
  }

  // Determine violations
  const violations: string[] = [];
  const shellOnBudget = !shellPaintTime || shellPaintTime <= budget.shellBudgetMs;
  const contentOnBudget =
    !contentVisibleTime || contentVisibleTime <= budget.contentBudgetMs;
  const requestCountOnBudget =
    resourceMetrics.length <= budget.requestBudgetCount;
  const authRefreshOnBudget =
    authRefreshDuration >= budget.authRefreshBudgetMs.min &&
    authRefreshDuration <= budget.authRefreshBudgetMs.max;
  const dataBudgetOnBudget =
    dataTotalDuration >= budget.dataBudgetMs.min &&
    dataTotalDuration <= budget.dataBudgetMs.max;

  if (!shellOnBudget) {
    violations.push(
      `Shell paint time ${shellPaintTime}ms exceeds budget ${budget.shellBudgetMs}ms`
    );
  }
  if (!contentOnBudget) {
    violations.push(
      `Content visible time ${contentVisibleTime}ms exceeds budget ${budget.contentBudgetMs}ms`
    );
  }
  if (!requestCountOnBudget) {
    violations.push(
      `Request count ${resourceMetrics.length} exceeds budget ${budget.requestBudgetCount}`
    );
  }
  if (!authRefreshOnBudget && authRefreshDuration > 0) {
    violations.push(
      `Auth refresh ${authRefreshDuration}ms outside budget [${budget.authRefreshBudgetMs.min}, ${budget.authRefreshBudgetMs.max}]ms`
    );
  }
  if (!dataBudgetOnBudget && dataTotalDuration > 0) {
    violations.push(
      `Data total ${dataTotalDuration}ms outside budget [${budget.dataBudgetMs.min}, ${budget.dataBudgetMs.max}]ms`
    );
  }

  return {
    route,
    timestamp: new Date().toISOString(),
    navigationStarted: navigationStartTime,
    shellPainted: shellPaintTime,
    contentVisible: contentVisibleTime,
    navigationComplete,
    totalDurationMs,
    requestMetrics: {
      count: resourceMetrics.length,
      byEndpoint,
      authRefreshDurationMs: authRefreshDuration,
      dataTotalDurationMs: dataTotalDuration,
    },
    budgetStatus: {
      shellOnBudget,
      contentOnBudget,
      requestCountOnBudget,
      authRefreshOnBudget,
      dataBudgetOnBudget,
      overallOnBudget:
        shellOnBudget &&
        contentOnBudget &&
        requestCountOnBudget &&
        authRefreshOnBudget &&
        dataBudgetOnBudget,
    },
    violations,
  };
}

export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  const logLevel = metrics.budgetStatus.overallOnBudget ? "info" : "warn";
  console.log(
    `[Performance] ${metrics.route} - Total: ${metrics.totalDurationMs.toFixed(0)}ms | Shell: ${metrics.shellPainted?.toFixed(0)}ms | Content: ${metrics.contentVisible?.toFixed(0)}ms | Requests: ${metrics.requestMetrics.count}`,
    {
      ...metrics,
      level: logLevel,
    }
  );

  if (metrics.violations.length > 0) {
    console.warn(
      `[Performance Budget Violations] ${metrics.route}:`,
      metrics.violations
    );
  }
}
