import { spawnSync } from "child_process";
import which from "which";

export function getGhUsername(): string | null {
  try {
    // Validate that gh binary exists
    const ghPath = which.sync("gh", { nothrow: true });
    if (!ghPath) {
      return null;
    }

    const result = spawnSync(ghPath, ["api", "user", "--jq", ".login"], {
      encoding: "utf8",
      timeout: 10000, // 10 second timeout
      stdio: ["ignore", "pipe", "pipe"]
    });

    if (result.error || result.status !== 0) {
      return null;
    }

    const username = result.stdout.trim();
    return username || null;
  } catch (error) {
    return null;
  }
}