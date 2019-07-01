const ncu = require('npm-check-updates');
const fs = require('fs');
const { join } = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const exists = promisify(fs.exists);

const IGNORED_PACKAGES = [
  '@types/node'
]

async function getPackageFiles() {
  const allSubDirs = await readdir(process.cwd(), { withFileTypes: true });
  const packageFiles = await Promise.all(allSubDirs
    .filter((dirent) => dirent.isDirectory())
    .map(({name}) => join(name, './package.json'))
    .map(async (packageFile) => ({
      packageFile,
      exists: await exists(packageFile)
    })));

  return packageFiles
    .filter(({exists}) => exists)
    .map(({packageFile}) => packageFile);
}

async function updatePackageFiles() {
  const allPackageFiles = await getPackageFiles();

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
}

run().catch((error) => {
  console.error(error);
  process.exit(-1);
});
