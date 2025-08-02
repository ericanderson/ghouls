import { execaSync } from "execa";

export interface GitRemoteInfo {
  owner: string;
  repo: string;
}

export function parseGitRemote(remoteUrl: string): GitRemoteInfo | null {
  if (!remoteUrl || typeof remoteUrl !== 'string') {
    return null;
  }

  const trimmedUrl = remoteUrl.trim();
  
  if (!trimmedUrl) {
    return null;
  }

  // Parse Git URLs (both HTTPS and SSH formats)
  // HTTPS: https://github.com/owner/repo.git or https://github.company.com/owner/repo.git
  // SSH: git@github.com:owner/repo.git or git@github.company.com:owner/repo.git
  
  let match: RegExpMatchArray | null = null;
  
  // Try HTTPS format - matches any domain
  match = trimmedUrl.match(/https:\/\/([^/]+)\/([^/]+)\/([^/]+?)(\.git)?$/);
  
  if (match && match[2] && match[3]) {
    return {
      owner: match[2],
      repo: match[3]
    };
  }
  
  // Try SSH format - matches any domain
  match = trimmedUrl.match(/git@([^:]+):([^/]+)\/([^/]+?)(\.git)?$/);
  
  if (match && match[2] && match[3]) {
    return {
      owner: match[2],
      repo: match[3]
    };
  }
  
  return null;
}

export function getGitRemote(): GitRemoteInfo | null {
  try {
    // Get the remote URL for origin
    const { stdout } = execaSync("git", ["remote", "get-url", "origin"], {
      timeout: 5000, // 5 second timeout
      reject: false
    });

    if (!stdout) {
      return null;
    }

    return parseGitRemote(stdout);
  } catch (error) {
    return null;
  }
}