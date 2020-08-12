import { DocsetEntries, Plugin } from "docset-tools-types";

export interface Options {
  // the name of the index file e.g. "index.html"
  indexFileName?: string;
  // the path of the index file directory relative to the base path
  indexFileDirPath?: string;
  // the equivalent of the package name for the docset, will use package.json name if doesn't exist
  docsetIdentifier?: string;
  // human readable name of the docset (will default to docsetIdentifier)
  docsetName?: string;
  // javascript is enabled by default, `false` if it should be disabled
  isJavascriptEnabled?: boolean;
  // Dash plist.info value, defaults to docsetIdentifier
  docsetPlatformFamily?: string;
  // Dash plist.info value for website url
  fallbackUrl?: string;
  // all docset entries
  entries?: DocsetEntries;
  // absolute path where icons exist (icon.png and icon@2x.png)
  iconsPath?: string;
  // absolute path for the docset files to be exposed in the docset
  docsPath?: string;
  // `true` if we should lot to console
  logToConsole?: boolean;
  // the full path where the output should be copied (if not compressed)
  outputPath?: string;
  // all plugins
  plugins?: {
    plugin: Plugin;
    options: any;
  }[];
}
