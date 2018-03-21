import * as yargs from "yargs";
import { prunePullRequestsCommand } from "./commands/PrunePullRequests";
import sourceMapSupport from "source-map-support";
sourceMapSupport.install();

export default function cli() {
  process.on("unhandledRejection", console.log);
  yargs
    .usage("$0 <cmd> [args]")
    .demandCommand()
    .command(prunePullRequestsCommand)
    .help().argv;
}
