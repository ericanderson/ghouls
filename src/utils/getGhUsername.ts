import { execaSync } from "execa";

export function getGhUsername(): string | null {
  try {
    const { stdout } = execaSync("gh", ["api", "user", "--jq", ".login"], {
      timeout: 10000, // 10 second timeout
      reject: false
    });

    const username = stdout?.trim();
    return username || null;
  } catch (error) {
    return null;
  }
}