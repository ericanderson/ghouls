import { CommandModule } from "yargs";
import { getConfig } from "../utils/getConfig";
import { createOctokitPlus } from "../utils/createOctokitPlus";
import ProgressBar from "progress";
import { PullRequest, OctokitPlus } from "../OctokitPlus";
import { ownerAndRepoMatch } from "../utils/ownerAndRepoMatch";

export const prunePullRequestsCommand: CommandModule = {
  handler: async (args: any) => {
    const prunePullRequest = new PrunePullRequest(
      createOctokitPlus(getConfig()),
      args.dryRun,
      args.repo.owner,
      args.repo.repo
    );

    await prunePullRequest.perform();
  },
  command: "prunePullRequests [--dry-run] <repo>",
  describe: "Prunes remote branches that have already been merged",
  builder: yargs =>
    yargs
      .env()
      .boolean("dry-run")
      .positional("repo", {
        type: "string",
        coerce: s => ({ owner: s.split("/")[0], repo: s.split("/")[1] })
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
