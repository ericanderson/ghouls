/**
 * Performance optimization utilities for handling large datasets
 */


export interface PerformanceConfig {
  batchSize: number;
  maxMemoryMB: number;
  enableProgressReporting: boolean;
  prFetchLimit?: number;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  batchSize: 50,
  maxMemoryMB: 256,
  enableProgressReporting: true,
  prFetchLimit: 1000 // Limit PR fetching to most recent 1000 PRs for very large repos
};

/**
 * Optimizes PR fetching strategy based on the number of local branches
 */
export function optimizePRFetchStrategy(
  localBranchCount: number,
  config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG
): { shouldOptimize: boolean; strategy: string; recommendedLimit?: number } {
  
  if (localBranchCount <= 50) {
    return {
      shouldOptimize: false,
      strategy: 'standard',
    };
  }

  if (localBranchCount <= 200) {
    return {
      shouldOptimize: true,
      strategy: 'batched',
      recommendedLimit: 500
    };
  }

  return {
    shouldOptimize: true,
    strategy: 'limited-with-batching',
    recommendedLimit: config.prFetchLimit || 1000
  };
}

/**
 * Estimates memory usage for branch processing
 */
export function estimateMemoryUsage(
  branchCount: number,
  prCount: number
): { estimatedMB: number; recommendation: string } {
  // Rough estimates based on typical object sizes
  const branchMemoryKB = branchCount * 2; // ~2KB per branch with metadata
  const prMemoryKB = prCount * 5; // ~5KB per PR object
  const totalMemoryMB = (branchMemoryKB + prMemoryKB) / 1024;

  let recommendation = 'optimal';
  if (totalMemoryMB > 2) {
    recommendation = 'high-memory';
  }
  if (totalMemoryMB > 10) {
    recommendation = 'memory-constrained';
  }

  return {
    estimatedMB: Math.round(totalMemoryMB),
    recommendation
  };
}

/**
 * Creates performance-optimized processing plan
 */
export interface ProcessingPlan {
  batchSize: number;
  enableStreaming: boolean;
  limitPRFetch: boolean;
  prFetchLimit?: number;
  memoryOptimized: boolean;
  estimatedDuration: string;
}

export function createProcessingPlan(
  branchCount: number,
  config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG
): ProcessingPlan {
  const prStrategy = optimizePRFetchStrategy(branchCount, config);
  const memoryEstimate = estimateMemoryUsage(branchCount, prStrategy.recommendedLimit || branchCount);

  // Dynamic batch sizing based on branch count
  let batchSize = config.batchSize;
  if (branchCount > 500) {
    batchSize = Math.min(100, Math.ceil(branchCount / 10));
  } else if (branchCount > 200) {
    batchSize = 75;
  }

  // Estimate processing duration (rough approximation)
  const estimatedSeconds = Math.ceil((branchCount * 0.1) + ((prStrategy.recommendedLimit || branchCount) * 0.05));
  const estimatedDuration = estimatedSeconds > 60 
    ? `${Math.ceil(estimatedSeconds / 60)} minutes`
    : `${estimatedSeconds} seconds`;

  return {
    batchSize,
    enableStreaming: branchCount > 100,
    limitPRFetch: prStrategy.shouldOptimize,
    prFetchLimit: prStrategy.recommendedLimit,
    memoryOptimized: memoryEstimate.recommendation !== 'optimal',
    estimatedDuration
  };
}

/**
 * Provides user-friendly recommendations for large datasets
 */
export function getPerformanceRecommendations(branchCount: number): string[] {
  const recommendations: string[] = [];

  if (branchCount > 100) {
    recommendations.push('📊 Large dataset detected - using optimized processing');
  }

  if (branchCount > 300) {
    recommendations.push('🔍 Consider using search/filtering to narrow down results');
    recommendations.push('⚡ Use --force flag to skip interactive mode for faster processing');
  }

  if (branchCount > 500) {
    recommendations.push('🏃 Processing may take a few minutes - progress will be shown');
    recommendations.push('💾 Limited PR fetching to most recent 1000 PRs for performance');
  }

  if (branchCount > 1000) {
    recommendations.push('🚀 Very large repository detected - consider running in off-peak hours');
    recommendations.push('📈 Consider using git cleanup commands first to reduce branch count');
  }

  return recommendations;
}