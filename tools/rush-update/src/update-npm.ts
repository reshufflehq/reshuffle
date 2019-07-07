import ncu, { NCUParams } from 'npm-check-updates';
import { join } from 'path';

export async function updatePackageFiles(projectFolders: string[], ncuParams: Partial<NCUParams>): Promise<boolean> {
  const results = await Promise.all(projectFolders.map(async (folder) => {
    const packageFile = join(folder, './package.json');
    const upgraded = await ncu.run({
      packageFile,
      upgrade: true,
      ...ncuParams,
    });
    const outdatedDependencies = Object.keys(upgraded);
    if (outdatedDependencies.length === 0) {
      return false;
    }
    console.info(`Updated '${packageFile}' dependencies:`);
    outdatedDependencies.forEach((depName) => {
      console.info(`    ${depName} -> ${upgraded[depName]}`);
    });
    return true;
  }));

  return results.some((packageUpdated) => packageUpdated);
}
