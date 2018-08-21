#!/bin/bash

FNAME=$(basename $1)
HASH=$(shasum -a256 $1 |cut -d' ' -f1)

set -x
for F in $(git ls-files "*.html"); do
  sed -i "" -e "s/${FNAME}?hash=.*'>/${FNAME}?hash=${HASH}'>/" $F
done
