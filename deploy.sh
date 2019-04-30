#!/bin/bash
aws s3 sync --profile thankshell --exclude ".DS_Store" app/ s3://static.thankshell.com/ --delete --acl public-read
