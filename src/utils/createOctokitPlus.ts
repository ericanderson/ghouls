import { Octokit } from "@octokit/rest";
import { Config } from "./getConfig";
import { OctokitPlus } from "../OctokitPlus";

export function createOctokitPlus({ baseUrl, token }: Config) {
  const octokit = new Octokit({
    baseUrl,
    auth: token
  });

  return new OctokitPlus(octokit);
}
