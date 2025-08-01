import { Octokit } from "@octokit/rest";
import { Config } from "./getConfig.js";
import { OctokitPlus } from "../OctokitPlus.js";

export function createOctokitPlus({ baseUrl, token }: Config) {
  if (!token) {
    throw new Error("No GitHub token found. Please provide a token in the config file or authenticate with 'gh auth login'");
  }

  if (!baseUrl) {
    throw new Error("No GitHub API base URL found. This should not happen - please report this issue.");
  }

  const octokit = new Octokit({
    baseUrl,
    auth: token
  });

  return new OctokitPlus(octokit);
}
