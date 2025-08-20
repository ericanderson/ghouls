/**
 * Complete Ghouls configuration structure
 */
export interface GhoulsConfig {
  /**
   * List of branch names and patterns that should never be deleted (case-insensitive)
   * Supports both exact branch names and glob patterns (e.g., "release/*", "hotfix-*")
   *
   * Special placeholder "$GHOULS_DEFAULT" can be used to include the default protected
   * branches in addition to custom ones:
   * ```json
   * {
   *   "protectedBranches": ["$GHOULS_DEFAULT", "custom-branch", "feature/*"]
   * }
   * ```
   *
   * If "$GHOULS_DEFAULT" is not used, the specified branches completely replace the defaults.
   */
  protectedBranches?: string[];
}

/**
 * Default protected branch names and patterns (case-insensitive)
 * Supports both exact names and glob patterns
 */
export const DEFAULT_PROTECTED_BRANCHES = [
  // Exact branch names
  "main",
  "master",
  "develop",
  "dev",
  "staging",
  "production",
  "prod",
  // Glob patterns for release and hotfix branches
  "release/*",
  "release-*",
  "hotfix/*",
] as const;

/**
 * Placeholder string that can be used in protectedBranches array to include default branches
 */
export const GHOULS_DEFAULT_PLACEHOLDER = "$GHOULS_DEFAULT";

/**
 * Expands $GHOULS_DEFAULT placeholder in protected branches array
 * Replaces all instances of $GHOULS_DEFAULT with the actual default protected branches
 * and removes duplicates while preserving order
 */
export function expandDefaultPlaceholder(branches: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const branch of branches) {
    if (branch === GHOULS_DEFAULT_PLACEHOLDER) {
      // Insert default branches, skipping any we've already seen
      for (const defaultBranch of DEFAULT_PROTECTED_BRANCHES) {
        if (!seen.has(defaultBranch)) {
          result.push(defaultBranch);
          seen.add(defaultBranch);
        }
      }
    } else if (!seen.has(branch)) {
      // Add custom branch if not already seen
      result.push(branch);
      seen.add(branch);
    }
  }

  return result;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Required<GhoulsConfig> = {
  protectedBranches: [...DEFAULT_PROTECTED_BRANCHES],
};

/**
 * Configuration file discovery paths (in order of precedence)
 */
export const CONFIG_FILE_NAMES = [
  ".config/ghouls.json",
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
 * Handles $GHOULS_DEFAULT placeholder expansion in protectedBranches
 */
export function getEffectiveConfig(config?: GhoulsConfig): Required<GhoulsConfig> {
  const merged = mergeConfigs(config, DEFAULT_CONFIG);

  let protectedBranches = merged.protectedBranches || DEFAULT_CONFIG.protectedBranches;

  // Expand $GHOULS_DEFAULT placeholder if present
  if (protectedBranches.includes(GHOULS_DEFAULT_PLACEHOLDER)) {
    protectedBranches = expandDefaultPlaceholder(protectedBranches);
  }

  return {
    protectedBranches,
  };
}
