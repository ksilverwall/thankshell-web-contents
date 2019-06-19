#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o noclobber

declare -r SCRIPT_DIR_PATH="$(dirname "$(readlink -f "$0")")"

cd "${SCRIPT_DIR_PATH}"

node_modules/.bin/eslint \
  --fix \
  --quiet ./app
