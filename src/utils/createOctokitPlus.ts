import { Octokit } from "@octokit/rest";
import { Config } from "./getConfig.js";
import { OctokitPlus } from "../OctokitPlus.js";

export function createOctokitPlus({ baseUrl, token }: Config) {
  const octokit = new Octokit({
    baseUrl,
    auth: token
  });

  return new OctokitPlus(octokit);
}
