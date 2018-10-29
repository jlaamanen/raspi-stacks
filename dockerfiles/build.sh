#!/bin/bash

REGISTRY=127.0.0.1:5000

# Iterate subdirectories
for DIR in */ ; do
  # Remove last character '/'
  MODULE=${DIR%?}
  TAG=${REGISTRY}/${MODULE}
  docker build -t ${TAG} ${DIR}
  
  # Push if build was successful
  if [ $? -eq 0 ]; then
    docker push ${TAG}
  fi
done
