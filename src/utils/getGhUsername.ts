import { execaSync } from "execa";

export function getGhUsername(): string | null {
  const result = execaSync("gh", ["api", "user", "--jq", ".login"], {
    timeout: 10000, // 10 second timeout
    reject: false
  });

  // Check if the command failed
  if (result.failed) {
    // Re-throw as an error so it can be caught and analyzed by calling code
    throw result;
  }

  const username = result.stdout?.trim();
  return username || null;
}