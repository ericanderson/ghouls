import { execaSync } from "execa";

export interface LocalBranch {
  name: string;
  sha: string;
  isCurrent: boolean;
}

export interface BranchStatus {
  ahead: number;
  behind: number;
}

/**
 * Gets all local branches with their SHA and current status
 */
export function getLocalBranches(): LocalBranch[] {
  try {
    // Get all local branches with their SHAs and current branch indicator
    const { stdout } = execaSync("git", ["branch", "-v", "--format=%(refname:short)|%(objectname)|%(HEAD)"], {
      timeout: 10000,
      reject: false
    });

    if (!stdout) {
      return [];
    }

    return stdout
      .split("\n")
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split("|");
        if (parts.length !== 3) {
          throw new Error(`Unexpected git branch output format: ${line}`);
        }
        
        return {
          name: parts[0].trim(),
          sha: parts[1].trim(),
          isCurrent: parts[2].trim() === "*"
        };
      });
  } catch (error) {
    throw new Error(`Failed to get local branches: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets the current branch name
 */
export function getCurrentBranch(): string {
  try {
    const { stdout } = execaSync("git", ["branch", "--show-current"], {
      timeout: 5000,
      reject: false
    });

    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks if a branch has unpushed commits compared to its upstream
 */
export function getBranchStatus(branchName: string): BranchStatus | null {
  try {
    // First check if the branch has an upstream
    const { stdout: upstreamResult } = execaSync("git", ["rev-parse", "--abbrev-ref", `${branchName}@{upstream}`], {
      timeout: 5000,
      reject: false
    });

    if (!upstreamResult) {
      // No upstream configured, assume it's safe (no unpushed commits)
      return { ahead: 0, behind: 0 };
    }

    const upstream = upstreamResult.trim();

    // Get ahead/behind status
    const { stdout } = execaSync("git", ["rev-list", "--count", "--left-right", `${upstream}...${branchName}`], {
      timeout: 5000,
      reject: false
    });

    const parts = stdout.trim().split("\t");
    if (parts.length !== 2) {
      return null;
    }

    return {
      behind: parseInt(parts[0], 10) || 0,
      ahead: parseInt(parts[1], 10) || 0
    };
  } catch (error) {
    // If we can't determine status, assume it's not safe to delete
    return null;
  }
}

/**
 * Deletes a local branch
 */
export function deleteLocalBranch(branchName: string, force: boolean = false): void {
  try {
    const args = ["branch", force ? "-D" : "-d", branchName];
    execaSync("git", args, {
      timeout: 10000
    });
  } catch (error) {
    throw new Error(`Failed to delete branch ${branchName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks if we're in a git repository
 */
export function isGitRepository(): boolean {
  try {
    execaSync("git", ["rev-parse", "--git-dir"], {
      timeout: 5000,
      reject: false
    });
    return true;
  } catch {
    return false;
  }
}