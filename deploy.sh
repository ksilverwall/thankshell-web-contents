#!/bin/bash

set -eu

if [ $1 == "production" ]; then
   BUCKET_NAME="static.thankshell.com"
else
   BUCKET_NAME="develop-static.thankshell.com"
fi

aws s3 sync --profile thankshell --exclude ".DS_Store" app/ s3://${BUCKET_NAME}/ --delete --acl public-read
