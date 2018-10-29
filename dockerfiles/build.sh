#!/bin/bash

REGISTRY=127.0.0.1:5000

# Iterate subdirectories
for DIR in */ ; do
  # Remove last character '/'
  MODULE=${DIR%?}
  TAG=${REGISTRY}/${MODULE}

  echo "Building Docker image ${TAG}"
  docker build -t ${TAG} ${DIR}
  
  # Push if build was successful
  if [ $? -eq 0 ]; then
    echo "Successfully built image ${TAG}, pushing"
    docker push ${TAG}
    echo "Push finished"
  else
    echo "Build failed for image ${TAG}"
  fi
done
