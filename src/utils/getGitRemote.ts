import { spawnSync } from "child_process";
import which from "which";

export interface GitRemoteInfo {
  owner: string;
  repo: string;
}

export function getGitRemote(): GitRemoteInfo | null {
  try {
    // Validate that git binary exists
    const gitPath = which.sync("git", { nothrow: true });
    if (!gitPath) {
      return null;
    }

    // Get the remote URL for origin
    const result = spawnSync(gitPath, ["remote", "get-url", "origin"], {
      encoding: "utf8",
      timeout: 5000, // 5 second timeout
      stdio: ["ignore", "pipe", "pipe"]
    });

    if (result.error || result.status !== 0) {
      return null;
    }

    const remoteUrl = result.stdout.trim();
    
    if (!remoteUrl) {
      return null;
    }

    // Parse GitHub URLs (both HTTPS and SSH formats)
    // HTTPS: https://github.com/owner/repo.git
    // SSH: git@github.com:owner/repo.git
    
    let match: RegExpMatchArray | null = null;
    
    // Try HTTPS format
    match = remoteUrl.match(/https:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
    
    if (!match) {
      // Try SSH format
      match = remoteUrl.match(/git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/);
    }
    
    if (match && match[1] && match[2]) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}