import { join } from "path";
import docsetCreator from "./docset-creator";
const yargs = require("yargs");

const argv = yargs
  .option("dry-run", {
    type: "boolean",
    description: "Only output the docset entries and don't create the docset",
  })
  .option("chrome-exe-path", {
    description: "full path to chrome executable if selectors are used",
  }).argv;

let options = require(join(process.cwd(), "src", "options"));
const outputPath = join(process.cwd(), "dist");
const docsPath = join(process.cwd(), "docs");
const iconsDirPath = join(process.cwd(), "src");
const addToTopDirPath = join(process.cwd(), "src", "add_to_top");
const addToBottomDirPath = join(process.cwd(), "src", "add_to_bottom");
if (options) {
  if (options.default) {
    options = options.default;
  }
} else {
  console.error(
    "The options file exists but no options are available... did you forget to export the options?"
  );
  process.exit(1);
}

docsetCreator({
  ...options,
  iconsDirPath,
  outputPath,
  docsPath,
  addToTopDirPath,
  addToBottomDirPath,
  logToConsole: true,
  dryRun: argv["dry-run"],
  chromeExePath: argv["chrome-exe-path"],
})
  .catch((e) => console.error(e))
  .then(() => "process complete");
