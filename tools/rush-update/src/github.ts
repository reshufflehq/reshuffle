import Octokit, { PullsCreateParams } from '@octokit/rest';

export async function createPullRequest(
  ghUsername: string,
  ghApikey: string,
  prParams: PullsCreateParams
) {
  const octokit = new Octokit({
    auth: {
      username: ghUsername,
      password: ghApikey,
      on2fa: async () => ''
    }
  });

  console.info('Creating PR...');
  await octokit.pulls.create(prParams);
}
