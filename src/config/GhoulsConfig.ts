import { z } from "zod/v4";

/**
 * Complete Ghouls configuration schema
 */

export const GhoulsConfig = z.object({
  protectedBranches: z.array(
    z.string().min(1, "Branch name cannot be empty"),
  ).optional(),
});

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
