import type { CommandModule } from "yargs";
import { createOctokitPlus } from "../utils/createOctokitPlus.js";
import ProgressBar from "progress";
import { PullRequest, OctokitPlus } from "../OctokitPlus.js";
import { getGitRemote } from "../utils/getGitRemote.js";
import { 
  getLocalBranches, 
  getCurrentBranch, 
  deleteLocalBranch, 
  isGitRepository 
} from "../utils/localGitOperations.js";
import { filterSafeBranches } from "../utils/branchSafetyChecks.js";
import { promptWithCancel } from "../utils/promptWithCancel.js";
import { 
  output, 
  verboseOutput, 
  outputSummary, 
  outputError, 
  isVerbose 
} from "../utils/outputFormatter.js";

export const pruneLocalBranchesCommand: CommandModule = {
  handler: async (args: any) => {
    // Set output options based on CLI flags
    const { setOutputOptions } = await import("../utils/outputFormatter.js");
    setOutputOptions({
      verbose: Boolean(args.verbose)
    });

    let owner: string;
    let repo: string;

    // Ensure we're in a git repository
    if (!isGitRepository()) {
      throw new Error("This command must be run from within a git repository.");
    }

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

    const pruneLocalBranches = new PruneLocalBranches(
      createOctokitPlus(),
      args.dryRun,
      args.force,
      owner,
      repo
    );

    await pruneLocalBranches.perform();
  },
  command: "local [--dry-run] [--force] [repo]",
  describe: "Delete merged local branches from pull requests",
  builder: yargs =>
    yargs
      .env()
      .option("dry-run", {
        type: "boolean",
        description: "Perform a dry run (show what would be deleted)"
      })
      .option("force", {
        type: "boolean",
        description: "Skip interactive mode and delete all safe branches automatically"
      })
      .option("verbose", {
        alias: "v",
        type: "boolean",
        description: "Show detailed output including progress information",
        default: false
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

class PruneLocalBranches {
  constructor(
    private octokitPlus: OctokitPlus,
    private dryRun: boolean,
    private force: boolean,
    private owner: string,
    private repo: string
  ) {}

  public async perform() {
    verboseOutput("Scanning for local branches that can be safely deleted...");
    
    // Get all local branches
    const localBranches = getLocalBranches();
    const currentBranch = getCurrentBranch();
    
    verboseOutput(`Found ${localBranches.length} local branches`);
    
    if (localBranches.length === 0) {
      output("No local branches found.");
      return;
    }

    // Get merged PRs from GitHub
    verboseOutput("Fetching merged pull requests from GitHub...");
    const mergedPRs = await this.getMergedPRsMap();
    verboseOutput(`Found ${mergedPRs.size} merged pull requests`);

    // Filter branches for safety
    const branchAnalysis = filterSafeBranches(localBranches, currentBranch, mergedPRs);
    const safeBranches = branchAnalysis.filter(analysis => analysis.safetyCheck.safe);
    const unsafeBranches = branchAnalysis.filter(analysis => !analysis.safetyCheck.safe);

    output(`Found ${safeBranches.length} local branch${safeBranches.length === 1 ? '' : 'es'} that can be safely deleted.`);

    // Show unsafe branches and reasons in verbose mode
    if (unsafeBranches.length > 0) {
      verboseOutput(`\nSkipping ${unsafeBranches.length} unsafe branches:`);
      for (const { branch, safetyCheck } of unsafeBranches) {
        verboseOutput(`  - ${branch.name} (${safetyCheck.reason})`);
      }
    }

    if (safeBranches.length === 0) {
      output("No local branches are safe to delete.");
      return;
    }

    // Get branches to delete based on mode
    let branchesToDelete = safeBranches;
    
    if (!this.force && !this.dryRun) {
      // Interactive mode
      const choices = safeBranches.map(({ branch, matchingPR }) => {
        const prInfo = matchingPR ? `PR #${matchingPR.number}` : 'no PR';
        const lastCommit = branch.lastCommitDate ? new Date(branch.lastCommitDate).toLocaleDateString() : 'unknown';
        return {
          name: `${branch.name} (${prInfo}, last commit: ${lastCommit})`,
          value: branch.name,
          checked: true
        };
      });

      const result = await promptWithCancel<{ selectedBranches: string[] }>([
        {
          type: 'checkbox',
          name: 'selectedBranches',
          message: 'Select branches to delete:',
          choices,
          pageSize: 20
        }
      ]);

      if (result === null) {
        output("Operation cancelled by user");
        return;
      }

      if (result.selectedBranches.length === 0) {
        output("No branches selected for deletion.");
        return;
      }

      branchesToDelete = safeBranches.filter(({ branch }) => 
        result.selectedBranches.includes(branch.name)
      );
    }

    // Show what will be deleted
    output(`${this.dryRun ? 'Would delete' : 'Deleting'} ${branchesToDelete.length} local branch${branchesToDelete.length === 1 ? '' : 'es'}:`);
    
    // Only show progress bar in verbose mode and if we have a TTY
    let bar: ProgressBar | null = null;
    
    if (isVerbose() && process.stderr.isTTY) {
      bar = new ProgressBar(":bar :branch (:current/:total)", {
        total: branchesToDelete.length,
        width: 30,
        stream: process.stderr
      });
    }

    let deletedCount = 0;
    let errorCount = 0;

    for (const { branch, matchingPR } of branchesToDelete) {
      const prInfo = matchingPR ? `#${matchingPR.number}` : 'no PR';
      
      if (bar) {
        bar.update(deletedCount + errorCount, { branch: `${branch.name} (${prInfo})` });
      }

      try {
        if (this.dryRun) {
          const message = `[DRY RUN] Would delete: ${branch.name} (${prInfo})`;
          if (bar) {
            bar.interrupt(message);
          } else {
            output(`  ${message}`);
          }
        } else {
          deleteLocalBranch(branch.name);
          const message = `Deleted: ${branch.name} (${prInfo})`;
          if (bar) {
            bar.interrupt(message);
          } else {
            output(`  ${message}`);
          }
        }
        deletedCount++;
      } catch (error) {
        const message = `Error deleting ${branch.name}: ${error instanceof Error ? error.message : String(error)}`;
        if (bar) {
          bar.interrupt(message);
        } else {
          outputError(`  ${message}`);
        }
        errorCount++;
      }
    }

    if (bar) {
      bar.update(branchesToDelete.length, { branch: "" });
      bar.terminate();
    }

    // Summary
    const summaryItems: string[] = [];
    if (this.dryRun) {
      summaryItems.push(`Would delete: ${deletedCount} local branch${deletedCount === 1 ? '' : 'es'}`);
    } else {
      summaryItems.push(`Successfully deleted: ${deletedCount} local branch${deletedCount === 1 ? '' : 'es'}`);
    }
    
    if (errorCount > 0) {
      summaryItems.push(`Errors: ${errorCount}`);
    }
    
    summaryItems.push(`Skipped (unsafe): ${unsafeBranches.length}`);
    
    outputSummary(summaryItems);
  }

  private async getMergedPRsMap(): Promise<Map<string, PullRequest>> {
    const mergedPRs = new Map<string, PullRequest>();

    const pullRequests = this.octokitPlus.getPullRequests({
      repo: this.repo,
      owner: this.owner,
      per_page: 100,
      state: "closed",
      sort: "updated",
      direction: "desc"
    });

    for await (const pr of pullRequests) {
      // Only include merged PRs
      if (pr.merge_commit_sha) {
        mergedPRs.set(pr.head.ref, pr);
      }
    }

    return mergedPRs;
  }
}