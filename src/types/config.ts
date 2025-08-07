/**
 * Complete Ghouls configuration structure
 */
export interface GhoulsConfig {
  /**
   * List of branch names that should never be deleted (case-insensitive)
   * Replaces the default protected branches if specified
   */
  protectedBranches?: string[];
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
 * Default configuration
 */
export const DEFAULT_CONFIG: Required<GhoulsConfig> = {
  protectedBranches: [...DEFAULT_PROTECTED_BRANCHES]
};

/**
 * Configuration file discovery paths (in order of precedence)
 */
export const CONFIG_FILE_NAMES = [
  ".config/ghouls.json"
] as const;

/**
 * Merge multiple configurations with precedence rules
 */
export function mergeConfigs(
  ...configs: Array<GhoulsConfig | undefined>
): GhoulsConfig {
  const merged: GhoulsConfig = {};

  for (const config of configs) {
    if (!config) continue;

    // Protected branches: first config wins (replace, don't merge)
    if (config.protectedBranches !== undefined && merged.protectedBranches === undefined) {
      merged.protectedBranches = [...config.protectedBranches];
    }
  }

  return merged;
}

/**
 * Get effective configuration by merging with defaults
 */
export function getEffectiveConfig(config?: GhoulsConfig): Required<GhoulsConfig> {
  const merged = mergeConfigs(config, DEFAULT_CONFIG);

  return {
    protectedBranches: merged.protectedBranches || DEFAULT_CONFIG.protectedBranches
  };
}
