import Octokit from "@octokit/rest";
import { Config } from "./getConfig";
import { OctokitPlus } from "../OctokitPlus";

export function createOctokitPlus({ baseUrl, username, token }: Config) {
  const octokit = new Octokit({
    baseUrl
  });
  octokit.authenticate({
    type: "oauth",
    username,
    token
  });

  return new OctokitPlus(octokit);
}
