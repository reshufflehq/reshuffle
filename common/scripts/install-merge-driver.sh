#!/usr/bin/env bash
set -euo pipefail

npm install -g pnpm @pnpm/merge-driver
pnpx npm-merge-driver install --driver-name pnpm-merge-driver --driver "pnpm-merge-driver %A %O %B %P" --files common/config/rush/shrinkwrap.yaml
