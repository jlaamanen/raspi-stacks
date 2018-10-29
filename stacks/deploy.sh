#!/bin/bash

# Iterate subdirectories
for DIR in */ ; do
  # Remove last character '/'
  STACK_NAME=${DIR%?}
  docker stack deploy -c ${STACK_NAME}/stack.yml ${STACK_NAME}
done
