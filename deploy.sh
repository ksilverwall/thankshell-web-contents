#!/bin/bash
aws s3 sync s3/ s3://thankshell.com/ --delete
aws s3 sync s3/ s3://static.thankshell.com/ --delete
