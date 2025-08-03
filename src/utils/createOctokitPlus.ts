import { Octokit } from "@octokit/rest";
import { OctokitPlus } from "../OctokitPlus.js";
import { getGhToken } from "./getGhToken.js";
import { getGhBaseUrl } from "./getGhBaseUrl.js";
import { detectGhCliError, formatGhCliError } from "./ghCliErrorHandler.js";

export function createOctokitPlus() {
  let token: string | null;
  let baseUrl: string;

  try {
    token = getGhToken();
  } catch (error) {
    const ghError = detectGhCliError(error);
    if (ghError) {
      throw new Error(formatGhCliError(ghError));
    }
    throw error;
  }

  if (!token) {
    throw new Error("No GitHub token found. Please authenticate with 'gh auth login'");
  }

  try {
    baseUrl = getGhBaseUrl();
  } catch (error) {
    const ghError = detectGhCliError(error);
    if (ghError) {
      throw new Error(formatGhCliError(ghError));
    }
    // If gh is not installed but we got here, default to github.com
    baseUrl = "https://api.github.com";
  }

  const octokit = new Octokit({
    baseUrl,
    auth: token
  });

  return new OctokitPlus(octokit);
}
