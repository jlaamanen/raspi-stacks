pipeline {
  agent any

  stages {
    stage("Build") {
      steps {
        dir("dockerfiles") {
          sh "build.sh"
        }
      }
    }
    stage("Deploy") {
      steps {
        dir("stacks") {
          sh "deploy.sh"
        }
      }
    }
  }
}
