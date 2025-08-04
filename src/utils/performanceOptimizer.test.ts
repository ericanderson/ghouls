import { describe, it, expect } from 'vitest';
import { 
  optimizePRFetchStrategy, 
  estimateMemoryUsage, 
  createProcessingPlan,
  getPerformanceRecommendations,
  DEFAULT_PERFORMANCE_CONFIG 
} from './performanceOptimizer.js';

describe('performanceOptimizer', () => {
  describe('optimizePRFetchStrategy', () => {
    it('should use standard strategy for small datasets', () => {
      const result = optimizePRFetchStrategy(25);
      
      expect(result.shouldOptimize).toBe(false);
      expect(result.strategy).toBe('standard');
      expect(result.recommendedLimit).toBeUndefined();
    });

    it('should use batched strategy for medium datasets', () => {
      const result = optimizePRFetchStrategy(100);
      
      expect(result.shouldOptimize).toBe(true);
      expect(result.strategy).toBe('batched');
      expect(result.recommendedLimit).toBe(500);
    });

    it('should use limited strategy for large datasets', () => {
      const result = optimizePRFetchStrategy(300);
      
      expect(result.shouldOptimize).toBe(true);
      expect(result.strategy).toBe('limited-with-batching');
      expect(result.recommendedLimit).toBe(1000);
    });

    it('should respect custom PR fetch limit', () => {
      const config = { ...DEFAULT_PERFORMANCE_CONFIG, prFetchLimit: 500 };
      const result = optimizePRFetchStrategy(300, config);
      
      expect(result.recommendedLimit).toBe(500);
    });
  });

  describe('estimateMemoryUsage', () => {
    it('should calculate memory usage for small datasets', () => {
      const result = estimateMemoryUsage(50, 100);
      
      expect(result.estimatedMB).toBeGreaterThan(0);
      expect(result.recommendation).toBe('optimal');
    });

    it('should recommend high-memory mode for larger datasets', () => {
      const result = estimateMemoryUsage(200, 500);
      
      expect(result.recommendation).toBe('high-memory');
      expect(result.estimatedMB).toBeGreaterThan(1);
    });

    it('should recommend memory-constrained mode for very large datasets', () => {
      const result = estimateMemoryUsage(1000, 2000);
      
      expect(result.recommendation).toBe('memory-constrained');
      expect(result.estimatedMB).toBeGreaterThan(10);
    });
  });

  describe('createProcessingPlan', () => {
    it('should create optimal plan for small datasets', () => {
      const plan = createProcessingPlan(30);
      
      expect(plan.batchSize).toBe(DEFAULT_PERFORMANCE_CONFIG.batchSize);
      expect(plan.enableStreaming).toBe(false);
      expect(plan.limitPRFetch).toBe(false);
      expect(plan.memoryOptimized).toBe(false);
    });

    it('should create optimized plan for medium datasets', () => {
      const plan = createProcessingPlan(150);
      
      expect(plan.enableStreaming).toBe(true);
      expect(plan.limitPRFetch).toBe(true);
      expect(plan.prFetchLimit).toBe(500);
    });

    it('should create memory-optimized plan for large datasets', () => {
      const plan = createProcessingPlan(600);
      
      expect(plan.batchSize).toBeGreaterThan(DEFAULT_PERFORMANCE_CONFIG.batchSize);
      expect(plan.enableStreaming).toBe(true);
      expect(plan.limitPRFetch).toBe(true);
      expect(plan.memoryOptimized).toBe(true);
    });

    it('should estimate reasonable processing duration', () => {
      const planSmall = createProcessingPlan(50);
      const planLarge = createProcessingPlan(500);
      
      expect(planSmall.estimatedDuration).toContain('seconds');
      expect(planLarge.estimatedDuration).toMatch(/(seconds|minutes)/);
    });
  });

  describe('getPerformanceRecommendations', () => {
    it('should provide no recommendations for small datasets', () => {
      const recommendations = getPerformanceRecommendations(50);
      expect(recommendations).toHaveLength(0);
    });

    it('should provide basic recommendations for medium datasets', () => {
      const recommendations = getPerformanceRecommendations(150);
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toContain('Large dataset detected');
    });

    it('should provide enhanced recommendations for large datasets', () => {
      const recommendations = getPerformanceRecommendations(400);
      expect(recommendations.length).toBeGreaterThan(2);
      expect(recommendations.some(r => r.includes('search/filtering'))).toBe(true);
      expect(recommendations.some(r => r.includes('--force flag'))).toBe(true);
    });

    it('should provide comprehensive recommendations for very large datasets', () => {
      const recommendations = getPerformanceRecommendations(1200);
      expect(recommendations.length).toBeGreaterThan(4);
      expect(recommendations.some(r => r.includes('Very large repository'))).toBe(true);
      expect(recommendations.some(r => r.includes('git cleanup'))).toBe(true);
    });
  });
});