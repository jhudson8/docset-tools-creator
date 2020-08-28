import { MainOptions } from "docset-tools-types";
import { normalizePath } from "./util";
import engine from "./engine";
const yargs = require("yargs");
let argv = yargs
  .option("dry-run", {
    type: "boolean",
    description: "Only output the docset entries and don't create the docset",
  })
  .option("config", {
    alias: "c",
    type: "boolean",
    description: "config file name / path",
  });
const configFilePath = normalizePath(argv.argv.c || "docsetconfig.js");
let options: MainOptions = require(configFilePath);
if ((options as any).default) {
  options = (options as any).default;
}

if (options.plugins) {
  options.plugins = options.plugins.map((plugin) => {
    plugin = (plugin as any).default || plugin;
    return {
      plugin: (plugin.plugin as any).default || plugin.plugin,
      options: plugin.options,
    };
  });

  for (let i = 0; i < options.plugins.length; i++) {
    const plugin = options.plugins[i];
    if (plugin.plugin.includeCliOptions) {
      argv = plugin.plugin.includeCliOptions(argv);
    }
  }
}
argv = argv.argv;

engine(options, argv)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => "process complete");
