import * as cdk from '@aws-cdk/core';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as cloudformation from '@aws-cdk/aws-cloudformation';

export class MyPipelineStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const codeCommitRepository = new codecommit.Repository(this, 'MyRepository', {
      repositoryName: 'MyRepositoryName',
    });

    const lambdaFunction = new lambda.Function(this, 'MyLambda', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
    });

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CodeCommit',
      repository: codeCommitRepository,
      output: sourceOutput,
    });

    const buildOutput = new codepipeline.Artifact();
    const buildProject = new codebuild.PipelineProject(this, 'MyBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject({ // buildspecは適宜設定
        version: '0.2',
        phases: {
          install: {
            commands: 'echo "Installing dependencies"',
          },
          build: {
            commands: 'echo "Building"',
          },
        },
        artifacts: {
          'base-directory': 'build',
          files: [
            '**/*',
          ],
        },
      }),
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CodeBuild',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const changeSetName = 'MyChangeSet';
    const stackName = 'MyStack';

    const createChangeSetAction = new codepipeline_actions.CloudFormationCreateReplaceChangeSetAction({
      actionName: 'CFN_CreateReplaceChangeSet',
      templatePath: buildOutput.atPath(`${stackName}.template.json`),
      stackName,
      changeSetName,
      adminPermissions: true,
    });

    const executeChangeSetAction = new codepipeline_actions.CloudFormationExecuteChangeSetAction({
      actionName: 'CFN_ExecuteChangeSet',
      stackName,
      changeSetName,
    });

    new codepipeline.Pipeline(this, 'MyPipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Build',
          actions: [buildAction],
        },
        {
          stageName: 'Deploy',
          actions: [createChangeSetAction, executeChangeSetAction],
        },
      ],
    });
  }
}
