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
  // all docset entries
  entries: {
    Annotation?: string[];
    Attribute?: string[];
    Binding?: string[];
    Builtin?: string[];
    Callback?: string[];
    Category?: string[];
    Class?: string[];
    Command?: string[];
    Component?: string[];
    Constant?: string[];
    Constructor?: string[];
    Define?: string[];
    Delegate?: string[];
    Diagram?: string[];
    Directive?: string[];
    Element?: string[];
    Entry?: string[];
    Enum?: string[];
    Environment?: string[];
    Error?: string[];
    Event?: string[];
    Exception?: string[];
    Extension?: string[];
    Field?: string[];
    File?: string[];
    Filter?: string[];
    Framework?: string[];
    Function?: string[];
    Global?: string[];
    Guide?: string[];
    Hook?: string[];
    Instance?: string[];
    Instruction?: string[];
    Interface?: string[];
    Keyword?: string[];
    Library?: string[];
    Literal?: string[];
    Macro?: string[];
    Method?: string[];
    Mixin?: string[];
    Modifier?: string[];
    Module?: string[];
    Namespace?: string[];
    Notation?: string[];
    Object?: string[];
    Operator?: string[];
    Option?: string[];
    Package?: string[];
    Parameter?: string[];
    Plugin?: string[];
    Procedure?: string[];
    Property?: string[];
    Protocol?: string[];
    Provider?: string[];
    Provisioner?: string[];
    Query?: string[];
    Record?: string[];
    Resource?: string[];
    Sample?: string[];
    Section?: string[];
    Service?: string[];
    Setting?: string[];
    Shortcut?: string[];
    Statement?: string[];
    Struct?: string[];
    Style?: string[];
    Subroutine?: string[];
    Tag?: string[];
    Test?: string[];
    Trait?: string[];
    Type?: string[];
    Union?: string[];
    Value?: string[];
    Variable?: string[];
    Word?: string[];
  };
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
}
