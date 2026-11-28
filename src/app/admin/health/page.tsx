import { Metadata } from 'next';
import { getAllToolHealth, getToolSuccessRate, getCommonErrors, getHealthStatsByCategory } from '@/lib/healthTracking';
import { getCatalogTool } from '@/config/catalog';
import { prisma } from '@/lib/prisma';
import { HealthDashboard } from '@/components/admin/HealthDashboard';

export const metadata: Metadata = {
  title: 'Tool Health Monitor | Admin',
  robots: 'noindex',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ToolHealthPage() {
  // Fetch health data
  const healthData = await getAllToolHealth();
  const categoryStats = await getHealthStatsByCategory();
  
  // Enrich with success rates and tool metadata
  const enrichedHealthData = await Promise.all(
    healthData.map(async (health) => {
      const [successRate24h, commonErrors, toolConfig] = await Promise.all([
        getToolSuccessRate(health.slug, 24),
        getCommonErrors(health.slug, 24, 3),
        prisma.toolConfig.findUnique({
          where: { slug: health.slug },
          select: { name: true, category: true, status: true },
        }),
      ]);
      
      const catalogTool = getCatalogTool(health.slug);
      
      return {
        ...health,
        successRate24h,
        commonErrors,
        tool: catalogTool,
        config: toolConfig,
      };
    })
  );

  // Get all tool configs to show tools with no health data
  const allConfigs = await prisma.toolConfig.findMany({
    orderBy: { slug: 'asc' },
  });

  // Find tools that don't have health data yet
  const untestedTools = allConfigs.filter(
    (config) => !healthData.some((h) => h.slug === config.slug)
  );

  return (
    <HealthDashboard
      healthData={enrichedHealthData}
      untestedTools={untestedTools}
      categoryStats={categoryStats}
    />
  );
}
