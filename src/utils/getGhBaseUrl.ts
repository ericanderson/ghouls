import { spawnSync } from "child_process";
import which from "which";

export function getGhBaseUrl(): string {
  try {
    // Validate that gh binary exists
    const ghPath = which.sync("gh", { nothrow: true });
    if (!ghPath) {
      return "https://api.github.com";
    }

    // Check if gh is authenticated to any hosts
    // Note: gh auth status outputs to stderr, not stdout
    const result = spawnSync(ghPath, ["auth", "status"], {
      encoding: "utf8",
      timeout: 10000, // 10 second timeout
      stdio: ["ignore", "pipe", "pipe"]
    });

    if (result.error) {
      return "https://api.github.com";
    }

    // gh auth status outputs to stderr, so check both stdout and stderr
    const hostsOutput = result.stderr || result.stdout || "";
    
    // Extract the host from the output (looking for lines like "github.com" or custom enterprise hosts)
    // Look for patterns like "✓ Logged in to github.com" or similar
    const hostMatch = hostsOutput.match(/(?:Logged in to|Active account on)\s+([^\s\n]+)/i) ||
                     hostsOutput.match(/^\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*$/m);
    
    if (hostMatch && hostMatch[1]) {
      const host = hostMatch[1];
      
      // If it's github.com, return the API URL
      if (host === "github.com") {
        return "https://api.github.com";
      }
      
      // For GitHub Enterprise, construct the API URL
      return `https://${host}/api/v3`;
    }
    
    // Default to github.com
    return "https://api.github.com";
  } catch (error) {
    // Default to github.com if gh CLI is not configured
    return "https://api.github.com";
  }
}