#!/bin/bash

# Iterate subdirectories
for DIR in */ ; do
  # Remove last character '/'
  STACK_NAME=${DIR%?}

  echo "Deploying stack ${STACK_NAME}..."
  docker stack deploy --resolve-image changed -c ${STACK_NAME}/stack.yml ${STACK_NAME}
  echo "Deploy finished for stack ${STACK_NAME}"
done
