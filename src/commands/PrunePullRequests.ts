import type { CommandModule } from "yargs";
import { getConfig } from "../utils/getConfig.js";
import { createOctokitPlus } from "../utils/createOctokitPlus.js";
import ProgressBar from "progress";
import { PullRequest, OctokitPlus } from "../OctokitPlus.js";
import { ownerAndRepoMatch } from "../utils/ownerAndRepoMatch.js";
import { getGitRemote } from "../utils/getGitRemote.js";

export const prunePullRequestsCommand: CommandModule = {
  handler: async (args: any) => {
    let owner: string;
    let repo: string;

    if (args.repo) {
      // Use provided repo
      owner = args.repo.owner;
      repo = args.repo.repo;
    } else {
      // Try to get from git remote
      const gitRemote = getGitRemote();
      if (!gitRemote) {
        throw new Error("No repo specified and unable to detect from git remote. Please run from a git repository or specify owner/repo.");
      }
      owner = gitRemote.owner;
      repo = gitRemote.repo;
    }

    const prunePullRequest = new PrunePullRequest(
      createOctokitPlus(getConfig()),
      args.dryRun,
      owner,
      repo
    );

    await prunePullRequest.perform();
  },
  command: "prunePullRequests [--dry-run] [repo]",
  describe: "Prunes remote branches that have already been merged",
  builder: yargs =>
    yargs
      .env()
      .boolean("dry-run")
      .positional("repo", {
        type: "string",
        coerce: (s: string | undefined) => {
          if (!s) {
            return undefined;
          }
          
          // Validate repo string format (owner/repo)
          const parts = s.split("/");
          if (parts.length !== 2 || !parts[0] || !parts[1]) {
            throw new Error("Repository must be in the format 'owner/repo'");
          }
          
          // Validate owner and repo names (GitHub naming rules)
          const ownerRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
          const repoRegex = /^[a-zA-Z0-9._-]+$/;
          
          if (!ownerRegex.test(parts[0])) {
            throw new Error("Invalid owner name. Must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen.");
          }
          
          if (!repoRegex.test(parts[1])) {
            throw new Error("Invalid repository name. Must contain only alphanumeric characters, dots, underscores, and hyphens.");
          }
          
          return { owner: parts[0], repo: parts[1] };
        }
      })
};

class PrunePullRequest {
  constructor(
    private octokitPlus: OctokitPlus,
    private dryRun: boolean,
    private owner: string,
    private repo: string
  ) {}

  public async perform() {
    const bar = new ProgressBar(":bar :prNum (:etas left)", {
      total: 100,
      width: 50
    });

    const pullRequests = this.octokitPlus.getPullRequests({
      repo: this.repo,
      owner: this.owner,
      per_page: 10,
      state: "closed",
      sort: "created",
      direction: "desc"
    });

    let max = 0;
    let min = 1_000_000;
    for await (const pr of pullRequests) {
      max = Math.max(pr.number, max);
      min = Math.min(pr.number, min);

      bar.update((max - min) / max, { prNum: `#${min}` }); // use min so things arent fighting if we parallelize
      await this.handlePr(pr, bar.interrupt.bind(bar));
    }
    bar.update(1, { prNum: "" });
    bar.terminate();
  }

  private async handlePr(pr: PullRequest, log: (s: string) => void) {
    if (!pr.merge_commit_sha || !ownerAndRepoMatch(pr.head, pr.base)) {
      return;
    }

    const ref = await this.octokitPlus.getReference(pr.head);
    if (!ref) {
      return;
    }

    const prNum = `#${pr.number}`.padStart(6);
    if (ref.object.sha !== pr.head.sha) {
      // if the current branch's sha doesn't match the one from the PR, then we shouldn't delete it
      log(`${prNum} - Skipping remote: heads/${pr.head.ref} (mismatched refs)`);
      return;
    }

    log(`${prNum} - Deleting remote: heads/${pr.head.ref}`);
    if (!this.dryRun) {
      await this.octokitPlus.deleteReference(pr.head);
    }
  }
}
