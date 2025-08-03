/**
 * Configuration types and interfaces for Ghouls safety checks
 */

/**
 * Configuration for branch safety checks
 */
export interface SafetyConfig {
  /**
   * List of branch names that should never be deleted (case-insensitive)
   * Replaces the default protected branches if specified
   */
  protectedBranches?: string[];
  
  /**
   * Additional branch patterns to protect (supports regex)
   * These are added to the default protected branches
   */
  additionalProtectedPatterns?: string[];
  
  /**
   * Whether to allow deletion of branches with unpushed commits
   * Default: false (branches with unpushed commits are protected)
   */
  allowUnpushedCommits?: boolean;
  
  /**
   * Whether to require a merged PR for branch deletion
   * Default: true (only branches with merged PRs can be deleted)
   */
  requireMergedPR?: boolean;
  
  /**
   * Custom safety rules with regex patterns
   */
  customSafetyRules?: Array<{
    name: string;
    pattern: string;
    reason: string;
  }>;
}

/**
 * Complete configuration file structure
 */
export interface GhoulsConfig {
  /**
   * Branch safety configuration
   */
  safety?: SafetyConfig;
  
  /**
   * Configuration file version for future compatibility
   */
  version?: string;
}

/**
 * Default protected branch names (case-insensitive)
 */
export const DEFAULT_PROTECTED_BRANCHES = [
  "main",
  "master", 
  "develop",
  "dev",
  "staging",
  "production",
  "prod"
] as const;

/**
 * Default safety configuration
 */
export const DEFAULT_SAFETY_CONFIG: Required<SafetyConfig> = {
  protectedBranches: [...DEFAULT_PROTECTED_BRANCHES],
  additionalProtectedPatterns: [],
  allowUnpushedCommits: false,
  requireMergedPR: true,
  customSafetyRules: []
};

/**
 * Configuration file discovery paths (in order of precedence)
 */
export const CONFIG_FILE_NAMES = [
  ".ghouls.json",
  ".ghoulsrc.json",
  "ghouls.config.json"
] as const;

/**
 * Merge multiple safety configurations with precedence rules
 */
export function mergeSafetyConfig(...configs: Array<SafetyConfig | undefined>): SafetyConfig {
  const merged: SafetyConfig = {};
  
  for (const config of configs) {
    if (!config) continue;
    
    // Protected branches: last config wins (replace, don't merge)
    if (config.protectedBranches !== undefined) {
      merged.protectedBranches = [...config.protectedBranches];
    }
    
    // Additional patterns: merge all patterns
    if (config.additionalProtectedPatterns) {
      merged.additionalProtectedPatterns = [
        ...(merged.additionalProtectedPatterns || []),
        ...config.additionalProtectedPatterns
      ];
    }
    
    // Boolean flags: last config wins
    if (config.allowUnpushedCommits !== undefined) {
      merged.allowUnpushedCommits = config.allowUnpushedCommits;
    }
    
    if (config.requireMergedPR !== undefined) {
      merged.requireMergedPR = config.requireMergedPR;
    }
    
    // Custom rules: merge all rules
    if (config.customSafetyRules) {
      merged.customSafetyRules = [
        ...(merged.customSafetyRules || []),
        ...config.customSafetyRules
      ];
    }
  }
  
  return merged;
}

/**
 * Get effective safety configuration by merging with defaults
 */
export function getEffectiveSafetyConfig(config?: SafetyConfig): Required<SafetyConfig> {
  const merged = mergeSafetyConfig(DEFAULT_SAFETY_CONFIG, config);
  
  return {
    protectedBranches: merged.protectedBranches || DEFAULT_SAFETY_CONFIG.protectedBranches,
    additionalProtectedPatterns: merged.additionalProtectedPatterns || DEFAULT_SAFETY_CONFIG.additionalProtectedPatterns,
    allowUnpushedCommits: merged.allowUnpushedCommits ?? DEFAULT_SAFETY_CONFIG.allowUnpushedCommits,
    requireMergedPR: merged.requireMergedPR ?? DEFAULT_SAFETY_CONFIG.requireMergedPR,
    customSafetyRules: merged.customSafetyRules || DEFAULT_SAFETY_CONFIG.customSafetyRules
  };
}