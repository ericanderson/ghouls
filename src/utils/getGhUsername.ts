import { execSync } from "child_process";

export function getGhUsername(): string | null {
  try {
    const username = execSync("gh api user --jq '.login'", { encoding: "utf8" }).trim();
    return username || null;
  } catch (error) {
    return null;
  }
}