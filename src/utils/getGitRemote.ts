import { execaSync } from "execa";

export interface GitRemoteInfo {
  owner: string;
  repo: string;
}

export function getGitRemote(): GitRemoteInfo | null {
  try {
    // Get the remote URL for origin
    const { stdout } = execaSync("git", ["remote", "get-url", "origin"], {
      timeout: 5000, // 5 second timeout
      reject: false
    });

    const remoteUrl = stdout?.trim();
    
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