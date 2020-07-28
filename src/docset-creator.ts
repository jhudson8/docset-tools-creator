import createSqlWasm, { SQLWasm, Database } from "sql-wasm";
import { join, normalize } from "path";
import fs, { existsSync, copy } from "fs-extra";
import rimraf from "rimraf";
import { CreatorFunctionOptions, DocsetEntryType } from "./types";
import browserSelector from "./browser-selector";
// the following doesn't have a type definition
const recursiveCopy = require("recursive-copy");

function escape(value: string) {
  return value.replace(/'/g, "''");
}

export default async function (options: CreatorFunctionOptions): Promise<void> {
  const {
    iconsDirPath,
    docsPath,
    excludePathPrefix,
    includePathPrefix,
    docsetIdentifier,
    isJavascriptEnabled,
    docsetPlatformFamily,
    fallbackUrl,
    outputPath,
    addToTopDirPath,
    addToBottomDirPath,
    selectors,
  } = options;
  let entries = options.entries;
  const indexFileName = options.indexFileName || "index.html";
  const indexFilePath = normalize(
    options.indexFileDirPath
      ? join(options.indexFileDirPath, indexFileName)
      : indexFileName
  ).replace(/\\/g, "/");
  const docsetFileName = docsetIdentifier + ".docset";
  const outputBasePath = join(outputPath, docsetFileName);
  const outputContentsPath = join(outputBasePath, "Contents");
  const outputResourcesPath = join(outputContentsPath, "Resources");
  const outputDocsPath = join(outputResourcesPath, "Documents");
  const docsetName = options.docsetName || docsetIdentifier;
  const dryRun = options.dryRun;

  const log = (...args: any[]) => {
    if (options.logToConsole) {
      console.log(...args);
    }
  };

  if (dryRun) {
    if (selectors) {
      entries = await browserSelector(entries, options);
    }
    console.log(entries);
    return;
  } else {
    try {
      log("deleting ", outputPath);
      rimraf.sync(outputPath);
    } catch (e) {
      console.error(e);
    }

    if (selectors) {
      entries = await browserSelector(entries, options);
    }

    log("copying from " + docsPath + " to " + outputDocsPath);
    await recursiveCopy(docsPath, outputDocsPath);

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
        if (excludePathPrefix && _path.startsWith(excludePathPrefix)) {
          _path = _path.substring(excludePathPrefix.length);
        }
        if (includePathPrefix) {
          _path = normalize(join(includePathPrefix, _path));
        }
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
    if (iconsDirPath) {
      log("copying icons...");
      const iconPath = join(iconsDirPath, "icon.png");
      const iconExists = existsSync(iconPath);
      if (iconExists) {
        await copy(iconPath, join(outputBasePath, "icon.png"));
      } else {
        console.error(iconPath + " does not exist");
      }
      const icon2xPath = join(iconsDirPath, "icon@2x.png");
      const icon2xExists = existsSync(iconPath);
      if (icon2xExists) {
        await copy(icon2xPath, join(outputBasePath, "icon@2x.png"));
      } else {
        console.error(icon2xPath + " does not exist");
      }
    }

    // prefix / suffix
    const checkAdds = (path: string, top: boolean) => {
      const base = top ? addToTopDirPath : addToBottomDirPath;
      if (!base) {
        return;
      }
      const deltaPath = path ? join(base, path) : base;

      const outputBasePathWithPrefix = path
        ? join(outputDocsPath, path)
        : outputDocsPath;
      const docsContents = fs.readdirSync(outputBasePathWithPrefix);
      for (let j = 0; j < docsContents.length; j++) {
        const name = docsContents[j];
        const outputFilePath = join(outputBasePathWithPrefix, name);
        const stats = fs.statSync(outputFilePath);
        if (stats.isFile()) {
          const ext = name.match(/\.([^.]+)$/)[1];
          let matchPath;
          // exact match
          const exactMatchPath = join(deltaPath, name);
          if (existsSync(exactMatchPath)) {
            matchPath = exactMatchPath;
          }
          if (!matchPath) {
            const dirWildcardMatch = join(deltaPath, "*." + ext);
            if (existsSync(dirWildcardMatch)) {
              matchPath = dirWildcardMatch;
            }
          }
          if (!matchPath) {
            const ext = name.match(/\.([^.]+)$/)[1];
            const allWildcardMatch = join(base, "_all", "*." + ext);
            if (existsSync(allWildcardMatch)) {
              matchPath = allWildcardMatch;
            }
          }
          if (matchPath) {
            // manually do these changes
            const srcData = fs.readFileSync(outputFilePath, {
              encoding: "utf8",
            });
            const deltaData = fs.readFileSync(matchPath, {
              encoding: "utf8",
            });
            const newData = top
              ? deltaData + "\n" + srcData
              : srcData + "\n" + deltaData;
            fs.writeFileSync(outputFilePath, newData, { encoding: "utf8" });
          }
        } else {
          checkAdds(path ? join(path, name) : name, top);
        }
      }
    };

    checkAdds(undefined, true);
    checkAdds(undefined, false);

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
  }
}
