# docset-tools-creator

Utility module used to create docsets. Supports

1. HTML page parsing
2. easy config

## Installation

```
yarn add docset-tools-creator
```

Create the direcoty

```
|- docs
   |- { all files to be included.  SiteSucker or another utility application can be used to download offline files }
|- src
   |- options.js
```

## Running the app

If you wan't a dry run, add `--dry-run` CLI arg.

```
docset-creator --chrome-exe-path /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
```

note: the chome exe path is only required if the `selectors` attribute is provided

## options.js

```
  // the name of the index file e.g. "index.html"
  indexFileName?: string;
  // the path of the index file directory relative to the base path
  indexFileDirPath?: string;
  // a path prefix that should be excluded from all doc entries (in case URLs were copy/pasted from browser)
  excludePathPrefix?: string;
  // a path prefix that should be included for each docset entry URL
  includePathPrefix?: string;
  // the equivalent of the package name for the docset
  docsetIdentifier: string;
  // human readable name of the docset (will default to docsetIdentifier)
  docsetName?: string;
  // javascript is enabled by default, `false` if it should be disabled
  isJavascriptEnabled?: boolean;
  // Dash plist.info value, defaults to docsetIdentifier
  docsetPlatformFamily?: string;
  // Dash plist.info value for website url
  fallbackUrl?: string;
  // any additionl selectors to populate entries
  selectors?: Selector[];
  // all docset entries
  entries?: Entries;
```

## types

```
export interface Selector extends SubSelector {
  url: string;
  waitFor?: string;
}

/* handler function used to navigate to an HTML file and return associated docset entries */
export interface SelectorHandler {
  (data: BrowserData): Promise<DocsetEntries | void>;
}

export interface BrowserData {
  /* return the element attribute as a promise */
  attr: (key: string) => Promise<string>;
  /* return the element attribute as a promise */
  innerText: () => Promise<string>;
  /* return the element outer html as a promise */
  outerHTML: () => Promise<string>;
  /* return a BrowserData representing a `querySelector` value using the current element as the root as a promise */
  single: (selector: string) => Promise<BrowserData>;
  /* return a BrowserData array representing a `querySelectorAll` value using the current element as the root as a promise */
  all: (selector: string) => Promise<BrowserData[]>;
  /* using the selector value, execute the handler function with the selector value and append the items to the entries provided as the 2nd parameter
    and return the aggregated results */
  addTo: (selector: SubSelector, entries: Entries) => Promise<DocsetEntries>;
  /* navigate to a new URL */
  goTo: (url: string, waitFor?: string) => Promise<BrowserData>;
}

/* selector data provided to the `addTo` function of `BrowserData` */
export interface SubSelector {
  /* the selector value */
  selector: string;
  /* the handler function provided called for each selector match */
  value: (data: BrowserData) => Promise<DocsetEntries>;
}

/* main selector object provided as the `selectors` options value */
export interface Selector extends SubSelector {
  /* the URL to navigate to */
  url: string;
  /* optional element selector to wait before processing */
  waitFor?: string;
}

```

## Example

```
function mainSelector(options) {
  return {
    url: options.url,
    selector: ".toctree-l1.current",
    value: async (data) => {
      const entry = await data.single("a");
      const text = await entry.innerText();
      const url = await entry.attr("href");
      const name = options.name || text;
      const rtn = {
        Entry: {
          [name]: url,
        },
      };
      return data.addTo(
        {
          selector: ".toctree-l2",
          value: async (data) => {
            const entry = await data.single("a");
            const text = await entry.innerText();
            const url = await entry.attr("href");
            return {
              Entry: {
                [name + ": " + text]: url,
              },
            };
          },
        },
        rtn
      );
    },
  };
}

function l3Selector(options) {
  return {
    url: options.url,
    selector: ".toctree-l3",
    value: async (data) => {
      const entry = await data.single("a");
      const url = await entry.attr("href");
      let name = await entry.innerText();
      if (options.namePrefix) {
        name = options.namePrefix + ": " + name;
      }
      return {
        [options.type]: {
          [name]: url,
        },
      };
    },
  };
}

function generalReferenceSelector() {
  return {
    url: "https://docs.snowflake.com/en/sql-reference.html",
    selector: ".left-sidebar .current .toctree-l2",
    value: async (data) => {
      const entry = await data.single("a");
      const name = await entry.innerText();
      if (!name || name === "Parameters") {
        return;
      }
      const url = await entry.attr("href");
      data = await data.goTo(url, ".toctree-l2");
      return data.addTo({
        selector: ".current .toctree-l3",
        value: async (data) => {
          const entry = await data.single("a");
          const text = await entry.innerText();
          const url = await entry.attr("href");
          const _name = name + ": " + text;
          const rtn = {
            Section: {
              [_name]: url,
            },
          };
          return rtn;
        },
      });
    },
  };
}

const options = {
  docsetIdentifier: "snowflake",
  docsetName: "Snowflake",
  // the index file name
  indexFileName: "index.html",
  // if the index file is not in the root directory
  indexFileDirPath: "en",
  fallbackUrl: "https://docs.snowflake.com/en/",
  // all entry path values will have this path prefix removed (useful if path values are copied from URLs)
  excludePathPrefix: "https://docs.snowflake.com/en/",

  selectors: [
    mainSelector({
      url: "https://docs.snowflake.com/en/user-guide-getting-started.html",
    }),
    mainSelector({
      name: "Introduction",
      url: "https://docs.snowflake.com/en/user-guide-intro.html",
    }),
    mainSelector({
      url: "https://docs.snowflake.com/en/release-notes.html",
    }),
    mainSelector({
      url: "https://docs.snowflake.com/en/user-guide-connecting.html",
    }),
    mainSelector({
      url: "https://docs.snowflake.com/en/user-guide-data-load.html",
    }),
    mainSelector({
      url: "https://docs.snowflake.com/en/user-guide-data-unload.html",
    }),
    mainSelector({
      name: "Sharing Data Securely",
      url: "https://docs.snowflake.com/en/user-guide-data-share.html",
    }),
    mainSelector({
      name: "Managing Your Account",
      url: "https://docs.snowflake.com/en/user-guide-admin.html",
    }),
    mainSelector({
      name: "Managing Security",
      url: "https://docs.snowflake.com/en/user-guide-admin-security.html",
    }),
    mainSelector({
      name: "Managing Security",
      url: "https://docs.snowflake.com/en/user-guide-admin-security.html",
    }),
    l3Selector({
      url: "https://docs.snowflake.com/en/sql-reference/parameters.html",
      type: "Parameter",
    }),
    generalReferenceSelector(),
    mainSelector({
      name: "SQL Command Reference",
      url: "https://docs.snowflake.com/en/sql-reference-commands.html",
    }),
    mainSelector({
      name: "SQL Function Reference",
      url: "https://docs.snowflake.com/en/sql-reference-functions.html",
    }),
  ],
};
module.exports = options;
```

## DocsetEntries

```
export interface DocsetEntries {
  Annotation?: Record<string, string>;
  Attribute?: Record<string, string>;
  Binding?: Record<string, string>;
  Builtin?: Record<string, string>;
  Callback?: Record<string, string>;
  Category?: Record<string, string>;
  Class?: Record<string, string>;
  Command?: Record<string, string>;
  Component?: Record<string, string>;
  Constant?: Record<string, string>;
  Constructor?: Record<string, string>;
  Define?: Record<string, string>;
  Delegate?: Record<string, string>;
  Diagram?: Record<string, string>;
  Directive?: Record<string, string>;
  Element?: Record<string, string>;
  Entry?: Record<string, string>;
  Enum?: Record<string, string>;
  Environment?: Record<string, string>;
  Error?: Record<string, string>;
  Event?: Record<string, string>;
  Exception?: Record<string, string>;
  Extension?: Record<string, string>;
  Field?: Record<string, string>;
  File?: Record<string, string>;
  Filter?: Record<string, string>;
  Framework?: Record<string, string>;
  Function?: Record<string, string>;
  Global?: Record<string, string>;
  Guide?: Record<string, string>;
  Hook?: Record<string, string>;
  Instance?: Record<string, string>;
  Instruction?: Record<string, string>;
  Interface?: Record<string, string>;
  Keyword?: Record<string, string>;
  Library?: Record<string, string>;
  Literal?: Record<string, string>;
  Macro?: Record<string, string>;
  Method?: Record<string, string>;
  Mixin?: Record<string, string>;
  Modifier?: Record<string, string>;
  Module?: Record<string, string>;
  Namespace?: Record<string, string>;
  Notation?: Record<string, string>;
  Object?: Record<string, string>;
  Operator?: Record<string, string>;
  Option?: Record<string, string>;
  Package?: Record<string, string>;
  Parameter?: Record<string, string>;
  Plugin?: Record<string, string>;
  Procedure?: Record<string, string>;
  Property?: Record<string, string>;
  Protocol?: Record<string, string>;
  Provider?: Record<string, string>;
  Provisioner?: Record<string, string>;
  Query?: Record<string, string>;
  Record?: Record<string, string>;
  Resource?: Record<string, string>;
  Sample?: Record<string, string>;
  Section?: Record<string, string>;
  Service?: Record<string, string>;
  Setting?: Record<string, string>;
  Shortcut?: Record<string, string>;
  Statement?: Record<string, string>;
  Struct?: Record<string, string>;
  Style?: Record<string, string>;
  Subroutine?: Record<string, string>;
  Tag?: Record<string, string>;
  Test?: Record<string, string>;
  Trait?: Record<string, string>;
  Type?: Record<string, string>;
  Union?: Record<string, string>;
  Value?: Record<string, string>;
  Variable?: Record<string, string>;
  Word?: Record<string, string>;
}
```
