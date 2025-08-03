import { LocalBranch, getBranchStatus } from "./localGitOperations.js";
import { PullRequest } from "../OctokitPlus.js";

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
  matchingPR?: PullRequest
): SafetyCheckResult {
  // Never delete the current branch
  if (branch.isCurrent || branch.name === currentBranch) {
    return {
      safe: false,
      reason: "current branch"
    };
  }

  // Never delete main/master/develop branches
  const protectedBranches = ["main", "master", "develop", "dev", "staging", "production", "prod"];
  if (protectedBranches.includes(branch.name.toLowerCase())) {
    return {
      safe: false,
      reason: "protected branch"
    };
  }

  // Never delete release or hotfix branches (pattern-based)
  const branchLower = branch.name.toLowerCase();
  const releasePatterns = [
    /^release\//,          // release/v1.0.0, release/1.0, etc.
    /^release-/,           // release-1.0, release-v1.0.0, etc.
    /^hotfix\//,           // hotfix/urgent-fix, hotfix/v1.0.1, etc.
  ];
  
  if (releasePatterns.some(pattern => pattern.test(branchLower))) {
    return {
      safe: false,
      reason: "release/hotfix branch"
    };
  }

  // If we have a matching PR, verify the SHAs match
  if (matchingPR) {
    if (branch.sha !== matchingPR.head.sha) {
      return {
        safe: false,
        reason: "SHA mismatch with PR head"
      };
    }

    // Additional check: ensure the PR was actually merged
    if (!matchingPR.merge_commit_sha) {
      return {
        safe: false,
        reason: "PR was not merged"
      };
    }
  }

  // Check for unpushed commits
  const branchStatus = getBranchStatus(branch.name);
  if (branchStatus && branchStatus.ahead > 0) {
    return {
      safe: false,
      reason: `${branchStatus.ahead} unpushed commit${branchStatus.ahead === 1 ? '' : 's'}`
    };
  }

  return { safe: true };
}

/**
 * Filters branches that are safe to delete and returns them with their safety status
 */
export function filterSafeBranches(
  branches: LocalBranch[],
  currentBranch: string,
  mergedPRs: Map<string, PullRequest> = new Map()
): Array<{ branch: LocalBranch; safetyCheck: SafetyCheckResult; matchingPR?: PullRequest }> {
  return branches.map(branch => {
    const matchingPR = mergedPRs.get(branch.name);
    const safetyCheck = isBranchSafeToDelete(branch, currentBranch, matchingPR);
    
    return {
      branch,
      safetyCheck,
      matchingPR
    };
  });
}