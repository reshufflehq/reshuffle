const ncu = require('npm-check-updates');
const { readdirSync, existsSync } = require('fs');
const { join } = require('path');

const IGNORED_PACKAGES = [
  '@types/node'
]

async function updatePackageFiles() {
  const allPackageFiles = readdirSync(process.cwd(), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map(({name}) => join(name, './package.json'))
    .filter(existsSync);

  const results = await Promise.all(allPackageFiles.map(async (packageFile) => {
    const upgraded = await ncu.run({
      packageFile,
      reject: IGNORED_PACKAGES,
      upgrade: true,
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

async function run() {
  const shouldUpdateShrinkwrapFile = await updatePackageFiles();
  if (!shouldUpdateShrinkwrapFile) {
    console.info('All dependencies are up to date!');
    return;
  }

  console.info('Done!');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
