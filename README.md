# raspi-stacks
Docker stack configurations for my Raspberry Pi

## Setting it up

To get this up and running on a Raspberry Pi:

### Build & deploy stacks initially
1. Install Docker
    ```
    curl -fsSL get.docker.com -o get-docker.sh && sh get-docker.sh
    ```
2. Have your GitHub SSH keys set up under `/home/pi/.ssh` (so they would be mounted to Jenkins)
3. Copy or `git clone` the repository on the Raspberry Pi
4. Run `dockerfiles/build.sh` and `stacks/deploy.sh` to get all stacks up and running

### Configure Jenkins
1. Wait for Jenkins to start running in port 8081
2. Read Jenkins initial admin password from inside the container
    ```
    docker exec -ti [container name or id] cat /var/jenkins_home/secrets/initialAdminPassword
    ```
3. Set Jenkins up in a browser with the password
4. Add a new pipeline project
5. Select "Pipeline script from SCM" and add your repository URL
6. Make sure that the script path is `Jenkinsfile`
7. Check "Poll SCM" in build triggers with the desired cron schedule, e.g.:
    * Every 5 minutes: `H/5 * * * *`
    * Every minute: `* * * * *`

Now Jenkins should be all set up and polling for changes in your repository's master branch!

## Using it

Just develop all your custom Docker images under `dockerfiles` directory. Each directory under it defines a custom image. Whenever a new directory appears there, it will be built by Jenkins and pushed into the local registry running in `devops` stack.

When you want to deploy any images (custom or existing), add them to an existing stack or create a new one under `stacks` directory. Each directory under it defines a Docker stack. After build stage, Jenkins deploys all defined stacks on the Raspberry Pi.
