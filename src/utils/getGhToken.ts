import { execaSync } from "execa";

export function getGhToken(): string | null {
  const result = execaSync("gh", ["auth", "token"], {
    timeout: 10000, // 10 second timeout
    reject: false
  });

  // Check if the command failed
  if (result.failed) {
    // Re-throw as an error so it can be caught and analyzed by createOctokitPlus
    throw result;
  }

  const token = result.stdout?.trim();
  return token || null;
}