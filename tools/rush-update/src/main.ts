import { updatePackageFiles } from './update-npm';
import { getProjectFolders, updateRushShrinkwrapFile, generateRushChangeFiles } from './rush';
import { switchToNewBranch, commitChanges, pushToRemoteBranch } from './git';
import { createPullRequest } from './github';
import { NCUParams } from 'npm-check-updates';

export const DEFAULT_BRANCH = 'update-npm-dependencies';
export const DEFAULT_COMMIT_MESSAGE = 'Update npm dependencies';
export const DEFAULT_CHANGE_COMMIT_MESSAGE = 'Generate change files';
export const DEFAULT_PR_TITLE = 'Update npm dependencies';
export const DEFAULT_PR_BODY = 'This PR was auto-generated with rush-update.';
export const DEFAULT_PR_BASE_BRANCH = 'master';

export default async function main({
  ncuParams,
  noCommit,
  branch,
  commitMessage,
  noChangeFile,
  changeCommitMessage,
  noPush,
  noPr,
  ghUsername = process.env.GITHUB_USERNAME,
  ghApikey = process.env.GITHUB_APIKEY,
  repoOwner,
  repoName,
  baseBranch,
  prTitle,
  prBody,
  prReviewers,
}: {
  ncuParams?: Partial<NCUParams>
  noCommit?: boolean,
  branch?: string,
  commitMessage?: string,
  noChangeFile?: boolean,
  changeCommitMessage?: string,
  noPush?: boolean,
  noPr?: boolean,
  ghUsername?: string,
  ghApikey?: string,
  repoOwner?: string
  repoName?: string,
  baseBranch?: string,
  prTitle?: string,
  prBody?: string,
  prReviewers?: string[],
}) {
  const projectFolders = await getProjectFolders();
  const shouldUpdateShrinkwrapFile = await updatePackageFiles(projectFolders, ncuParams || {});
  if (!shouldUpdateShrinkwrapFile) {
    console.info('All dependencies are up to date!');
    return;
  }

  await updateRushShrinkwrapFile();

  if (noCommit) {
    return;
  }
  const actualBranch = branch || DEFAULT_BRANCH;
  switchToNewBranch(actualBranch);
  commitChanges(commitMessage || DEFAULT_COMMIT_MESSAGE);

  if (!noChangeFile) {
    generateRushChangeFiles();
    commitChanges(changeCommitMessage || DEFAULT_CHANGE_COMMIT_MESSAGE);
  }

  if (noPush) {
    return;
  }
  pushToRemoteBranch(actualBranch);

  if (noPr) {
    return;
  }

  if (!ghUsername) {
    throw new Error('Github username was not specified.');
  }
  if (!ghApikey) {
    throw new Error('Github apikey was not specified.');
  }
  if (!repoOwner) {
    throw new Error('Repository owner was not specified.');
  }
  if (!repoName) {
    throw new Error('Repository name was not specified.');
  }

  await createPullRequest(
    ghUsername,
    ghApikey,
    {
      owner: repoOwner,
      repo: repoName,
      head: actualBranch,
      base: baseBranch || DEFAULT_PR_BASE_BRANCH,
      title: prTitle || DEFAULT_PR_TITLE,
      body: prBody || DEFAULT_PR_BODY,
    },
    prReviewers
  );

  console.info('Done!');
}
