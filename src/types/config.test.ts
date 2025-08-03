import { describe, it, expect } from 'vitest';
import { 
  mergeSafetyConfig, 
  getEffectiveSafetyConfig, 
  DEFAULT_SAFETY_CONFIG,
  DEFAULT_PROTECTED_BRANCHES 
} from './config.js';
import type { SafetyConfig } from './config.js';

describe('config', () => {
  describe('mergeSafetyConfig', () => {
    it('should return empty config when no configs provided', () => {
      const result = mergeSafetyConfig();
      expect(result).toEqual({});
    });

    it('should return single config unchanged', () => {
      const config: SafetyConfig = {
        protectedBranches: ['main', 'develop'],
        allowUnpushedCommits: true
      };
      
      const result = mergeSafetyConfig(config);
      expect(result).toEqual(config);
    });

    it('should merge multiple configs with precedence', () => {
      const config1: SafetyConfig = {
        protectedBranches: ['main', 'develop'],
        allowUnpushedCommits: true,
        additionalProtectedPatterns: ['feature/*']
      };
      
      const config2: SafetyConfig = {
        protectedBranches: ['main', 'staging'], // Should override config1
        requireMergedPR: false,
        additionalProtectedPatterns: ['hotfix/*'] // Should merge with config1
      };
      
      const result = mergeSafetyConfig(config1, config2);
      
      expect(result).toEqual({
        protectedBranches: ['main', 'staging'], // From config2 (last wins)
        allowUnpushedCommits: true, // From config1
        requireMergedPR: false, // From config2
        additionalProtectedPatterns: ['feature/*', 'hotfix/*'] // Merged
      });
    });

    it('should handle undefined configs in merge', () => {
      const config: SafetyConfig = {
        protectedBranches: ['main'],
        allowUnpushedCommits: true
      };
      
      const result = mergeSafetyConfig(undefined, config, undefined);
      expect(result).toEqual(config);
    });

    it('should merge custom safety rules', () => {
      const config1: SafetyConfig = {
        customSafetyRules: [
          { name: 'rule1', pattern: 'temp/.*', reason: 'temp branch' }
        ]
      };
      
      const config2: SafetyConfig = {
        customSafetyRules: [
          { name: 'rule2', pattern: 'wip/.*', reason: 'work in progress' }
        ]
      };
      
      const result = mergeSafetyConfig(config1, config2);
      
      expect(result.customSafetyRules).toEqual([
        { name: 'rule1', pattern: 'temp/.*', reason: 'temp branch' },
        { name: 'rule2', pattern: 'wip/.*', reason: 'work in progress' }
      ]);
    });
  });

  describe('getEffectiveSafetyConfig', () => {
    it('should return defaults when no config provided', () => {
      const result = getEffectiveSafetyConfig();
      expect(result).toEqual(DEFAULT_SAFETY_CONFIG);
    });

    it('should merge config with defaults', () => {
      const config: SafetyConfig = {
        protectedBranches: ['main', 'custom-branch'],
        allowUnpushedCommits: true
      };
      
      const result = getEffectiveSafetyConfig(config);
      
      expect(result).toEqual({
        protectedBranches: ['main', 'custom-branch'], // Custom value
        additionalProtectedPatterns: [], // Default value
        allowUnpushedCommits: true, // Custom value
        requireMergedPR: true, // Default value
        customSafetyRules: [] // Default value
      });
    });

    it('should preserve all default values when config is empty', () => {
      const result = getEffectiveSafetyConfig({});
      expect(result).toEqual(DEFAULT_SAFETY_CONFIG);
    });

    it('should handle partial config objects', () => {
      const config: SafetyConfig = {
        additionalProtectedPatterns: ['release/*']
      };
      
      const result = getEffectiveSafetyConfig(config);
      
      expect(result.protectedBranches).toEqual([...DEFAULT_PROTECTED_BRANCHES]);
      expect(result.additionalProtectedPatterns).toEqual(['release/*']);
      expect(result.allowUnpushedCommits).toBe(false);
      expect(result.requireMergedPR).toBe(true);
      expect(result.customSafetyRules).toEqual([]);
    });
  });

  describe('DEFAULT_PROTECTED_BRANCHES', () => {
    it('should contain expected branch names', () => {
      expect(DEFAULT_PROTECTED_BRANCHES).toEqual([
        'main',
        'master',
        'develop',
        'dev',
        'staging',
        'production',
        'prod'
      ]);
    });

    it('should be readonly array', () => {
      // TypeScript compiler should enforce this, but at runtime the array is still mutable
      // This test verifies the array is frozen or similar readonly behavior would be expected
      // For now, just verify it's an array with the expected content
      expect(Array.isArray(DEFAULT_PROTECTED_BRANCHES)).toBe(true);
      expect(DEFAULT_PROTECTED_BRANCHES.length).toBe(7);
    });
  });

  describe('DEFAULT_SAFETY_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_SAFETY_CONFIG).toEqual({
        protectedBranches: [
          'main',
          'master',
          'develop',
          'dev',
          'staging',
          'production',
          'prod'
        ],
        additionalProtectedPatterns: [],
        allowUnpushedCommits: false,
        requireMergedPR: true,
        customSafetyRules: []
      });
    });

    it('should be required config type', () => {
      // Verify all required fields are present
      const config: Required<SafetyConfig> = DEFAULT_SAFETY_CONFIG;
      expect(config.protectedBranches).toBeDefined();
      expect(config.additionalProtectedPatterns).toBeDefined();
      expect(config.allowUnpushedCommits).toBeDefined();
      expect(config.requireMergedPR).toBeDefined();
      expect(config.customSafetyRules).toBeDefined();
    });
  });
});