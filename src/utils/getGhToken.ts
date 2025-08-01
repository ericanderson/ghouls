import { execSync } from "child_process";

export function getGhToken(): string | null {
  try {
    const token = execSync("gh auth token", { encoding: "utf8" }).trim();
    return token || null;
  } catch (error) {
    return null;
  }
}