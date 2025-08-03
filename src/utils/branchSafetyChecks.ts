import { LocalBranch, getBranchStatus } from "./localGitOperations.js";
import { PullRequest } from "../OctokitPlus.js";
import type { SafetyConfig } from "../types/config.js";
import { getEffectiveSafetyConfig } from "../types/config.js";

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
}

/**
 * Checks if a local branch is safe to delete based on various criteria
 */
export function isBranchSafeToDelete(
  branch: LocalBranch,
  currentBranch: string,
  matchingPR?: PullRequest,
  config?: SafetyConfig
): SafetyCheckResult {
  const effectiveConfig = getEffectiveSafetyConfig(config);
  // Never delete the current branch
  if (branch.isCurrent || branch.name === currentBranch) {
    return {
      safe: false,
      reason: "current branch"
    };
  }

  // Check protected branch names (case-insensitive)
  const protectedBranches = effectiveConfig.protectedBranches.map(b => b.toLowerCase());
  if (protectedBranches.includes(branch.name.toLowerCase())) {
    return {
      safe: false,
      reason: "protected branch"
    };
  }

  // Check additional protected patterns (regex)
  for (const pattern of effectiveConfig.additionalProtectedPatterns) {
    try {
      const regex = new RegExp(pattern, 'i'); // case-insensitive
      if (regex.test(branch.name)) {
        return {
          safe: false,
          reason: `matches protected pattern: ${pattern}`
        };
      }
    } catch {
      // Invalid regex pattern - skip this rule
      continue;
    }
  }

  // Check custom safety rules
  for (const rule of effectiveConfig.customSafetyRules) {
    try {
      const regex = new RegExp(rule.pattern, 'i'); // case-insensitive
      if (regex.test(branch.name)) {
        return {
          safe: false,
          reason: rule.reason
        };
      }
    } catch {
      // Invalid regex pattern - skip this rule
      continue;
    }
  }

  // If we have a matching PR, verify the SHAs match
  if (matchingPR) {
    if (branch.sha !== matchingPR.head.sha) {
      return {
        safe: false,
        reason: "SHA mismatch with PR head"
      };
    }

    // Additional check: ensure the PR was actually merged (if required)
    if (effectiveConfig.requireMergedPR && !matchingPR.merge_commit_sha) {
      return {
        safe: false,
        reason: "PR was not merged"
      };
    }
  }

  // Check for unpushed commits (if not allowed)
  if (!effectiveConfig.allowUnpushedCommits) {
    const branchStatus = getBranchStatus(branch.name);
    if (branchStatus && branchStatus.ahead > 0) {
      return {
        safe: false,
        reason: `${branchStatus.ahead} unpushed commit${branchStatus.ahead === 1 ? '' : 's'}`
      };
    }
  }

  return { safe: true };
}

/**
 * Filters branches that are safe to delete and returns them with their safety status
 */
export function filterSafeBranches(
  branches: LocalBranch[],
  currentBranch: string,
  mergedPRs: Map<string, PullRequest> = new Map(),
  config?: SafetyConfig
): Array<{ branch: LocalBranch; safetyCheck: SafetyCheckResult; matchingPR?: PullRequest }> {
  return branches.map(branch => {
    const matchingPR = mergedPRs.get(branch.name);
    const safetyCheck = isBranchSafeToDelete(branch, currentBranch, matchingPR, config);
    
    return {
      branch,
      safetyCheck,
      matchingPR
    };
  });
}