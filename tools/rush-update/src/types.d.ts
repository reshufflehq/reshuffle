declare module 'npm-check-updates' {
  interface NCUParams {
    packageFile: string;
    reject?: string[];
    upgrade?: boolean;
  }

  function run(params: NCUParams): Promise<Record<string, string[]>>;
}
