import { Octokit } from "@octokit/rest";
import { OctokitPlus } from "../OctokitPlus.js";
import { getGhToken } from "./getGhToken.js";
import { getGhBaseUrl } from "./getGhBaseUrl.js";

export function createOctokitPlus() {
  const token = getGhToken();
  if (!token) {
    throw new Error("No GitHub token found. Please authenticate with 'gh auth login'");
  }

  const baseUrl = getGhBaseUrl();
  if (!baseUrl) {
    throw new Error("No GitHub API base URL found. This should not happen - please report this issue.");
  }

  const octokit = new Octokit({
    baseUrl,
    auth: token
  });

  return new OctokitPlus(octokit);
}
