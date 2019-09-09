// Derived from on https://github.com/types/npm-columnify (MIT license)
declare module 'columnify' {
  export default function (data: { [key: string]: any } | any[], options?: GlobalOptions): string;

  export interface Options {
    align?: string;
    minWidth?: number;
    maxWidth?: number;
    paddingChr?: string;
    preserveNewLines?: boolean;
    truncateMarker?: string;
    showHeaders?: boolean;
    dataTransform?: (data: string) => string;
    headingTransform?: (data: string) => string;
  }

  export interface GlobalOptions extends Options {
    columns?: string[];
    columnSplitter?: string;
    config?: {
      [columnName: string]: Options;
    }
  }
}

// Derived from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/shell-escape/index.d.ts
declare module 'any-shell-escape' {
  type AnyShellEscape = (a: string | string[]) => string;

  const anyShellEscape: AnyShellEscape;

  export = anyShellEscape;
}
