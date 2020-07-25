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

// all known docset entry types
export type DocsetEntryType =
  | "Annotation"
  | "Attribute"
  | "Binding"
  | "Builtin"
  | "Callback"
  | "Category"
  | "Class"
  | "Command"
  | "Component"
  | "Constant"
  | "Constructor"
  | "Define"
  | "Delegate"
  | "Diagram"
  | "Directive"
  | "Element"
  | "Entry"
  | "Enum"
  | "Environment"
  | "Error"
  | "Event"
  | "Exception"
  | "Extension"
  | "Field"
  | "File"
  | "Filter"
  | "Framework"
  | "Function"
  | "Global"
  | "Guide"
  | "Hook"
  | "Instance"
  | "Instruction"
  | "Interface"
  | "Keyword"
  | "Library"
  | "Literal"
  | "Macro"
  | "Method"
  | "Mixin"
  | "Modifier"
  | "Module"
  | "Namespace"
  | "Notation"
  | "Object"
  | "Operator"
  | "Option"
  | "Package"
  | "Parameter"
  | "Plugin"
  | "Procedure"
  | "Property"
  | "Protocol"
  | "Provider"
  | "Provisioner"
  | "Query"
  | "Record"
  | "Resource"
  | "Sample"
  | "Section"
  | "Service"
  | "Setting"
  | "Shortcut"
  | "Statement"
  | "Struct"
  | "Style"
  | "Subroutine"
  | "Tag"
  | "Test"
  | "Trait"
  | "Type"
  | "Union"
  | "Value"
  | "Variable"
  | "Word";

/* handler function used to navigate to an HTML file and return associated docset entries */
export interface SelectorHandler {
  (data: BrowserData): Promise<DocsetEntries | void>;
}

/* context object provided to the selector handler */
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
  addTo: (
    selector: SubSelector,
    entries: DocsetEntries
  ) => Promise<DocsetEntries>;
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

export interface Options {
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
  entries?: DocsetEntries;
}

export interface CreatorFunctionOptions extends Options {
  // absolute path where icons exist (icon.png and icon@2x.png)
  iconsDirPath?: string;
  // absolute path for the docset files to be exposed in the docset
  docsPath: string;
  // `true` if we should lot to console
  logToConsole?: boolean;
  // the full path where the output should be copied
  outputPath: string;
  // absolute path for files that contain content that should be appended to the top of docs files
  addToTopDirPath?: string;
  // absolute path for files that contain content that should be appended to the bottom of docs files
  addToBottomDirPath?: string;
  // `true` if we just output the entries
  dryRun?: boolean;
  // chrome executable path if using selectors
  chromeExePath?: string;
}
