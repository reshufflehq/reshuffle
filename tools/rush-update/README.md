# rush-update

Utillity to auto update dependencies in all rush projects (including the shrinkwrap file) and create a PR on github.
Meant to be used in CI/CD for repo using `@microsoft/rush`

## Usage

```sh
rush-update [options]

Options:
  --ignore-packages, -x  Packages to ignore           [default: []]
  --branch, -b           Branch for commiting changes [default: "update-npm-dependencies"]
  --commit-message       Commit message               [default: "Update npm dependencies"]
  --repo-owner           Username or Organization name on github
  --repo-name            Name of the repository on github
  --pr-base              Base branch for pull-request [default: "master"]
  --pr-title             Pull request title           [default: "Update npm dependencies"]
  --pr-body              Pull request body            [default: "This PR was auto-generated with rush-update."]
  --gh-username          Github username (for authentication)
  --gh-apikey            Github apikey
  --no-commit            Doesn't commit changes
  --no-push              Commit changes but don't push to remote
  --no-pr                Commit and push to remote but don't create a pull request

# example with rush script
node common/scripts/install-run.js rush-update@latest -x @types/node --repo-owner binaris --repo-name shiftjs --gh-apikey 1234qweasd --gh-username shift-circleci
```

## Usage in CI
for example, here is a CircleCI config to run this script every night:
```yml
version: 2.1
jobs:
  update_npm_dependencies:
    docker:
      - image: circleci/node:10
    steps:
      - checkout
      - run:
          name: Configure git
          command: |
            git config user.email "auto-npm-dep-update@mydomain.com"
            git config user.name "autoupdate"
      - run:
          name: Update npm dependencies
          command: node common/scripts/install-run.js rush-update@latest rush-update -x @types/node --repo-owner binaris --repo-name shiftjs
workflows:
  version: 2
  nightly:
    triggers:
       - schedule:
           cron: "0 0 * * *"
           filters:
             branches:
               only:
                 - master
    jobs:
      - update_npm_dependencies

```
