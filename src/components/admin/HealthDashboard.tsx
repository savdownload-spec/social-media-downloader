'use client';

import { useState } from 'react';
import { Search, AlertCircle, CheckCircle2, AlertTriangle, HelpCircle, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import type { CatalogTool } from '@/config/catalog';

type HealthData = {
  id: string;
  slug: string;
  successCount: number;
  failureCount: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  lastError: string | null;
  lastErrorCode: string | null;
  avgResponseMs: number | null;
  isHealthy: boolean;
  successRate24h: number | null;
  commonErrors: Array<{ errorCode: string; count: number }>;
  tool: CatalogTool | undefined;
  config: { name: string; category: string; status: string } | null;
};

type UntestedTool = {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
};

type CategoryStats = Record<string, {
  total: number;
  healthy: number;
  unhealthy: number;
  unknown: number;
}>;

type Props = {
  healthData: HealthData[];
  untestedTools: UntestedTool[];
  categoryStats: CategoryStats;
};

export function HealthDashboard({ healthData, untestedTools, categoryStats }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Calculate overall stats
  const totalTools = healthData.length + untestedTools.length;
  const healthyTools = healthData.filter((h) => h.isHealthy).length;
  const unhealthyTools = healthData.filter((h) => !h.isHealthy).length;
  const untestedCount = untestedTools.length;

  // Filter tools
  const filteredHealthData = healthData.filter((tool) => {
    const matchesSearch =
      tool.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.config?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === 'all' || tool.config?.category === selectedCategory;
    
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'healthy' && tool.isHealthy) ||
      (selectedStatus === 'unhealthy' && !tool.isHealthy);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredUntestedTools = untestedTools.filter((tool) => {
    const matchesSearch =
      tool.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === 'all' || tool.category === selectedCategory;
    
    const matchesStatus = selectedStatus === 'all' || selectedStatus === 'untested';
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = ['all', ...Object.keys(categoryStats).sort()];

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tool Health Monitor</h1>
        <p className="text-text-muted">Real-time monitoring of tool operational status and performance</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Tools"
          value={totalTools}
          icon={<RefreshCw className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Healthy"
          value={healthyTools}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Unhealthy"
          value={unhealthyTools}
          icon={<AlertCircle className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Untested"
          value={untestedCount}
          icon={<HelpCircle className="w-5 h-5" />}
          color="gray"
        />
      </div>

      {/* Category Overview */}
      <div className="mb-8 p-6 bg-white dark:bg-card border border-border rounded-lg shadow-soft">
        <h2 className="text-lg font-semibold mb-4">Status by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(categoryStats).map(([category, stats]) => (
            <CategoryCard key={category} category={category} stats={stats} />
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="healthy">Healthy</option>
          <option value="unhealthy">Unhealthy</option>
          <option value="untested">Untested</option>
        </select>
      </div>

      {/* Tool List */}
      <div className="space-y-4">
        {filteredHealthData.map((health) => (
          <ToolHealthCard key={health.id} health={health} />
        ))}
        
        {filteredUntestedTools.map((tool) => (
          <UntestedToolCard key={tool.id} tool={tool} />
        ))}
        
        {filteredHealthData.length === 0 && filteredUntestedTools.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No tools match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  };

  return (
    <div className="p-6 bg-white dark:bg-card border border-border rounded-lg shadow-soft">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-muted">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function CategoryCard({
  category,
  stats,
}: {
  category: string;
  stats: { total: number; healthy: number; unhealthy: number; unknown: number };
}) {
  const healthyPercent = stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0;

  return (
    <div className="p-4 border border-border rounded-lg">
      <h3 className="font-semibold mb-2">{category}</h3>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">{stats.total} tools</span>
        <span className="text-green-600 dark:text-green-400">●</span>
        <span>{stats.healthy} healthy</span>
        {stats.unhealthy > 0 && (
          <>
            <span className="text-red-600 dark:text-red-400">●</span>
            <span>{stats.unhealthy} unhealthy</span>
          </>
        )}
        {stats.unknown > 0 && (
          <>
            <span className="text-gray-400">●</span>
            <span>{stats.unknown} untested</span>
          </>
        )}
      </div>
      <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all"
          style={{ width: `${healthyPercent}%` }}
        />
      </div>
    </div>
  );
}

function ToolHealthCard({ health }: { health: HealthData }) {
  const totalOperations = health.successCount + health.failureCount;
  const successRate = health.successRate24h ?? 0;

  return (
    <div className="p-6 bg-white dark:bg-card border border-border rounded-lg shadow-soft">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold">{health.config?.name ?? health.slug}</h3>
            <StatusBadge
              isHealthy={health.isHealthy}
              successRate={successRate}
            />
            <span className="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {health.config?.category}
            </span>
          </div>
          <p className="text-sm text-text-muted">{health.slug}</p>
        </div>

        {health.avgResponseMs && (
          <div className="text-right">
            <p className="text-sm text-text-muted">Avg Response</p>
            <p className="text-lg font-semibold">{health.avgResponseMs}ms</p>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-text-muted">24h Success Rate</p>
          <p className="text-lg font-semibold flex items-center gap-1">
            {successRate.toFixed(1)}%
            {successRate >= 80 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Total Operations</p>
          <p className="text-lg font-semibold">{totalOperations.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Successes</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            {health.successCount.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Failures</p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            {health.failureCount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Timestamps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-text-muted">Last Success</p>
          <p className="font-medium">
            {health.lastSuccess
              ? new Date(health.lastSuccess).toLocaleString()
              : 'Never'}
          </p>
        </div>
        <div>
          <p className="text-text-muted">Last Failure</p>
          <p className="font-medium">
            {health.lastFailure
              ? new Date(health.lastFailure).toLocaleString()
              : 'Never'}
          </p>
        </div>
      </div>

      {/* Common Errors */}
      {health.commonErrors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Common Errors (24h)
          </p>
          <div className="space-y-1">
            {health.commonErrors.map((error) => (
              <div key={error.errorCode} className="flex items-center justify-between text-sm">
                <code className="text-red-600 dark:text-red-400">{error.errorCode}</code>
                <span className="text-red-600 dark:text-red-400">{error.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Error */}
      {health.lastError && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Last Error: {health.lastErrorCode}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {health.lastError}
          </p>
        </div>
      )}
    </div>
  );
}

function UntestedToolCard({ tool }: { tool: UntestedTool }) {
  return (
    <div className="p-6 bg-white dark:bg-card border border-border rounded-lg shadow-soft opacity-60">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold">{tool.name}</h3>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              Untested
            </span>
            <span className="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {tool.category}
            </span>
          </div>
          <p className="text-sm text-text-muted">{tool.slug}</p>
        </div>
        <HelpCircle className="w-8 h-8 text-gray-400" />
      </div>
      <p className="mt-3 text-sm text-text-muted">
        No health data available. This tool has not been executed since health monitoring was enabled.
      </p>
    </div>
  );
}

function StatusBadge({
  isHealthy,
  successRate,
}: {
  isHealthy: boolean;
  successRate: number;
}) {
  if (successRate >= 80) {
    return (
      <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
        <CheckCircle2 className="w-3 h-3" />
        Healthy
      </span>
    );
  }

  if (successRate >= 50) {
    return (
      <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
        <AlertTriangle className="w-3 h-3" />
        Degraded
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
      <AlertCircle className="w-3 h-3" />
      Unhealthy
    </span>
  );
}
