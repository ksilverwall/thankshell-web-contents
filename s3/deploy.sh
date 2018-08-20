#!/bin/bash

if [ $# -ne 1 ]; then
  echo "./deploy.sh <file>"
  exit -1 
fi

aws s3 cp --acl public-read-write $1 s3://sla-bank/$1
