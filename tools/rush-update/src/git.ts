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

export function switchToNewBranch(branchName: string): void {
  runGit('checkout', '-b', branchName);
}

export function commitChanges(commitMessage: string): void {
  runGit('add', '--all');
  runGit('commit', '-m', commitMessage);
}

export function pushToRemoteBranch(remoteBranch: string): void {
  runGit('push', '--set-upstream', 'origin', remoteBranch);
}
