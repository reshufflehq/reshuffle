import { spawnSync } from 'child_process';

function runGit(...args: string[]): void {
  console.info(`git ${args.join(' ')}`);
  const { status } = spawnSync('git', args, {
    stdio: 'inherit',
  });

  if (status !== 0) {
    throw new Error(`git exited with code ${status}`);
  }
}

export function commitCurrentChangesToBranch(branchName: string, commitMessage: string) {
  runGit('checkout', '-b', branchName);
  runGit('commit', '-a', '-m', commitMessage);
}

export function pushToRemoteBranch(remoteBranch: string) {
  runGit('push', '--set-upstream', 'origin', remoteBranch);
}
