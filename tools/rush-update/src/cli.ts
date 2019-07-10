#!/usr/bin/env node

import yargs from 'yargs';
import main, {
  DEFAULT_BRANCH,
  DEFAULT_COMMIT_MESSAGE,
  DEFAULT_PR_TITLE,
  DEFAULT_PR_BODY,
  DEFAULT_CHANGE_COMMIT_MESSAGE
} from './main';

const { argv } = yargs
  .usage('$0 [options]')
  .option('ignore-packages', {
    describe: 'Packages to ignore',
    alias: 'x',
    type: 'string',
    array: true,
    default: [],
  })
  .option('branch', {
    describe: 'Branch for commiting changes',
    alias: 'b',
    type: 'string',
    default: DEFAULT_BRANCH,
  })
  .option('commit-message', {
    describe: 'Commit message',
    type: 'string',
    default: DEFAULT_COMMIT_MESSAGE,
  })
  .option('change-commit-message', {
    describe: 'Commit message for generate rush change files',
    type: 'string',
    default: DEFAULT_CHANGE_COMMIT_MESSAGE,
  })
  .option('repo-owner', {
    describe: 'Username or Organization name on github',
    type: 'string',
  })
  .option('repo-name', {
    describe: 'Name of the repository on github',
    type: 'string',
  })
  .option('pr-base', {
    describe: 'Base branch for pull-request',
    type: 'string',
    default: 'master',
  })
  .option('pr-title', {
    describe: 'Pull request title',
    type: 'string',
    default: DEFAULT_PR_TITLE,
  })
  .option('pr-body', {
    describe: 'Pull request body',
    type: 'string',
    default: DEFAULT_PR_BODY,
  })
  .option('pr-reviewers', {
    describe: 'Pull request reviewers',
    type: 'string',
    array: true,
    default: [],
  })
  .option('gh-username', {
    describe: 'Github username (for authentication)',
    type: 'string',
  })
  .option('gh-apikey', {
    describe: 'Github apikey',
    type: 'string',
  })
  .option('commit', {
    hidden: true,
    type: 'boolean',
    default: true,
  })
  .option('change-file', {
    hidden: true,
    type: 'boolean',
    default: true,
  })
  .option('push', {
    hidden: true,
    type: 'boolean',
    default: true,
  })
  .option('pr', {
    hidden: true,
    type: 'boolean',
    default: true,
  });

const {
  'ignore-packages': reject,
  branch,
  'commit-message': commitMessage,
  'change-commit-message': changeCommitMessage,
  'gh-username': ghUsername,
  'gh-apikey': ghApikey,
  'repo-owner': repoOwner,
  'repo-name': repoName,
  'pr-base': baseBranch,
  'pr-title': prTitle,
  'pr-body': prBody,
  'pr-reviewers': prReviewers,
  commit,
  'change-file': changeFile,
  push,
  pr,
} = argv;

main({
  ncuParams: { reject },
  noCommit: !commit,
  noChangeFile: !changeFile,
  branch,
  commitMessage,
  changeCommitMessage,
  noPush: !push,
  noPr: !pr,
  ghUsername: ghUsername || process.env.GITHUB_USERNAME,
  ghApikey: ghApikey || process.env.GITHUB_API_KEY,
  repoOwner,
  repoName,
  baseBranch,
  prTitle,
  prBody,
  prReviewers,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
