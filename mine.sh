#!/bin/bash

for i in $(cat lines); do
  echo getting $i
  diff -q empty-output <( curl -s -S "https://charts.finsa.com.au/data/minute/$i/mid?l=12" )
done
