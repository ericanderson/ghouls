import { execaSync } from "execa";

export function getGhToken(): string | null {
  try {
    const { stdout } = execaSync("gh", ["auth", "token"], {
      timeout: 10000, // 10 second timeout
      reject: false
    });

    const token = stdout?.trim();
    return token || null;
  } catch (error) {
    return null;
  }
}