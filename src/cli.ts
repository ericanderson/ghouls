import sourceMapSupport from "source-map-support";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { pruneAllCommand } from "./commands/PruneAll.js";
import { pruneLocalBranchesCommand } from "./commands/PruneLocalBranches.js";
import { prunePullRequestsCommand } from "./commands/PrunePullRequests.js";
sourceMapSupport.install();

export default function cli() {
  process.on("unhandledRejection", console.log);
  yargs(hideBin(process.argv))
    .usage("$0 <cmd> [args]")
    .demandCommand()
    .command(prunePullRequestsCommand)
    .command(pruneLocalBranchesCommand)
    .command(pruneAllCommand)
    .help().argv;
}
