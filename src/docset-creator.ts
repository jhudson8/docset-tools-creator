import createSqlWasm, { SQLWasm, Database } from "sql-wasm";
import { join, normalize } from "path";
import fs, { existsSync, copy } from "fs-extra";
import rimraf from "rimraf";
import { CreatorFunctionOptions, DocsetEntryType } from "./types";
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
    entries,
  } = options;
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

  const log = (...args: any[]) => {
    if (options.logToConsole) {
      console.log(args);
    }
  };

  try {
    log("deleting ", outputPath);
    rimraf.sync(outputPath);
  } catch (e) {
    console.error(e);
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

  const fileRefs: { type: DocsetEntryType; path: string }[] = [];
  Object.entries(entries).forEach(([type, entries]) => {
    Object.entries(entries).forEach(([name, path]) => {
      if (excludePathPrefix && path.startsWith(excludePathPrefix)) {
        path = path.substring(excludePathPrefix.length);
      }
      if (includePathPrefix) {
        path = normalize(join(includePathPrefix, path));
      }
      path = path.replace(/[\\/]#/, "#").replace(/\\/g, "/");
      if (path.endsWith("/")) {
        path = path + indexFileName;
      }
      fileRefs.push({ type: type as DocsetEntryType, path });
      commands.push(
        `INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES ('${escape(
          name
        )}', '${escape(type)}', '${escape(path)}');`
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
      <key>DashDocSetFamily</key>
      <string>dashtoc</string>
      <key>${indexFilePath}</key>
      <string>docs/index.html</string>
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
  const addToFile = (path: string, top: boolean) => {
    const sourcePath = join(top ? addToTopDirPath : addToBottomDirPath, path);
    const destPath = join(outputDocsPath, path);
    const srcData = fs.readFileSync(destPath, { encoding: "utf8" });
    const deltaData = fs.readFileSync(sourcePath, { encoding: "utf8" });
    const newData = top
      ? deltaData + "\n" + srcData
      : srcData + "\n" + deltaData;
    fs.writeFileSync(destPath, newData, { encoding: "utf8" });
  };

  const checkAdds = (path: string, top: boolean) => {
    const base = top ? addToTopDirPath : addToBottomDirPath;
    if (!base) {
      return;
    }

    const _path = path ? join(base, path) : base;
    if (!fs.existsSync(_path)) {
      return;
    }

    const contents = fs.readdirSync(_path);
    for (let i = 0; i < contents.length; i++) {
      const name = contents[i];
      const stats = fs.statSync(join(_path, name));
      if (stats.isFile()) {
        if (name.match(/\*\.(.*)/)) {
          // any file with this prefix
          const index: Record<string, boolean> = {};
          fileRefs.forEach(({ type, path }) => {
            if (path.startsWith("#")) {
              path = join(outputDocsPath, indexFilePath) + path;
            }
            // make sure the file is valid
            path = path.replace(/#.*/, "");
            if (!fs.existsSync(path)) {
              console.error("Invalid path: ", path);
              throw new Error(`${path} not found`);
            } else if (!index[path]) {
              index[path] = true;
              // manually do these changes
              const srcData = fs.readFileSync(path, { encoding: "utf8" });
              const deltaData = fs.readFileSync(join(_path, name), {
                encoding: "utf8",
              });
              const newData = top
                ? deltaData + "\n" + srcData
                : srcData + "\n" + deltaData;
              fs.writeFileSync(path, newData, { encoding: "utf8" });
              log("appending to: ", path);
            }
          });
        } else {
          // copy
          addToFile(path ? join(path, name) : name, top);
        }
      } else {
        checkAdds(path ? join(path, name) : name, top);
      }
    }
  };

  checkAdds(undefined, true);
  checkAdds(undefined, false);

  fileRefs.forEach(({ type, path }) => {
    if (path.startsWith("#")) {
      path = join(outputDocsPath, indexFilePath) + path;
    }
    // make sure the file is valid
    path = path.replace(/#.*/, "");
    if (!fs.existsSync(path)) {
      throw new Error(`${path} not found`);
    }
  });
}
