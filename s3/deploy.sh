#!/bin/bash

if [ $# -lt 1 ]; then
  echo "./deploy.sh <file>"
  exit -1 
fi

for F in $@; do
  aws s3 cp --acl public-read-write $F s3://sla-bank/$F
done
