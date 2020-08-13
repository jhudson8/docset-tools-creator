import { join, normalize } from "path";
import { DocsetEntries } from "docset-tools-types";
import rimraf from "rimraf";

export function normalizePath(path: string) {
  if (!path) {
    return path;
  }
  if (
    !path.match(/^[a-zA-Z]+:/) &&
    !path.startsWith("/") &&
    !path.startsWith("\\")
  ) {
    // append cwd
    path = join(process.cwd(), path);
  }
  return normalize(path);
}

export function unionEntries(
  a?: DocsetEntries,
  b?: DocsetEntries
): DocsetEntries {
  a = { ...(a || {}) };
  b = b || {};
  const anyA = a as any;
  Object.entries(b).forEach(([key, bEntries]) => {
    if (!anyA[key]) {
      anyA[key] = {};
    }
    const aEntries = anyA[key];
    anyA[key] = { ...aEntries, ...bEntries };
  });
  return anyA;
}

export function rmdir(path: string): Promise<void> {
  return new Promise(function (resolve, reject) {
    rimraf(path, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
