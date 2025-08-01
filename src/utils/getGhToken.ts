import { spawnSync } from "child_process";
import which from "which";

export function getGhToken(): string | null {
  try {
    // Validate that gh binary exists
    const ghPath = which.sync("gh", { nothrow: true });
    if (!ghPath) {
      return null;
    }

    const result = spawnSync(ghPath, ["auth", "token"], {
      encoding: "utf8",
      timeout: 10000, // 10 second timeout
      stdio: ["ignore", "pipe", "pipe"]
    });

    if (result.error || result.status !== 0) {
      return null;
    }

    const token = result.stdout.trim();
    return token || null;
  } catch (error) {
    return null;
  }
}