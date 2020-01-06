// Derived from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/shell-escape/index.d.ts
declare module 'any-shell-escape' {
  type AnyShellEscape = (a: string | string[]) => string;

  const anyShellEscape: AnyShellEscape;

  export = anyShellEscape;
}
