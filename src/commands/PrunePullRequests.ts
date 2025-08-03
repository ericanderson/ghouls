import type { CommandModule } from "yargs";
import { createOctokitPlus } from "../utils/createOctokitPlus.js";
import ProgressBar from "progress";
import { PullRequest, OctokitPlus } from "../OctokitPlus.js";
import { ownerAndRepoMatch } from "../utils/ownerAndRepoMatch.js";
import { getGitRemote } from "../utils/getGitRemote.js";
import inquirer from "inquirer";

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
      createOctokitPlus(),
      args.dryRun,
      args.force,
      owner,
      repo
    );

    await prunePullRequest.perform();
  },
  command: "remote [--dry-run] [--force] [repo]",
  describe: "Delete merged remote branches from pull requests",
  builder: yargs =>
    yargs
      .env()
      .option("dry-run", {
        type: "boolean",
        description: "Perform a dry run (show what would be deleted)"
      })
      .option("force", {
        type: "boolean",
        description: "Skip interactive mode and delete all merged branches automatically"
      })
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

interface BranchToDelete {
  ref: string;
  pr: PullRequest;
}

class PrunePullRequest {
  constructor(
    private octokitPlus: OctokitPlus,
    private dryRun: boolean,
    private force: boolean,
    private owner: string,
    private repo: string
  ) {}

  public async perform() {
    console.log("\nScanning for remote branches that can be safely deleted...");
    
    // First collect all branches that can be deleted
    const branchesToDelete = await this.collectDeletableBranches();
    
    if (branchesToDelete.length === 0) {
      console.log("\n👻 No branches found that can be safely deleted.");
      return;
    }

    console.log(`Found ${branchesToDelete.length} branches that can be deleted.`);

    // Get branches to delete based on mode
    let selectedBranches = branchesToDelete;
    
    if (!this.force && !this.dryRun) {
      // Interactive mode
      const choices = branchesToDelete.map(({ ref, pr }) => {
        const mergeDate = pr.merged_at ? new Date(pr.merged_at).toLocaleDateString() : 'unknown';
        return {
          name: `${ref} (PR #${pr.number}: ${pr.title || 'No title'}, merged: ${mergeDate})`,
          value: ref,
          checked: true
        };
      });

      const { selected } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selected',
          message: '👻 Select remote branches to delete:',
          choices,
          pageSize: 20
        }
      ]);

      if (selected.length === 0) {
        console.log("\n👻 No branches selected for deletion.");
        return;
      }

      selectedBranches = branchesToDelete.filter(({ ref }) => 
        selected.includes(ref)
      );
    }

    // Delete selected branches
    console.log(`\n💀 ${this.dryRun ? 'Would delete' : 'Deleting'} ${selectedBranches.length} branch${selectedBranches.length === 1 ? '' : 'es'}:`);
    
    const bar = new ProgressBar(":bar :branch (:current/:total)", {
      total: selectedBranches.length,
      width: 30
    });

    let deletedCount = 0;
    let errorCount = 0;

    for (const { ref, pr } of selectedBranches) {
      bar.update(deletedCount + errorCount, { branch: `${ref} (#${pr.number})` });

      try {
        if (this.dryRun) {
          bar.interrupt(`[DRY RUN] Would delete: ${ref} (PR #${pr.number})`);
        } else {
          await this.octokitPlus.deleteReference(pr.head);
          bar.interrupt(`💀 Deleted: ${ref} (PR #${pr.number})`);
        }
        deletedCount++;
      } catch (error) {
        bar.interrupt(`Error deleting ${ref}: ${error instanceof Error ? error.message : String(error)}`);
        errorCount++;
      }
    }

    bar.update(selectedBranches.length, { branch: "" });
    bar.terminate();

    // Summary
    console.log(`\nSummary:`);
    if (this.dryRun) {
      console.log(`  Would delete: ${deletedCount} branch${deletedCount === 1 ? '' : 'es'}`);
    } else {
      console.log(`  👻 Successfully deleted: ${deletedCount} branch${deletedCount === 1 ? '' : 'es'}`);
    }
    
    if (errorCount > 0) {
      console.log(`  Errors: ${errorCount}`);
    }
  }

  private async collectDeletableBranches(): Promise<BranchToDelete[]> {
    const branchesToDelete: BranchToDelete[] = [];
    
    const pullRequests = this.octokitPlus.getPullRequests({
      repo: this.repo,
      owner: this.owner,
      per_page: 100,
      state: "closed",
      sort: "updated",
      direction: "desc"
    });

    for await (const pr of pullRequests) {
      if (!pr.merge_commit_sha || !ownerAndRepoMatch(pr.head, pr.base)) {
        continue;
      }

      const ref = await this.octokitPlus.getReference(pr.head);
      if (!ref) {
        continue;
      }

      if (ref.object.sha !== pr.head.sha) {
        // if the current branch's sha doesn't match the one from the PR, then we shouldn't delete it
        continue;
      }

      branchesToDelete.push({
        ref: `heads/${pr.head.ref}`,
        pr
      });
    }

    return branchesToDelete;
  }
}
