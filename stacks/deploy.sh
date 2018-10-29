#!/bin/bash

# Iterate subdirectories
for DIR in */ ; do
  # Remove last character '/'
  STACK_NAME=${DIR%?}
  docker deploy -c ${STACK_NAME}/stack.yml ${STACK_NAME}
done
