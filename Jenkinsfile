node {
    checkout scm;
    properties([
        parameters([
            stringParam(
                defaultValue: "false",
                description: 'build docker without cache',
                name: 'NO_CACHE'
           ),
           booleanParam(
               defaultValue: false,
               description: 'whether to avoid triggering precious at the end',
               name: 'NO_PRECIOUS'
           ),
        ]),
    ]);

    genericWrapper([slackChannel:'#jenkins', timeoutMinutes: 60]) {
        withCredentials([
            string(credentialsId: 'docker-account',  variable: 'DOCKER_ACCOUNT')
        ]) {
            def imageTag = "${DOCKER_ACCOUNT}/reshuffle:${BRANCH_NAME}";
            stage('Build') {
                echo 'Building docker image';
                sh "sudo docker build ${NO_CACHE ? '--no-cache' : ''} --tag ${imageTag} .";
            }
            stage('Push') {
                echo 'Pushing docker image';
                sh 'sudo $(aws ecr get-login --no-include-email --region us-east-1)';
                sh "sudo docker push ${imageTag}";
            }
            if (!NO_PRECIOUS) {
                trigger_precious(BRANCH_NAME, JOB_NAME);
            }
        }
    }
}
