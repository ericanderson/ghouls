import type { CommandModule } from "yargs";
import { createOctokitPlus } from "../utils/createOctokitPlus.js";
import { getGitRemote } from "../utils/getGitRemote.js";
import { isGitRepository } from "../utils/localGitOperations.js";

export const pruneAllCommand: CommandModule = {
  handler: async (args: any) => {
    let owner: string;
    let repo: string;

    // Ensure we're in a git repository if no repo is specified
    if (!args.repo && !isGitRepository()) {
      throw new Error("This command must be run from within a git repository or specify owner/repo.");
    }

    if (args.repo) {
      // Use provided repo
      owner = args.repo.owner;
      repo = args.repo.repo;
    } else {
      // Try to get from git remote
      const gitRemote = getGitRemote();
      if (!gitRemote) {
        throw new Error(
          "No repo specified and unable to detect from git remote. Please run from a git repository or specify owner/repo.",
        );
      }
      owner = gitRemote.owner;
      repo = gitRemote.repo;
    }

    // Note: octokitPlus is created here to ensure authentication is available,
    // but the actual API calls are made within the individual command handlers
    createOctokitPlus();

    console.log("🚀 Starting combined branch cleanup...\n");

    let remoteSuccess = false;
    let localSuccess = false;
    let remoteError: Error | undefined;
    let localError: Error | undefined;

    // Phase 1: Remote branch pruning
    console.log("=== Phase 1: Remote Branch Cleanup ===");
    try {
      // Import dynamically to avoid circular dependencies
      const { prunePullRequestsCommand } = await import("./PrunePullRequests.js");
      await prunePullRequestsCommand.handler!({
        ...args,
        repo: { owner, repo },
      });
      remoteSuccess = true;
    } catch (error) {
      remoteError = error instanceof Error ? error : new Error(String(error));
      console.error(`\n❌ Remote cleanup failed: ${remoteError.message}`);
    }

    // Phase 2: Local branch pruning (continue even if remote failed)
    console.log("\n=== Phase 2: Local Branch Cleanup ===");
    try {
      // Import dynamically to avoid circular dependencies
      const { pruneLocalBranchesCommand } = await import("./PruneLocalBranches.js");
      await pruneLocalBranchesCommand.handler!({
        ...args,
        repo: { owner, repo },
      });
      localSuccess = true;
    } catch (error) {
      localError = error instanceof Error ? error : new Error(String(error));
      console.error(`\n❌ Local cleanup failed: ${localError.message}`);
    }

    // Final summary
    console.log("\n=== Combined Cleanup Summary ===");
    console.log(`Remote cleanup: ${remoteSuccess ? "✅ Success" : "❌ Failed"}`);
    console.log(`Local cleanup: ${localSuccess ? "✅ Success" : "❌ Failed"}`);

    // Exit with error code if both operations failed
    if (!remoteSuccess && !localSuccess) {
      console.error("\n❌ Both cleanup operations failed!");
      process.exit(1);
    } else if (!remoteSuccess || !localSuccess) {
      // Partial success
      console.log("\n⚠️  Cleanup completed with some errors.");
      process.exit(0);
    } else {
      console.log("\n✅ All cleanup operations completed successfully!");
    }
  },
  command: "all [--dry-run] [--force] [repo]",
  describe: "Delete both remote and local merged branches",
  builder: yargs =>
    yargs
      .env()
      .option("dry-run", {
        type: "boolean",
        description: "Perform a dry run (show what would be deleted)",
      })
      .option("force", {
        type: "boolean",
        description: "Skip interactive mode and delete all safe branches automatically",
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
            throw new Error(
              "Invalid owner name. Must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen.",
            );
          }

          if (!repoRegex.test(parts[1])) {
            throw new Error(
              "Invalid repository name. Must contain only alphanumeric characters, dots, underscores, and hyphens.",
            );
          }

          return { owner: parts[0], repo: parts[1] };
        },
      }),
};
