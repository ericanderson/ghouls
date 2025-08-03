import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { prunePullRequestsCommand } from "./commands/PrunePullRequests.js";
import { pruneLocalBranchesCommand } from "./commands/PruneLocalBranches.js";
import { pruneAllCommand } from "./commands/PruneAll.js";
import sourceMapSupport from "source-map-support";
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
