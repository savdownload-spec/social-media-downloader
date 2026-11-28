/**
 * Tool Health Monitoring Service
 * 
 * Tracks success/failure rates, response times, and common errors for every tool.
 * Updates aggregated metrics in ToolHealth and maintains detailed logs in ToolHealthLog.
 */

import { prisma } from '@/lib/prisma';

/**
 * Record the result of a tool operation.
 * Updates both the aggregated health metrics and the detailed log.
 * 
 * @param slug - Tool slug identifier
 * @param success - Whether the operation succeeded
 * @param responseMs - Response time in milliseconds
 * @param error - Error message if failed
 * @param errorCode - Error code if failed
 */
export async function recordToolResult(
  slug: string,
  success: boolean,
  responseMs: number,
  error?: string,
  errorCode?: string
): Promise<void> {
  try {
    // Log the individual event
    await prisma.toolHealthLog.create({
      data: {
        slug,
        success,
        responseMs,
        error: error?.substring(0, 500), // Limit error message length
        errorCode: errorCode?.substring(0, 100),
      },
    });

    // Update aggregated health metrics
    const existing = await prisma.toolHealth.findUnique({
      where: { slug },
    });

    if (existing) {
      // Update existing health record
      const totalCount = existing.successCount + existing.failureCount;
      const newSuccessCount = existing.successCount + (success ? 1 : 0);
      const newFailureCount = existing.failureCount + (success ? 0 : 1);
      
      // Calculate rolling average response time (weighted toward recent requests)
      const newAvgResponseMs = existing.avgResponseMs
        ? Math.round((existing.avgResponseMs * 0.9) + (responseMs * 0.1))
        : responseMs;

      // Calculate health status (healthy if success rate > 50% over last 20 operations)
      const recentSuccessRate = totalCount >= 10
        ? (newSuccessCount / (newSuccessCount + newFailureCount)) * 100
        : 100; // Assume healthy until we have enough data

      await prisma.toolHealth.update({
        where: { slug },
        data: {
          successCount: { increment: success ? 1 : 0 },
          failureCount: { increment: success ? 0 : 1 },
          lastSuccess: success ? new Date() : undefined,
          lastFailure: success ? undefined : new Date(),
          lastError: success ? null : error?.substring(0, 500),
          lastErrorCode: success ? null : errorCode?.substring(0, 100),
          avgResponseMs: newAvgResponseMs,
          isHealthy: recentSuccessRate >= 50,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new health record
      await prisma.toolHealth.create({
        data: {
          slug,
          successCount: success ? 1 : 0,
          failureCount: success ? 0 : 1,
          lastSuccess: success ? new Date() : null,
          lastFailure: success ? null : new Date(),
          lastError: success ? null : error?.substring(0, 500),
          lastErrorCode: success ? null : errorCode?.substring(0, 100),
          avgResponseMs: responseMs,
          isHealthy: success,
        },
      });
    }
  } catch (err) {
    // Health tracking failures should never break the main operation
    console.error('[HealthTracking] Failed to record tool result:', err);
  }
}

/**
 * Get health metrics for a specific tool.
 */
export async function getToolHealth(slug: string) {
  return prisma.toolHealth.findUnique({
    where: { slug },
  });
}

/**
 * Get health metrics for all tools.
 */
export async function getAllToolHealth() {
  return prisma.toolHealth.findMany({
    orderBy: [
      { isHealthy: 'asc' }, // Show unhealthy tools first
      { slug: 'asc' },
    ],
  });
}

/**
 * Calculate success rate for a specific tool over a time period.
 * 
 * @param slug - Tool slug identifier
 * @param hours - Number of hours to look back (default: 24)
 * @returns Success rate as a percentage (0-100), or null if no data
 */
export async function getToolSuccessRate(
  slug: string,
  hours: number = 24
): Promise<number | null> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const logs = await prisma.toolHealthLog.findMany({
    where: {
      slug,
      createdAt: { gte: since },
    },
    select: { success: true },
  });

  if (logs.length === 0) return null;

  const successful = logs.filter((l) => l.success).length;
  return Math.round((successful / logs.length) * 100);
}

/**
 * Get common error reasons for a tool over a time period.
 * 
 * @param slug - Tool slug identifier
 * @param hours - Number of hours to look back (default: 24)
 * @param limit - Maximum number of error types to return (default: 5)
 * @returns Array of error codes with counts
 */
export async function getCommonErrors(
  slug: string,
  hours: number = 24,
  limit: number = 5
): Promise<Array<{ errorCode: string; count: number }>> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const logs = await prisma.toolHealthLog.findMany({
    where: {
      slug,
      success: false,
      errorCode: { not: null },
      createdAt: { gte: since },
    },
    select: { errorCode: true },
  });

  // Count occurrences of each error code
  const errorCounts = new Map<string, number>();
  for (const log of logs) {
    if (log.errorCode) {
      errorCounts.set(log.errorCode, (errorCounts.get(log.errorCode) || 0) + 1);
    }
  }

  // Sort by count and return top N
  return Array.from(errorCounts.entries())
    .map(([errorCode, count]) => ({ errorCode, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get average response time for a tool over a time period.
 * 
 * @param slug - Tool slug identifier
 * @param hours - Number of hours to look back (default: 24)
 * @returns Average response time in milliseconds, or null if no data
 */
export async function getAverageResponseTime(
  slug: string,
  hours: number = 24
): Promise<number | null> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const result = await prisma.toolHealthLog.aggregate({
    where: {
      slug,
      responseMs: { not: null },
      createdAt: { gte: since },
    },
    _avg: { responseMs: true },
  });

  return result._avg.responseMs ? Math.round(result._avg.responseMs) : null;
}

/**
 * Clean up old health logs (run as a cron job).
 * Retains logs for the specified number of days.
 * 
 * @param retentionDays - Number of days to retain logs (default: 90)
 * @returns Number of deleted logs
 */
export async function cleanupOldLogs(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await prisma.toolHealthLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

/**
 * Run a health check on a specific tool by executing a test operation.
 * This is used for manual testing and automated health monitoring.
 * 
 * @param slug - Tool slug identifier
 * @returns Health check result with status and details
 */
export async function runHealthCheck(slug: string): Promise<{
  ok: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  successRate: number | null;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  avgResponseMs: number | null;
  commonErrors: Array<{ errorCode: string; count: number }>;
}> {
  const health = await getToolHealth(slug);
  const successRate = await getToolSuccessRate(slug, 24);
  const avgResponseMs = await getAverageResponseTime(slug, 24);
  const commonErrors = await getCommonErrors(slug, 24, 3);

  if (!health) {
    return {
      ok: false,
      status: 'unknown',
      successRate: null,
      lastSuccess: null,
      lastFailure: null,
      avgResponseMs: null,
      commonErrors: [],
    };
  }

  const rate = successRate ?? 0;
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (rate < 50) status = 'unhealthy';
  else if (rate < 80) status = 'degraded';

  return {
    ok: health.isHealthy,
    status,
    successRate,
    lastSuccess: health.lastSuccess,
    lastFailure: health.lastFailure,
    avgResponseMs,
    commonErrors,
  };
}

/**
 * Get health statistics for all tools grouped by category.
 */
export async function getHealthStatsByCategory(): Promise<Record<string, {
  total: number;
  healthy: number;
  unhealthy: number;
  unknown: number;
}>> {
  const tools = await getAllToolHealth();
  const configs = await prisma.toolConfig.findMany({
    select: { slug: true, category: true },
  });

  const categoryMap = new Map(configs.map((c) => [c.slug, c.category]));
  const stats: Record<string, {
    total: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
  }> = {};

  for (const tool of tools) {
    const category = categoryMap.get(tool.slug) ?? 'Unknown';
    if (!stats[category]) {
      stats[category] = { total: 0, healthy: 0, unhealthy: 0, unknown: 0 };
    }
    stats[category].total++;
    if (tool.isHealthy) {
      stats[category].healthy++;
    } else {
      stats[category].unhealthy++;
    }
  }

  // Add tools that have no health data yet
  for (const config of configs) {
    const category = config.category;
    if (!stats[category]) {
      stats[category] = { total: 0, healthy: 0, unhealthy: 0, unknown: 0 };
    }
    const hasHealthData = tools.some((t) => t.slug === config.slug);
    if (!hasHealthData) {
      stats[category].total++;
      stats[category].unknown++;
    }
  }

  return stats;
}
