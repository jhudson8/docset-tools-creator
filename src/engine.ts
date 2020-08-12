import createSqlWasm, { SQLWasm, Database } from "sql-wasm";
import { join, normalize } from "path";
import fs, { existsSync, copy } from "fs-extra";
// the following doesn't have a type definition
const recursiveCopy = require("recursive-copy");
import { Options } from "./types";
import { unionEntries, normalizePath, rmdir } from "./util";
import { DocsetEntryType } from "docset-tools-types";

export default async function (options: Options, argv: any): Promise<void> {
  const {
    iconsPath,
    docsPath,
    isJavascriptEnabled,
    docsetPlatformFamily,
    fallbackUrl,
    outputPath,
    plugins,
  } = options;
  let { docsetIdentifier } = options;
  let entries = options.entries || {};
  let indexFileName = options.indexFileName || "index.html";
  if (options.hasOwnProperty("indexFileName") && !options.indexFileName) {
    indexFileName = undefined;
  }
  const indexFilePath = normalize(
    options.indexFileDirPath
      ? join(options.indexFileDirPath, indexFileName)
      : indexFileName
  ).replace(/\\/g, "/");
  if (!docsetIdentifier) {
    docsetIdentifier = require(join(process.cwd(), "package.json")).name;
  }
  const docsetFileName = docsetIdentifier + ".docset";
  const outputBasePath = join(outputPath, docsetFileName);
  const outputContentsPath = join(outputBasePath, "Contents");
  const outputResourcesPath = join(outputContentsPath, "Resources");
  const outputDocsPath = join(outputResourcesPath, "Documents");
  const docsetName = options.docsetName || docsetIdentifier;
  const dryRun = argv["dry-run"];

  const log = (...args: any[]) => {
    if (options.logToConsole) {
      console.log(...args);
    }
  };

  let tmpCount = 0;
  const parentTmpPath = join(process.cwd(), "._docset_tmp");
  const createTmpFolder = async (): Promise<string> => {
    tmpCount++;
    const path = join(parentTmpPath, tmpCount.toString());
    return path;
  };

  const include = async ({ path }: { path: string }) => {
    // copy the content to the output directory
    if (!dryRun) {
      await recursiveCopy(path, outputDocsPath);
    }
  };

  try {
    for (let i = 0; i < plugins.length; i++) {
      const plugin = plugins[i];
      const data = await plugin.plugin.execute({
        args: argv,
        createTmpFolder,
        include,
        pluginOptions: plugin.options,
        mainOptions: options,
        workingDir: process.cwd(),
      });
      entries = unionEntries(entries, data.entries);
      // FIXME add to plist
    }

    if (docsPath) {
      const fullDocsPath = normalizePath(docsPath);
      log("copying from " + fullDocsPath + " to " + outputDocsPath);
      await recursiveCopy(fullDocsPath, outputDocsPath);
    }

    log("creating index");
    const wasmPath = require.resolve("sql-wasm/dist/sqlite3.wasm");
    const SQL = await createSqlWasm({ wasmUrl: wasmPath });
    const db = new SQL.Database();
    const commands = [
      `CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);`,
      `CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);`,
    ];

    const fileRefs: {
      type: DocsetEntryType;
      path: string;
      name: string;
    }[] = [];
    Object.entries(entries).forEach(([type, entries]) => {
      Object.entries(entries).forEach(([name, path]) => {
        let _path = (path as any) as string;
        _path = _path.replace(/[\\/]#/, "#").replace(/\\/g, "/");
        if (_path.endsWith("/")) {
          _path = _path + indexFileName;
        }
        if (!_path.match(/^\.?\//) && options.indexFileDirPath) {
          _path = normalize(join(options.indexFileDirPath, _path));
        }
        if (_path.startsWith("/")) {
          _path = _path.replace(/^\//, "");
        }
        _path = _path.replace(/\\/g, "/");
        fileRefs.push({ type: type as DocsetEntryType, path: _path, name });
        commands.push(
          `INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES ('${escape(
            name
          )}', '${escape(type)}', '${escape(_path)}');`
        );
      });
    });

    for (let i = 0; i < commands.length; i++) {
      await db.exec(commands[i]);
    }

    // save to file
    const data = db.export();
    const buffer = Buffer.from(data);
    await fs.writeFile(join(outputResourcesPath, "docSet.dsidx"), buffer);

    // create info.plist
    log("creating info.plist");
    const infoPlistData = `
      <?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
      <plist version="1.0">
      <dict>
        <key>CFBundleIdentifier</key>
        <string>${docsetIdentifier}</string>
        <key>CFBundleName</key>
        <string>${docsetName}</string>
        <key>DocSetPlatformFamily</key>
        <string>${docsetPlatformFamily}</string>
        <key>isDashDocset</key>
        <true/>
        <key>dashIndexFilePath</key>
        <string>${indexFilePath}</string>
        <key>isJavaScriptEnabled</key><${
          isJavascriptEnabled ? "true" : "false"
        }/>${
      fallbackUrl
        ? `
        <key>DashDocSetFallbackURL</key>
        <string>${fallbackUrl}</string>`
        : ""
    }
      </dict>
      </plist>
    `;
    await fs.writeFile(join(outputContentsPath, "info.plist"), infoPlistData);

    // icons
    if (iconsPath) {
      log("copying icons...");
      const iconPath = join(iconsPath, "icon.png");
      const iconExists = existsSync(iconPath);
      if (iconExists) {
        await copy(iconPath, join(outputBasePath, "icon.png"));
      } else {
        console.error(iconPath + " does not exist");
      }
      const icon2xPath = join(iconsPath, "icon@2x.png");
      const icon2xExists = existsSync(iconPath);
      if (icon2xExists) {
        await copy(icon2xPath, join(outputBasePath, "icon@2x.png"));
      } else {
        console.error(icon2xPath + " does not exist");
      }
    }

    fileRefs.forEach(({ type, name, path }) => {
      if (path.startsWith("#")) {
        path = join(outputDocsPath, indexFilePath) + path;
      }
      // make sure the file is valid
      path = normalize(join(outputDocsPath, path));
      const pathToCheck = path.replace(/#.*/, "");
      if (!fs.existsSync(pathToCheck)) {
        throw new Error(`${path} not found`);
      }
      path = "file://" + encodeURI(path.replace(/\\/g, "/"));
      console.log(type + " > " + name + "\n\t" + path);
    });
  } finally {
    try {
      await rmdir(parentTmpPath);
    } catch (e) {
      console.error(e);
    }
  }
}
