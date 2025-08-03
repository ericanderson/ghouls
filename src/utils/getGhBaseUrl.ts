import { execaSync } from "execa";

export function getGhBaseUrl(): string {
  const result = execaSync("gh", ["auth", "status"], {
    timeout: 10000, // 10 second timeout
    reject: false
  });

  // Check if the command failed due to gh not being installed
  if (result.failed && result.exitCode === 127) {
    throw result;
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
}