#!/usr/bin/env node

import * as cdk from '@aws-cdk/core';
import { MyPipelineStack } from '../lib/cdk-stack.js'

const app = new cdk.App();
new MyPipelineStack(app, 'MyPipelineStack', {});
