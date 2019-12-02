import Octokit, { PullsCreateParams } from '@octokit/rest';

export async function createPullRequest(
  ghUsername: string,
  ghApikey: string,
  prParams: PullsCreateParams,
  reviewers?: string[]
) {
  const octokit = new Octokit({
    auth: {
      username: ghUsername,
      password: ghApikey,
      on2fa: async () => '',
    },
  });

  console.info('Creating PR...');
  const { data: pr } = await octokit.pulls.create(prParams);

  if (reviewers && reviewers.length > 0) {
    console.info(`Requesting PR review from ${reviewers.join(', ')}...`);
    await octokit.pulls.createReviewRequest({
      owner: prParams.owner,
      repo: prParams.repo,
      // eslint-disable-next-line @typescript-eslint/camelcase
      pull_number: pr.number,
      reviewers,
    });
  }
}
