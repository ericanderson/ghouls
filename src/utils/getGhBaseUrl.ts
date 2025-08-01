import { execSync } from "child_process";

export function getGhBaseUrl(): string {
  try {
    // Check if gh is authenticated to any hosts
    const hostsOutput = execSync("gh auth status", { encoding: "utf8", stdio: ['pipe', 'pipe', 'pipe'] });
    
    // Extract the host from the output (looking for lines like "github.com" or custom enterprise hosts)
    const hostMatch = hostsOutput.match(/^([^\s]+)$/m);
    
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